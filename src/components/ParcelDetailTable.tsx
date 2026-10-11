"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  FileText,
  Package,
  Pencil,
  Printer,
} from "lucide-react";
import { useToast } from "@/components/Feedback";
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
import { formatTnd, type Parcel } from "@/lib/domain";
import {
  downloadParcelsExcel,
  openBordereauPdf,
  openParcelListPdf,
} from "@/lib/parcel-report";
import { useAuth } from "@/lib/auth-context";
import { canSeeDeliveryMode } from "@/lib/roles";
import { dispatchLabel, isDispatched } from "@/lib/parcel-parcours";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";
import { compareSortValues, SortableTh, type SortDir } from "@/lib/table-sort";

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

function QuietStatus({ status }: { status: string }) {
  const meta = STATUS_META[status as StatusKey];
  const color = meta?.color ?? "#64748b";
  return (
    <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-ops-ink">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {meta?.label ?? status}
    </span>
  );
}

export function ParcelDetailTable({
  rows,
  onEdit,
  canEditRow,
  detailBasePath,
  reportTitle = "Liste des colis",
  loading = false,
  showPartyDetails = false,
}: {
  rows: Parcel[];
  onEdit?: (row: Parcel) => void;
  canEditRow?: (row: Parcel) => boolean;
  detailBasePath?: string;
  reportTitle?: string;
  loading?: boolean;
  showPartyDetails?: boolean;
}) {
  const { session } = useAuth();
  const toast = useToast();
  const showModes = canSeeDeliveryMode(session?.user.role);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [groupByZone, setGroupByZone] = useState(false);

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
      openParcelListPdf({
        title: reportTitle,
        rows: filtered,
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
    if (row.bordereauUrl && !row.bordereauUrl.includes("example.com")) {
      window.open(row.bordereauUrl, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      openBordereauPdf(row, { includeMode: showModes });
    } catch (err) {
      toast.error(
        "Bordereau impossible",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  const colSpan = showPartyDetails ? 8 : 7;

  return (
    <section className="overflow-hidden rounded-2xl border border-ops-card bg-ops-surface">
      <div className="flex flex-col gap-3 border-b border-ops-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={FileSpreadsheet}
            onClick={exportExcel}
          >
            Excel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={FileText}
            onClick={exportPdf}
          >
            PDF
          </Button>
          <button
            type="button"
            onClick={() => setGroupByZone((v) => !v)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition",
              groupByZone
                ? "border-ops-accent/40 bg-ops-accent/10 text-ops-accent"
                : "border-ops-card text-ops-ink/50 hover:text-ops-ink",
            )}
          >
            Grouper par zone
          </button>
        </div>
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Rechercher…"
          className="w-full lg:w-64"
        />
      </div>

      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-ops-ink/[0.06]"
            />
          ))}
        </div>
      ) : pageRows.length === 0 ? (
        <div className="p-10">
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
          <ul className="divide-y divide-ops-card md:hidden">
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
              const code = row.code ?? `#${row.id}`;
              const body = (
                <div className="flex items-start justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    {detailBasePath ? (
                      <Link
                        href={`${detailBasePath}/${row.id}`}
                        className="font-mono text-[13px] font-bold text-ops-ink hover:text-ops-accent"
                      >
                        {code}
                      </Link>
                    ) : (
                      <p className="font-mono text-[13px] font-bold text-ops-ink">
                        {code}
                      </p>
                    )}
                    {showModes ? (
                      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ops-ink/35">
                        {row.mode === "INTERNAL" ? "Umbrella" : "Navex"}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-[15px] font-semibold text-ops-ink">
                      {row.recipientName}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ops-ink/45">
                      {row.city}
                      {row.phone ? ` · ${row.phone}` : ""}
                    </p>
                    {showPartyDetails && row.sender?.name ? (
                      <p className="mt-0.5 text-[11px] text-ops-ink/40">
                        Exp. {row.sender.name}
                      </p>
                    ) : null}
                    {row.driver?.name ? (
                      <p className="mt-0.5 text-[11px] text-ops-ink/40">
                        Livreur {row.driver.name}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[15px] font-extrabold tabular-nums text-ops-ink">
                      {formatTnd(row.price)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <QuietStatus status={row.status} />
                    <div className="flex items-center gap-0.5">
                      <IconBtn
                        label="Bordereau"
                        onClick={() => printBordereau(row)}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </IconBtn>
                      {onEdit ? (
                        <IconBtn
                          label="Modifier"
                          disabled={!editable}
                          onClick={() => onEdit(row)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </IconBtn>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
              return (
                <li key={row.id}>
                  {showZone ? (
                    <p className="bg-ops-page/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ops-ink/40">
                      {zoneLabel(row)}
                      <span className="ml-1.5 font-medium normal-case tracking-normal text-ops-ink/28">
                        {zoneCount}
                      </span>
                    </p>
                  ) : null}
                  {body}
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
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
                      <tr className={trClass}>
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
                          {showModes ? (
                            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ops-ink/30">
                              {row.mode === "INTERNAL" ? "Umbrella" : "Navex"}
                            </p>
                          ) : null}
                        </td>
                        <td className={cn(tdClass, "min-w-[10rem] px-3 py-2")}>
                          <p className="truncate text-[13px] font-semibold text-ops-ink">
                            {row.recipientName}
                          </p>
                          <p className="truncate text-[11px] text-ops-ink/40">
                            {row.phone}
                            <span className="mx-1 text-ops-ink/20">·</span>
                            {row.city}
                          </p>
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
                          className={cn(tdClass, "whitespace-nowrap px-3 py-2")}
                        >
                          <QuietStatus status={row.status} />
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
                            {onEdit ? (
                              <IconBtn
                                label="Modifier"
                                disabled={!editable}
                                onClick={() => onEdit(row)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
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
        </>
      )}

      {!loading && filtered.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-ops-card px-4 py-3 text-[12px] text-ops-ink/45 sm:flex-row sm:items-center sm:justify-between">
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
    </section>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ops-ink/35 transition hover:bg-ops-ink/[0.06] hover:text-ops-ink disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}
