"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ScanLine,
  Package,
  CheckCircle2,
  AlertTriangle,
  Truck,
  UserRound,
  Usb,
  X,
  History,
  Route,
  Camera,
} from "lucide-react";
import { CameraBarcodePanel } from "@/components/CameraBarcodePanel";
import { DashboardHero } from "@/components/DashboardHero";
import { ParcelBarcode } from "@/components/ParcelBarcode";
import { TypeaheadSelect } from "@/components/TypeaheadSelect";
import { Badge, Button, Panel, SelectField, buttonClass } from "@/components/ui";
import { useConfirm, useToast } from "@/components/Feedback";
import { PORTAL_BY_ROLE, type AppRole } from "@/lib/roles";
import { useAuth } from "@/lib/auth-context";
import { ApiError, apiFetch } from "@/lib/api";
import {
  formatTnd,
  isPickupManifest,
  isReturnLot,
  PICKUP_MANIFEST_KIND_LABEL,
  type Parcel,
  type PickupManifest,
  type ReturnLot,
  type TimelineEntry,
} from "@/lib/domain";

type ScanBundle = ReturnLot | PickupManifest;
import { STATUS_META, type StatusKey } from "@/lib/status-meta";
import { canScanMutate } from "@/lib/scan-actions";
import { canTransition, requiresComment } from "@/lib/parcel-transitions";
import {
  caseProgress,
  casesForRole,
  isExpectedCaseStep,
  nextCaseStatus,
  stepLabel,
  type ScanCase,
  type ScanCaseId,
} from "@/lib/scan-cases";
import { scanCodeCandidates } from "@/lib/normalize-scan-code";
import {
  rememberClientScanToday,
  rememberOpsScanSession,
  wasClientScannedToday,
  wasOpsScannedThisSession,
} from "@/lib/scan-doublon";
import { useHidScanner } from "@/lib/use-hid-scanner";
import { cn } from "@/lib/cn";

type StepChoice = "AUTO" | StatusKey;

type ScanFeedback = {
  tone: "ok" | "warn" | "error";
  title: string;
  detail?: string;
};

type MachineTestState =
  | { phase: "idle" }
  | { phase: "listening"; startedAt: number }
  | { phase: "ok"; code: string; ms: number }
  | { phase: "fail"; reason: string };

type DriverOption = {
  id: number;
  name: string;
  phone?: string | null;
  zoneId?: number | null;
};

const MACHINE_TEST_MS = 30_000;
const SCAN_IDLE_ACCEPT_MS = 350;
/** Ignore wedge/camera double-fire of the exact same burst. */
const PHYSICAL_DUP_MS = 450;
const MACHINE_TEST_CODE = "UMB-TEST-SCAN";
const MACHINE_OK_KEY = "umbrella.scanner.machineOk";

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-TN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function sortedTimeline(entries: TimelineEntry[] | undefined): TimelineEntry[] {
  if (!entries?.length) return [];
  return [...entries].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

export function ScannerPage({ role }: { role: AppRole }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { session } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const inflight = useRef(false);
  const caseRef = useRef<ScanCase | null>(null);
  const livreurRef = useRef<DriverOption | null>(null);
  const stepRef = useRef<StepChoice>("AUTO");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [bundle, setBundle] = useState<ScanBundle | null>(null);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<ScanCaseId | null>(null);
  const [selectedStep, setSelectedStep] = useState<StepChoice>("AUTO");
  const [selectedLivreur, setSelectedLivreur] = useState<DriverOption | null>(
    null,
  );
  const [machineTest, setMachineTest] = useState<MachineTestState>(() => {
    if (typeof window === "undefined") return { phase: "idle" };
    try {
      const raw = sessionStorage.getItem(MACHINE_OK_KEY);
      if (raw) {
        return { phase: "ok", code: raw, ms: 0 };
      }
    } catch {
      /* ignore */
    }
    return { phase: "idle" };
  });
  const [showMachineTest, setShowMachineTest] = useState(false);
  const machineListening = useRef(false);
  const machineStartedAt = useRef(0);
  const machineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBurst = useRef<{ code: string; at: number } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const base = PORTAL_BY_ROLE[role];
  const firstName = session?.user.name?.split(/\s+/)[0] ?? "";
  const canMutate = canScanMutate(role);
  const operatorName = session?.user.name ?? "Opérateur";

  const availableCases = useMemo(
    () => (canMutate ? casesForRole(role) : []),
    [canMutate, role],
  );

  const selectedCase = useMemo(
    () => availableCases.find((c) => c.id === selectedCaseId) ?? null,
    [availableCases, selectedCaseId],
  );

  caseRef.current = selectedCase;
  livreurRef.current = selectedLivreur;
  stepRef.current = selectedStep;
  machineListening.current = machineTest.phase === "listening";

  const progress = useMemo(
    () =>
      selectedCase && parcel
        ? caseProgress(selectedCase, parcel.status)
        : selectedCase
          ? selectedCase.steps.map((key) => ({
              key,
              label: stepLabel(key),
              done: false,
              current: false,
            }))
          : [],
    [selectedCase, parcel],
  );

  const history = useMemo(
    () => sortedTimeline(parcel?.timeline),
    [parcel?.timeline],
  );

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const reportDuplicate = useCallback(
    (detail: string) => {
      setFeedback({
        tone: "warn",
        title: "Doublon",
        detail,
      });
      toast.error("Doublon", detail);
      setCode("");
      focusInput();
    },
    [toast, focusInput],
  );

  const loadDrivers = useCallback(async () => {
    if (!session?.accessToken) return;
    setDriversLoading(true);
    try {
      const list = await apiFetch<DriverOption[]>("/users/livreurs", {
        token: session.accessToken,
      });
      setDrivers(list);
    } catch {
      setDrivers([]);
      toast.error("Impossible de charger les livreurs");
    } finally {
      setDriversLoading(false);
    }
  }, [session?.accessToken, toast]);

  useEffect(() => {
    if (!selectedCase?.needsLivreur) return;
    if (role === "LIVREUR" && session?.user) {
      setSelectedLivreur({
        id: session.user.id,
        name: session.user.name,
        phone: session.user.phone ?? null,
      });
      return;
    }
    void loadDrivers();
  }, [selectedCase?.needsLivreur, role, session?.user, loadDrivers]);

  const livreurOptions = useMemo(
    () =>
      drivers.map((d) => ({
        id: String(d.id),
        label: d.name,
        hint: d.phone ?? undefined,
        value: d,
      })),
    [drivers],
  );

  const clearMachineTimer = useCallback(() => {
    if (machineTimer.current) {
      clearTimeout(machineTimer.current);
      machineTimer.current = null;
    }
    if (scanIdleTimer.current) {
      clearTimeout(scanIdleTimer.current);
      scanIdleTimer.current = null;
    }
  }, []);

  const stopMachineTest = useCallback(() => {
    clearMachineTimer();
    machineListening.current = false;
    setMachineTest({ phase: "idle" });
    focusInput();
  }, [clearMachineTimer, focusInput]);

  const completeMachineTest = useCallback(
    (scanned: string) => {
      const value = scanned.trim();
      if (!value || !machineListening.current) return false;
      const started = machineStartedAt.current || Date.now();
      clearMachineTimer();
      machineListening.current = false;
      setMachineTest({
        phase: "ok",
        code: value,
        ms: Math.max(0, Date.now() - started),
      });
      try {
        sessionStorage.setItem(MACHINE_OK_KEY, value);
      } catch {
        /* ignore */
      }
      setCode("");
      setShowMachineTest(false);
      setFeedback({
        tone: "ok",
        title: "Douchette OK — pas besoin de reconnecter",
        detail: `Code reçu : ${value}. Scannez n’importe quel colis quand vous voulez.`,
      });
      toast.success("Douchette OK", "Mémorisée pour cette session");
      focusInput();
      return true;
    },
    [clearMachineTimer, toast, focusInput],
  );

  const startMachineTest = useCallback(() => {
    clearMachineTimer();
    setParcel(null);
    setCode("");
    const startedAt = Date.now();
    machineStartedAt.current = startedAt;
    machineListening.current = true;
    setShowMachineTest(true);
    setMachineTest({ phase: "listening", startedAt });
    setFeedback({
      tone: "warn",
      title: "Test machine — 30 s",
      detail:
        "1) Cliquez le champ code  2) Scannez UMB-TEST-SCAN (ou n’importe quel code). Utilisez Chrome/Edge.",
    });
    focusInput();
    machineTimer.current = setTimeout(() => {
      if (!machineListening.current) return;
      machineListening.current = false;
      setMachineTest({
        phase: "fail",
        reason:
          "Aucun caractère reçu. Douchette en mode clavier (HID), Chrome sur localhost:3010, focus sur le champ.",
      });
      setFeedback({
        tone: "error",
        title: "Machine non détectée",
        detail: "Testez d’abord dans Notepad, puis ici.",
      });
      toast.error("Test échoué", "Aucun scan reçu");
      focusInput();
    }, MACHINE_TEST_MS);
  }, [clearMachineTimer, focusInput, toast]);

  useEffect(() => () => clearMachineTimer(), [clearMachineTimer]);

  useEffect(() => {
    if (machineTest.phase !== "listening") return;
    const id = window.setInterval(() => {
      const el = inputRef.current;
      if (el && document.activeElement !== el) el.focus();
    }, 800);
    return () => window.clearInterval(id);
  }, [machineTest.phase]);

  function onScanInputChange(value: string) {
    setCode(value);
    if (!machineListening.current) return;
    if (scanIdleTimer.current) clearTimeout(scanIdleTimer.current);
    const trimmed = value.trim();
    if (trimmed.length < 3) return;
    scanIdleTimer.current = setTimeout(() => {
      if (machineListening.current) completeMachineTest(trimmed);
    }, SCAN_IDLE_ACCEPT_MS);
  }

  const buildCaseComment = useCallback(
    (scanCase: ScanCase, next: StatusKey, livreur: DriverOption | null) => {
      const parts = [
        `Cas: ${scanCase.label}`,
        `Scan: ${operatorName}`,
      ];
      if (livreur) parts.push(`Livreur: ${livreur.name}`);
      if (requiresComment(next, "")) {
        parts.push(`Étape: ${stepLabel(next)}`);
      }
      return parts.join(" · ");
    },
    [operatorName],
  );

  const applyCaseStep = useCallback(
    async (target: Parcel, scanCase: ScanCase, livreur: DriverOption | null) => {
      const stepChoice = stepRef.current;
      const next =
        stepChoice === "AUTO"
          ? nextCaseStatus(scanCase, target.status, role)
          : stepChoice;

      if (!next) {
        reportDuplicate(
          `${target.code ?? "Ce colis"} est déjà traité pour ce parcours (${STATUS_META[target.status as StatusKey]?.label ?? target.status}).`,
        );
        return target;
      }

      if (next === target.status) {
        reportDuplicate(
          `${target.code ?? "Ce colis"} est déjà à « ${stepLabel(next)} ». Choisissez l’étape suivante ou un autre colis.`,
        );
        return target;
      }

      if (
        scanCase.needsLivreur &&
        (next === "AFFECTE_LIVREUR" || next === "EN_COURS") &&
        !livreur
      ) {
        setFeedback({
          tone: "warn",
          title: "Choisir qui récupère / livre",
          detail: "Sélectionnez le livreur avant de scanner.",
        });
        return null;
      }

      const gate = canTransition(target.status, next, role);
      if (!gate.ok) {
        setFeedback({
          tone: "error",
          title: "Étape impossible",
          detail: gate.reason,
        });
        toast.error("Étape impossible", gate.reason);
        return null;
      }

      const currentLabel =
        STATUS_META[target.status as StatusKey]?.label ?? target.status;
      const nextLbl = stepLabel(next);
      const aligned = isExpectedCaseStep(scanCase, target.status, next);

      if (!aligned) {
        setFeedback({
          tone: "warn",
          title: "Cas / étape non alignés",
          detail: `Colis « ${currentLabel} » → « ${nextLbl} ». Confirmation requise.`,
        });
        const first = await confirm({
          title: "Étape incorrecte pour ce parcours",
          description: `Le colis est « ${currentLabel} », mais l’étape choisie / cas (« ${scanCase.label} ») appliquerait « ${nextLbl} ». Continuer quand même ?`,
          confirmLabel: "Continuer",
          cancelLabel: "Annuler",
          tone: "danger",
        });
        if (!first) {
          setFeedback({
            tone: "warn",
            title: "Scan annulé",
            detail: "Choisissez le bon parcours / étape, puis rescandez.",
          });
          return null;
        }
        const second = await confirm({
          title: "Deuxième confirmation",
          description: `Confirmez vraiment le passage de « ${currentLabel} » vers « ${nextLbl} » pour ${target.code ?? "ce colis"}.`,
          confirmLabel: "Oui, appliquer",
          cancelLabel: "Non",
          tone: "danger",
        });
        if (!second) {
          setFeedback({
            tone: "warn",
            title: "Scan annulé",
            detail: "Statut inchangé.",
          });
          return null;
        }
      }

      const note = buildCaseComment(scanCase, next, livreur);
      const body: Record<string, unknown> = {
        code: target.code ?? String(target.id),
        status: next,
        comment: note,
      };
      if (
        livreur &&
        (next === "AFFECTE_LIVREUR" || next === "EN_COURS")
      ) {
        body.driverId = livreur.id;
      }

      const result = await apiFetch<Parcel>("/parcels/scan", {
        method: "POST",
        token: session?.accessToken,
        body: JSON.stringify(body),
      });
      setParcel(result);

      if (stepChoice !== "AUTO") {
        const idx = scanCase.steps.indexOf(next);
        const following = idx >= 0 ? scanCase.steps[idx + 1] : undefined;
        setSelectedStep(following ?? "AUTO");
      }

      setFeedback({
        tone: "ok",
        title: `OK — ${nextLbl}`,
        detail: [
          result.code ?? undefined,
          livreur ? `Livreur: ${livreur.name}` : null,
          `Par: ${operatorName}`,
        ]
          .filter(Boolean)
          .join(" · "),
      });
      toast.success(nextLbl, result.code ?? undefined);
      return result;
    },
    [
      role,
      session?.accessToken,
      toast,
      confirm,
      buildCaseComment,
      operatorName,
      reportDuplicate,
    ],
  );

  const fetchScanTarget = useCallback(
    async (scanCode: string): Promise<Parcel | ScanBundle> => {
      if (canMutate) {
        return apiFetch<Parcel | ScanBundle>("/parcels/scan", {
          method: "POST",
          token: session?.accessToken,
          body: JSON.stringify({ code: scanCode }),
        });
      }
      return apiFetch<Parcel | ScanBundle>(
        `/parcels/by-code/${encodeURIComponent(scanCode)}`,
        { token: session?.accessToken },
      );
    },
    [canMutate, session?.accessToken],
  );

  const lookupParcel = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q || inflight.current) return;

      const candidates = scanCodeCandidates(q);
      const primary = candidates[0] ?? q;
      const normalized = candidates.find((c) => c !== primary) ?? primary;
      const burstKey = normalized.toUpperCase();
      const now = Date.now();
      if (
        lastBurst.current &&
        lastBurst.current.code === burstKey &&
        now - lastBurst.current.at < PHYSICAL_DUP_MS
      ) {
        reportDuplicate(`« ${normalized} » vient d’être scanné (doublon machine / caméra).`);
        return;
      }
      lastBurst.current = { code: burstKey, at: now };

      if (machineListening.current) {
        completeMachineTest(normalized);
        return;
      }

      if (candidates.some((c) => c.toUpperCase() === MACHINE_TEST_CODE)) {
        machineListening.current = true;
        machineStartedAt.current = Date.now();
        completeMachineTest(MACHINE_TEST_CODE);
        return;
      }

      if (role === "CLIENT") {
        if (wasClientScannedToday(normalized)) {
          reportDuplicate(
            `« ${normalized} » déjà scanné aujourd’hui. Un client ne peut scanner le même bordereau qu’une fois par jour.`,
          );
          return;
        }
        rememberClientScanToday(normalized);
        router.push(`/track?code=${encodeURIComponent(normalized)}`);
        setFeedback({
          tone: "ok",
          title: "Suivi ouvert",
          detail: `${normalized} · valable pour aujourd’hui`,
        });
        return;
      }

      const activeCase = caseRef.current;
      const activeLivreur = livreurRef.current;

      // Quick lookup (no parcours): block same bordereau twice in this session.
      if (!activeCase && wasOpsScannedThisSession(normalized)) {
        reportDuplicate(
          `« ${normalized} » déjà scanné dans cette session (même bordereau).`,
        );
        return;
      }

      inflight.current = true;
      setBusy(true);
      setFeedback(null);
      setBundle(null);

      try {
        let found: Parcel | ScanBundle | null = null;
        let usedCode = primary;
        let lastError: unknown = null;
        for (const candidate of candidates) {
          try {
            found = await fetchScanTarget(candidate);
            usedCode = candidate;
            break;
          } catch (err) {
            lastError = err;
          }
        }
        if (!found) throw lastError ?? new Error("Colis introuvable");

        if (usedCode !== primary) {
          toast.info(
            "Code corrigé",
            `${primary} → ${usedCode} (clavier AZERTY)`,
          );
        }

        setCode("");

        if (isReturnLot(found) || isPickupManifest(found)) {
          setParcel(null);
          setBundle(found);
          rememberOpsScanSession(found.code);
          const label = isReturnLot(found)
            ? "Lot retour"
            : `Manifeste ${PICKUP_MANIFEST_KIND_LABEL[found.manifestKind].toLowerCase()}`;
          setFeedback({
            tone: "ok",
            title: `${label} · ${found.itemCount} colis`,
            detail: `${found.code} — ouvrez chaque colis depuis la liste pour le détail / statut.`,
          });
          toast.success(label, `${found.itemCount} colis`);
          return;
        }

        setParcel(found);
        setBundle(null);

        if (role === "EXPEDITEUR") {
          rememberOpsScanSession(found.code ?? usedCode);
          router.push(
            `${base}/parcels?q=${encodeURIComponent(found.code ?? usedCode)}`,
          );
          return;
        }

        if (canMutate && activeCase) {
          inflight.current = false;
          setBusy(false);
          const updated = await applyCaseStep(
            found,
            activeCase,
            activeLivreur,
          );
          if (updated) {
            setParcel(updated);
            rememberOpsScanSession(updated.code ?? usedCode);
          }
          return;
        }

        rememberOpsScanSession(found.code ?? usedCode);
        setFeedback({
          tone: "ok",
          title: "Colis trouvé",
          detail: `${found.code ?? usedCode} · ${STATUS_META[found.status as StatusKey]?.label ?? found.status}`,
        });
      } catch (err) {
        setParcel(null);
        setBundle(null);
        const msg = err instanceof Error ? err.message : "Introuvable";
        const isDup =
          (err instanceof ApiError && err.status === 409) ||
          /doublon/i.test(msg);
        if (isDup) {
          reportDuplicate(msg);
        } else {
          setFeedback({
            tone: "error",
            title: "Scan échoué",
            detail:
              msg === "Colis introuvable" && primary !== normalized
                ? `${msg} (lu « ${primary} », essayé « ${normalized} »). Vérifiez le clavier EN (US) ou utilisez Scanner ce colis.`
                : msg,
          });
          toast.error("Scan échoué", msg);
        }
        setCode(normalized !== primary ? normalized : primary);
      } finally {
        if (inflight.current) {
          inflight.current = false;
          setBusy(false);
        }
        focusInput();
      }
    },
    [
      role,
      canMutate,
      session?.accessToken,
      router,
      base,
      toast,
      focusInput,
      applyCaseStep,
      completeMachineTest,
      fetchScanTarget,
      reportDuplicate,
    ],
  );

  const onCameraDetect = useCallback(
    (scanned: string) => {
      if (machineListening.current) {
        completeMachineTest(scanned);
        return;
      }
      void lookupParcel(scanned);
    },
    [completeMachineTest, lookupParcel],
  );

  useHidScanner({
    enabled: true,
    onScan: (scanned) => {
      if (machineListening.current) {
        completeMachineTest(scanned);
        return;
      }
      void lookupParcel(scanned);
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void lookupParcel(code);
  }

  function selectCase(scanCase: ScanCase | null) {
    if (!scanCase) {
      setSelectedCaseId(null);
      setSelectedStep("AUTO");
      return;
    }
    setSelectedCaseId(scanCase.id);
    setSelectedStep("AUTO");
    setParcel(null);
    setBundle(null);
    setFeedback({
      tone: "warn",
      title: scanCase.label,
      detail:
        "Étape auto ou manuelle, puis scannez le bordereau. Livreur seulement pour Affecter / En cours.",
    });
    if (!scanCase.needsLivreur) {
      setSelectedLivreur(null);
    } else if (role === "LIVREUR" && session?.user) {
      setSelectedLivreur({
        id: session.user.id,
        name: session.user.name,
        phone: session.user.phone ?? null,
      });
    }
    focusInput();
  }

  const stepNeedsLivreur =
    selectedStep === "AFFECTE_LIVREUR" || selectedStep === "EN_COURS";
  /** Quick scan always allowed; optional parcours only for status advances. */
  const caseReadyForMutate =
    Boolean(selectedCase) &&
    (!stepNeedsLivreur || Boolean(selectedLivreur) || role === "LIVREUR");

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      <div className="lg:hidden">
        <DashboardHero
          subtitle={`Bonjour${firstName ? ` ${firstName}` : ""} — scan rapide, cas détaillés depuis Retours / Colis.`}
        />
      </div>

      <Panel className="space-y-4">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ops-accent/15 text-ops-accent">
            <ScanLine className="h-7 w-7" />
          </span>
          <h1 className="mt-3 font-display text-xl font-bold text-ops-ink">
            Scanner rapide
          </h1>
          <p className="mt-1 max-w-md text-sm text-ops-ink/50">
            Douchette ou caméra — lecture immédiate. Un lot retour affiche tous
            ses colis. Parcours optionnel pour avancer un statut.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ops-ink/40">
            <UserRound className="h-3.5 w-3.5" />
            Opérateur : {operatorName}
          </p>
        </div>

        <div
          className={cn(
            "flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
            machineTest.phase === "ok" &&
              "border-emerald-500/40 bg-emerald-500/10",
            machineTest.phase === "listening" &&
              "border-amber-500/40 bg-amber-500/10",
            machineTest.phase === "fail" &&
              "border-ops-accent/40 bg-ops-accent/10",
            machineTest.phase === "idle" &&
              "border-ops-card bg-ops-page/60",
          )}
        >
          <div className="flex items-start gap-3 text-left">
            <span
              className={cn(
                "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                machineTest.phase === "ok" && "bg-emerald-500 text-white",
                machineTest.phase === "listening" && "bg-amber-500 text-white",
                machineTest.phase === "fail" && "bg-ops-accent text-white",
                machineTest.phase === "idle" &&
                  "bg-ops-card text-ops-ink/55",
              )}
            >
              <Usb className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ops-ink">
                {machineTest.phase === "ok"
                  ? "Connecté"
                  : machineTest.phase === "listening"
                    ? "Connexion…"
                    : machineTest.phase === "fail"
                      ? "Non connecté"
                      : "Machine non connectée"}
              </p>
              <p className="mt-0.5 text-[12px] text-ops-ink/50">
                {machineTest.phase === "ok"
                  ? `Douchette OK${machineTest.code ? ` · dernier code « ${machineTest.code} »` : ""} — pas besoin de reconnecter`
                  : machineTest.phase === "listening"
                    ? "Scannez le code de test (30 s)"
                    : machineTest.phase === "fail"
                      ? machineTest.reason
                      : "Cliquez Connecter, puis scannez une fois pour valider la douchette"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {machineTest.phase === "listening" ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  stopMachineTest();
                  setShowMachineTest(false);
                }}
              >
                Annuler
              </Button>
            ) : machineTest.phase === "ok" ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-[12px] font-semibold text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Connecté
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={Usb}
                  onClick={() => {
                    try {
                      sessionStorage.removeItem(MACHINE_OK_KEY);
                    } catch {
                      /* ignore */
                    }
                    setMachineTest({ phase: "idle" });
                    setShowMachineTest(true);
                    startMachineTest();
                  }}
                >
                  Reconnecter
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Usb}
                onClick={() => {
                  setShowMachineTest(true);
                  startMachineTest();
                }}
              >
                Connecter
              </Button>
            )}
          </div>
        </div>

        {machineTest.phase === "listening" ||
        (showMachineTest && machineTest.phase !== "ok") ? (
          <div
            className={cn(
              "rounded-2xl border p-4",
              machineTest.phase === "listening"
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-ops-card bg-ops-page/60",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ops-ink">
                Code de test — scannez avec la douchette
              </p>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => {
                  stopMachineTest();
                  setShowMachineTest(false);
                }}
                className="rounded-lg p-1 text-ops-ink/45 transition hover:text-ops-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-xl bg-white px-3 py-4 shadow-sm">
              <ParcelBarcode
                code={MACHINE_TEST_CODE}
                height={72}
                className="mx-auto flex w-full max-w-md justify-center [&_svg]:h-auto [&_svg]:w-full"
              />
            </div>
            <p className="mt-2 text-center font-mono text-xs font-bold text-ops-ink">
              {MACHINE_TEST_CODE}
            </p>
            {machineTest.phase === "fail" ? (
              <Button
                type="button"
                size="sm"
                className="mt-3 w-full"
                variant="secondary"
                onClick={startMachineTest}
              >
                Relancer la connexion
              </Button>
            ) : null}
          </div>
        ) : null}

        {canMutate && availableCases.length > 0 ? (
          <div className="space-y-3 rounded-2xl border border-ops-card bg-ops-page/60 p-4">
            <SelectField
              label="Parcours (optionnel)"
              value={selectedCaseId ?? ""}
              onChange={(e) => {
                const id = e.target.value as ScanCaseId | "";
                const hit = availableCases.find((c) => c.id === id) ?? null;
                selectCase(hit);
              }}
            >
              <option value="">— Lecture seule / rapide —</option>
              {availableCases.map((scanCase) => (
                <option key={scanCase.id} value={scanCase.id}>
                  {scanCase.label}
                </option>
              ))}
            </SelectField>
            {selectedCase ? (
              <p className="text-[11px] leading-snug text-ops-ink/45">
                {selectedCase.description}
              </p>
            ) : (
              <p className="text-[11px] leading-snug text-ops-ink/45">
                Sans parcours : scan = affichage du colis ou expansion d’un lot
                retour. Cas détaillés (dispatch, cycle…) depuis Retours / détail
                colis.
              </p>
            )}

            {selectedCase ? (
              <SelectField
                label="Étape à appliquer"
                value={selectedStep}
                onChange={(e) => {
                  const v = e.target.value as StepChoice;
                  setSelectedStep(v);
                  focusInput();
                }}
              >
                <option value="AUTO">
                  Automatique — étape suivante du parcours
                </option>
                {selectedCase.steps.map((step, i) => (
                  <option key={step} value={step}>
                    {i + 1}. {stepLabel(step)}
                  </option>
                ))}
              </SelectField>
            ) : null}

            {selectedCase?.needsLivreur && role !== "LIVREUR" ? (
              <TypeaheadSelect<DriverOption>
                label="Livreur"
                placeholder="Tapez un nom ou téléphone…"
                options={livreurOptions}
                value={selectedLivreur}
                displayValue={selectedLivreur?.name ?? ""}
                loading={driversLoading}
                emptyText="Aucun livreur"
                onSelect={(opt) => {
                  setSelectedLivreur(opt.value);
                  focusInput();
                }}
                onClear={() => setSelectedLivreur(null)}
              />
            ) : null}

            {selectedCase && role === "LIVREUR" && selectedLivreur ? (
              <div className="flex items-center gap-2 rounded-xl border border-ops-card bg-ops-surface px-3 py-2 text-sm text-ops-ink/70">
                <Truck className="h-4 w-4 text-ops-accent" />
                Vous êtes le livreur : {selectedLivreur.name}
              </div>
            ) : null}
          </div>
        ) : null}

        {selectedCase ? (
          <div className="rounded-2xl border border-ops-card bg-ops-page/60 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Route className="h-4 w-4 text-ops-accent" />
              <p className="text-sm font-semibold text-ops-ink">
                Aperçu parcours
              </p>
              {selectedStep !== "AUTO" ? (
                <span className="ml-auto rounded-md bg-ops-accent/15 px-2 py-0.5 text-[10px] font-bold text-ops-accent">
                  Étape forcée
                </span>
              ) : null}
            </div>
            <ol className="space-y-1.5">
              {progress.map((step, i) => {
                const forced = selectedStep === step.key;
                return (
                  <li
                    key={step.key}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]",
                      forced && "bg-ops-accent/20 font-semibold text-ops-ink",
                      !forced &&
                        step.current &&
                        "bg-ops-accent/10 font-semibold text-ops-ink",
                      !forced && step.done && "text-ops-ink/40 line-through",
                      !forced &&
                        !step.done &&
                        !step.current &&
                        "text-ops-ink/55",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        forced || step.current
                          ? "bg-ops-accent text-white"
                          : step.done
                            ? "bg-emerald-500/30 text-emerald-200"
                            : "bg-ops-card text-ops-ink/50",
                      )}
                    >
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left hover:underline"
                      onClick={() => setSelectedStep(step.key)}
                    >
                      {step.label}
                    </button>
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              className="mt-2 text-[11px] font-semibold text-ops-ink/40 hover:text-ops-accent"
              onClick={() => setSelectedStep("AUTO")}
            >
              Remettre en automatique
            </button>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-ops-ink">
            {machineTest.phase === "listening" ? "Test douchette" : "Code colis"}
            <input
              ref={inputRef}
              data-scan-input="1"
              value={code}
              onChange={(e) => onScanInputChange(e.target.value)}
              autoFocus
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder={
                machineTest.phase === "listening"
                  ? "Scannez un code pour tester…"
                  : selectedCase && !caseReadyForMutate
                    ? "Choisissez le livreur pour cette étape"
                    : "Douchette, caméra, ou saisie…"
              }
              disabled={busy && machineTest.phase !== "listening"}
              className={cn(
                "mt-1.5 w-full rounded-xl border bg-ops-page px-4 py-3 text-center font-mono text-base outline-none ring-ops-accent focus:ring-2 disabled:opacity-60",
                machineTest.phase === "listening"
                  ? "border-amber-500/50"
                  : "border-ops-card",
              )}
            />
          </label>
          {machineTest.phase === "listening" ? (
            <p className="text-center text-xs text-ops-ink/45">
              Dès que des caractères apparaissent, le test passe OK.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="submit"
                className="w-full"
                disabled={
                  !code.trim() ||
                  busy ||
                  (Boolean(selectedCase) && !caseReadyForMutate)
                }
              >
                {busy ? "Lecture…" : "Lire le code"}
              </Button>
              <Button
                type="button"
                variant={cameraOpen ? "secondary" : "primary"}
                className="w-full"
                icon={Camera}
                disabled={busy || (Boolean(selectedCase) && !caseReadyForMutate)}
                onClick={() => setCameraOpen((open) => !open)}
              >
                {cameraOpen ? "Fermer caméra" : "Scanner téléphone"}
              </Button>
            </div>
          )}
        </form>

        {cameraOpen && machineTest.phase !== "listening" ? (
          <CameraBarcodePanel
            onDetect={onCameraDetect}
            onClose={() => {
              setCameraOpen(false);
              focusInput();
            }}
          />
        ) : null}

        {feedback ? (
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border px-3 py-3 text-sm",
              feedback.tone === "ok" &&
                "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
              feedback.tone === "warn" &&
                "border-amber-500/30 bg-amber-500/10 text-amber-100",
              feedback.tone === "error" &&
                "border-ops-accent/40 bg-ops-accent/10 text-rose-100",
            )}
          >
            {feedback.tone === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{feedback.title}</p>
              {feedback.detail ? (
                <p className="mt-0.5 opacity-80">{feedback.detail}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Panel>

      {bundle ? (
        <Panel className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ops-card text-ops-accent">
              <Package className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-lg font-bold text-ops-ink">
                {bundle.code}
              </p>
              <p className="text-sm text-ops-ink/70">
                {isReturnLot(bundle)
                  ? "Lot retour"
                  : `Manifeste ${PICKUP_MANIFEST_KIND_LABEL[bundle.manifestKind].toLowerCase()}`}{" "}
                · {bundle.itemCount} colis
                {bundle.sender?.name ? ` · ${bundle.sender.name}` : ""}
              </p>
            </div>
            <Badge tone={bundle.status === "OPEN" ? "success" : "neutral"}>
              {bundle.status === "OPEN" ? "Ouvert" : "Fermé"}
            </Badge>
          </div>
          <ul className="divide-y divide-ops-card rounded-xl border border-ops-card">
            {bundle.parcels.map((p) => (
              <li key={p.id}>
                <Link
                  href={`${base}/parcels/${p.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 transition hover:bg-ops-page/80"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-sm font-semibold text-ops-ink">
                      {p.code ?? `#${p.id}`}
                    </span>
                    <span className="block truncate text-xs text-ops-ink/50">
                      {p.recipientName} · {p.city}
                    </span>
                  </span>
                  <StatusPill status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {parcel ? (
        <Panel className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ops-card text-ops-accent">
              <Package className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-lg font-bold text-ops-ink">
                {parcel.code}
              </p>
              <p className="truncate text-sm text-ops-ink/70">
                {parcel.recipientName} · {parcel.phone}
              </p>
              <p className="mt-1 text-sm text-ops-ink/55">
                {parcel.city}
                {parcel.zone?.name ? ` · ${parcel.zone.name}` : ""}
              </p>
              {parcel.driver?.name ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ops-ink/45">
                  <UserRound className="h-3.5 w-3.5" />
                  Livreur : {parcel.driver.name}
                </p>
              ) : null}
            </div>
            <StatusPill status={parcel.status} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ops-card pt-3 text-sm">
            <span className="font-display text-lg font-bold text-ops-accent">
              {formatTnd(parcel.price)}
            </span>
            <div className="flex gap-2">
              <Link
                href={`${base}/parcels/${parcel.id}`}
                className={buttonClass("secondary")}
              >
                Détail
              </Link>
              <Link
                href={`${base}/bordereau?id=${parcel.id}`}
                className={buttonClass("primary")}
              >
                Bordereau
              </Link>
            </div>
          </div>

          <div className="space-y-3 border-t border-ops-card pt-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-ops-accent" />
              <p className="text-xs font-semibold uppercase tracking-wide text-ops-ink/45">
                Historique détaillé
              </p>
              <span className="ml-auto text-[11px] text-ops-ink/35">
                {history.length} événement{history.length === 1 ? "" : "s"}
              </span>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-ops-ink/45">Aucun événement encore.</p>
            ) : (
              <ol className="relative space-y-0 border-l border-ops-card pl-4">
                {history.map((entry, idx) => {
                  const statusMeta = entry.status
                    ? STATUS_META[entry.status as StatusKey]
                    : null;
                  return (
                    <li key={`${entry.at}-${idx}`} className="relative pb-4 last:pb-0">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-ops-accent ring-4 ring-ops-surface" />
                      <div className="rounded-xl border border-ops-card bg-ops-page/50 px-3 py-2.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-ops-ink">
                            {entry.label}
                          </p>
                          <time className="shrink-0 text-[11px] text-ops-ink/40">
                            {formatWhen(entry.at)}
                          </time>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ops-ink/50">
                          {entry.actor ? (
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="h-3 w-3" />
                              {entry.actor}
                            </span>
                          ) : null}
                          {statusMeta ? (
                            <span
                              className="rounded px-1.5 py-0.5 font-semibold"
                              style={{
                                background: statusMeta.color,
                                color: statusMeta.ink ?? "#fff",
                              }}
                            >
                              {statusMeta.label}
                            </span>
                          ) : null}
                        </div>
                        {entry.comment &&
                        !entry.label.includes(entry.comment) ? (
                          <p className="mt-1.5 text-[12px] leading-snug text-ops-ink/55">
                            {entry.comment}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status as StatusKey];
  return (
    <span
      className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold"
      style={{
        background: meta?.color ?? "#334155",
        color: meta?.ink ?? "#fff",
      }}
    >
      {meta?.label ?? status}
    </span>
  );
}
