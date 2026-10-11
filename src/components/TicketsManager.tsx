"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, LifeBuoy, Plus, XCircle } from "lucide-react";
import { errorText, useToast } from "@/components/Feedback";
import { Modal } from "@/components/Modal";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchInput,
  SegmentedTabs,
  SelectField,
  TableCard,
  TextAreaField,
  TextField,
  tableClass,
  tdClass,
  theadClass,
  thClass,
  trClass,
  type BadgeTone,
} from "@/components/ui";
import {
  canOpenParcelTicket,
  formatTnd,
  TICKET_KIND_LABEL,
  type Parcel,
  type Ticket,
  type TicketKind,
  type TicketStatus,
} from "@/lib/domain";
import { SortableTh, useTableSort } from "@/lib/table-sort";
import { useApi, useApiQuery } from "@/lib/use-api";

type TicketSortKey = "title" | "parcel" | "status" | "createdAt";

const STATUS_LABEL: Record<TicketStatus, string> = {
  EN_COURS: "En cours",
  RESOLU: "Résolu",
  FERME: "Fermé",
};

const STATUS_TONE: Record<TicketStatus, BadgeTone> = {
  EN_COURS: "warning",
  RESOLU: "success",
  FERME: "neutral",
};

const KIND_TONE: Record<TicketKind, BadgeTone> = {
  GENERAL: "neutral",
  CHANGEMENT_PRIX: "gold",
  RELANCE: "info",
};

const TICKET_SORT = {
  title: (t: Ticket) => t.title,
  parcel: (t: Ticket) => t.parcel?.code ?? "",
  status: (t: Ticket) => STATUS_LABEL[t.status],
  createdAt: (t: Ticket) => t.createdAt,
} as const;

type Filter = "ALL" | TicketStatus;

export function TicketsManager({
  canCreate = true,
  canResolve = false,
  allowParcelKinds = false,
  defaultParcelId,
}: {
  canCreate?: boolean;
  canResolve?: boolean;
  /** Expéditeur / support / admin — changement prix & relance. */
  allowParcelKinds?: boolean;
  defaultParcelId?: number;
}) {
  const request = useApi();
  const toast = useToast();
  const { data, error, loading, reload } = useApiQuery<Ticket[]>("/tickets");
  const { data: parcelData } = useApiQuery<Parcel[]>(canCreate ? "/parcels" : null);
  const tickets = useMemo(() => data ?? [], [data]);
  const parcels = useMemo(() => parcelData ?? [], [parcelData]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(Boolean(defaultParcelId));
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [kind, setKind] = useState<TicketKind>(
    allowParcelKinds && defaultParcelId ? "RELANCE" : "GENERAL",
  );
  const [parcelId, setParcelId] = useState(
    defaultParcelId ? String(defaultParcelId) : "",
  );

  const eligibleParcels = useMemo(() => {
    if (!allowParcelKinds || kind === "GENERAL") return parcels;
    return parcels.filter((p) => canOpenParcelTicket(p));
  }, [parcels, allowParcelKinds, kind]);

  const counts = useMemo(
    () => ({
      ALL: tickets.length,
      EN_COURS: tickets.filter((t) => t.status === "EN_COURS").length,
      RESOLU: tickets.filter((t) => t.status === "RESOLU").length,
      FERME: tickets.filter((t) => t.status === "FERME").length,
    }),
    [tickets],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter(
      (t) =>
        (filter === "ALL" || t.status === filter) &&
        (!q ||
          [
            t.title,
            t.description,
            t.kind,
            TICKET_KIND_LABEL[t.kind ?? "GENERAL"],
            t.parcel?.code,
            t.createdBy?.name,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  }, [tickets, filter, query]);

  const { sorted: visible, sortKey, sortDir, toggleSort } = useTableSort<
    Ticket,
    TicketSortKey
  >(filtered, TICKET_SORT, "createdAt", "desc");

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const selectedParcelId = Number(form.get("parcelId") || parcelId);
    const requestedPriceRaw = String(form.get("requestedPrice") ?? "").trim();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        kind,
        description: String(form.get("description") ?? "").trim() || undefined,
        parcelId: selectedParcelId || undefined,
      };
      if (kind === "GENERAL") {
        body.title = String(form.get("title") ?? "").trim();
      } else {
        const customTitle = String(form.get("title") ?? "").trim();
        if (customTitle) body.title = customTitle;
        if (!selectedParcelId) {
          throw new Error("Sélectionnez un colis");
        }
      }
      if (kind === "CHANGEMENT_PRIX") {
        const price = Number(requestedPriceRaw.replace(",", "."));
        if (!(price > 0)) throw new Error("Nouveau prix invalide");
        body.requestedPrice = price;
      }
      const ticket = await request<Ticket>("/tickets", "POST", body);
      setCreating(false);
      setKind("GENERAL");
      setParcelId("");
      toast.success("Ticket ouvert", `#${ticket.id} · ${ticket.title}`);
      await reload();
    } catch (err) {
      toast.error("Ticket non créé", errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(ticket: Ticket, status: TicketStatus) {
    setBusyId(ticket.id);
    try {
      await request(`/tickets/${ticket.id}/status`, "PATCH", { status });
      const extra =
        status === "RESOLU" && ticket.kind === "CHANGEMENT_PRIX"
          ? " · prix appliqué"
          : "";
      toast.success(
        `Ticket #${ticket.id} ${STATUS_LABEL[status].toLowerCase()}${extra}`,
      );
      setSelected(null);
      await reload();
    } catch (err) {
      toast.error("Mise à jour impossible", errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  function actions(ticket: Ticket) {
    const busy = busyId === ticket.id;
    return (
      <div className="flex flex-wrap justify-end gap-2">
        {canResolve && ticket.status === "EN_COURS" ? (
          <Button
            size="sm"
            variant="success"
            icon={CheckCircle2}
            loading={busy}
            onClick={() => void setStatus(ticket, "RESOLU")}
          >
            {ticket.kind === "CHANGEMENT_PRIX" ? "Résoudre & appliquer" : "Résoudre"}
          </Button>
        ) : null}
        {ticket.status !== "FERME" ? (
          <Button
            size="sm"
            variant="secondary"
            icon={XCircle}
            disabled={busy}
            onClick={() => void setStatus(ticket, "FERME")}
          >
            Fermer
          </Button>
        ) : null}
      </div>
    );
  }

  const ticketKind = (t: Ticket): TicketKind => t.kind ?? "GENERAL";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Support"
        description={
          allowParcelKinds
            ? "Relance et changement de prix après sortie expéditeur, jusqu’au virement."
            : `${counts.EN_COURS} ticket(s) en cours · ${tickets.length} au total`
        }
        actions={
          canCreate ? (
            <Button icon={Plus} onClick={() => setCreating(true)}>
              Nouveau ticket
            </Button>
          ) : undefined
        }
      />

      {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}

      <TableCard
        toolbar={
          <>
            <SegmentedTabs<Filter>
              label="Filtrer par statut"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "ALL", label: "Tous", count: counts.ALL },
                { value: "EN_COURS", label: "En cours", count: counts.EN_COURS },
                { value: "RESOLU", label: "Résolus", count: counts.RESOLU },
                { value: "FERME", label: "Fermés", count: counts.FERME },
              ]}
            />
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Sujet, type, colis…"
              className="w-full md:w-64"
            />
          </>
        }
      >
        {loading && tickets.length === 0 ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-ops-ink/[0.06]" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={LifeBuoy}
              title="Aucun ticket"
              description={
                query || filter !== "ALL"
                  ? "Aucun ticket ne correspond à ce filtre."
                  : "Ouvrez un ticket si un colis pose problème."
              }
            />
          </div>
        ) : (
          <table className={tableClass}>
            <thead className={theadClass}>
              <tr>
                <SortableTh
                  label="Ticket"
                  column="title"
                  activeKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableTh
                  label="Colis"
                  column="parcel"
                  activeKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableTh
                  label="Statut"
                  column="status"
                  activeKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableTh
                  label="Ouvert le"
                  column="createdAt"
                  activeKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="hidden md:table-cell"
                />
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id} className={trClass}>
                  <td className={tdClass}>
                    <button
                      type="button"
                      onClick={() => setSelected(t)}
                      className="text-left"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={KIND_TONE[ticketKind(t)]} className="text-[10px]">
                          {TICKET_KIND_LABEL[ticketKind(t)]}
                        </Badge>
                        <p className="font-semibold text-ops-ink hover:text-ops-accent">
                          #{t.id} · {t.title}
                        </p>
                      </div>
                      {t.requestedPrice != null ? (
                        <p className="mt-0.5 text-xs font-semibold text-ops-accent">
                          Prix demandé : {formatTnd(t.requestedPrice)}
                        </p>
                      ) : null}
                      {t.description ? (
                        <p className="max-w-md truncate text-xs text-ops-ink/50">
                          {t.description}
                        </p>
                      ) : null}
                      {t.createdBy ? (
                        <p className="text-[11px] text-ops-ink/50">
                          par {t.createdBy.name}
                        </p>
                      ) : null}
                    </button>
                  </td>
                  <td className={`${tdClass} font-mono text-xs text-ops-ink/50`}>
                    {t.parcel?.code ?? "—"}
                  </td>
                  <td className={tdClass}>
                    <Badge tone={STATUS_TONE[t.status]} dot>
                      {STATUS_LABEL[t.status]}
                    </Badge>
                  </td>
                  <td
                    className={`${tdClass} hidden whitespace-nowrap text-ops-ink/50 md:table-cell`}
                  >
                    {new Date(t.createdAt).toLocaleDateString("fr-TN")}
                  </td>
                  <td className={tdClass}>{actions(t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nouveau ticket"
        description={
          allowParcelKinds
            ? "Relance / prix : après sortie expéditeur, jusqu’au virement."
            : "Décrivez le problème, l'équipe support vous répond rapidement."
        }
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Annuler
            </Button>
            <Button type="submit" form="ticket-create-form" loading={saving}>
              Ouvrir le ticket
            </Button>
          </div>
        }
      >
        <form id="ticket-create-form" onSubmit={onCreate} className="space-y-4">
          {allowParcelKinds ? (
            <SelectField
              name="kind"
              label="Type"
              value={kind}
              onChange={(e) => {
                const next = e.target.value as TicketKind;
                setKind(next);
                if (next !== "GENERAL" && !parcelId && defaultParcelId) {
                  setParcelId(String(defaultParcelId));
                }
              }}
            >
              <option value="GENERAL">Général</option>
              <option value="RELANCE">Relance colis</option>
              <option value="CHANGEMENT_PRIX">Changement de prix</option>
            </SelectField>
          ) : null}
          {kind === "GENERAL" ? (
            <TextField
              name="title"
              label="Sujet"
              required
              minLength={3}
              maxLength={120}
            />
          ) : (
            <TextField
              name="title"
              label="Sujet (optionnel)"
              maxLength={120}
              placeholder={TICKET_KIND_LABEL[kind]}
            />
          )}
          <SelectField
            name="parcelId"
            label={kind === "GENERAL" ? "Colis concerné" : "Colis"}
            required={kind !== "GENERAL"}
            value={parcelId}
            onChange={(e) => setParcelId(e.target.value)}
          >
            <option value="">
              {kind === "GENERAL" ? "Aucun colis précis" : "Choisir un colis…"}
            </option>
            {(kind === "GENERAL" ? parcels : eligibleParcels).map((p) => (
              <option key={p.id} value={p.id}>
                {p.code ?? `#${p.id}`} · {p.recipientName} · {formatTnd(p.price)}
              </option>
            ))}
          </SelectField>
          {kind === "CHANGEMENT_PRIX" ? (
            <TextField
              name="requestedPrice"
              label="Nouveau prix (TND)"
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0.001"
              required
            />
          ) : null}
          {kind !== "GENERAL" && eligibleParcels.length === 0 ? (
            <p className="rounded-xl bg-ops-ink/[0.04] px-3 py-2 text-xs text-ops-ink/55">
              Aucun colis éligible (sortie expéditeur → avant virement).
            </p>
          ) : null}
          <TextAreaField
            name="description"
            label="Description"
            rows={4}
            maxLength={1000}
            placeholder={
              kind === "RELANCE"
                ? "Motif de la relance…"
                : kind === "CHANGEMENT_PRIX"
                  ? "Pourquoi modifier le prix ?"
                  : "Que s'est-il passé ?"
            }
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Ticket #${selected.id}` : ""}
        description={selected?.title}
        size="md"
        footer={selected ? actions(selected) : undefined}
      >
        {selected ? (
          <dl className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={KIND_TONE[ticketKind(selected)]}>
                {TICKET_KIND_LABEL[ticketKind(selected)]}
              </Badge>
              <Badge tone={STATUS_TONE[selected.status]} dot>
                {STATUS_LABEL[selected.status]}
              </Badge>
              {selected.parcel?.code ? (
                <Badge tone="info">{selected.parcel.code}</Badge>
              ) : null}
            </div>
            {selected.requestedPrice != null ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ops-ink/50">
                  Prix demandé
                </dt>
                <dd className="mt-1 font-semibold text-ops-accent">
                  {formatTnd(selected.requestedPrice)}
                  {selected.parcel?.price != null
                    ? ` (actuel ${formatTnd(selected.parcel.price)})`
                    : ""}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ops-ink/50">
                Description
              </dt>
              <dd className="mt-1 whitespace-pre-line text-ops-ink">
                {selected.description ?? "Aucune description"}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ops-ink/50">
                  Auteur
                </dt>
                <dd className="mt-1 text-ops-ink">
                  {selected.createdBy?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ops-ink/50">
                  Ouvert le
                </dt>
                <dd className="mt-1 text-ops-ink">
                  {new Date(selected.createdAt).toLocaleString("fr-TN")}
                </dd>
              </div>
            </div>
          </dl>
        ) : null}
      </Modal>
    </div>
  );
}
