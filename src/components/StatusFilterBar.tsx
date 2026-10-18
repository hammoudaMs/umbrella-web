"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Ban,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Hourglass,
  LayoutGrid,
  Package,
  PackageCheck,
  RotateCcw,
  Truck,
  UserRound,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  countByParcelStatus,
  countForStatusKey,
  DASHBOARD_STATUS_KEYS,
  STATUS_ALIAS_KEYS,
} from "@/lib/dashboard-statuses";
import { REASON_VISIBLE_STATUSES } from "@/lib/parcel-transitions";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";

type Countable = { status: string };

type FilterOption = {
  key: string | null;
  label: string;
  title: string;
  count: number;
  color: string;
  Icon: ComponentType<LucideProps>;
};

const SHORT_LABEL: Partial<Record<StatusKey, string>> = {
  EN_ATTENTE: "En attente",
  A_ENLEVER: "En attente",
  ENLEVES: "Récupéré",
  AU_DEPOT: "Au dépôt",
  EXPEDIE_DESTINATION: "Expédié",
  ARRIVE_DESTINATION: "Destination",
  AFFECTE_LIVREUR: "Affecté",
  EN_COURS: "En livraison",
  LIVRES: "Livré",
  LIVRES_PAYES: "Payé",
  LIVRAISON_ANNULEE: "Annulé",
  RETOUR_DEPOT: "Retour",
  RETOUR_EXPEDITEURS: "Retour exp.",
  RETOUR_RECU: "Retour reçu",
  RETOUR_DEFINITIF: "Retour déf.",
  RETOUR_INTER_AGENCE: "Inter-agence",
  A_VERIFIER: "À vérifier",
  NON_SERIEUX: "Non sérieux",
  ECHANGES: "Échanges",
};

const STATUS_ICON: Partial<Record<StatusKey, ComponentType<LucideProps>>> = {
  EN_ATTENTE: Hourglass,
  A_ENLEVER: Hourglass,
  ENLEVES: PackageCheck,
  AU_DEPOT: Building2,
  EXPEDIE_DESTINATION: Truck,
  ARRIVE_DESTINATION: Building2,
  AFFECTE_LIVREUR: UserRound,
  EN_COURS: Truck,
  LIVRES: CheckCircle2,
  LIVRES_PAYES: CheckCircle2,
  LIVRAISON_ANNULEE: Ban,
  RETOUR_DEPOT: RotateCcw,
  RETOUR_EXPEDITEURS: RotateCcw,
  RETOUR_RECU: Package,
  RETOUR_DEFINITIF: Ban,
  RETOUR_INTER_AGENCE: RotateCcw,
  A_VERIFIER: Package,
  NON_SERIEUX: Ban,
  ECHANGES: Package,
};

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function StatusFilterBar({
  parcels,
  trailing,
}: {
  parcels: Countable[];
  /** Top-right of the status card (e.g. batch print). */
  trailing?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("status");
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const counts = useMemo(() => countByParcelStatus(parcels), [parcels]);

  const keys = useMemo(() => {
    const withCount = DASHBOARD_STATUS_KEYS.filter(
      (key) => countForStatusKey(key, counts) > 0 || current === key,
    );
    const extras = Array.from(counts.keys()).filter(
      (key) =>
        key !== "SUPPRIME" &&
        !DASHBOARD_STATUS_KEYS.includes(key as StatusKey) &&
        !STATUS_ALIAS_KEYS.has(key as StatusKey) &&
        ((counts.get(key) ?? 0) > 0 || current === key),
    ) as StatusKey[];
    const merged = [...withCount, ...extras];
    if (current && !merged.includes(current as StatusKey)) {
      return [...merged, current as StatusKey];
    }
    return merged;
  }, [counts, current]);

  const totalCount = useMemo(
    () => parcels.filter((p) => p.status !== "SUPPRIME").length,
    [parcels],
  );

  const options = useMemo((): FilterOption[] => {
    const all: FilterOption = {
      key: null,
      label: "Tous",
      title: "Tous les colis",
      count: totalCount,
      color: "#991211",
      Icon: LayoutGrid,
    };
    const rest = keys.map((key) => {
      const meta = STATUS_META[key];
      return {
        key,
        label: SHORT_LABEL[key] ?? meta?.label ?? key,
        title: meta?.label ?? key,
        count: countForStatusKey(key, counts),
        color: meta?.color ?? "#64748b",
        Icon: STATUS_ICON[key] ?? Package,
      };
    });
    return [all, ...rest];
  }, [counts, keys, totalCount]);

  const selected =
    options.find((opt) => opt.key === current) ?? options[0]!;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function go(status: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (status) params.set("status", status);
    else params.delete("status");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setOpen(false);
  }

  const SelectedIcon = selected.Icon;

  return (
    <div className="space-y-1.5">
      <div className="flex max-w-md items-start gap-2">
        <div ref={rootRef} className="relative min-w-0 flex-1">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex w-full min-h-11 items-center gap-2.5 rounded-xl border bg-ops-surface px-3 py-2 text-left transition",
              "border-ops-card hover:border-ops-ink/20",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              open && "border-ops-accent/40 ring-1 ring-ops-accent/20",
            )}
          >
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: hexToRgba(selected.color, 0.2),
                color: selected.color,
              }}
              aria-hidden
            >
              <SelectedIcon className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-ops-ink/40">
                Statut
              </span>
              <span className="mt-0.5 flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-ops-ink">
                  {selected.label}
                </span>
                <span className="shrink-0 font-display text-[13px] font-bold tabular-nums text-ops-ink/45">
                  {selected.count}
                </span>
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-ops-ink/40 transition",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>

          {open ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="Filtrer par statut"
              className="absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-ops-card bg-ops-surface py-1 shadow-lg"
            >
            {options.map((opt) => {
              const active = opt.key === selected.key;
              const Icon = opt.Icon;
              return (
                <li key={opt.key ?? "all"} role="option" aria-selected={active}>
                  <button
                    type="button"
                    title={opt.title}
                    onClick={() => go(opt.key)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition",
                      active
                        ? "bg-ops-accent/10"
                        : "hover:bg-ops-ink/[0.05]",
                    )}
                  >
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: hexToRgba(opt.color, 0.18),
                        color: opt.color,
                      }}
                      aria-hidden
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ops-ink">
                      {opt.label}
                    </span>
                    <span className="shrink-0 font-display text-[13px] font-bold tabular-nums text-ops-ink/45">
                      {opt.count}
                    </span>
                    {active ? (
                      <Check
                        className="h-4 w-4 shrink-0 text-ops-accent"
                        aria-hidden
                      />
                    ) : (
                      <span className="w-4 shrink-0" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          ) : null}
        </div>
        {trailing ? (
          <div className="flex h-11 shrink-0 items-center">{trailing}</div>
        ) : null}
      </div>

      {current ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => go(null)}
            className="text-[11px] font-medium text-ops-ink/40 transition hover:text-ops-accent"
          >
            Effacer le filtre
          </button>
          {REASON_VISIBLE_STATUSES.has(current as StatusKey) ? (
            <p className="text-[11px] font-medium text-ops-accent/80">
              Motif d’annulation / vérification affiché sur chaque colis
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
