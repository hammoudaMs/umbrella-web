"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookUser,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Home,
  MapPin,
  Package,
  Plus,
  Printer,
  UserRound,
} from "lucide-react";
import {
  AddressLocationFields,
  type AddressLocationValue,
} from "@/components/AddressLocationFields";
import { errorText, useToast } from "@/components/Feedback";
import { Modal } from "@/components/Modal";
import { ZoneField } from "@/components/ZoneField";
import { Button } from "@/components/ui";
import { loadAddressBook, type SavedAddress } from "@/lib/address-book";
import { scoreAddress } from "@/lib/address-quality";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { DELIVERY_WINDOWS, type DeliveryWindowId } from "@/lib/delivery-windows";
import type {
  DeliveryMode,
  DeliveryRoute,
  Parcel,
  UserRow,
  Zone,
} from "@/lib/domain";
import { USE_MOCK } from "@/lib/mock-mode";
import { displayGovernorate } from "@/lib/normalize-text";
import { openBordereauPdf } from "@/lib/parcel-report";
import {
  mergeSavedProductType,
  productTypeOptions,
} from "@/lib/product-types";
import { canAssignParcelZone, canSeeDeliveryMode } from "@/lib/roles";
import { PORTAL_BY_ROLE } from "@/tenants/registry";
import { useStatusLabel } from "@/i18n/hooks";
import { useApi, useApiQuery } from "@/lib/use-api";
import { upsertZone } from "@/lib/zone-book";

const STEPS = [
  { id: "recipient", label: "Destinataire", Icon: UserRound },
  { id: "address", label: "Adresse", Icon: MapPin },
  { id: "parcel", label: "Colis", Icon: Package },
  { id: "confirm", label: "Confirmer", Icon: Check },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const EMPTY_ADDRESS: AddressLocationValue = {
  governorate: "",
  city: "",
  locality: "",
  address: "",
  lat: null,
  lng: null,
  accuracyMeters: null,
};

type RecipientLookup = {
  found: boolean;
  phone: string;
  name?: string | null;
  governorate?: string | null;
  city?: string | null;
  locality?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  source?: "client" | "parcel";
  hasAccount?: boolean;
};

const INTERNAL_ROUTE_GOVS = new Set([
  "Tunis",
  "Ariana",
  "Ben Arous",
  "La Mannouba",
]);

function defaultModeForGov(
  governorate: string,
  routes: DeliveryRoute[],
): DeliveryMode {
  const hit = routes.find(
    (r) =>
      r.governorate.localeCompare(governorate, "fr", { sensitivity: "base" }) ===
      0,
  );
  if (hit) return hit.mode;
  return INTERNAL_ROUTE_GOVS.has(governorate) ? "INTERNAL" : "EXTERNAL";
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-ops-ink"
    >
      {children}
    </label>
  );
}

const fieldClass =
  "w-full rounded-xl border border-ops-card bg-ops-page px-3 py-2.5 text-sm text-ops-ink outline-none ring-ops-accent focus:ring-2";

function formatMoney(n: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 3,
  }).format(n);
}

type CreateParcelWizardProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export function CreateParcelWizard({
  open,
  onClose,
  onCreated,
}: CreateParcelWizardProps) {
  const { session, updateProfile } = useAuth();
  const router = useRouter();
  const statusLabelFn = useStatusLabel();
  const role = session?.user.role;
  const showModes = canSeeDeliveryMode(role);
  const showZones = canAssignParcelZone(role);
  const isSender = role === "EXPEDITEUR";
  const request = useApi();
  const toast = useToast();
  const [savedProductTypes, setSavedProductTypes] = useState<string[]>([]);
  const [createdParcel, setCreatedParcel] = useState<Parcel | null>(null);
  const typeOptions = useMemo(
    () => productTypeOptions(savedProductTypes),
    [savedProductTypes],
  );
  const { data: deliveryRoutesData } = useApiQuery<DeliveryRoute[]>(
    open && showModes ? "/delivery-routes" : null,
  );
  const deliveryRoutes = useMemo(
    () => deliveryRoutesData ?? [],
    [deliveryRoutesData],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [exchange, setExchange] = useState(false);
  const [allowTry, setAllowTry] = useState(false);
  const [isFragile, setIsFragile] = useState(false);
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);
  const [contentDeclarationAccepted, setContentDeclarationAccepted] =
    useState(false);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [productType, setProductType] = useState("");
  const [productTypeOther, setProductTypeOther] = useState("");
  const [location, setLocation] = useState<AddressLocationValue>(EMPTY_ADDRESS);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("EXTERNAL");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [deliveryWindow, setDeliveryWindow] =
    useState<DeliveryWindowId>("journee");
  const [landmarkPreview, setLandmarkPreview] = useState<string | null>(null);
  const [landmarkName, setLandmarkName] = useState<string | null>(null);
  const [forceWeakAddress, setForceWeakAddress] = useState(false);
  const [zoneName, setZoneName] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [articleCount, setArticleCount] = useState("1");
  const [parcelCount, setParcelCount] = useState("1");
  const [paymentMode, setPaymentMode] = useState("espece");
  const [exchangeNotes, setExchangeNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [parcelAdvancedOpen, setParcelAdvancedOpen] = useState(true);
  const [recipientLookupHint, setRecipientLookupHint] = useState<string | null>(
    null,
  );
  const [lookingUpRecipient, setLookingUpRecipient] = useState(false);
  const lastLookupPhoneRef = useRef<string | null>(null);

  const addressQuality = useMemo(() => scoreAddress(location), [location]);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  function resetForm() {
    setStepIndex(0);
    setRecipientName("");
    setPhone("");
    setPhone2("");
    setExchange(false);
    setAllowTry(false);
    setIsFragile(false);
    setLiabilityAccepted(false);
    setContentDeclarationAccepted(false);
    setColor("");
    setSize("");
    setProductType("");
    setProductTypeOther("");
    setLocation(EMPTY_ADDRESS);
    setDeliveryMode("EXTERNAL");
    setDeliveryWindow("journee");
    setLandmarkPreview(null);
    setLandmarkName(null);
    setForceWeakAddress(false);
    setZoneName(null);
    setPrice("");
    setArticleCount("1");
    setParcelCount("1");
    setPaymentMode("espece");
    setExchangeNotes("");
    setNotes("");
    setParcelAdvancedOpen(true);
    setCreatedParcel(null);
    setRecipientLookupHint(null);
    setLookingUpRecipient(false);
    lastLookupPhoneRef.current = null;
  }

  useEffect(() => {
    if (!open) return;
    setSavedAddresses(loadAddressBook());
    setStepIndex(0);
    setCreatedParcel(null);
  }, [open]);

  useEffect(() => {
    if (!open || phone.length !== 8 || !session?.accessToken) {
      if (phone.length !== 8) {
        setRecipientLookupHint(null);
        lastLookupPhoneRef.current = null;
      }
      return;
    }
    if (lastLookupPhoneRef.current === phone) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLookingUpRecipient(true);
      void apiFetch<RecipientLookup>(
        `/parcels/recipient-by-phone/${encodeURIComponent(phone)}`,
        { token: session.accessToken },
      )
        .then((hit) => {
          if (cancelled) return;
          lastLookupPhoneRef.current = phone;
          if (!hit.found) {
            setRecipientLookupHint(null);
            return;
          }
          if (hit.name?.trim()) {
            setRecipientName((current) =>
              current.trim().length >= 2 ? current : hit.name!.trim(),
            );
          }
          const gov = hit.governorate?.trim() ?? "";
          const city = hit.city?.trim() ?? "";
          const street = hit.address?.trim() ?? "";
          if (gov && city && street) {
            setLocation({
              governorate: gov,
              city,
              locality: hit.locality?.trim() || "",
              address: street,
              lat: hit.lat ?? null,
              lng: hit.lng ?? null,
              accuracyMeters: null,
            });
            setRecipientLookupHint(
              hit.hasAccount
                ? "Client connu — adresse reprise automatiquement"
                : "Adresse déjà utilisée sur ce numéro — reprise automatiquement",
            );
            toast.info(
              "Adresse trouvée",
              hit.hasAccount
                ? "Compte client existant pour ce téléphone."
                : "Dernière livraison pour ce téléphone.",
            );
          } else if (hit.name?.trim()) {
            setRecipientLookupHint(
              "Client connu — complètez l’adresse de livraison",
            );
          } else {
            setRecipientLookupHint(null);
          }
        })
        .catch(() => {
          if (!cancelled) setRecipientLookupHint(null);
        })
        .finally(() => {
          if (!cancelled) setLookingUpRecipient(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, phone, session?.accessToken, toast]);

  useEffect(() => {
    if (!open) return;
    const fromSession = session?.user.productTypes;
    if (fromSession) {
      setSavedProductTypes(fromSession);
      return;
    }
    if (!session?.accessToken) {
      setSavedProductTypes([]);
      return;
    }
    void apiFetch<UserRow>("/users/me", { token: session.accessToken })
      .then((user) => setSavedProductTypes(user.productTypes ?? []))
      .catch(() => setSavedProductTypes([]));
  }, [open, session?.accessToken, session?.user.productTypes]);

  useEffect(() => {
    if (!location.governorate) return;
    setDeliveryMode(defaultModeForGov(location.governorate, deliveryRoutes));
  }, [location.governorate, deliveryRoutes]);

  function handleClose() {
    onClose();
    resetForm();
  }

  function startAnother() {
    resetForm();
  }

  function goHome() {
    handleClose();
    if (role) router.push(PORTAL_BY_ROLE[role]);
  }

  function printCreatedBordereau(parcel: Parcel) {
    try {
      openBordereauPdf(parcel, { includeMode: showModes });
    } catch (err) {
      toast.error(
        "Bordereau impossible",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  async function resolveZonePayload(name: string | null) {
    if (!name?.trim()) {
      return { zoneName: null as string | null, zoneId: null as number | null };
    }
    const trimmed = name.trim();
    upsertZone({ name: trimmed });
    if (USE_MOCK) return { zoneName: trimmed, zoneId: null as number | null };
    try {
      const list = await apiFetch<Zone[]>("/zones", {
        token: session?.accessToken,
      });
      const hit = list.find(
        (z) =>
          z.name.localeCompare(trimmed, "fr", { sensitivity: "base" }) === 0,
      );
      if (hit) return { zoneName: trimmed, zoneId: hit.id };
      const created = await request<Zone>("/zones", "POST", { name: trimmed });
      return { zoneName: trimmed, zoneId: created.id };
    } catch {
      return { zoneName: trimmed, zoneId: null as number | null };
    }
  }

  function applySavedAddress(entry: SavedAddress) {
    setLocation({
      governorate: entry.governorate,
      city: entry.city,
      locality: entry.locality,
      address: entry.line,
      lat: entry.lat ?? null,
      lng: entry.lng ?? null,
      accuracyMeters: null,
    });
    if (entry.contact) setRecipientName(entry.contact);
    if (entry.phone) setPhone(entry.phone);
    toast.info(`Adresse « ${entry.label} » appliquée`);
  }

  function validateStep(index: number): boolean {
    const id = STEPS[index]?.id as StepId | undefined;
    if (id === "recipient") {
      if (recipientName.trim().length < 2) {
        toast.error("Nom du destinataire requis");
        return false;
      }
      if (!/^[0-9]{8}$/.test(phone.trim())) {
        toast.error("Téléphone : 8 chiffres requis");
        return false;
      }
      if (phone2.trim() && !/^[0-9]{8}$/.test(phone2.trim())) {
        toast.error("Téléphone 2 invalide");
        return false;
      }
      return true;
    }
    if (id === "address") {
      if (!location.governorate || !location.city) {
        toast.error("Gouvernorat et ville sont requis");
        return false;
      }
      if (!location.address.trim()) {
        toast.error("Adresse / rue requise");
        return false;
      }
      if (!isSender) {
        const quality = scoreAddress(location);
        if (quality.level === "weak" && !forceWeakAddress) {
          toast.info(
            "Adresse trop vague",
            "Précisez la rue ou le GPS, ou continuez pour confirmer.",
          );
          setForceWeakAddress(true);
          return false;
        }
      }
      return true;
    }
    if (id === "parcel") {
      if (!productType) {
        toast.error("Choisissez le type de produit");
        return false;
      }
      if (productType === "Autre" && productTypeOther.trim().length < 2) {
        toast.error("Précisez le type de produit");
        return false;
      }
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        toast.error("Prix invalide");
        return false;
      }
      if (allowTry && !liabilityAccepted) {
        toast.error(
          "Acceptez la responsabilité (dommage / vol) pour l'essai produit.",
        );
        return false;
      }
      if (!contentDeclarationAccepted) {
        toast.error(
          "Acceptez la déclaration légale (contenu léger, conforme, responsabilité expéditeur).",
        );
        return false;
      }
      return true;
    }
    return true;
  }

  function goNext() {
    if (!validateStep(stepIndex)) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLast) {
      goNext();
      return;
    }
    for (let i = 0; i < STEPS.length - 1; i += 1) {
      if (!validateStep(i)) {
        setStepIndex(i);
        return;
      }
    }
    if (allowTry && !liabilityAccepted) {
      toast.error(
        "Acceptez la responsabilité (dommage / vol) pour l'essai produit.",
      );
      return;
    }
    if (!contentDeclarationAccepted) {
      toast.error(
        "Acceptez la déclaration légale (contenu léger, conforme, responsabilité expéditeur).",
      );
      return;
    }

    const designation =
      productType === "Autre" ? productTypeOther.trim() : productType;
    const street = location.address.trim();
    const address = location.locality.trim()
      ? `${location.locality.trim()}, ${street}`
      : street;
    const quality = scoreAddress(location);

    setSaving(true);
    try {
      const zonePayload = showZones
        ? await resolveZonePayload(zoneName)
        : { zoneName: null as string | null, zoneId: null as number | null };
      const created = await request<Parcel>("/parcels", "POST", {
        recipientName: recipientName.trim(),
        phone: phone.trim(),
        phone2: phone2.trim() || undefined,
        governorate: location.governorate,
        city: location.city,
        address,
        price: Number(price),
        articleCount: Number(articleCount || 1),
        designation,
        notes: notes.trim() || undefined,
        ...(showModes ? { mode: deliveryMode } : {}),
        allowOpen: allowTry,
        tryProduct: allowTry,
        isFragile,
        color: color.trim() || undefined,
        size: size.trim() || undefined,
        liabilityAcceptedAt: allowTry ? new Date().toISOString() : undefined,
        contentDeclarationAcceptedAt: new Date().toISOString(),
        isExchange: exchange,
        exchangeNotes: exchange ? exchangeNotes : undefined,
        paymentMode,
        parcelCount: Number(parcelCount || 1),
        locality: location.locality || undefined,
        lat: location.lat ?? undefined,
        lng: location.lng ?? undefined,
        deliveryWindow,
        landmarkPhotoName: landmarkName || undefined,
        addressQuality: quality.score,
        ...(showZones && zonePayload.zoneId != null
          ? { zoneId: zonePayload.zoneId }
          : showZones && zonePayload.zoneName
            ? { zoneName: zonePayload.zoneName }
            : {}),
      });

      if (productType === "Autre") {
        const nextTypes = mergeSavedProductType(
          savedProductTypes.length
            ? savedProductTypes
            : session?.user.productTypes,
          designation,
        );
        if (nextTypes) {
          try {
            await updateProfile({ productTypes: nextTypes });
            setSavedProductTypes(nextTypes);
          } catch {
            // Parcel already created — type save is best-effort.
          }
        }
      }

      setCreatedParcel(created);
      onCreated?.();
    } catch (err) {
      toast.error("Création impossible", errorText(err));
    } finally {
      setSaving(false);
    }
  }

  const windowLabel =
    DELIVERY_WINDOWS.find((w) => w.id === deliveryWindow)?.label ??
    deliveryWindow;

  if (createdParcel) {
    const codeLabel = createdParcel.code ?? `#${createdParcel.id}`;
    const priceLabel = formatMoney(Number(createdParcel.price));
    return (
      <Modal
        open={open}
        onClose={goHome}
        title="Colis créé"
        description="Votre colis est enregistré et visible dans vos listes."
        size="md"
        footer={
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              icon={Printer}
              onClick={() => printCreatedBordereau(createdParcel)}
              className="w-full sm:col-span-2"
            >
              Imprimer le bordereau
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={Plus}
              onClick={startAnother}
              className="w-full"
            >
              Ajouter un autre
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={Home}
              onClick={goHome}
              className="w-full"
            >
              Accueil
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" strokeWidth={2} />
            </span>
            <p className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ops-ink">
              {codeLabel}
            </p>
            <p className="mt-1 text-sm text-ops-ink/50">
              {statusLabelFn(createdParcel.status)}
            </p>
          </div>

          <dl className="grid gap-2.5">
            <SuccessRow label="Destinataire" value={createdParcel.recipientName} />
            <SuccessRow label="Téléphone" value={createdParcel.phone} />
            <SuccessRow
              label="Adresse"
              value={[
                createdParcel.address,
                createdParcel.city,
                createdParcel.governorate
                  ? displayGovernorate(createdParcel.governorate)
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <SuccessRow
              label="Produit"
              value={createdParcel.designation ?? "—"}
            />
            <SuccessRow label="Montant COD" value={priceLabel} />
          </dl>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nouveau colis"
      description={`Étape ${stepIndex + 1} sur ${STEPS.length} — ${step.label}`}
      size="xl"
      footer={
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between">
            {stepIndex > 0 ? (
              <Button
                type="button"
                variant="secondary"
                icon={ArrowLeft}
                onClick={goBack}
                className="w-full sm:w-auto"
              >
                Précédent
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="w-full justify-start px-2 sm:w-auto"
              >
                Annuler
              </Button>
            )}

            {isLast ? (
              <Button
                type="submit"
                form="parcel-create-form"
                icon={Plus}
                loading={saving}
                disabled={
                  !contentDeclarationAccepted ||
                  (allowTry && !liabilityAccepted)
                }
                className="w-full sm:w-auto sm:ms-auto"
              >
                Créer le colis
              </Button>
            ) : (
              <Button
                type="button"
                onClick={goNext}
                className="w-full sm:w-auto sm:ms-auto"
              >
                Suivant
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>

          {stepIndex > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="text-[12px] font-medium text-ops-ink/40 transition hover:text-ops-ink/70"
              >
                Annuler
              </button>
              <p className="text-[11px] font-semibold tabular-nums text-ops-ink/35">
                {stepIndex + 1} / {STEPS.length}
              </p>
            </div>
          ) : (
            <p className="text-end text-[11px] font-semibold tabular-nums text-ops-ink/35">
              {stepIndex + 1} / {STEPS.length}
            </p>
          )}
        </div>
      }
    >
      <div className="mb-5">
        <ol className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            const Icon = s.Icon;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (i < stepIndex) setStepIndex(i);
                    else if (i > stepIndex) {
                      for (let j = stepIndex; j < i; j += 1) {
                        if (!validateStep(j)) {
                          setStepIndex(j);
                          return;
                        }
                      }
                      setStepIndex(i);
                    }
                  }}
                  className={cn(
                    "flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition sm:flex-row sm:gap-2 sm:px-2.5 sm:py-2.5",
                    active
                      ? "bg-ops-accent/12 text-ops-accent ring-1 ring-ops-accent/35"
                      : done
                        ? "bg-ops-ink/[0.04] text-ops-ink hover:bg-ops-ink/[0.07]"
                        : "text-ops-ink/35",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      active
                        ? "bg-ops-accent text-white"
                        : done
                          ? "bg-ops-accent/20 text-ops-accent"
                          : "bg-ops-ink/[0.06] text-ops-ink/40",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
                  </span>
                  <span className="hidden text-left text-[11px] font-semibold leading-tight sm:block sm:text-xs">
                    {s.label}
                  </span>
                  <span className="sm:hidden">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-ops-ink/[0.08]">
          <div
            className="h-full rounded-full bg-ops-accent transition-all duration-300 ease-out"
            style={{
              width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <form id="parcel-create-form" onSubmit={onSubmit} className="space-y-4">
        {step.id === "recipient" ? (
          <section className="space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-ops-ink">
                Qui reçoit le colis ?
              </h3>
              <p className="mt-1 text-sm text-ops-ink/50">
                Nom et téléphone du destinataire pour la livraison.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="recipientName">Nom complet</FieldLabel>
                <input
                  id="recipientName"
                  name="recipientName"
                  required
                  autoComplete="name"
                  className={fieldClass}
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ex. Amine Ben Salah"
                />
              </div>
              <div>
                <FieldLabel htmlFor="phone">Téléphone</FieldLabel>
                <input
                  id="phone"
                  name="phone"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  placeholder="8 chiffres"
                  className={fieldClass}
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                />
                {lookingUpRecipient ? (
                  <p className="mt-1.5 text-[11px] text-ops-ink/40">
                    Recherche client / adresse…
                  </p>
                ) : null}
              </div>
              <div>
                <FieldLabel htmlFor="phone2">Téléphone 2</FieldLabel>
                <input
                  id="phone2"
                  name="phone2"
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  placeholder="Optionnel"
                  className={fieldClass}
                  value={phone2}
                  onChange={(e) =>
                    setPhone2(e.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                />
              </div>
            </div>
            {recipientLookupHint ? (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-3.5 py-2.5 text-sm text-ops-ink/75">
                {recipientLookupHint}
              </div>
            ) : null}
          </section>
        ) : null}

        {step.id === "address" ? (
          <section className="space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-ops-ink">
                Où livrer ?
              </h3>
              <p className="mt-1 text-sm text-ops-ink/50">
                {isSender
                  ? "Utilisez la carte ou Ma position pour l’adresse de livraison."
                  : "Adresse précise, créneau et repère pour le livreur."}
              </p>
              {recipientLookupHint ? (
                <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-300/80">
                  {recipientLookupHint}
                </p>
              ) : null}
            </div>

            {!isSender && savedAddresses.length > 0 ? (
              <div className="space-y-2">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ops-ink/50">
                  <BookUser className="h-3.5 w-3.5" />
                  Depuis le carnet
                </p>
                <div className="flex flex-wrap gap-2">
                  {savedAddresses.slice(0, 6).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => applySavedAddress(a)}
                      className="rounded-full border border-ops-card bg-ops-surface px-3 py-1.5 text-left text-xs font-semibold text-ops-ink transition hover:border-ops-accent/50 hover:text-ops-accent"
                    >
                      {a.label}
                      <span className="mt-0.5 block font-normal text-ops-ink/50">
                        {a.city}
                        {a.governorate
                          ? ` · ${displayGovernorate(a.governorate)}`
                          : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {showZones ? (
              <ZoneField
                value={zoneName}
                onChange={setZoneName}
                canManage
                fieldClass={fieldClass}
              />
            ) : null}
            <AddressLocationFields
              value={location}
              onChange={(next) => {
                setLocation(next);
                setForceWeakAddress(false);
              }}
              required
              fieldClass={fieldClass}
              showQuality={!isSender}
            />
            {!isSender &&
            forceWeakAddress &&
            addressQuality.level === "weak" ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                Continuez encore pour confirmer malgré une adresse faible (
                {addressQuality.score}/100).
              </p>
            ) : null}

            {!isSender ? (
              <>
                <div>
                  <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-ops-ink">
                    <Clock3 className="h-4 w-4 text-ops-accent" />
                    Créneau de livraison
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {DELIVERY_WINDOWS.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setDeliveryWindow(w.id)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-left text-sm transition",
                          deliveryWindow === w.id
                            ? "border-ops-accent bg-ops-accent/15 text-ops-accent"
                            : "border-ops-card text-ops-ink hover:border-ops-accent/40",
                        )}
                      >
                        <span className="font-semibold">{w.label}</span>
                        <span className="mt-0.5 block text-xs text-ops-ink/50">
                          {w.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor="landmarkPhoto">
                    Photo repère (optionnel)
                  </FieldLabel>
                  <label className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ops-card bg-ops-ink/[0.04] px-4 py-5 text-center transition hover:border-ops-accent/40">
                    <Camera className="h-5 w-5 text-ops-accent" />
                    <span className="text-sm font-medium text-ops-ink">
                      {landmarkName ??
                        "Ajouter une photo du lieu (façade, pharmacie…)"}
                    </span>
                    <span className="text-[11px] text-ops-ink/50">
                      Stockage local uniquement (démo front)
                    </span>
                    <input
                      id="landmarkPhoto"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setLandmarkName(file.name);
                        const reader = new FileReader();
                        reader.onload = () => {
                          setLandmarkPreview(
                            typeof reader.result === "string"
                              ? reader.result
                              : null,
                          );
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {landmarkPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={landmarkPreview}
                      alt="Repère"
                      className="mt-3 max-h-40 w-full rounded-xl object-cover"
                    />
                  ) : null}
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {step.id === "parcel" ? (
          <section className="space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-ops-ink">
                {isSender ? "Produit & prix" : "Contenu & paiement"}
              </h3>
              <p className="mt-1 text-sm text-ops-ink/50">
                {isSender
                  ? "Choisissez le type et le montant à encaisser (COD)."
                  : "Type de produit, COD et options de livraison."}
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="productType">Type de produit</FieldLabel>
              <select
                id="productType"
                name="productType"
                required
                className={fieldClass}
                value={productType}
                onChange={(e) => {
                  setProductType(e.target.value);
                  if (e.target.value !== "Autre") setProductTypeOther("");
                }}
              >
                <option value="" disabled>
                  Sélectionnez un type
                </option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {productType === "Autre" ? (
              <div>
                <FieldLabel htmlFor="productTypeOther">
                  Précisez le type
                </FieldLabel>
                <input
                  id="productTypeOther"
                  name="productTypeOther"
                  required
                  minLength={2}
                  className={fieldClass}
                  value={productTypeOther}
                  onChange={(e) => setProductTypeOther(e.target.value)}
                  placeholder="Ex. meuble, pièces auto…"
                />
                <p className="mt-1.5 text-[12px] text-ops-ink/45">
                  Ce type sera enregistré sur votre compte pour les prochains
                  colis.
                </p>
              </div>
            ) : null}

            <div>
              <FieldLabel htmlFor="price">
                {isSender ? "Montant à encaisser (COD)" : "Prix en DT"}
              </FieldLabel>
              <div className="relative">
                <input
                  id="price"
                  name="price"
                  required
                  type="number"
                  step="0.001"
                  min={0}
                  inputMode="decimal"
                  className={cn(fieldClass, "pr-14 text-lg font-semibold")}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold text-ops-ink/45">
                  DT
                </span>
              </div>
            </div>

            {isSender ? (
              <>
                <button
                  type="button"
                  onClick={() => setParcelAdvancedOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-ops-card bg-ops-page/50 px-3.5 py-3 text-left text-sm font-semibold text-ops-ink/70 transition hover:border-ops-accent/35 hover:text-ops-ink"
                >
                  Options (articles, couleur, taille, essai…)
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition",
                      parcelAdvancedOpen && "rotate-180",
                    )}
                  />
                </button>

                {parcelAdvancedOpen ? (
                  <div className="space-y-4 rounded-xl border border-ops-card bg-ops-page/40 p-3.5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor="articleCount">
                          Nombre d&apos;articles
                        </FieldLabel>
                        <input
                          id="articleCount"
                          name="articleCount"
                          type="number"
                          min={1}
                          className={fieldClass}
                          value={articleCount}
                          onChange={(e) => setArticleCount(e.target.value)}
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor="parcelCount">
                          Nombre de colis
                        </FieldLabel>
                        <input
                          id="parcelCount"
                          name="parcelCount"
                          type="number"
                          min={1}
                          className={fieldClass}
                          value={parcelCount}
                          onChange={(e) => setParcelCount(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="paymentMode">
                        Mode de paiement
                      </FieldLabel>
                      <select
                        id="paymentMode"
                        name="paymentMode"
                        className={fieldClass}
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                      >
                        <option value="espece">Espèce seulement</option>
                        <option value="cheque">Chèque seulement</option>
                        <option value="espece_ou_cheque">
                          Espèce ou chèque
                        </option>
                      </select>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor="color">Couleur</FieldLabel>
                        <input
                          id="color"
                          name="color"
                          className={fieldClass}
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          placeholder="Ex. noir, rouge…"
                          maxLength={80}
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor="size">Taille</FieldLabel>
                        <input
                          id="size"
                          name="size"
                          className={fieldClass}
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          placeholder="Ex. M, 42, unique…"
                          maxLength={80}
                        />
                      </div>
                    </div>

                    <ParcelOptionsBlock
                      allowTry={allowTry}
                      setAllowTry={setAllowTry}
                      isFragile={isFragile}
                      setIsFragile={setIsFragile}
                      liabilityAccepted={liabilityAccepted}
                      setLiabilityAccepted={setLiabilityAccepted}
                      exchange={exchange}
                      setExchange={setExchange}
                      exchangeNotes={exchangeNotes}
                      setExchangeNotes={setExchangeNotes}
                      fieldClass={fieldClass}
                    />
                  </div>
                ) : null}

                <ContentDeclarationBlock
                  accepted={contentDeclarationAccepted}
                  setAccepted={setContentDeclarationAccepted}
                />
              </>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <FieldLabel htmlFor="articleCount">
                      Nombre d&apos;articles
                    </FieldLabel>
                    <input
                      id="articleCount"
                      name="articleCount"
                      type="number"
                      min={1}
                      className={fieldClass}
                      value={articleCount}
                      onChange={(e) => setArticleCount(e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="parcelCount">
                      Nombre de colis
                    </FieldLabel>
                    <input
                      id="parcelCount"
                      name="parcelCount"
                      type="number"
                      min={1}
                      className={fieldClass}
                      value={parcelCount}
                      onChange={(e) => setParcelCount(e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="paymentMode">
                      Mode de paiement
                    </FieldLabel>
                    <select
                      id="paymentMode"
                      name="paymentMode"
                      className={fieldClass}
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      <option value="espece">Espèce seulement</option>
                      <option value="cheque">Chèque seulement</option>
                      <option value="espece_ou_cheque">
                        Espèce ou chèque
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="color">Couleur</FieldLabel>
                    <input
                      id="color"
                      name="color"
                      className={fieldClass}
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Ex. noir, rouge…"
                      maxLength={80}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="size">Taille</FieldLabel>
                    <input
                      id="size"
                      name="size"
                      className={fieldClass}
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      placeholder="Ex. M, 42, unique…"
                      maxLength={80}
                    />
                  </div>
                </div>

                {showModes ? (
                  <div>
                    <FieldLabel htmlFor="mode">Canal de livraison</FieldLabel>
                    <select
                      id="mode"
                      name="mode"
                      className={fieldClass}
                      value={deliveryMode}
                      onChange={(e) =>
                        setDeliveryMode(e.target.value as DeliveryMode)
                      }
                    >
                      <option value="EXTERNAL">
                        Navex (EXTERNAL)
                        {location.governorate &&
                        defaultModeForGov(
                          location.governorate,
                          deliveryRoutes,
                        ) === "EXTERNAL"
                          ? " — auto lieu"
                          : ""}
                      </option>
                      <option value="INTERNAL">
                        Umbrella (INTERNAL)
                        {location.governorate &&
                        defaultModeForGov(
                          location.governorate,
                          deliveryRoutes,
                        ) === "INTERNAL"
                          ? " — auto lieu"
                          : ""}
                      </option>
                    </select>
                  </div>
                ) : null}

                <ParcelOptionsBlock
                  allowTry={allowTry}
                  setAllowTry={setAllowTry}
                  isFragile={isFragile}
                  setIsFragile={setIsFragile}
                  liabilityAccepted={liabilityAccepted}
                  setLiabilityAccepted={setLiabilityAccepted}
                  exchange={exchange}
                  setExchange={setExchange}
                  exchangeNotes={exchangeNotes}
                  setExchangeNotes={setExchangeNotes}
                  fieldClass={fieldClass}
                />

                <ContentDeclarationBlock
                  accepted={contentDeclarationAccepted}
                  setAccepted={setContentDeclarationAccepted}
                />
              </>
            )}
          </section>
        ) : null}

        {step.id === "confirm" ? (
          <section className="space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-ops-ink">
                Vérifiez avant de créer
              </h3>
              <p className="mt-1 text-sm text-ops-ink/50">
                Contrôlez les infos — le colis partira en statut En attente.
              </p>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <ReviewCard title="Destinataire">
                <p className="font-semibold text-ops-ink">{recipientName}</p>
                <p className="text-ops-ink/60">{phone}</p>
                {phone2 ? (
                  <p className="text-ops-ink/45">2e : {phone2}</p>
                ) : null}
              </ReviewCard>
              <ReviewCard title="Adresse">
                <p className="font-semibold text-ops-ink">
                  {location.city}
                  {location.governorate
                    ? ` · ${displayGovernorate(location.governorate)}`
                    : ""}
                </p>
                <p className="text-ops-ink/60">
                  {[location.locality, location.address]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="mt-1 text-ops-ink/45">Créneau : {windowLabel}</p>
              </ReviewCard>
              <ReviewCard title="Colis">
                <p className="font-semibold text-ops-ink">
                  {productType === "Autre"
                    ? productTypeOther
                    : productType}
                </p>
                <p className="text-ops-ink/60">
                  {price ? formatMoney(Number(price)) : "—"} ·{" "}
                  {articleCount || 1} art. · {parcelCount || 1} colis
                </p>
                {color.trim() || size.trim() ? (
                  <p className="mt-1 text-ops-ink/45">
                    {[
                      color.trim() ? `Couleur : ${color.trim()}` : null,
                      size.trim() ? `Taille : ${size.trim()}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
                {showModes ? (
                  <p className="mt-1 text-ops-ink/45">
                    Canal : {deliveryMode === "INTERNAL" ? "Umbrella" : "Navex"}
                  </p>
                ) : null}
              </ReviewCard>
              <ReviewCard title="Options">
                <p className="text-ops-ink/70">
                  Essai : {allowTry ? "Oui" : "Non"} · Fragile :{" "}
                  {isFragile ? "Oui" : "Non"}
                </p>
                <p className="text-ops-ink/70">
                  Échange : {exchange ? "Oui" : "Non"}
                </p>
                <p className="mt-1 text-ops-ink/45">
                  Déclaration légale :{" "}
                  {contentDeclarationAccepted ? "Acceptée" : "Non acceptée"}
                </p>
                {showZones && zoneName ? (
                  <p className="mt-1 text-ops-ink/45">Zone : {zoneName}</p>
                ) : null}
              </ReviewCard>
            </dl>

            <div>
              <FieldLabel htmlFor="notes">Remarques (optionnel)</FieldLabel>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className={fieldClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instructions livreur, étage, code porte…"
              />
            </div>
          </section>
        ) : null}
      </form>
    </Modal>
  );
}

function ContentDeclarationBlock({
  accepted,
  setAccepted,
}: {
  accepted: boolean;
  setAccepted: (v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-ops-accent/30 bg-ops-accent/[0.07] p-4">
      <p className="text-sm font-semibold text-ops-ink">
        Déclaration obligatoire — législation tunisienne
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ops-ink/55">
        Je déclare que le produit est léger, autorisé à la circulation et non
        interdit par la législation tunisienne. J&apos;assume l&apos;entière
        responsabilité du contenu en tant qu&apos;expéditeur. Umbrella Express /
        la société décline toute responsabilité liée au contenu, à sa nature ou
        à sa conformité légale.
      </p>
      <label className="mt-4 flex items-start gap-3 text-sm text-ops-ink">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-ops-card accent-ops-accent"
          required
        />
        <span>
          J&apos;accepte cette déclaration : produit léger et licite, pleine
          responsabilité de l&apos;expéditeur, aucune responsabilité de la
          société.
        </span>
      </label>
    </div>
  );
}

function ParcelOptionsBlock({
  allowTry,
  setAllowTry,
  isFragile,
  setIsFragile,
  liabilityAccepted,
  setLiabilityAccepted,
  exchange,
  setExchange,
  exchangeNotes,
  setExchangeNotes,
  fieldClass,
}: {
  allowTry: boolean;
  setAllowTry: (v: boolean) => void;
  isFragile: boolean;
  setIsFragile: (v: boolean) => void;
  liabilityAccepted: boolean;
  setLiabilityAccepted: (v: boolean) => void;
  exchange: boolean;
  setExchange: (v: boolean) => void;
  exchangeNotes: string;
  setExchangeNotes: (v: string) => void;
  fieldClass: string;
}) {
  return (
    <>
      <div className="grid gap-4 rounded-xl border border-ops-card bg-ops-page/60 p-4 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ops-ink">
            Essai produit / ouvrir avant paiement
          </legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="allowOpen"
                value="Non"
                checked={!allowTry}
                onChange={() => {
                  setAllowTry(false);
                  setLiabilityAccepted(false);
                }}
              />
              Non
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="allowOpen"
                value="Oui"
                checked={allowTry}
                onChange={() => setAllowTry(true)}
              />
              Oui
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ops-ink">
            Colis fragile
          </legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="isFragile"
                value="Non"
                checked={!isFragile}
                onChange={() => setIsFragile(false)}
              />
              Non
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="isFragile"
                value="Oui"
                checked={isFragile}
                onChange={() => setIsFragile(true)}
              />
              Oui
            </label>
          </div>
          <p className="mt-2 text-xs text-ops-ink/45">
            Affiché sur le bordereau — manipulation soignée.
          </p>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ops-ink">
            Échange
          </legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="exchangeRadio"
                checked={!exchange}
                onChange={() => setExchange(false)}
              />
              Non
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="exchangeRadio"
                checked={exchange}
                onChange={() => setExchange(true)}
              />
              Oui
            </label>
          </div>
        </fieldset>
      </div>

      {allowTry ? (
        <div className="rounded-xl border border-ops-accent/25 bg-ops-accent/[0.08] p-4">
          <p className="text-sm font-semibold text-ops-ink">
            Responsabilité expéditeur — essai produit
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ops-ink/50">
            En autorisant l&apos;essai / l&apos;ouverture du colis avant
            paiement, vous acceptez que tout dommage, détérioration, perte ou
            vol survenant pendant cette phase est à votre charge.
          </p>
          <label className="mt-4 flex items-start gap-3 text-sm text-ops-ink">
            <input
              type="checkbox"
              checked={liabilityAccepted}
              onChange={(e) => setLiabilityAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-ops-card accent-ops-accent"
            />
            <span>
              Je confirme et j&apos;assume toute responsabilité en cas de
              dommage ou de vol lié à l&apos;essai du produit.
            </span>
          </label>
        </div>
      ) : null}

      {exchange ? (
        <div>
          <FieldLabel htmlFor="exchangeNotes">Articles à échanger</FieldLabel>
          <input
            id="exchangeNotes"
            name="exchangeNotes"
            className={fieldClass}
            value={exchangeNotes}
            onChange={(e) => setExchangeNotes(e.target.value)}
          />
        </div>
      ) : null}
    </>
  );
}

function ReviewCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ops-card bg-ops-page/70 px-3.5 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ops-ink/40">
        {title}
      </dt>
      <dd className="mt-1.5 space-y-0.5 text-sm">{children}</dd>
    </div>
  );
}

function SuccessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-ops-card bg-ops-page/60 px-3.5 py-2.5">
      <dt className="text-[12px] font-medium text-ops-ink/45">{label}</dt>
      <dd className="text-end text-sm font-semibold text-ops-ink">{value}</dd>
    </div>
  );
}
