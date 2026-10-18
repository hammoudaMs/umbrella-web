"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Boxes,
  Package,
  PackageCheck,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";
import { SenderPlacePerformance } from "@/components/SenderPlacePerformance";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SegmentedTabs,
  StatCard,
  StatusBadge,
  TableCard,
  tableClass,
  tdClass,
  theadClass,
  thClass,
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
import { useApiQuery } from "@/lib/use-api";

type AnalyticsPayload = {
  soldes?: {
    fraisLivraison?: number;
    retoursFrais?: number;
    profit?: number;
    ventes?: number;
    encaisse?: number;
  };
  kpis?: {
    delivered: number;
    returns: number;
    profit?: number;
    ventes?: number;
  };
};

type StockBucket = {
  key: string;
  label: string;
  hint: string;
  icon: typeof Package;
  count: number;
  value: number;
  tone: "neutral" | "brand" | "gold" | "success";
};

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
    deliveryFee: toAmount(p.deliveryFee ?? 0),
    returnFee: toAmount(p.returnFee ?? 0),
    status: p.status,
  };
}

function parcelValue(p: Parcel): number {
  return salePriceOf(moneyOf(p));
}

type StockView = "open" | "closed" | "all";

export function SenderFinancesPage() {
  const t = useT();
  const analytics = useApiQuery<AnalyticsPayload>("/dashboard/analytics");
  const parcels = useApiQuery<Parcel[]>("/parcels");
  const [stockView, setStockView] = useState<StockView>("open");

  const soldes = analytics.data?.soldes;
  const list = useMemo(
    () => (parcels.data ?? []).filter((p) => p.status !== "SUPPRIME"),
    [parcels.data],
  );

  const stock = useMemo(() => {
    const buckets: StockBucket[] = [
      {
        key: "prep",
        label: t("finances.stockPrep"),
        hint: t("finances.stockPrepHint"),
        icon: Package,
        count: 0,
        value: 0,
        tone: "gold",
      },
      {
        key: "pipe",
        label: t("finances.stockPipe"),
        hint: t("finances.stockPipeHint"),
        icon: Truck,
        count: 0,
        value: 0,
        tone: "brand",
      },
      {
        key: "delivered",
        label: t("finances.stockDelivered"),
        hint: t("finances.stockDeliveredHint"),
        icon: PackageCheck,
        count: 0,
        value: 0,
        tone: "success",
      },
      {
        key: "returns",
        label: t("finances.stockReturns"),
        hint: t("finances.stockReturnsHint"),
        icon: RotateCcw,
        count: 0,
        value: 0,
        tone: "neutral",
      },
    ];

    for (const p of list) {
      const value = parcelValue(p);
      if (PREP.has(p.status)) {
        buckets[0].count += 1;
        buckets[0].value += value;
      } else if (PIPE.has(p.status)) {
        buckets[1].count += 1;
        buckets[1].value += value;
      } else if (isDeliveredStatus(p.status)) {
        buckets[2].count += 1;
        buckets[2].value += value;
      } else if (isReturnStatus(p.status)) {
        buckets[3].count += 1;
        buckets[3].value += value;
      }
    }

    return buckets;
  }, [list, t]);

  const openStockValue = stock[0].value + stock[1].value;
  const openStockCount = stock[0].count + stock[1].count;
  const closedCount = stock[2].count + stock[3].count;
  const closedValue = stock[2].value + stock[3].value;

  const inventory = useMemo(() => {
    return list
      .filter((p) => {
        const open = PREP.has(p.status) || PIPE.has(p.status);
        const closed = isDeliveredStatus(p.status) || isReturnStatus(p.status);
        if (stockView === "open") return open;
        if (stockView === "closed") return closed;
        return open || closed;
      })
      .slice(0, 100)
      .map((p) => {
        const m = moneyOf(p);
        return {
          id: p.id,
          code: p.code ?? `#${p.id}`,
          status: p.status,
          city: p.city,
          governorate: p.governorate,
          sale: salePriceOf(m),
          cod: m.price,
          deliveryFee: deliveryFeeOf(m),
          returnFee: isReturnStatus(p.status) ? returnFeeOf(m) : 0,
          profit: parcelProfitOf(m),
          inStock: PREP.has(p.status) || PIPE.has(p.status),
        };
      });
  }, [list, stockView]);

  const ledgerRows = useMemo(() => {
    return list
      .filter((p) => isDeliveredStatus(p.status) || isReturnStatus(p.status))
      .slice(0, 80)
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

  const error = analytics.error || parcels.error;
  const loading = analytics.loading || parcels.loading;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("finances.eyebrow")}
        title={t("finances.title")}
        description={t("finances.description")}
      />

      {error ? (
        <ErrorBanner
          message={error}
          onRetry={() => {
            void analytics.reload();
            void parcels.reload();
          }}
        />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-ops-card bg-ops-surface shadow-ops">
        <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-b border-ops-card px-5 py-4 sm:border-e lg:border-b-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ops-ink/45">
              {t("finances.openStockValue")}
            </p>
            <p className="mt-1.5 font-display text-2xl font-extrabold tabular-nums text-ops-ink">
              {loading ? "…" : formatTnd(openStockValue)}
            </p>
            <p className="mt-1 text-xs text-ops-ink/45">
              {t("finances.openStockHint", { count: openStockCount })}
            </p>
          </div>
          <div className="border-b border-ops-card px-5 py-4 sm:border-b-0 lg:border-e">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ops-ink/45">
              {t("finances.haveStock")}
            </p>
            <p className="mt-1.5 font-display text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
              {loading ? "…" : openStockCount}
            </p>
            <p className="mt-1 text-xs text-ops-ink/45">
              {t("finances.haveStockHint", {
                value: formatTnd(openStockValue),
              })}
            </p>
          </div>
          <div className="border-b border-ops-card px-5 py-4 sm:border-e lg:border-b-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ops-ink/45">
              {t("finances.notInStock")}
            </p>
            <p className="mt-1.5 font-display text-2xl font-extrabold tabular-nums text-ops-ink">
              {loading ? "…" : closedCount}
            </p>
            <p className="mt-1 text-xs text-ops-ink/45">
              {t("finances.notInStockHint", {
                value: formatTnd(closedValue),
              })}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ops-ink/45">
              {t("finances.margin")}
            </p>
            <p className="mt-1.5 font-display text-2xl font-extrabold tabular-nums text-ops-ink">
              {loading ? "…" : formatTnd(soldes?.profit ?? 0)}
            </p>
            <p className="mt-1 text-xs text-ops-ink/45">
              {t("finances.salesHint")} · {t("finances.feesHint", {
                liv: formatTnd(soldes?.fraisLivraison ?? 0),
                ret: formatTnd(soldes?.retoursFrais ?? 0),
              })}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ops-ink">
              {t("finances.stockTitle")}
            </h2>
            <p className="text-sm text-ops-ink/45">{t("finances.stockLead")}</p>
          </div>
          <Boxes className="hidden h-5 w-5 text-ops-ink/25 sm:block" aria-hidden />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stock.map((bucket) => {
            const Icon = bucket.icon;
            return (
              <StatCard
                key={bucket.key}
                icon={Icon}
                tone={bucket.tone}
                label={bucket.label}
                value={loading ? "…" : bucket.count}
                hint={`${formatTnd(bucket.value)} · ${bucket.hint}`}
              />
            );
          })}
        </div>
      </section>

      <TableCard
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ops-ink">
                {t("finances.inventoryTitle")}
              </p>
              <p className="text-xs text-ops-ink/45">
                {t("finances.inventoryHint")}
              </p>
            </div>
            <SegmentedTabs<StockView>
              label={t("finances.filterStock")}
              value={stockView}
              onChange={setStockView}
              options={[
                {
                  value: "open",
                  label: t("finances.stockOpenOnly"),
                  count: openStockCount,
                },
                {
                  value: "closed",
                  label: t("finances.stockClosedOnly"),
                  count: closedCount,
                },
                {
                  value: "all",
                  label: t("finances.stockAll"),
                  count: list.length,
                },
              ]}
            />
          </div>
        }
      >
        {inventory.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t("finances.inventoryEmpty")}
            description={t("finances.inventoryEmptyHint")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>{t("finances.colParcel")}</th>
                  <th className={thClass}>{t("finances.colPlace")}</th>
                  <th className={thClass}>{t("common.status")}</th>
                  <th className={thClass}>{t("finances.colSale")}</th>
                  <th className={`${thClass} text-right`}>
                    {t("finances.stockState")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((r) => (
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
                      <p className="text-sm text-ops-ink">{r.city || "—"}</p>
                      <p className="text-[11px] text-ops-ink/40">
                        {displayGovernorate(r.governorate || "—")}
                      </p>
                    </td>
                    <td className={tdClass}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatTnd(r.sale)}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <Badge tone={r.inStock ? "success" : "neutral"}>
                        {r.inStock
                          ? t("finances.inStockBadge")
                          : t("finances.outStockBadge")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>

      <SenderPlacePerformance parcels={list} />

      <TableCard
        toolbar={
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ops-ink">
                {t("finances.ledgerTitle")}
              </p>
              <p className="text-xs text-ops-ink/45">{t("finances.ledgerHint")}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-ops-ink/45">
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                {t("finances.profitCol")}
              </span>
              <span className="inline-flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5 text-ops-accent" />
                {t("finances.fees")}
              </span>
            </div>
          </div>
        }
      >
        {ledgerRows.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t("finances.emptyTitle")}
            description={t("finances.emptyDescription")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>{t("finances.colParcel")}</th>
                  <th className={thClass}>{t("finances.colSale")}</th>
                  <th className={thClass}>{t("finances.colCod")}</th>
                  <th className={thClass}>{t("finances.colDelivery")}</th>
                  <th className={thClass}>{t("finances.colReturn")}</th>
                  <th className={`${thClass} text-right`}>
                    {t("finances.profitCol")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((r) => (
                  <tr key={r.id} className={trClass}>
                    <td className={tdClass}>
                      <Link
                        href={`/expediteur/parcels/${r.id}`}
                        className="font-mono text-xs font-semibold text-ops-ink hover:text-ops-accent"
                      >
                        {r.code}
                      </Link>
                      <div className="mt-0.5">
                        <Badge
                          tone={
                            isReturnStatus(r.status) ? "danger" : "success"
                          }
                        >
                          {isReturnStatus(r.status)
                            ? t("finances.badgeReturn")
                            : t("finances.badgeDelivered")}
                        </Badge>
                      </div>
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatTnd(r.sale)}
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatTnd(r.cod)}
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatTnd(r.deliveryFee)}
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      {r.returnFee ? formatTnd(r.returnFee) : "—"}
                    </td>
                    <td
                      className={`${tdClass} text-right font-semibold tabular-nums ${
                        (r.profit ?? 0) >= 0
                          ? "text-emerald-700 dark:text-emerald-300"
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
        )}
      </TableCard>
    </div>
  );
}
