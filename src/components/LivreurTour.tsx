"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Coins, MapPin, Phone, RefreshCw, Route } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useLiveReload } from "@/lib/data-refresh";
import { useAuth } from "@/lib/auth-context";
import { useStatusLabel } from "@/i18n/hooks";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";
import {
  ACTION_TONE_CLASS,
  buildActionComment,
  livreurActionsFor,
  type CancelParty,
  type LivreurAction,
} from "@/lib/livreur-actions";
import {
  buildTourByPlaces,
  flattenTourStops,
  googleMapsTourUrl,
} from "@/lib/tour-planner";
import {
  EmptyState,
  LoadingBlock,
  PageHeader,
  Panel,
} from "@/components/ui";

type TourParcel = {
  id: number;
  code: string | null;
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  governorate: string;
  status: string;
  mode: "EXTERNAL" | "INTERNAL";
  price: string | number;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const CLOSED_STATUSES = [
  "LIVRES",
  "LIVRES_PAYES",
  "RETOUR_EXPEDITEURS",
  "REMBOURSES",
  "SUPPRIME",
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function isSameLocalDay(iso: string | undefined, day: Date) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= startOfDay(day).getTime() && t <= endOfDay(day).getTime();
}

function priceNum(price: string | number) {
  const n = typeof price === "number" ? price : Number(price);
  return Number.isFinite(n) ? n : 0;
}

function formatTnd(n: number) {
  return new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n);
}

export function LivreurTour() {
  const { session } = useAuth();
  const statusLabelFn = useStatusLabel();
  const [parcels, setParcels] = useState<TourParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [tourActive, setTourActive] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pending, setPending] = useState<{
    parcel: TourParcel;
    action: LivreurAction;
  } | null>(null);
  const [comment, setComment] = useState("");
  const [cancelParty, setCancelParty] = useState<CancelParty | null>(null);

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    const data = await apiFetch<TourParcel[]>("/parcels", {
      token: session.accessToken,
    });
    setParcels(data);
  }, [session?.accessToken]);

  useEffect(() => {
    load()
      .catch((e: Error) => setMessage(e.message))
      .finally(() => setLoading(false));
  }, [load]);

  useLiveReload(() => {
    void load().catch((e: Error) => setMessage(e.message));
  }, { enabled: Boolean(session?.accessToken) });

  const today = useMemo(() => new Date(), []);

  const active = useMemo(
    () => parcels.filter((p) => !CLOSED_STATUSES.includes(p.status)),
    [parcels],
  );

  const deliveredToday = useMemo(
    () =>
      parcels.filter(
        (p) =>
          (p.status === "LIVRES" || p.status === "LIVRES_PAYES") &&
          isSameLocalDay(p.updatedAt ?? p.createdAt, today),
      ),
    [parcels, today],
  );

  const todayParcels = useMemo(() => {
    const map = new Map<number, TourParcel>();
    for (const p of active) map.set(p.id, p);
    for (const p of deliveredToday) map.set(p.id, p);
    return Array.from(map.values());
  }, [active, deliveredToday]);

  const montantAEncaisser = useMemo(
    () => active.reduce((sum, p) => sum + priceNum(p.price), 0),
    [active],
  );
  const montantLivreAujourdhui = useMemo(
    () => deliveredToday.reduce((sum, p) => sum + priceNum(p.price), 0),
    [deliveredToday],
  );

  const todayLabel = useMemo(
    () =>
      today.toLocaleDateString("fr-TN", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [today],
  );

  const places = useMemo(
    () => (tourActive ? buildTourByPlaces(active) : []),
    [tourActive, active],
  );

  const orderedStops = useMemo(() => flattenTourStops(places), [places]);

  const mapsUrl = useMemo(
    () => googleMapsTourUrl(orderedStops),
    [orderedStops],
  );

  function demandTour() {
    if (active.length === 0) {
      setMessage("Aucun colis actif à organiser");
      return;
    }
    setGenerating(true);
    setMessage(null);
    window.setTimeout(() => {
      setTourActive(true);
      const planned = buildTourByPlaces(active);
      setMessage(
        `Tournée prête · ${planned.length} lieu(x) · ${active.length} stop(s)`,
      );
      setGenerating(false);
    }, 450);
  }

  function clearTour() {
    setTourActive(false);
    setMessage("Tournée réinitialisée — liste simple");
  }

  async function applyStatus(
    parcelId: number,
    status: string,
    note?: string,
  ) {
    if (!session?.accessToken) return;
    setBusyId(parcelId);
    setMessage(null);
    try {
      await apiFetch(`/parcels/${parcelId}/status`, {
        method: "PATCH",
        token: session.accessToken,
        body: JSON.stringify({
          status,
          comment: note || undefined,
          actor: "LIVREUR",
        }),
      });
      setMessage("Statut mis à jour");
      setPending(null);
      setComment("");
      setCancelParty(null);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  function onAction(parcel: TourParcel, action: LivreurAction) {
    if (action.needsComment || action.cancelPartyChoices?.length) {
      setPending({ parcel, action });
      setComment("");
      setCancelParty(null);
      return;
    }
    void applyStatus(parcel.id, action.status);
  }

  function onConfirmComment(e: FormEvent) {
    e.preventDefault();
    if (!pending) return;
    const choices = pending.action.cancelPartyChoices;
    if (choices?.length && !cancelParty) {
      setMessage("Choisissez Client ou Expéditeur");
      return;
    }
    if (!choices?.length && pending.action.needsComment && !comment.trim()) {
      setMessage("Un commentaire est requis pour cette action");
      return;
    }
    const note = buildActionComment(pending.action, comment, cancelParty);
    if (!note.trim()) {
      setMessage("Indiquez qui a annulé (client ou expéditeur)");
      return;
    }
    void applyStatus(pending.parcel.id, pending.action.status, note);
  }

  function renderParcelCard(
    p: TourParcel,
    stopIndex?: number,
  ) {
    const actions = livreurActionsFor(p.status);
    const busy = busyId === p.id;

    return (
      <article className="rounded-2xl border border-cream bg-surface p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            {stopIndex != null ? (
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-brand">
                Stop {stopIndex}
              </p>
            ) : null}
            <p className="font-mono text-xs font-semibold text-brand keep-ltr">
              {p.code}
            </p>
            <h2 className="mt-0.5 font-display text-lg font-bold text-ink">
              {p.recipientName}
            </h2>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-muted">
              <MapPin className="h-3.5 w-3.5" />
              {p.city} · {p.governorate}
            </p>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{
              backgroundColor:
                STATUS_META[p.status as StatusKey]?.color ??
                "var(--color-surface-2)",
              color: STATUS_META[p.status as StatusKey]?.ink ?? "#1A1414",
            }}
          >
            {statusLabelFn(p.status)}
          </span>
        </div>

        <p className="mt-3 text-sm text-ink-muted">{p.address}</p>
        <p className="mt-1 font-semibold text-ink">{p.price} TND COD</p>

        <div className="mt-3 flex gap-2">
          <a
            href={`tel:${p.phone}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-cream py-2.5 text-sm font-semibold text-ink"
          >
            <Phone className="h-4 w-4" aria-hidden />
            Appeler
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${p.address} ${p.city} Tunisie`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-cream py-2.5 text-sm font-semibold text-ink"
          >
            <MapPin className="h-4 w-4" aria-hidden />
            GPS
          </a>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={busy}
              onClick={() => onAction(p, action)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-50 ${ACTION_TONE_CLASS[action.tone]}`}
            >
              <span aria-hidden>{action.emoji}</span>
              {action.label}
            </button>
          ))}
        </div>
      </article>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-10">
      <PageHeader
        title="Aujourd’hui"
        description={`Tournée du ${todayLabel} — colis et montant COD`}
        actions={
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load()
                .catch((e: Error) => setMessage(e.message))
                .finally(() => setLoading(false));
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cream px-3 py-2 text-sm font-semibold text-ink"
          >
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </button>
        }
      />

      <Panel className="space-y-4 border-brand/20 bg-gradient-to-br from-brand/[0.06] to-surface">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand/15 text-brand">
            <Coins className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold text-ink">
              Colis du jour
            </p>
            <p className="text-sm text-ink-muted">
              {todayParcels.length} colis · montant à encaisser{" "}
              <span className="font-semibold text-ink">
                {formatTnd(montantAEncaisser)} TND
              </span>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-cream bg-surface px-2 py-3 text-center">
            <p className="font-display text-xl font-bold text-ink">
              {active.length}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-ink-muted">
              À livrer
            </p>
          </div>
          <div className="rounded-xl border border-cream bg-surface px-2 py-3 text-center">
            <p className="font-display text-xl font-bold text-brand">
              {formatTnd(montantAEncaisser)}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-ink-muted">
              Montant COD
            </p>
          </div>
          <div className="rounded-xl border border-cream bg-surface px-2 py-3 text-center">
            <p className="font-display text-xl font-bold text-ink">
              {deliveredToday.length}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-ink-muted">
              Livrés
            </p>
          </div>
        </div>
        {deliveredToday.length > 0 ? (
          <p className="text-xs text-ink-muted">
            Encaissé aujourd’hui :{" "}
            <span className="font-semibold text-ink">
              {formatTnd(montantLivreAujourdhui)} TND
            </span>
          </p>
        ) : null}
      </Panel>

      <Panel className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-xl">
            🛵
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold text-ink">
              Tournée intelligente
            </p>
            <p className="text-sm text-ink-muted">
              Regroupe vos colis du jour par ville / gouvernorat.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={generating || active.length === 0}
            onClick={demandTour}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
          >
            <Route className="h-4 w-4" />
            {generating ? "Organisation…" : "Demander une tournée"}
          </button>
          {tourActive ? (
            <button
              type="button"
              onClick={clearTour}
              className="rounded-xl border border-cream px-4 py-3 text-sm font-semibold text-ink"
            >
              Liste simple
            </button>
          ) : null}
        </div>
        {tourActive && mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cream bg-cream-soft/50 px-4 py-2.5 text-sm font-semibold text-ink"
          >
            <MapPin className="h-4 w-4" aria-hidden />
            Ouvrir l&apos;itinéraire GPS ({orderedStops.length} stops)
          </a>
        ) : null}
      </Panel>

      {message ? (
        <p className="rounded-xl border border-cream bg-surface px-4 py-2 text-sm font-medium text-ink">
          {message}
        </p>
      ) : null}

      {loading ? <LoadingBlock rows={3} label="Chargement tournée…" /> : null}

      {!loading && todayParcels.length === 0 ? (
        <EmptyState
          title="Aucun colis aujourd’hui"
          description="Dès qu’un colis vous est assigné, il apparaît ici avec le montant COD."
          action={
            <Link
              href="/livreur/parcels"
              className="text-sm font-semibold text-brand"
            >
              Voir tous les colis
            </Link>
          }
        />
      ) : null}

      {!loading && tourActive && places.length > 0 ? (
        <div className="space-y-6">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            À livrer aujourd’hui
          </h2>
          {places.map((place, placeIndex) => {
            const baseIndex = places
              .slice(0, placeIndex)
              .reduce((sum, p) => sum + p.stops.length, 0);
            return (
              <section key={place.placeKey} className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-brand px-4 py-3 text-white">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                    {placeIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">📍 {place.placeLabel}</p>
                    <p className="text-xs text-white/80">
                      {place.stops.length} stop
                      {place.stops.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {place.stops.map((p, i) => (
                    <li key={p.id}>
                      {renderParcelCard(p, baseIndex + i + 1)}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : null}

      {!loading && !tourActive && active.length > 0 ? (
        <section className="space-y-3">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            À livrer aujourd’hui · {formatTnd(montantAEncaisser)} TND
          </h2>
          <ul className="space-y-4">
            {active.map((p) => (
              <li key={p.id}>{renderParcelCard(p)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && deliveredToday.length > 0 ? (
        <section className="space-y-3">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Livrés aujourd’hui · {formatTnd(montantLivreAujourdhui)} TND
          </h2>
          <ul className="space-y-3">
            {deliveredToday.map((p) => (
              <li key={`done-${p.id}`}>{renderParcelCard(p)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <form
            onSubmit={onConfirmComment}
            className="w-full max-w-md rounded-2xl border border-cream bg-surface p-5 shadow-soft"
          >
            <p className="font-display text-lg font-bold text-ink">
              <span aria-hidden className="mr-1.5">
                {pending.action.emoji}
              </span>
              {pending.action.label}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {pending.parcel.code} · {pending.parcel.recipientName}
            </p>
            {pending.action.cancelPartyChoices?.length ? (
              <fieldset className="mt-4">
                <legend className="text-sm font-medium text-ink">
                  Annulée par <span className="text-brand">*</span>
                </legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {pending.action.cancelPartyChoices.map((opt) => {
                    const active = cancelParty === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCancelParty(opt.id)}
                        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                          active
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-cream bg-surface text-ink hover:border-brand/40"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
            <label className="mt-4 block text-sm font-medium text-ink">
              {pending.action.commentLabel ?? "Commentaire"}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                required={!pending.action.cancelPartyChoices?.length}
                className="mt-1.5 w-full rounded-xl border border-cream px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
                placeholder={
                  pending.action.cancelPartyChoices?.length
                    ? "Ex. client refuse, expéditeur a annulé la commande…"
                    : "Ex. report demain 10h, numéro erroné…"
                }
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPending(null);
                  setComment("");
                  setCancelParty(null);
                }}
                className="flex-1 rounded-xl border border-cream py-2.5 text-sm font-semibold text-ink"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={
                  busyId === pending.parcel.id ||
                  Boolean(
                    pending.action.cancelPartyChoices?.length && !cancelParty,
                  )
                }
                className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Confirmer
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <Link
        href="/livreur/parcels"
        className="block text-center text-sm font-semibold text-brand"
      >
        Liste complète (table) →
      </Link>
    </div>
  );
}
