"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowLeftRight,
  Camera,
  CheckCircle2,
  Circle,
  Clock3,
  History,
  MapPin,
  MessageSquare,
  MessageSquareWarning,
  Phone,
  PhoneCall,
  Printer,
  Route,
  Truck,
  User,
  UserRound,
  Warehouse,
} from "lucide-react";
import { errorText, useConfirm, useToast } from "@/components/Feedback";
import {
  Badge,
  Button,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Panel,
  StatusBadge,
  buttonClass,
} from "@/components/ui";
import { DELIVERY_WINDOWS } from "@/lib/delivery-windows";
import {
  formatTnd,
  type DeliveryMode,
  type Parcel,
  type TimelineEntry,
} from "@/lib/domain";
import { mapsNavigateUrl } from "@/lib/geolocation";
import {
  buildParcours,
  dispatchLabel,
  isDispatched,
  lastTimelineActor,
} from "@/lib/parcel-parcours";
import {
  canSeeDeliveryMode,
  canSwitchDeliveryMode,
  type AppRole,
} from "@/lib/roles";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";
import { useAuth } from "@/lib/auth-context";
import { useApi, useApiQuery } from "@/lib/use-api";
import { cn } from "@/lib/cn";

const SENDER_EDITABLE = ["EN_ATTENTE", "NON_SERIEUX"];

function modeLabel(mode: DeliveryMode) {
  return mode === "EXTERNAL" ? "Navex" : "Umbrella";
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ops-ink/50">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-ops-ink">{children}</dd>
    </div>
  );
}

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

function sortedTimeline(entries: TimelineEntry[] | undefined, createdAt: string) {
  if (!entries?.length) {
    return [{ at: createdAt, label: "Colis créé" } satisfies TimelineEntry];
  }
  return [...entries].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

function roleCanSeeOps(role: AppRole | undefined): boolean {
  if (!role) return false;
  return (
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "CHEF_AGENCE" ||
    role === "MAGASINIER" ||
    role === "PICKUP" ||
    role === "SUPPORT" ||
    role === "LIVREUR" ||
    role === "EXPEDITEUR"
  );
}

function OpsCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "ok" | "warn" | "accent";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3",
        tone === "ok" && "border-emerald-500/30 bg-emerald-500/10",
        tone === "warn" && "border-amber-500/30 bg-amber-500/10",
        tone === "accent" && "border-ops-accent/30 bg-ops-accent/10",
        tone === "neutral" && "border-ops-card bg-ops-page/50",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ops-ink/45">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-ops-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-ops-ink/45">{hint}</p> : null}
    </div>
  );
}

export function ParcelDetailView({
  parcelId,
  backHref,
  portalBase,
}: {
  parcelId: string;
  backHref: string;
  portalBase: string;
}) {
  const { session } = useAuth();
  const role = session?.user.role;
  const showModes = canSeeDeliveryMode(role);
  const showOps = roleCanSeeOps(role);
  const request = useApi();
  const toast = useToast();
  const confirm = useConfirm();
  const [switching, setSwitching] = useState(false);
  const { data: parcel, error, loading, reload } = useApiQuery<Parcel>(
    `/parcels/${parcelId}`,
  );

  // Refresh when returning from scanner so parcours / history stay in sync.
  useEffect(() => {
    function onFocus() {
      void reload();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void reload();
    });
    return () => window.removeEventListener("focus", onFocus);
  }, [reload]);

  const canSwitch =
    !!parcel &&
    canSwitchDeliveryMode(role) &&
    parcel.status !== "SUPPRIME" &&
    (role !== "EXPEDITEUR" || SENDER_EDITABLE.includes(parcel.status));

  async function onSwitchMode() {
    if (!parcel || !canSwitch) return;
    const next: DeliveryMode =
      parcel.mode === "EXTERNAL" ? "INTERNAL" : "EXTERNAL";
    const ok = await confirm({
      title: `Basculer vers ${modeLabel(next)} ?`,
      description:
        next === "EXTERNAL"
          ? "Le colis passera sur Navex (EXTERNAL). Un livreur Umbrella assigné sera retiré."
          : "Le colis restera en livraison Umbrella (INTERNAL).",
      confirmLabel: `Passer en ${modeLabel(next)}`,
    });
    if (!ok) return;
    setSwitching(true);
    try {
      await request(`/parcels/${parcel.id}/mode`, "PATCH", { mode: next });
      toast.success(`Canal : ${modeLabel(next)}`);
      await reload();
    } catch (err) {
      toast.error("Basculement impossible", errorText(err));
    } finally {
      setSwitching(false);
    }
  }

  if (loading && !parcel) return <LoadingBlock rows={3} label="Chargement du colis…" />;
  if (error || !parcel) {
    return (
      <EmptyState
        title="Colis introuvable"
        description={error ?? "Ce colis n'existe pas ou n'est pas accessible."}
        action={
          <Link href={backHref} className={buttonClass("secondary")}>
            Retour à la liste
          </Link>
        }
      />
    );
  }

  const parcours = buildParcours(parcel.status);
  const dispatched = isDispatched(parcel);
  const timeline = sortedTimeline(parcel.timeline, parcel.createdAt);
  const lastActor = lastTimelineActor(parcel.timeline);
  const slot = DELIVERY_WINDOWS.find((w) => w.id === parcel.deliveryWindow);
  const hasGps = parcel.lat != null && parcel.lng != null;
  const statusMeta = STATUS_META[parcel.status as StatusKey];
  const messagePeerId =
    role === "LIVREUR"
      ? (parcel.recipientUserId ?? null)
      : role === "CLIENT" || role === "EXPEDITEUR"
        ? (parcel.driverId ?? null)
        : (parcel.driverId ?? parcel.senderId);
  const messagesHref =
    messagePeerId != null
      ? `${portalBase}/messages?peer=${messagePeerId}&parcel=${parcel.id}`
      : `${portalBase}/messages`;
  const callHref =
    messagePeerId != null
      ? `${messagesHref}&call=1`
      : messagesHref;
  const canChatPeer =
    role === "LIVREUR" || role === "CLIENT"
      ? messagePeerId != null
      : true;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Colis"
        title={parcel.code ?? `#${parcel.id}`}
        description={`${parcel.recipientName} · ${parcel.city}, ${parcel.governorate}`}
        actions={
          <>
            <Link href={backHref} className={buttonClass("secondary")}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Retour
            </Link>
            {role !== "CLIENT" ? (
              <Link href={`${portalBase}/tickets`} className={buttonClass("secondary")}>
                <MessageSquareWarning className="h-4 w-4" aria-hidden />
                Signaler
              </Link>
            ) : null}
            <Link href={`${portalBase}/bordereau?id=${parcel.id}`} className={buttonClass("primary")}>
              <Printer className="h-4 w-4" aria-hidden />
              Bordereau
            </Link>
          </>
        }
      />

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={parcel.status} />
            {showModes ? (
              <Badge tone={parcel.mode === "EXTERNAL" ? "info" : "success"}>
                {modeLabel(parcel.mode)} ({parcel.mode})
              </Badge>
            ) : null}
            {canSwitch ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={ArrowLeftRight}
                disabled={switching}
                onClick={() => void onSwitchMode()}
              >
                {parcel.mode === "EXTERNAL"
                  ? "Basculer Umbrella"
                  : "Basculer Navex"}
              </Button>
            ) : null}
            {dispatched ? (
              <Badge tone="success">Dispatché</Badge>
            ) : (
              <Badge tone="warning">Non dispatché</Badge>
            )}
            {parcel.tryProduct ? <Badge tone="warning">Essai produit</Badge> : null}
            {parcel.isExchange ? <Badge tone="gold">Échange</Badge> : null}
          </div>
          <p className="font-display text-2xl font-extrabold text-ops-accent">
            {formatTnd(parcel.price)}
          </p>
        </div>

        {showOps ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <OpsCard
              label="Statut"
              value={statusMeta?.label ?? parcel.status}
              hint={parcel.updatedAt ? `Maj ${formatWhen(parcel.updatedAt)}` : undefined}
              tone="accent"
            />
            <OpsCard
              label="Dispatch"
              value={dispatchLabel(parcel)}
              hint={
                parcel.driver?.name
                  ? `Livreur : ${parcel.driver.name}`
                  : "Aucun livreur assigné"
              }
              tone={dispatched ? "ok" : "warn"}
            />
            <OpsCard
              label="Livreur"
              value={parcel.driver?.name ?? "—"}
              hint={parcel.driver?.phone ?? parcel.zone?.name ?? "Non assigné"}
              tone={parcel.driver?.name ? "ok" : "neutral"}
            />
            <OpsCard
              label="Prochaine étape"
              value={parcours.nextLabel ?? "Cycle terminé"}
              hint={lastActor ? `Dernier scan : ${lastActor}` : "Aucun scan encore"}
              tone={parcours.nextLabel ? "warn" : "ok"}
            />
          </div>
        ) : null}

        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2">
            <Route className="h-4 w-4 text-ops-accent" aria-hidden />
            <h2 className="text-sm font-bold text-ops-ink">{parcours.label}</h2>
          </div>
          <ol className="space-y-1.5">
            {parcours.steps.map((step, i) => (
              <li
                key={step.key}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
                  step.current && "border-ops-accent/40 bg-ops-accent/10 font-semibold",
                  step.done && "border-ops-card bg-ops-page/40 text-ops-ink/50",
                  step.upcoming && "border-ops-card bg-transparent text-ops-ink/55",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    step.current && "bg-ops-accent text-white",
                    step.done && "bg-emerald-500/25 text-emerald-200",
                    step.upcoming && "bg-ops-card text-ops-ink/45",
                  )}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                  ) : step.current ? (
                    i + 1
                  ) : (
                    <Circle className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">{step.label}</span>
                {step.current ? (
                  <span className="text-[11px] font-semibold text-ops-accent">
                    Actuel
                  </span>
                ) : null}
                {step.done ? (
                  <span className="text-[11px] text-emerald-200/80">Fait</span>
                ) : null}
              </li>
            ))}
          </ol>
          {(parcel.status === "EN_ATTENTE" || parcel.status === "A_ENLEVER") &&
          parcours.kind === "LIVRAISON" ? (
            <p className="mt-3 text-xs text-ops-ink/45">
              En attente de collecte — le premier scan passera à «{" "}
              {parcours.nextLabel} ».
            </p>
          ) : null}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel>
            <h2 className="font-display text-lg font-bold text-ops-ink">
              Destinataire & adresse
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="Destinataire">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4 text-ops-ink/50" aria-hidden />
                  {parcel.recipientName}
                </span>
              </Detail>
              <Detail label="Téléphone">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`tel:${parcel.phone}`}
                    className="inline-flex items-center gap-1.5 text-ops-accent hover:underline"
                  >
                    <Phone className="h-4 w-4" aria-hidden />
                    {parcel.phone}
                  </a>
                  {parcel.phone2 ? (
                    <span className="text-ops-ink/50">/ {parcel.phone2}</span>
                  ) : null}
                </div>
                {canChatPeer ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={messagesHref}
                      className={buttonClass("secondary")}
                    >
                      <MessageSquare className="h-4 w-4" aria-hidden />
                      {role === "LIVREUR"
                        ? "Message client"
                        : role === "CLIENT"
                          ? "Message livreur"
                          : "Message Umbrella"}
                    </Link>
                    {messagePeerId != null ? (
                      <Link
                        href={callHref}
                        className={buttonClass("secondary")}
                      >
                        <PhoneCall className="h-4 w-4" aria-hidden />
                        {role === "LIVREUR"
                          ? "Appel client"
                          : role === "CLIENT"
                            ? "Appel livreur"
                            : "Appel Umbrella"}
                      </Link>
                    ) : null}
                  </div>
                ) : role === "LIVREUR" ? (
                  <p className="mt-2 text-xs text-ops-ink/45">
                    Pas de compte client Umbrella pour ce numéro — utilisez
                    l’appel téléphonique.
                  </p>
                ) : role === "CLIENT" && !parcel.driverId ? (
                  <p className="mt-2 text-xs text-ops-ink/45">
                    Aucun livreur assigné pour le moment.
                  </p>
                ) : null}
              </Detail>
              <Detail label="Adresse">
                <span className="inline-flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ops-ink/50" aria-hidden />
                  <span>
                    {parcel.address}
                    <br />
                    <span className="text-ops-ink/50">
                      {parcel.city}, {parcel.governorate}
                    </span>
                  </span>
                </span>
              </Detail>
              <Detail label="Localisation GPS">
                {hasGps ? (
                  <a
                    href={mapsNavigateUrl({
                      destLat: parcel.lat,
                      destLng: parcel.lng,
                      destLabel: `${parcel.address}, ${parcel.city}, Tunisie`,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ops-accent hover:underline"
                  >
                    {parcel.lat?.toFixed(5)}, {parcel.lng?.toFixed(5)}
                  </a>
                ) : (
                  <span className="text-ops-ink/50">Non renseignée</span>
                )}
              </Detail>
              <Detail label="Créneau">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4 text-ops-ink/50" aria-hidden />
                  {slot ? `${slot.label} (${slot.hint})` : "Toute la journée"}
                </span>
              </Detail>
              <Detail label="Photo repère">
                <span className="inline-flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-ops-ink/50" aria-hidden />
                  {parcel.landmarkPhotoName ?? "—"}
                </span>
              </Detail>
            </dl>
          </Panel>

          <Panel>
            <h2 className="font-display text-lg font-bold text-ops-ink">
              Colis & livraison
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <Detail label="Désignation">{parcel.designation ?? "—"}</Detail>
              <Detail label="Articles">{parcel.articleCount ?? 1}</Detail>
              <Detail label="Paiement">{parcel.paymentMode ?? "espèce"}</Detail>
              <Detail label="Livreur">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-ops-ink/50" aria-hidden />
                  {parcel.driver?.name ?? "Non assigné"}
                </span>
                {parcel.driver?.phone ? (
                  <span className="mt-0.5 block text-xs text-ops-ink/45">
                    {parcel.driver.phone}
                  </span>
                ) : null}
              </Detail>
              <Detail label="Zone">{parcel.zone?.name ?? "—"}</Detail>
              {showOps ? (
                <Detail label="Agence">
                  <span className="inline-flex items-center gap-1.5">
                    <Warehouse className="h-4 w-4 text-ops-ink/50" aria-hidden />
                    {parcel.agency?.name ?? "—"}
                  </span>
                </Detail>
              ) : null}
              {showOps && role !== "CLIENT" ? (
                <Detail label="Expéditeur">
                  {parcel.sender?.name ?? "—"}
                  {parcel.sender?.phone ? (
                    <span className="mt-0.5 block text-xs text-ops-ink/45">
                      {parcel.sender.phone}
                    </span>
                  ) : null}
                </Detail>
              ) : null}
              <Detail label="Créé le">
                {new Date(parcel.createdAt).toLocaleString("fr-TN")}
              </Detail>
              {parcel.updatedAt ? (
                <Detail label="Dernière MAJ">
                  {new Date(parcel.updatedAt).toLocaleString("fr-TN")}
                </Detail>
              ) : null}
            </dl>
            {parcel.notes ? (
              <p className="mt-4 rounded-xl bg-ops-ink/[0.05] px-4 py-3 text-sm text-ops-ink">
                {parcel.notes}
              </p>
            ) : null}
            {parcel.isExchange && parcel.exchangeNotes ? (
              <p className="mt-3 text-sm text-ops-ink/50">
                Échange : {parcel.exchangeNotes}
              </p>
            ) : null}
          </Panel>
        </div>

        <Panel>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-ops-accent" aria-hidden />
            <h2 className="font-display text-lg font-bold text-ops-ink">
              Historique détaillé
            </h2>
          </div>
          <p className="mt-1 text-xs text-ops-ink/40">
            {timeline.length} événement{timeline.length === 1 ? "" : "s"}
          </p>
          <ol className="relative mt-5 space-y-4 border-l border-ops-card pl-5">
            {timeline.map((ev, i) => {
              const meta = ev.status
                ? STATUS_META[ev.status as StatusKey]
                : null;
              return (
                <li key={`${ev.at}-${i}`} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-ops-surface",
                      i === 0 ? "bg-ops-accent" : "bg-ops-card",
                    )}
                    aria-hidden
                  />
                  <div className="rounded-xl border border-ops-card bg-ops-page/40 px-3 py-2.5">
                    <p className="text-sm font-semibold text-ops-ink">{ev.label}</p>
                    <p className="mt-1 text-[11px] text-ops-ink/45">
                      {formatWhen(ev.at)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-ops-ink/50">
                      {ev.actor ? (
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="h-3 w-3" aria-hidden />
                          {ev.actor}
                        </span>
                      ) : null}
                      {meta ? (
                        <span
                          className="rounded px-1.5 py-0.5 font-semibold"
                          style={{
                            background: meta.color,
                            color: meta.ink ?? "#fff",
                          }}
                        >
                          {meta.label}
                        </span>
                      ) : null}
                    </div>
                    {ev.comment && !ev.label.includes(ev.comment) ? (
                      <p className="mt-1.5 text-[12px] text-ops-ink/55">
                        {ev.comment}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
