"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronRight,
  MapPin,
  Package,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  StatusBadge,
  tableClass,
  tdClass,
  theadClass,
  trClass,
} from "@/components/ui";
import { useT } from "@/i18n/locale-context";
import { formatTnd, toAmount, type Parcel } from "@/lib/domain";
import { displayGovernorate } from "@/lib/normalize-text";
import {
  deliveryFeeOf,
  isDeliveredStatus,
  isReturnStatus,
  parcelProfitOf,
  returnFeeOf,
  salePriceOf,
} from "@/lib/sender-finance";
import { SortableTh, useTableSort } from "@/lib/table-sort";
import { useApiQuery } from "@/lib/use-api";
import { cn } from "@/lib/cn";

type AnalyticsPayload = {
  soldes?: {
    fraisLivraison?: number;
    retoursFrais?: number;
    profit?: number;
  };
};

type StageKey = "all" | "prep" | "pipe" | "delivered" | "returns";

type InventoryRow = {
  id: number;
  code: string;
  status: string;
  city: string;
  governorate: string;
  recipient: string;
  product: string | null;
  sale: number;
  base: number;
  profit: number | null;
  inStock: boolean;
};

type InventorySortKey =
  | "code"
  | "product"
  | "place"
  | "status"
  | "sale"
  | "base"
  | "profit";

type LedgerRow = {
  id: number;
  code: string;
  status: string;
  sale: number;
  cod: number;
  deliveryFee: number;
  returnFee: number;
  profit: number | null;
};

type LedgerSortKey =
  | "code"
  | "status"
  | "sale"
  | "cod"
  | "deliveryFee"
  | "returnFee"
  | "profit";

const INVENTORY_SORT = {
  code: (r: InventoryRow) => r.code,
  product: (r: InventoryRow) => r.product ?? "",
  place: (r: InventoryRow) => `${r.city ?? ""} ${r.governorate ?? ""}`,
  status: (r: InventoryRow) => r.status,
  sale: (r: InventoryRow) => r.sale,
  base: (r: InventoryRow) => r.base,
  profit: (r: InventoryRow) => r.profit ?? Number.NEGATIVE_INFINITY,
} as const;

const LEDGER_SORT = {
  code: (r: LedgerRow) => r.code,
  status: (r: LedgerRow) => r.status,
  sale: (r: LedgerRow) => r.sale,
  cod: (r: LedgerRow) => r.cod,
  deliveryFee: (r: LedgerRow) => r.deliveryFee,
  returnFee: (r: LedgerRow) => r.returnFee,
  profit: (r: LedgerRow) => r.profit ?? Number.NEGATIVE_INFINITY,
} as const;

const PREP = new Set(["EN_ATTENTE", "A_ENLEVER", "ENLEVES"]);
const PIPE = new Set([
  "AU_DEPOT",
  "EXPEDIE_DESTINATION",
  "ARRIVE_DESTINATION",
  "AFFECTE_LIVREUR",
  "EN_COURS",
  "A_VERIFIER",
  "ECHANGES",
]);

function moneyOf(p: Parcel) {
  return {
    price: toAmount(p.price),
    unitSalePrice:
      p.unitSalePrice != null ? toAmount(p.unitSalePrice) : null,
    unitCost: p.unitCost != null ? toAmount(p.unitCost) : null,
    deliveryFee: toAmount(p.deliveryFee ?? 0),
    returnFee: toAmount(p.returnFee ?? 0),
    status: p.status,
  };
}

function parcelValue(p: Parcel): number {
  return salePriceOf(moneyOf(p));
}

function stageOf(status: string): Exclude<StageKey, "all"> | null {
  if (PREP.has(status)) return "prep";
  if (PIPE.has(status)) return "pipe";
  if (isDeliveredStatus(status)) return "delivered";
  if (isReturnStatus(status)) return "returns";
  return null;
}

export function SenderFinancesPage() {
  const t = useT();
  const analytics = useApiQuery<AnalyticsPayload>("/dashboard/analytics");
  const parcels = useApiQuery<Parcel[]>("/parcels");
  const [stage, setStage] = useState<StageKey>("all");

  const soldes = analytics.data?.soldes;
  const list = useMemo(
    () => (parcels.data ?? []).filter((p) => p.status !== "SUPPRIME"),
    [parcels.data],
  );

  const counts = useMemo(() => {
    let prep = 0;
    let pipe = 0;
    let delivered = 0;
    let returns = 0;
    let openValue = 0;
    for (const p of list) {
      const value = parcelValue(p);
      const s = stageOf(p.status);
      if (s === "prep") {
        prep += 1;
        openValue += value;
      } else if (s === "pipe") {
        pipe += 1;
        openValue += value;
      } else if (s === "delivered") {
        delivered += 1;
      } else if (s === "returns") {
        returns += 1;
      }
    }
    return {
      prep,
      pipe,
      delivered,
      returns,
      open: prep + pipe,
      closed: delivered + returns,
      openValue,
      all: list.length,
    };
  }, [list]);

  const filters: Array<{ key: StageKey; label: string; count: number }> = [
    { key: "all", label: t("finances.stockAll"), count: counts.all },
    { key: "prep", label: t("finances.stockPrep"), count: counts.prep },
    { key: "pipe", label: t("finances.stockPipe"), count: counts.pipe },
    {
      key: "delivered",
      label: t("finances.stockDelivered"),
      count: counts.delivered,
    },
    {
      key: "returns",
      label: t("finances.stockReturns"),
      count: counts.returns,
    },
  ];

  const inventory = useMemo((): InventoryRow[] => {
    return list
      .filter((p) => (stage === "all" ? true : stageOf(p.status) === stage))
      .map((p) => {
        const m = moneyOf(p);
        return {
          id: p.id,
          code: p.code ?? `#${p.id}`,
          status: p.status,
          city: p.city,
          governorate: p.governorate,
          recipient: p.recipientName,
          product: p.designation?.trim() || p.notes?.trim() || null,
          sale: salePriceOf(m),
          base: m.price,
          profit: parcelProfitOf(m),
          inStock: PREP.has(p.status) || PIPE.has(p.status),
        };
      });
  }, [list, stage]);

  const {
    sorted: sortedInventory,
    sortKey: inventorySortKey,
    sortDir: inventorySortDir,
    toggleSort: toggleInventorySort,
  } = useTableSort<InventoryRow, InventorySortKey>(
    inventory,
    INVENTORY_SORT,
    "code",
    "asc",
  );
  const inventoryRows = sortedInventory.slice(0, 100);

  const ledgerRows = useMemo((): LedgerRow[] => {
    return list
      .filter((p) => isDeliveredStatus(p.status) || isReturnStatus(p.status))
      .map((p) => {
        const m = moneyOf(p);
        return {
          id: p.id,
          code: p.code ?? `#${p.id}`,
          status: p.status,
          sale: salePriceOf(m),
          cod: m.price,
          deliveryFee: deliveryFeeOf(m),
          returnFee: isReturnStatus(p.status) ? returnFeeOf(m) : 0,
          profit: parcelProfitOf(m),
        };
      });
  }, [list]);

  const {
    sorted: sortedLedger,
    sortKey: ledgerSortKey,
    sortDir: ledgerSortDir,
    toggleSort: toggleLedgerSort,
  } = useTableSort<LedgerRow, LedgerSortKey>(
    ledgerRows,
    LEDGER_SORT,
    "code",
    "asc",
  );
  const ledgerVisible = sortedLedger.slice(0, 60);

  const error = analytics.error || parcels.error;
  const loading = analytics.loading || parcels.loading;
  const margin = soldes?.profit ?? 0;

  return (
    <div className="w-full space-y-5 pb-8 lg:space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold tracking-tight text-ops-ink lg:text-3xl">
            {t("finances.title")}
          </h1>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ops-ink/35">
            {t("finances.openStockValue")}
          </p>
          <p className="mt-0.5 whitespace-nowrap font-display text-xl font-extrabold tabular-nums leading-none text-ops-ink sm:text-2xl lg:text-3xl">
            {loading ? "…" : formatTnd(counts.openValue)}
          </p>
        </div>
      </header>

      {error ? (
        <ErrorBanner
          message={error}
          onRetry={() => {
            void analytics.reload();
            void parcels.reload();
          }}
        />
      ) : null}

      <dl className="grid grid-cols-3 divide-x divide-ops-card rounded-xl border border-ops-card bg-ops-surface">
        <div className="px-2 py-3 text-center sm:px-3 lg:px-6 lg:py-4 lg:text-left">
          <dt className="text-[10px] font-medium text-ops-ink/40 lg:text-xs">
            {t("finances.haveStock")}
          </dt>
          <dd className="mt-0.5 font-display text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 lg:text-2xl">
            {loading ? "…" : counts.open}
          </dd>
        </div>
        <div className="px-2 py-3 text-center sm:px-3 lg:px-6 lg:py-4 lg:text-left">
          <dt className="text-[10px] font-medium text-ops-ink/40 lg:text-xs">
            {t("finances.notInStock")}
          </dt>
          <dd className="mt-0.5 font-display text-lg font-bold tabular-nums text-ops-ink lg:text-2xl">
            {loading ? "…" : counts.closed}
          </dd>
        </div>
        <div className="min-w-0 px-2 py-3 text-center sm:px-3 lg:px-6 lg:py-4 lg:text-left">
          <dt className="text-[10px] font-medium text-ops-ink/40 lg:text-xs">
            {t("finances.margin")}
          </dt>
          <dd
            className={cn(
              "mt-0.5 whitespace-nowrap font-display text-base font-bold tabular-nums sm:text-lg lg:text-2xl",
              margin >= 0 ? "text-ops-ink" : "text-ops-accent",
            )}
          >
            {loading ? "…" : formatTnd(margin)}
          </dd>
        </div>
      </dl>

      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-ops-ink lg:text-base">
            {t("finances.inventoryTitle")}
            <span className="ms-1.5 font-normal text-ops-ink/35">
              ({inventory.length})
            </span>
          </h2>
          <p className="text-xs text-ops-ink/40">{t("finances.stockLead")}</p>
        </div>
        <div
          role="tablist"
          aria-label={t("finances.stockLead")}
          className="space-y-1.5 lg:space-y-2"
        >
          {filters
            .filter((f) => f.key === "all")
            .map((f) => {
              const active = stage === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStage(f.key)}
                  className={cn(
                    "flex min-h-[3.25rem] w-full flex-row items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-start transition sm:min-h-14",
                    active
                      ? "border-ops-accent bg-ops-accent text-white"
                      : "border-ops-card bg-ops-surface text-ops-ink/70 hover:border-ops-ink/20 active:bg-ops-page",
                  )}
                >
                  <span className="text-[13px] font-semibold sm:text-sm lg:text-base">
                    {f.label}
                  </span>
                  <span
                    className={cn(
                      "text-base font-bold tabular-nums leading-none",
                      active ? "text-white" : "text-ops-ink",
                    )}
                  >
                    {loading ? "…" : f.count}
                  </span>
                </button>
              );
            })}
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:gap-2">
            {filters
              .filter((f) => f.key !== "all")
              .map((f) => {
                const active = stage === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStage(f.key)}
                    className={cn(
                      "flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-2 text-center transition sm:min-h-14",
                      active
                        ? "border-ops-accent bg-ops-accent text-white"
                        : "border-ops-card bg-ops-surface text-ops-ink/70 hover:border-ops-ink/20 active:bg-ops-page",
                    )}
                  >
                    <span className="w-full text-[11px] font-semibold leading-snug sm:text-xs lg:text-sm">
                      {f.label}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums leading-none",
                        active ? "text-white" : "text-ops-ink",
                      )}
                    >
                      {loading ? "…" : f.count}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      </section>

      <section className="space-y-2.5">

        {inventory.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t("finances.inventoryEmpty")}
            description={t("finances.inventoryEmptyHint")}
          />
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {inventoryRows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/expediteur/parcels/${r.id}`}
                    className="block rounded-2xl border border-ops-card bg-ops-surface p-3.5 transition active:bg-ops-page"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-ops-accent">
                          {r.code}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-ops-ink">
                          {r.product || t("finances.productFallback")}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ops-ink/45">
                          {r.recipient || "—"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-ops-ink/40">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">
                            {r.city || "—"}
                            {r.governorate
                              ? ` · ${displayGovernorate(r.governorate)}`
                              : ""}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="font-display text-base font-bold tabular-nums text-ops-ink">
                          {formatTnd(r.sale)}
                        </p>
                        <p className="text-[10px] tabular-nums text-ops-ink/40">
                          {t("finances.colCodShort")}: {formatTnd(r.base)}
                        </p>
                        <ChevronRight
                          className="h-4 w-4 text-ops-ink/25"
                          aria-hidden
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge status={r.status} />
                      {r.profit != null ? (
                        <Badge tone={r.profit >= 0 ? "success" : "danger"}>
                          {t("finances.profitCol")} {formatTnd(r.profit)}
                        </Badge>
                      ) : (
                        <Badge tone={r.inStock ? "success" : "neutral"}>
                          {r.inStock
                            ? t("finances.inStockBadge")
                            : t("finances.outStockBadge")}
                        </Badge>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-hidden rounded-2xl border border-ops-card bg-ops-surface md:block">
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <SortableTh
                      label={t("finances.colParcel")}
                      column="code"
                      activeKey={inventorySortKey}
                      sortDir={inventorySortDir}
                      onSort={toggleInventorySort}
                    />
                    <SortableTh
                      label={t("finances.productName")}
                      column="product"
                      activeKey={inventorySortKey}
                      sortDir={inventorySortDir}
                      onSort={toggleInventorySort}
                    />
                    <SortableTh
                      label={t("finances.colPlace")}
                      column="place"
                      activeKey={inventorySortKey}
                      sortDir={inventorySortDir}
                      onSort={toggleInventorySort}
                    />
                    <SortableTh
                      label={t("common.status")}
                      column="status"
                      activeKey={inventorySortKey}
                      sortDir={inventorySortDir}
                      onSort={toggleInventorySort}
                    />
                    <SortableTh
                      label={t("finances.colSale")}
                      column="sale"
                      activeKey={inventorySortKey}
                      sortDir={inventorySortDir}
                      onSort={toggleInventorySort}
                      className="text-right"
                      buttonClassName="ml-auto"
                    />
                    <SortableTh
                      label={t("finances.colCodShort")}
                      column="base"
                      activeKey={inventorySortKey}
                      sortDir={inventorySortDir}
                      onSort={toggleInventorySort}
                      className="hidden text-right lg:table-cell"
                      buttonClassName="ml-auto"
                    />
                    <SortableTh
                      label={t("finances.profitCol")}
                      column="profit"
                      activeKey={inventorySortKey}
                      sortDir={inventorySortDir}
                      onSort={toggleInventorySort}
                      className="hidden text-right xl:table-cell"
                      buttonClassName="ml-auto"
                    />
                  </tr>
                </thead>
                <tbody>
                  {inventoryRows.map((r) => (
                    <tr key={r.id} className={trClass}>
                      <td className={tdClass}>
                        <Link
                          href={`/expediteur/parcels/${r.id}`}
                          className="font-mono text-xs font-semibold text-ops-ink hover:text-ops-accent"
                        >
                          {r.code}
                        </Link>
                      </td>
                      <td className={tdClass}>
                        <p className="text-sm font-medium text-ops-ink">
                          {r.product || t("finances.productFallback")}
                        </p>
                        <p className="text-[11px] text-ops-ink/40">
                          {r.recipient || "—"}
                        </p>
                      </td>
                      <td className={tdClass}>
                        <p className="text-sm text-ops-ink">{r.city || "—"}</p>
                        <p className="text-[11px] text-ops-ink/40">
                          {displayGovernorate(r.governorate || "—")}
                        </p>
                      </td>
                      <td className={tdClass}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums`}>
                        {formatTnd(r.sale)}
                      </td>
                      <td
                        className={`${tdClass} hidden text-right tabular-nums text-ops-ink/55 lg:table-cell`}
                      >
                        {formatTnd(r.base)}
                      </td>
                      <td
                        className={`${tdClass} hidden text-right font-semibold tabular-nums xl:table-cell ${
                          r.profit == null
                            ? "text-ops-ink/35"
                            : r.profit >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-ops-accent"
                        }`}
                      >
                        {r.profit != null ? formatTnd(r.profit) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-ops-ink">
          {t("finances.ledgerTitle")}
        </h2>
        {ledgerRows.length === 0 ? (
          <p className="text-sm text-ops-ink/40">{t("finances.emptyDescription")}</p>
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {ledgerVisible.map((r) => {
                const isReturn = isReturnStatus(r.status);
                const profit = r.profit ?? 0;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/expediteur/parcels/${r.id}`}
                      className="block rounded-2xl border border-ops-card bg-ops-surface p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-xs font-bold text-ops-ink">
                            {r.code}
                          </p>
                          <Badge
                            tone={isReturn ? "danger" : "success"}
                            className="mt-1.5"
                          >
                            {isReturn
                              ? t("finances.badgeReturn")
                              : t("finances.badgeDelivered")}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-ops-ink/40">
                            {t("finances.profitCol")}
                          </p>
                          <p
                            className={cn(
                              "inline-flex items-center gap-1 font-display text-base font-bold tabular-nums",
                              profit >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-ops-accent",
                            )}
                          >
                            {profit >= 0 ? (
                              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                            )}
                            {formatTnd(profit)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-ops-card pt-2.5 text-center">
                        <div>
                          <p className="text-[10px] text-ops-ink/35">
                            {t("finances.colSale")}
                          </p>
                          <p className="text-xs font-semibold tabular-nums text-ops-ink">
                            {formatTnd(r.sale)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-ops-ink/35">
                            {t("finances.colDelivery")}
                          </p>
                          <p className="text-xs font-semibold tabular-nums text-ops-ink">
                            {formatTnd(r.deliveryFee)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-ops-ink/35">
                            {t("finances.colReturn")}
                          </p>
                          <p className="text-xs font-semibold tabular-nums text-ops-ink">
                            {r.returnFee ? formatTnd(r.returnFee) : "—"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-hidden rounded-2xl border border-ops-card bg-ops-surface md:block">
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <SortableTh
                      label={t("finances.colParcel")}
                      column="code"
                      activeKey={ledgerSortKey}
                      sortDir={ledgerSortDir}
                      onSort={toggleLedgerSort}
                    />
                    <SortableTh
                      label={t("common.status")}
                      column="status"
                      activeKey={ledgerSortKey}
                      sortDir={ledgerSortDir}
                      onSort={toggleLedgerSort}
                    />
                    <SortableTh
                      label={t("finances.colSale")}
                      column="sale"
                      activeKey={ledgerSortKey}
                      sortDir={ledgerSortDir}
                      onSort={toggleLedgerSort}
                      className="text-right"
                      buttonClassName="ml-auto"
                    />
                    <SortableTh
                      label={t("finances.colCodShort")}
                      column="cod"
                      activeKey={ledgerSortKey}
                      sortDir={ledgerSortDir}
                      onSort={toggleLedgerSort}
                      className="text-right"
                      buttonClassName="ml-auto"
                    />
                    <SortableTh
                      label={t("finances.colDelivery")}
                      column="deliveryFee"
                      activeKey={ledgerSortKey}
                      sortDir={ledgerSortDir}
                      onSort={toggleLedgerSort}
                      className="text-right"
                      buttonClassName="ml-auto"
                    />
                    <SortableTh
                      label={t("finances.colReturn")}
                      column="returnFee"
                      activeKey={ledgerSortKey}
                      sortDir={ledgerSortDir}
                      onSort={toggleLedgerSort}
                      className="text-right"
                      buttonClassName="ml-auto"
                    />
                    <SortableTh
                      label={t("finances.profitCol")}
                      column="profit"
                      activeKey={ledgerSortKey}
                      sortDir={ledgerSortDir}
                      onSort={toggleLedgerSort}
                      className="text-right"
                      buttonClassName="ml-auto"
                    />
                  </tr>
                </thead>
                <tbody>
                  {ledgerVisible.map((r) => (
                    <tr key={r.id} className={trClass}>
                      <td className={tdClass}>
                        <Link
                          href={`/expediteur/parcels/${r.id}`}
                          className="font-mono text-xs font-semibold hover:text-ops-accent"
                        >
                          {r.code}
                        </Link>
                      </td>
                      <td className={tdClass}>
                        <Badge
                          tone={
                            isReturnStatus(r.status) ? "danger" : "success"
                          }
                        >
                          {isReturnStatus(r.status)
                            ? t("finances.badgeReturn")
                            : t("finances.badgeDelivered")}
                        </Badge>
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {formatTnd(r.sale)}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {formatTnd(r.cod)}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {formatTnd(r.deliveryFee)}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {r.returnFee ? formatTnd(r.returnFee) : "—"}
                      </td>
                      <td
                        className={`${tdClass} text-right font-semibold tabular-nums ${
                          (r.profit ?? 0) >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-ops-accent"
                        }`}
                      >
                        {r.profit != null ? formatTnd(r.profit) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
