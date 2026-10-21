"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  ChevronRight,
  Copy,
  FileText,
  MessageSquareWarning,
  Package,
  Pencil,
  Phone,
  Printer,
} from "lucide-react";
import { CopyableCode } from "@/components/CopyableCode";
import { useConfirm, useToast } from "@/components/Feedback";
import { Modal } from "@/components/Modal";
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
  onBatchSelectionChange,
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
  /** Notifies parent when batch selection changes (for status-card print, etc.). */
  onBatchSelectionChange?: (state: {
    count: number;
    print: () => void;
  }) => void;
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [batchPrintedIds, setBatchPrintedIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [printChoiceOpen, setPrintChoiceOpen] = useState(false);
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
    list.sort((a, b) => dir * compareSortValues(read(a), read(b)));
    return list;
  }, [rows, query, sortKey, sortDir]);

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

  const printSelectedRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!onBatchSelectionChange) return;
    onBatchSelectionChange({
      count: multiSelect ? selectedIds.size : 0,
      print: () => {
        void printSelectedRef.current();
      },
    });
  }, [multiSelect, selectedIds, onBatchSelectionChange]);
  const canSelectAll =
    multiSelect &&
    (statusFilter === "EN_ATTENTE" || statusFilter === "A_ENLEVER");
  const allFilteredSelected =
    canSelectAll &&
    filtered.length > 0 &&
    filtered.every((r) => selectedIds.has(r.id));
  const someFilteredSelected =
    canSelectAll && selectedIds.size > 0 && !allFilteredSelected;
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectAllMobileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!canSelectAll && selectedIds.size > 0) {
      setSelectedIds(new Set());
    }
  }, [canSelectAll, selectedIds.size]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected;
    }
    if (selectAllMobileRef.current) {
      selectAllMobileRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

  function toggleRow(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    if (!canSelectAll) return;
    if (allFilteredSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filtered.map((r) => r.id)));
  }

  function listRedirectPath() {
    if (!detailBasePath) return null;
    return detailBasePath.split("?")[0] || detailBasePath;
  }

  const neverPrintedRows = useMemo(
    () => selectedRows.filter((r) => !batchPrintedIds.has(r.id)),
    [selectedRows, batchPrintedIds],
  );
  const alreadyPrintedRows = useMemo(
    () => selectedRows.filter((r) => batchPrintedIds.has(r.id)),
    [selectedRows, batchPrintedIds],
  );

  async function runPrint(rows: DetailParcel[]) {
    if (rows.length === 0) {
      toast.error("Aucun colis à imprimer");
      return;
    }
    try {
      openBordereauxPdf(rows, { includeMode: showModes });
      const printed = rows.map((r) => r.id);
      const next = markBatchPrinted(userId, printed);
      setBatchPrintedIds(next);
      setSelectedIds(new Set());
      setPrintChoiceOpen(false);
      toast.success(
        rows.length === 1
          ? "Bordereau envoyé à l’impression"
          : `${rows.length} bordereaux envoyés à l’impression`,
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

  async function printSelected() {
    if (selectedRows.length === 0) {
      toast.error("Sélectionnez au moins un colis");
      return;
    }

    const total = selectedRows.length;
    const reprintCount = alreadyPrintedRows.length;

    if (reprintCount === 0) {
      const ok = await confirm({
        title:
          total === 1
            ? "Imprimer 1 bordereau"
            : `Imprimer ${total} bordereaux`,
        description:
          "L’impression s’ouvrira, puis vous serez renvoyé à la liste des colis.",
        confirmLabel: "Imprimer puis retourner",
        cancelLabel: "Annuler",
      });
      if (!ok) return;
      await runPrint(selectedRows);
      return;
    }

    setPrintChoiceOpen(true);
  }

  printSelectedRef.current = () => {
    void printSelected();
  };

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "createdAt" || key === "price" ? "desc" : "asc");
    }
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

  const selectedCount = selectedIds.size;
  const reprintInSelection = selectedRows.filter((r) =>
    batchPrintedIds.has(r.id),
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {canSelectAll ? (
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[12px] font-medium text-ops-ink/55">
            <input
              ref={selectAllMobileRef}
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAllFiltered}
              className="h-3.5 w-3.5 rounded border-ops-card accent-ops-accent"
              aria-label={`Tout sélectionner (${filtered.length})`}
            />
            <span className="whitespace-nowrap">
              Tout
              <span className="ms-1 tabular-nums text-ops-ink/35">
                ({filtered.length})
              </span>
            </span>
          </label>
        ) : null}
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Rechercher code, destinataire, ville…"
          className="min-w-0 flex-1"
        />
        <ToolbarIconBtn
          label={role === "EXPEDITEUR" ? "Manifeste" : "PDF"}
          onClick={exportPdf}
        >
          <FileText className="h-4 w-4" />
        </ToolbarIconBtn>
      </div>

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
          <ul className="space-y-2 md:hidden">
            {pageRows.map((row) => {
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
              const addressLine = [street, place].filter(Boolean).join(" · ");
              return (
                <li key={row.id}>
                  <article
                    className={cn(
                      "relative overflow-hidden rounded-xl border bg-ops-surface",
                      selected ? "border-ops-ink/25 bg-ops-ink/[0.03]" : "border-ops-card",
                    )}
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-[3px]"
                      style={{ backgroundColor: tone }}
                      aria-hidden
                    />
                    <div className="space-y-2 py-2.5 pe-2.5 ps-3.5">
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <CopyableCode
                            code={row.code}
                            fallback={`#${row.id}`}
                            size="sm"
                            className="min-w-0"
                            textClassName="text-ops-ink/40"
                            renderCode={
                              href
                                ? (display) => (
                                    <Link
                                      href={href}
                                      className="truncate transition hover:text-ops-accent"
                                    >
                                      {display}
                                    </Link>
                                  )
                                : undefined
                            }
                          />
                          <div className="flex shrink-0 items-center gap-2">
                            <p className="whitespace-nowrap font-display text-[14px] font-bold tabular-nums text-ops-ink">
                              {formatTnd(row.price)}
                            </p>
                            {multiSelect ? (
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleRow(row.id)}
                                className="h-4 w-4 rounded border-ops-card accent-ops-accent"
                                aria-label={`Sélectionner ${code}`}
                              />
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-0.5 truncate text-[14px] font-semibold leading-snug text-ops-ink">
                          {row.recipientName}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span
                            className="inline-flex max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              color: tone,
                              backgroundColor: `${tone}22`,
                            }}
                          >
                            {meta?.label ?? row.status}
                          </span>
                          {row.phone ? (
                            <a
                              href={`tel:${row.phone}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-ops-accent"
                            >
                              <Phone className="h-3 w-3" strokeWidth={2.25} />
                              {row.phone}
                            </a>
                          ) : null}
                        </div>
                        {addressLine ? (
                          <p className="mt-1 truncate text-[11px] text-ops-ink/45">
                            {addressLine}
                          </p>
                        ) : null}
                        {showPartyDetails && row.sender?.name ? (
                          <p className="mt-0.5 text-[10px] text-ops-ink/35">
                            Exp. {row.sender.name}
                            {row.driver?.name
                              ? ` · Livreur ${row.driver.name}`
                              : ""}
                          </p>
                        ) : row.driver?.name ? (
                          <p className="mt-0.5 text-[10px] text-ops-ink/35">
                            Livreur {row.driver.name}
                          </p>
                        ) : null}
                      </div>

                      {row.statusReason &&
                      (statusFilter
                        ? REASON_VISIBLE_STATUSES.has(statusFilter as StatusKey)
                        : REASON_VISIBLE_STATUSES.has(
                            row.status as StatusKey,
                          )) ? (
                        <p className="rounded-lg bg-ops-accent/10 px-2 py-1 text-[11px] font-medium leading-snug text-ops-accent">
                          Motif · {row.statusReason}
                        </p>
                      ) : null}
                      {multiSelect && batchPrinted ? (
                        <p className="text-[10px] font-medium text-amber-700/80 dark:text-amber-300/70">
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

                      <div className="flex items-center justify-between gap-1 border-t border-ops-card/80 pt-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-1">
                          <ActionBtn
                            label="Bordereau"
                            onClick={() => printBordereau(row)}
                          >
                            <Printer className="h-4 w-4" strokeWidth={2.25} />
                          </ActionBtn>
                          <ActionBtn
                            label="Copier le code"
                            onClick={() => void copyParcelCode(row)}
                          >
                            <Copy className="h-4 w-4" strokeWidth={2.25} />
                          </ActionBtn>
                          {onEdit ? (
                            <ActionBtn
                              label="Modifier"
                              disabled={!editable}
                              onClick={() => onEdit(row)}
                            >
                              <Pencil className="h-4 w-4" strokeWidth={2.25} />
                            </ActionBtn>
                          ) : null}
                          {showTicketAction && ticketHref ? (
                            <ActionLink label={ticketLabel} href={ticketHref}>
                              <MessageSquareWarning
                                className="h-4 w-4"
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
                              <Ban className="h-4 w-4" strokeWidth={2.25} />
                            </ActionBtn>
                          ) : null}
                        </div>
                        {href ? (
                          <ActionLink label="Détail" href={href}>
                            <ChevronRight
                              className="h-4 w-4"
                              strokeWidth={2.25}
                            />
                          </ActionLink>
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
                      {canSelectAll ? (
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAllFiltered}
                          className="h-4 w-4 rounded border-ops-card accent-ops-accent"
                          title={
                            allFilteredSelected
                              ? "Tout désélectionner"
                              : `Tout sélectionner (${filtered.length})`
                          }
                          aria-label={
                            allFilteredSelected
                              ? "Tout désélectionner"
                              : `Tout sélectionner (${filtered.length})`
                          }
                        />
                      ) : (
                        <span className="sr-only">Sélection</span>
                      )}
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
                {pageRows.map((row) => {
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
                    <tr
                      key={row.id}
                      className={cn(
                        trClass,
                        selectedIds.has(row.id) && "bg-ops-ink/[0.04]",
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
                          <CopyableCode
                            code={row.code}
                            fallback={`#${row.id}`}
                            size="sm"
                            textClassName="text-[12px] font-semibold"
                            renderCode={
                              detailBasePath
                                ? (display) => (
                                    <Link
                                      href={`${detailBasePath}/${row.id}`}
                                      className="hover:text-ops-accent"
                                    >
                                      {display}
                                    </Link>
                                  )
                                : undefined
                            }
                          />
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

      {multiSelect && selectedCount > 0 ? (
        <div
          className="pointer-events-none sticky bottom-3 z-20 flex justify-center px-1 pt-2"
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-ops-card bg-ops-surface/95 px-3 py-2.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md supports-[backdrop-filter]:bg-ops-surface/85">
            <p className="min-w-0 flex-1 text-[13px] font-semibold text-ops-ink">
              <span className="tabular-nums">{selectedCount}</span>
              {" sélectionné"}
              {selectedCount > 1 ? "s" : ""}
              {reprintInSelection > 0 ? (
                <span className="ms-1.5 font-normal text-ops-ink/40">
                  · {reprintInSelection} déjà imprimé
                  {reprintInSelection > 1 ? "s" : ""}
                </span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="shrink-0 px-2 text-[12px] font-medium text-ops-ink/45 transition hover:text-ops-ink"
            >
              Effacer
            </button>
            <Button
              type="button"
              size="sm"
              icon={Printer}
              onClick={() => void printSelected()}
              className="shrink-0"
            >
              Imprimer
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={printChoiceOpen}
        onClose={() => setPrintChoiceOpen(false)}
        title="Que voulez-vous imprimer ?"
        description={`${selectedRows.length} colis sélectionnés · ${neverPrintedRows.length} jamais imprimés · ${alreadyPrintedRows.length} déjà imprimés.`}
        size="md"
        footer={
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="primary"
              icon={Printer}
              disabled={neverPrintedRows.length === 0}
              onClick={() => void runPrint(neverPrintedRows)}
            >
              {neverPrintedRows.length === 0
                ? "Aucun non imprimé"
                : neverPrintedRows.length === 1
                  ? "Imprimer le non imprimé (1)"
                  : `Imprimer les non imprimés (${neverPrintedRows.length})`}
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={Printer}
              onClick={() => void runPrint(selectedRows)}
            >
              {selectedRows.length === 1
                ? "Imprimer toute la sélection (1)"
                : `Imprimer toute la sélection (${selectedRows.length})`}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPrintChoiceOpen(false)}
            >
              Annuler
            </Button>
          </div>
        }
      />
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
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-ops-page transition disabled:cursor-not-allowed disabled:opacity-35",
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
  const className =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ops-card bg-ops-page text-ops-ink/70 transition hover:border-ops-accent/35 hover:text-ops-accent";
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
