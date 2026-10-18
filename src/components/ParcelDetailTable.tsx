"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  ChevronRight,
  Copy,
  FileSpreadsheet,
  FileText,
  MessageSquareWarning,
  Package,
  Pencil,
  Phone,
  Printer,
} from "lucide-react";
import { useConfirm, useToast } from "@/components/Feedback";
import { ReturnVerificationActions } from "@/components/ReturnVerificationActions";
import {
  Button,
  EmptyState,
  SearchInput,
  tableClass,
  tdClass,
  theadClass,
  thClass,
  trClass,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  canOpenParcelTicket,
  formatTnd,
  type Parcel,
} from "@/lib/domain";
import {
  loadBatchPrintedIds,
  markBatchPrinted,
} from "@/lib/batch-print-memory";
import { displayGovernorate } from "@/lib/normalize-text";
import {
  downloadParcelsExcel,
  openBordereauPdf,
  openBordereauxPdf,
  openParcelListPdf,
} from "@/lib/parcel-report";
import { useAuth } from "@/lib/auth-context";
import { canSeeDeliveryMode } from "@/lib/roles";
import { dispatchLabel, isDispatched } from "@/lib/parcel-parcours";
import {
  REASON_VISIBLE_STATUSES,
  canPassReturnVerification,
} from "@/lib/parcel-transitions";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";
import { compareSortValues, SortableTh, type SortDir } from "@/lib/table-sort";

function ticketsBaseFromDetail(detailBasePath?: string): string | null {
  if (!detailBasePath) return null;
  const base = detailBasePath.replace(/\/parcels\/?$/, "").replace(/\/$/, "");
  return base ? `${base}/tickets` : null;
}

function parcelAddressLines(row: Parcel) {
  const street = [row.locality, row.address].filter(Boolean).join(", ");
  const place = [row.city, displayGovernorate(row.governorate)]
    .filter(Boolean)
    .join(", ");
  return { street, place };
}

export type DetailParcel = Parcel;

type SortKey = "code" | "recipientName" | "price" | "createdAt" | "status";

const PAGE_SIZE = 15;

const PARCEL_SORT = {
  code: (p: Parcel) => p.code ?? "",
  recipientName: (p: Parcel) => p.recipientName,
  price: (p: Parcel) => Number(p.price),
  createdAt: (p: Parcel) => p.createdAt,
  status: (p: Parcel) => STATUS_META[p.status as StatusKey]?.label ?? p.status,
} as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function QuietStatus({
  status,
  reason,
  emphasizeReason,
}: {
  status: string;
  reason?: string | null;
  emphasizeReason?: boolean;
}) {
  const meta = STATUS_META[status as StatusKey];
  const color = meta?.color ?? "#64748b";
  return (
    <span className="inline-flex max-w-[14rem] flex-col gap-0.5 text-[12px] font-semibold text-ops-ink">
      <span className="inline-flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        {meta?.label ?? status}
      </span>
      {reason &&
      (emphasizeReason ||
        REASON_VISIBLE_STATUSES.has(status as StatusKey)) ? (
        <span
          className="line-clamp-2 pl-4 text-[11px] font-medium leading-snug text-ops-accent"
          title={reason}
        >
          {reason}
        </span>
      ) : null}
    </span>
  );
}

export function ParcelDetailTable({
  rows,
  onEdit,
  canEditRow,
  onCancel,
  canCancelRow,
  detailBasePath,
  reportTitle = "Liste des colis",
  loading = false,
  showPartyDetails = false,
  multiSelect = false,
  statusFilter = null,
  onParcelMutated,
}: {
  rows: Parcel[];
  onEdit?: (row: Parcel) => void;
  canEditRow?: (row: Parcel) => boolean;
  onCancel?: (row: Parcel) => void;
  canCancelRow?: (row: Parcel) => boolean;
  detailBasePath?: string;
  reportTitle?: string;
  loading?: boolean;
  showPartyDetails?: boolean;
  multiSelect?: boolean;
  statusFilter?: string | null;
  onParcelMutated?: () => void;
}) {
  const { session } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const showModes = canSeeDeliveryMode(session?.user.role);
  const role = session?.user.role;
  const ticketsBase = ticketsBaseFromDetail(detailBasePath);
  const showTicketAction =
    Boolean(ticketsBase) &&
    (role === "EXPEDITEUR" ||
      role === "SUPPORT" ||
      role === "ADMIN" ||
      role === "SUPER_ADMIN" ||
      role === "CHEF_AGENCE");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [groupByZone, setGroupByZone] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [batchPrintedIds, setBatchPrintedIds] = useState<Set<number>>(
    () => new Set(),
  );
  const userId = session?.user.id;

  useEffect(() => {
    if (!multiSelect || !userId) {
      setBatchPrintedIds(new Set());
      return;
    }
    setBatchPrintedIds(loadBatchPrintedIds(userId));
  }, [multiSelect, userId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter((r) =>
          [
            r.code,
            r.recipientName,
            r.phone,
            r.address,
            r.city,
            r.governorate,
            r.notes,
            r.designation,
            r.zone?.name,
            r.driver?.name,
            r.sender?.name,
            STATUS_META[r.status as StatusKey]?.label ?? r.status,
            String(r.price),
          ]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    const read = PARCEL_SORT[sortKey];
    list.sort((a, b) => {
      if (groupByZone) {
        const za = a.zone?.name?.trim() || "\uffff";
        const zb = b.zone?.name?.trim() || "\uffff";
        const byZone = za.localeCompare(zb, "fr", { sensitivity: "base" });
        if (byZone !== 0) return byZone;
      }
      return dir * compareSortValues(read(a), read(b));
    });
    return list;
  }, [rows, query, sortKey, sortDir, groupByZone]);

  function zoneKey(row: Parcel) {
    return String(row.zone?.id ?? row.zoneId ?? "none");
  }

  function zoneLabel(row: Parcel) {
    return row.zone?.name?.trim() || "Sans zone";
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const firstIndex = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastIndex = (currentPage - 1) * PAGE_SIZE + pageRows.length;

  useEffect(() => {
    if (!multiSelect) {
      setSelectedIds(new Set());
      return;
    }
    const allowed = new Set(filtered.map((r) => r.id));
    setSelectedIds((prev) => {
      const next = new Set(
        Array.from(prev).filter((id) => allowed.has(id)),
      );
      return next.size === prev.size ? prev : next;
    });
  }, [multiSelect, filtered]);

  const selectedRows = useMemo(
    () => filtered.filter((r) => selectedIds.has(r.id)),
    [filtered, selectedIds],
  );
  const allFilteredSelected =
    multiSelect &&
    filtered.length > 0 &&
    filtered.every((r) => selectedIds.has(r.id));
  const pageAllSelected =
    multiSelect &&
    pageRows.length > 0 &&
    pageRows.every((r) => selectedIds.has(r.id));

  function toggleRow(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filtered.map((r) => r.id)));
  }

  function toggleSelectPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) {
        for (const row of pageRows) next.delete(row.id);
      } else {
        for (const row of pageRows) next.add(row.id);
      }
      return next;
    });
  }

  function listRedirectPath() {
    if (!detailBasePath) return null;
    return detailBasePath.split("?")[0] || detailBasePath;
  }

  async function printSelected() {
    if (selectedRows.length === 0) {
      toast.error("Sélectionnez au moins un colis");
      return;
    }

    const reprintCount = selectedRows.filter((r) =>
      batchPrintedIds.has(r.id),
    ).length;
    const total = selectedRows.length;

    if (reprintCount > 0) {
      const ok = await confirm({
        title:
          reprintCount === 1
            ? "Réimpression d’un colis"
            : `Réimpression de ${reprintCount} colis`,
        description:
          reprintCount === total
            ? `${reprintCount} colis seront imprimés à nouveau. Continuer puis retourner à la liste ?`
            : `${reprintCount} colis sur ${total} seront imprimés à nouveau. Les autres seront imprimés pour la première fois. Continuer puis retourner à la liste ?`,
        confirmLabel: "Imprimer puis retourner",
        cancelLabel: "Annuler",
        tone: "danger",
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title:
          total === 1
            ? "Imprimer 1 bordereau"
            : `Imprimer ${total} bordereaux`,
        description: "L’impression s’ouvrira, puis vous serez renvoyé à la liste des colis.",
        confirmLabel: "Imprimer puis retourner",
        cancelLabel: "Annuler",
      });
      if (!ok) return;
    }

    try {
      openBordereauxPdf(selectedRows, { includeMode: showModes });
      const printed = selectedRows.map((r) => r.id);
      const next = markBatchPrinted(userId, printed);
      setBatchPrintedIds(next);
      setSelectedIds(new Set());
      toast.success(
        total === 1
          ? "Bordereau envoyé à l’impression"
          : `${total} bordereaux envoyés à l’impression`,
      );
      const redirectTo = listRedirectPath();
      if (redirectTo) {
        router.push(redirectTo);
      }
    } catch (err) {
      toast.error(
        "Impression impossible",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "createdAt" || key === "price" ? "desc" : "asc");
    }
  }

  function reportSlug() {
    return (
      reportTitle
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "colis"
    );
  }

  function exportExcel() {
    downloadParcelsExcel(filtered, `umbrella-${reportSlug()}`, {
      includeMode: showModes,
    });
  }

  function exportPdf() {
    try {
      const isSenderManifest = role === "EXPEDITEUR";
      const rows = isSenderManifest
        ? filtered.filter((r) => r.status === "EN_ATTENTE")
        : filtered;
      if (isSenderManifest && rows.length === 0) {
        toast.error(
          "Aucun colis en attente de collecte",
          "Le manifeste PDF n’inclut que ce statut.",
        );
        return;
      }
      openParcelListPdf({
        title: isSenderManifest
          ? "Manifeste · En attente de collecte"
          : reportTitle,
        rows: rows.map((r) => ({
          ...r,
          designation: r.designation ?? r.notes,
          notes: r.notes ?? r.designation ?? null,
        })),
        accountName: session?.user.name,
        includeMode: showModes,
      });
    } catch (err) {
      toast.error(
        "Export PDF impossible",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  function printBordereau(row: Parcel) {
    try {
      openBordereauPdf(row, { includeMode: showModes });
    } catch (err) {
      toast.error(
        "Bordereau impossible",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  async function copyParcelCode(row: Parcel) {
    const code = row.code?.trim() || `#${row.id}`;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copié", code);
    } catch {
      toast.error("Copie impossible", code);
    }
  }

  const colSpan = (showPartyDetails ? 8 : 7) + (multiSelect ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Rechercher code, destinataire, ville…"
          className="min-w-0 flex-1"
        />
        <div className="flex shrink-0 items-center gap-1">
          <ToolbarIconBtn label="Excel" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
          </ToolbarIconBtn>
          <ToolbarIconBtn
            label={role === "EXPEDITEUR" ? "Manifeste" : "PDF"}
            onClick={exportPdf}
          >
            <FileText className="h-4 w-4" />
          </ToolbarIconBtn>
          <button
            type="button"
            onClick={() => setGroupByZone((v) => !v)}
            className={cn(
              "rounded-xl border px-2.5 py-2 text-[11px] font-semibold transition",
              groupByZone
                ? "border-ops-accent/40 bg-ops-accent/10 text-ops-accent"
                : "border-ops-card text-ops-ink/45 hover:text-ops-ink",
            )}
          >
            Zones
          </button>
        </div>
      </div>

      {multiSelect ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ops-card bg-ops-surface px-3 py-2.5">
          <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-ops-ink/70">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAllFiltered}
              className="h-4 w-4 rounded border-ops-card accent-ops-accent"
            />
            Tout sélectionner ({filtered.length})
          </label>
          {selectedIds.size > 0 ? (
            <>
              <span className="text-[12px] text-ops-ink/40">
                {selectedIds.size} sélectionné
                {selectedIds.size > 1 ? "s" : ""}
                {selectedRows.some((r) => batchPrintedIds.has(r.id))
                  ? ` · ${selectedRows.filter((r) => batchPrintedIds.has(r.id)).length} déjà imprimés`
                  : ""}
              </span>
              <Button
                type="button"
                size="sm"
                icon={Printer}
                onClick={() => void printSelected()}
                className="ms-auto"
              >
                Imprimer ({selectedIds.size})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                Effacer
              </Button>
            </>
          ) : (
            <p className="ms-auto text-[11px] text-ops-ink/40">
              Cochez puis imprimez — avertissement si réimpression
            </p>
          )}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-ops-ink/[0.06]"
            />
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="hidden space-y-2 rounded-2xl border border-ops-card bg-ops-surface p-4 md:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-ops-ink/[0.06]"
            />
          ))}
        </div>
      ) : pageRows.length === 0 ? (
        <div className="rounded-2xl border border-ops-card bg-ops-surface p-10">
          <EmptyState
            icon={Package}
            title={query ? "Aucun résultat" : "Aucun colis"}
            description={
              query
                ? "Modifiez votre recherche."
                : "Les colis apparaîtront ici."
            }
          />
        </div>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {pageRows.map((row, index) => {
              const showZone =
                groupByZone &&
                (index === 0 ||
                  zoneKey(pageRows[index - 1]!) !== zoneKey(row));
              const editable =
                onEdit && (canEditRow ? canEditRow(row) : true);
              const code = row.code ?? `#${row.id}`;
              const href = detailBasePath
                ? `${detailBasePath}/${row.id}`
                : null;
              const meta = STATUS_META[row.status as StatusKey];
              const tone = meta?.color ?? "#64748b";
              const { street, place } = parcelAddressLines(row);
              const selected = selectedIds.has(row.id);
              const batchPrinted = batchPrintedIds.has(row.id);
              const cancellable =
                onCancel && (canCancelRow ? canCancelRow(row) : true);
              const ticketHref = ticketsBase
                ? `${ticketsBase}?parcelId=${row.id}`
                : null;
              const ticketLabel = canOpenParcelTicket(row)
                ? "Ticket colis"
                : "Signaler";
              return (
                <li key={row.id} className="space-y-2">
                  {showZone ? (
                    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ops-ink/35">
                      {zoneLabel(row)}
                    </p>
                  ) : null}
                  <article
                    className={cn(
                      "relative overflow-hidden rounded-2xl border bg-ops-surface",
                      selected
                        ? "border-ops-accent/45 ring-1 ring-ops-accent/25"
                        : "border-ops-card",
                    )}
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-[3px]"
                      style={{ backgroundColor: tone }}
                      aria-hidden
                    />
                    <div className="space-y-3 py-3.5 pe-3.5 ps-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2.5">
                          {multiSelect ? (
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleRow(row.id)}
                              className="mt-1 h-4 w-4 shrink-0 rounded border-ops-card accent-ops-accent"
                              aria-label={`Sélectionner ${code}`}
                            />
                          ) : null}
                          <div className="min-w-0">
                            {href ? (
                              <Link
                                href={href}
                                className="font-mono text-[11px] font-medium tracking-[0.04em] text-ops-ink/40 transition hover:text-ops-accent"
                              >
                                {code}
                              </Link>
                            ) : (
                              <p className="font-mono text-[11px] font-medium tracking-[0.04em] text-ops-ink/40">
                                {code}
                              </p>
                            )}
                            <p className="mt-1 truncate text-[15px] font-semibold leading-snug text-ops-ink">
                              {row.recipientName}
                            </p>
                          </div>
                        </div>
                        <p className="shrink-0 pt-0.5 font-display text-[15px] font-bold tabular-nums tracking-tight text-ops-ink">
                          {formatTnd(row.price)}
                        </p>
                      </div>

                      <div className="space-y-1 text-[12px] leading-relaxed text-ops-ink/45">
                        {street ? (
                          <p className="line-clamp-2 text-ops-ink/55">{street}</p>
                        ) : null}
                        {place ? <p className="truncate">{place}</p> : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {row.phone ? (
                          <a
                            href={`tel:${row.phone}`}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ops-card bg-ops-page px-2.5 text-[12px] font-semibold text-ops-accent transition hover:border-ops-accent/35"
                          >
                            <Phone className="h-3.5 w-3.5" strokeWidth={2.25} />
                            {row.phone}
                          </a>
                        ) : null}
                        {row.phone2 ? (
                          <a
                            href={`tel:${row.phone2}`}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ops-card bg-ops-page px-2.5 text-[12px] font-medium text-ops-ink/55 transition hover:border-ops-ink/20"
                          >
                            <Phone className="h-3.5 w-3.5" strokeWidth={2.25} />
                            {row.phone2}
                          </a>
                        ) : null}
                      </div>

                      {showPartyDetails && row.sender?.name ? (
                        <p className="text-[11px] text-ops-ink/35">
                          Exp. {row.sender.name}
                          {row.driver?.name ? ` · Livreur ${row.driver.name}` : ""}
                        </p>
                      ) : row.driver?.name ? (
                        <p className="text-[11px] text-ops-ink/35">
                          Livreur {row.driver.name}
                        </p>
                      ) : null}

                      <p
                        className="truncate text-[12px] font-semibold"
                        style={{ color: tone }}
                      >
                        {meta?.label ?? row.status}
                      </p>
                      {row.statusReason &&
                      (statusFilter
                        ? REASON_VISIBLE_STATUSES.has(statusFilter as StatusKey)
                        : REASON_VISIBLE_STATUSES.has(
                            row.status as StatusKey,
                          )) ? (
                        <p className="rounded-lg bg-ops-accent/10 px-2.5 py-1.5 text-[12px] font-medium leading-snug text-ops-accent">
                          Motif · {row.statusReason}
                        </p>
                      ) : null}
                      {multiSelect && batchPrinted ? (
                        <p className="text-[11px] font-medium text-amber-700/80 dark:text-amber-300/70">
                          Déjà imprimé en lot — réimpression possible
                        </p>
                      ) : null}
                      {canPassReturnVerification(row.status, role) ? (
                        <ReturnVerificationActions
                          parcel={row}
                          role={role}
                          compact
                          onDone={() => onParcelMutated?.()}
                        />
                      ) : null}

                      <div className="flex items-center gap-2 border-t border-ops-card/80 pt-3">
                        <ActionBtn
                          label="Bordereau"
                          onClick={() => printBordereau(row)}
                        >
                          <Printer className="h-5 w-5" strokeWidth={2.25} />
                        </ActionBtn>
                        <ActionBtn
                          label="Copier le code"
                          onClick={() => void copyParcelCode(row)}
                        >
                          <Copy className="h-5 w-5" strokeWidth={2.25} />
                        </ActionBtn>
                        {row.phone ? (
                          <ActionLink label="Appeler" href={`tel:${row.phone}`}>
                            <Phone className="h-5 w-5" strokeWidth={2.25} />
                          </ActionLink>
                        ) : null}
                        {onEdit ? (
                          <ActionBtn
                            label="Modifier"
                            disabled={!editable}
                            onClick={() => onEdit(row)}
                          >
                            <Pencil className="h-5 w-5" strokeWidth={2.25} />
                          </ActionBtn>
                        ) : null}
                        {showTicketAction && ticketHref ? (
                          <ActionLink label={ticketLabel} href={ticketHref}>
                            <MessageSquareWarning
                              className="h-5 w-5"
                              strokeWidth={2.25}
                            />
                          </ActionLink>
                        ) : null}
                        {cancellable ? (
                          <ActionBtn
                            label="Annuler le colis"
                            onClick={() => onCancel(row)}
                            danger
                          >
                            <Ban className="h-5 w-5" strokeWidth={2.25} />
                          </ActionBtn>
                        ) : null}
                        {href ? (
                          <Link
                            href={href}
                            className="ms-auto inline-flex h-11 items-center gap-1 rounded-xl bg-ops-accent px-3.5 text-[13px] font-semibold text-white transition hover:brightness-110"
                          >
                            Détail
                            <ChevronRight className="h-4 w-4" aria-hidden />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-hidden rounded-2xl border border-ops-card bg-ops-surface md:block">
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  {multiSelect ? (
                    <th className={cn(thClass, "w-10 px-2 py-2")}>
                      <input
                        type="checkbox"
                        checked={pageAllSelected}
                        onChange={toggleSelectPage}
                        className="h-4 w-4 rounded border-ops-card accent-ops-accent"
                        aria-label="Sélectionner la page"
                      />
                    </th>
                  ) : null}
                  <SortableTh
                    label="Code"
                    column="code"
                    activeKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label="Client"
                    column="recipientName"
                    activeKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                  {showPartyDetails ? (
                    <th className={cn(thClass, "py-2")}>Expéditeur</th>
                  ) : null}
                  <th className={cn(thClass, "py-2")}>Livreur</th>
                  <SortableTh
                    label="Statut"
                    column="status"
                    activeKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label="Montant"
                    column="price"
                    activeKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                    className="text-right"
                    buttonClassName="ml-auto"
                  />
                  <SortableTh
                    label="Date"
                    column="createdAt"
                    activeKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                  <th className={cn(thClass, "py-2 text-right")}> </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => {
                  const showZone =
                    groupByZone &&
                    (index === 0 ||
                      zoneKey(pageRows[index - 1]!) !== zoneKey(row));
                  const zoneCount = filtered.filter(
                    (r) => zoneKey(r) === zoneKey(row),
                  ).length;
                  const editable =
                    onEdit && (canEditRow ? canEditRow(row) : true);
                  const cancellable =
                    onCancel && (canCancelRow ? canCancelRow(row) : true);
                  const ticketHref = ticketsBase
                    ? `${ticketsBase}?parcelId=${row.id}`
                    : null;
                  const ticketLabel = canOpenParcelTicket(row)
                    ? "Ticket colis"
                    : "Signaler";
                  return (
                    <Fragment key={row.id}>
                      {showZone ? (
                        <tr>
                          <td
                            colSpan={colSpan}
                            className="bg-ops-page/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ops-ink/40"
                          >
                            {zoneLabel(row)}
                            <span className="ml-1.5 font-medium normal-case tracking-normal text-ops-ink/28">
                              {zoneCount}
                            </span>
                          </td>
                        </tr>
                      ) : null}
                      <tr
                        className={cn(
                          trClass,
                          selectedIds.has(row.id) && "bg-ops-accent/[0.04]",
                        )}
                      >
                        {multiSelect ? (
                          <td className={cn(tdClass, "px-2 py-2")}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(row.id)}
                              onChange={() => toggleRow(row.id)}
                              className="h-4 w-4 rounded border-ops-card accent-ops-accent"
                              title={
                                batchPrintedIds.has(row.id)
                                  ? "Déjà imprimé en lot — réimpression possible"
                                  : undefined
                              }
                              aria-label={`Sélectionner ${row.code ?? row.id}`}
                            />
                          </td>
                        ) : null}
                        <td
                          className={cn(tdClass, "whitespace-nowrap px-3 py-2")}
                        >
                          {detailBasePath ? (
                            <Link
                              href={`${detailBasePath}/${row.id}`}
                              className="font-mono text-[12px] font-semibold text-ops-ink hover:text-ops-accent"
                            >
                              {row.code ?? `#${row.id}`}
                            </Link>
                          ) : (
                            <span className="font-mono text-[12px] font-semibold text-ops-ink">
                              {row.code ?? `#${row.id}`}
                            </span>
                          )}
                        </td>
                        <td className={cn(tdClass, "min-w-[12rem] px-3 py-2")}>
                          <p className="truncate text-[13px] font-semibold text-ops-ink">
                            {row.recipientName}
                          </p>
                          <p className="truncate text-[11px] text-ops-ink/45">
                            {[row.city, displayGovernorate(row.governorate)]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          {row.address ? (
                            <p className="truncate text-[11px] text-ops-ink/35">
                              {row.address}
                            </p>
                          ) : null}
                          {row.phone ? (
                            <a
                              href={`tel:${row.phone}`}
                              className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-ops-accent hover:underline"
                            >
                              <Phone className="h-3 w-3" aria-hidden />
                              {row.phone}
                            </a>
                          ) : null}
                        </td>
                        {showPartyDetails ? (
                          <td
                            className={cn(tdClass, "px-3 py-2 text-ops-ink/65")}
                          >
                            {row.sender?.name ?? "—"}
                          </td>
                        ) : null}
                        <td className={cn(tdClass, "min-w-[8rem] px-3 py-2")}>
                          <p className="truncate text-[12px] font-semibold text-ops-ink">
                            {row.driver?.name ?? "—"}
                          </p>
                          <p
                            className={cn(
                              "truncate text-[10px] font-medium",
                              isDispatched(row)
                                ? "text-emerald-600 dark:text-emerald-300/80"
                                : "text-ops-ink/35",
                            )}
                          >
                            {dispatchLabel(row)}
                          </p>
                        </td>
                        <td
                          className={cn(tdClass, "min-w-[10rem] px-3 py-2")}
                        >
                          <QuietStatus
                            status={row.status}
                            reason={row.statusReason}
                            emphasizeReason={
                              !!statusFilter &&
                              REASON_VISIBLE_STATUSES.has(
                                statusFilter as StatusKey,
                              )
                            }
                          />
                          {canPassReturnVerification(row.status, role) &&
                          role === "EXPEDITEUR" ? (
                            <div className="mt-1.5">
                              <ReturnVerificationActions
                                parcel={row}
                                role={role}
                                compact
                                onDone={() => onParcelMutated?.()}
                              />
                            </div>
                          ) : null}
                        </td>
                        <td
                          className={cn(
                            tdClass,
                            "whitespace-nowrap px-3 py-2 text-right text-[13px] font-semibold tabular-nums text-ops-ink",
                          )}
                        >
                          {formatTnd(row.price)}
                        </td>
                        <td
                          className={cn(
                            tdClass,
                            "whitespace-nowrap px-3 py-2 text-ops-ink/40",
                          )}
                        >
                          {formatDate(row.createdAt)}
                        </td>
                        <td className={cn(tdClass, "px-2 py-2")}>
                          <div className="flex items-center justify-end gap-0.5">
                            <IconBtn
                              label="Bordereau"
                              onClick={() => printBordereau(row)}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn
                              label="Copier le code"
                              onClick={() => void copyParcelCode(row)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </IconBtn>
                            {row.phone ? (
                              <IconLink
                                label="Appeler"
                                href={`tel:${row.phone}`}
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </IconLink>
                            ) : null}
                            {onEdit ? (
                              <IconBtn
                                label="Modifier"
                                disabled={!editable}
                                onClick={() => onEdit(row)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </IconBtn>
                            ) : null}
                            {showTicketAction && ticketHref ? (
                              <IconLink label={ticketLabel} href={ticketHref}>
                                <MessageSquareWarning className="h-3.5 w-3.5" />
                              </IconLink>
                            ) : null}
                            {cancellable ? (
                              <IconBtn
                                label="Annuler le colis"
                                onClick={() => onCancel(row)}
                                danger
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </IconBtn>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        </>
      )}

      {!loading && filtered.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-ops-card bg-ops-surface px-4 py-3 text-[12px] text-ops-ink/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {firstIndex}–{lastIndex} / {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </Button>
            <span className="min-w-[3.5rem] text-center font-semibold text-ops-ink">
              {currentPage}/{totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Suivant
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 min-w-[2.75rem] items-center justify-center gap-1.5 rounded-xl border bg-ops-page px-3 transition disabled:cursor-not-allowed disabled:opacity-35",
        danger
          ? "border-ops-accent/30 text-ops-accent hover:border-ops-accent/50 hover:bg-ops-accent/10"
          : "border-ops-card text-ops-ink/70 hover:border-ops-ink/20 hover:text-ops-ink",
      )}
    >
      {children}
    </button>
  );
}

function ActionLink({
  label,
  href,
  children,
}: {
  label: string;
  href: string;
  children: ReactNode;
}) {
  const external = href.startsWith("tel:");
  if (external) {
    return (
      <a
        href={href}
        title={label}
        aria-label={label}
        className="inline-flex h-11 min-w-[2.75rem] items-center justify-center gap-1.5 rounded-xl border border-ops-card bg-ops-page px-3 text-ops-ink/70 transition hover:border-ops-accent/35 hover:text-ops-accent"
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="inline-flex h-11 min-w-[2.75rem] items-center justify-center gap-1.5 rounded-xl border border-ops-card bg-ops-page px-3 text-ops-ink/70 transition hover:border-ops-ink/20 hover:text-ops-ink"
    >
      {children}
    </Link>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-30",
        danger
          ? "text-ops-accent/70 hover:bg-ops-accent/10 hover:text-ops-accent"
          : "text-ops-ink/35 hover:bg-ops-ink/[0.06] hover:text-ops-ink",
      )}
    >
      {children}
    </button>
  );
}

function IconLink({
  label,
  href,
  children,
}: {
  label: string;
  href: string;
  children: ReactNode;
}) {
  const external = href.startsWith("tel:");
  const className =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg text-ops-ink/35 transition hover:bg-ops-ink/[0.06] hover:text-ops-ink";
  if (external) {
    return (
      <a href={href} title={label} aria-label={label} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} title={label} aria-label={label} className={className}>
      {children}
    </Link>
  );
}

function ToolbarIconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ops-card text-ops-ink/45 transition hover:border-ops-ink/15 hover:text-ops-ink"
    >
      {children}
    </button>
  );
}
