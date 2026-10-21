"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronRight,
  MapPin,
  Package,
  Trophy,
  TrendingDown,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import {
  Badge,
  EmptyState,
  SearchInput,
  StatusBadge,
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
  roundMoney,
  salePriceOf,
  unitCostOf,
} from "@/lib/sender-finance";
import {
  citiesForGovernorate,
  governoratesWithCities,
} from "@/lib/tunisia-address";
import { cn } from "@/lib/cn";

export type PlaceRow = {
  key: string;
  label: string;
  governorate: string;
  city: string;
  delivered: number;
  inProgress: number;
  returns: number;
  total: number;
  score: number;
  valueOpen: number;
  ca: number;
  deliveryFees: number;
  capital: number;
  netProfit: number;
  parcelsInProgress: Parcel[];
  parcelsDone: Parcel[];
};

type GroupBy = "city" | "governorate";
type PlaceView = "cities" | "parcels";

const fieldClass =
  "w-full rounded-xl border border-ops-card bg-ops-surface px-3 py-2.5 text-sm text-ops-ink outline-none ring-ops-accent focus:ring-2 disabled:opacity-50";

function isActiveParcel(p: Parcel): boolean {
  return p.status !== "SUPPRIME";
}

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

function placeKey(p: Parcel, groupBy: GroupBy): string {
  const gov = p.governorate?.trim() || "—";
  const city = p.city?.trim() || "—";
  return groupBy === "governorate" ? `g:${gov}` : `c:${gov}|${city}`;
}

function placeLabel(p: Parcel, groupBy: GroupBy): string {
  const gov = p.governorate?.trim() || "—";
  const city = p.city?.trim() || "—";
  if (groupBy === "governorate") return displayGovernorate(gov);
  return city === "—" ? displayGovernorate(gov) : city;
}

function buildPlaces(parcels: Parcel[], groupBy: GroupBy): PlaceRow[] {
  const map = new Map<string, PlaceRow>();

  for (const p of parcels) {
    if (!isActiveParcel(p)) continue;
    const key = placeKey(p, groupBy);
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        label: placeLabel(p, groupBy),
        governorate: p.governorate?.trim() || "—",
        city: p.city?.trim() || "—",
        delivered: 0,
        inProgress: 0,
        returns: 0,
        total: 0,
        score: 0,
        valueOpen: 0,
        ca: 0,
        deliveryFees: 0,
        capital: 0,
        netProfit: 0,
        parcelsInProgress: [],
        parcelsDone: [],
      };
      map.set(key, row);
    }

    row.total += 1;
    const m = moneyOf(p);
    const sale = salePriceOf(m);

    if (isDeliveredStatus(p.status)) {
      row.delivered += 1;
      row.parcelsDone.push(p);
      row.ca += sale;
      row.deliveryFees += deliveryFeeOf(m);
      row.capital += unitCostOf(m);
      row.netProfit += parcelProfitOf(m) ?? 0;
    } else if (isReturnStatus(p.status)) {
      row.returns += 1;
      row.parcelsDone.push(p);
      row.deliveryFees += deliveryFeeOf(m) + returnFeeOf(m);
      row.netProfit += parcelProfitOf(m) ?? 0;
    } else {
      row.inProgress += 1;
      row.parcelsInProgress.push(p);
      row.valueOpen += sale;
    }
  }

  return Array.from(map.values()).map((row) => ({
    ...row,
    ca: roundMoney(row.ca),
    deliveryFees: roundMoney(row.deliveryFees),
    capital: roundMoney(row.capital),
    netProfit: roundMoney(row.netProfit),
    valueOpen: roundMoney(row.valueOpen),
    score: row.delivered - row.returns - row.inProgress,
  }));
}

function ScoreBar({ score, maxAbs }: { score: number; maxAbs: number }) {
  const denom = Math.max(1, maxAbs);
  const ratio = Math.min(1, Math.abs(score) / denom);
  const widthPct = ratio * 50;

  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-ops-ink/[0.08]">
      <span
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-ops-ink/20"
        aria-hidden
      />
      {score > 0 ? (
        <span
          className="absolute inset-y-0 left-1/2 rounded-r-full bg-emerald-500"
          style={{ width: `${widthPct}%` }}
        />
      ) : null}
      {score < 0 ? (
        <span
          className="absolute inset-y-0 rounded-l-full bg-ops-accent"
          style={{
            width: `${widthPct}%`,
            right: "50%",
            left: "auto",
          }}
        />
      ) : null}
    </div>
  );
}

function scoreLabel(score: number): string {
  if (score > 0) return `+${score}`;
  return String(score);
}

export function SenderPlacePerformance({ parcels }: { parcels: Parcel[] }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("city");
  const [view, setView] = useState<PlaceView>("cities");
  const [detail, setDetail] = useState<PlaceRow | null>(null);

  const cityOptions = useMemo(
    () => (governorate ? citiesForGovernorate(governorate) : []),
    [governorate],
  );

  const filteredParcels = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parcels.filter((p) => {
      if (!isActiveParcel(p)) return false;
      if (governorate && p.governorate !== governorate) return false;
      if (city && p.city !== city) return false;
      if (q) {
        const hay = [p.city, p.governorate, p.code, p.recipientName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [parcels, query, governorate, city]);

  const places = useMemo(
    () => buildPlaces(filteredParcels, groupBy),
    [filteredParcels, groupBy],
  );

  const maxAbs = useMemo(
    () => Math.max(1, ...places.map((p) => Math.abs(p.score))),
    [places],
  );

  const ranked = useMemo(() => {
    const sorted = [...places].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.delivered !== a.delivered) return b.delivered - a.delivered;
      return a.label.localeCompare(b.label, "fr");
    });
    const best = sorted.filter((p) => p.score > 0).slice(0, 5);
    const worst = [...sorted]
      .filter((p) => p.score < 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);
    return { best, worst, all: sorted };
  }, [places]);

  function resetFilters() {
    setQuery("");
    setGovernorate("");
    setCity("");
  }

  const parcelRows = useMemo(() => {
    return [...filteredParcels].sort((a, b) => {
      const placeA = `${a.governorate} ${a.city}`;
      const placeB = `${b.governorate} ${b.city}`;
      const byPlace = placeA.localeCompare(placeB, "fr");
      if (byPlace !== 0) return byPlace;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
  }, [filteredParcels]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ops-ink">
          {view === "cities"
            ? t("finances.placesBestWorst")
            : t("finances.viewParcels")}
        </h2>
        <div className="inline-flex rounded-lg border border-ops-card p-0.5">
          {(
            [
              ["cities", t("finances.viewCities")],
              ["parcels", t("finances.viewParcels")],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-semibold transition",
                view === value
                  ? "bg-ops-accent text-white"
                  : "text-ops-ink/45",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4 md:gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("finances.searchPlace")}
          className="col-span-2 md:col-span-2"
        />
        <label className="block min-w-0">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ops-ink/40">
            {t("finances.filterGov")}
          </span>
          <select
            aria-label={t("finances.filterGov")}
            className={fieldClass}
            value={governorate}
            onChange={(e) => {
              setGovernorate(e.target.value);
              setCity("");
            }}
          >
            <option value="">{t("finances.allGov")}</option>
            {Object.keys(governoratesWithCities).map((gov) => (
              <option key={gov} value={gov}>
                {displayGovernorate(gov)}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ops-ink/40">
            {t("finances.filterCity")}
          </span>
          <select
            aria-label={t("finances.filterCity")}
            className={fieldClass}
            value={city}
            disabled={!governorate}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">{t("finances.allCities")}</option>
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={resetFilters}
          className="col-span-2 self-end text-left text-[11px] font-semibold text-ops-ink/40 md:col-span-4"
        >
          {t("finances.resetFilters")}
        </button>
      </div>

      {view === "cities" ? (
        <>
          <div className="flex justify-end">
            <div className="inline-flex rounded-lg border border-ops-card p-0.5">
              {(
                [
                  ["city", t("finances.groupCity")],
                  ["governorate", t("finances.groupGov")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGroupBy(value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-semibold transition",
                    groupBy === value
                      ? "bg-ops-ink/10 text-ops-ink"
                      : "text-ops-ink/40",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {places.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title={t("finances.placesEmpty")}
              description={t("finances.placesEmptyHint")}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <PlaceList
                title={t("finances.bestPlaces")}
                icon={Trophy}
                tone="good"
                rows={
                  ranked.best.length > 0
                    ? ranked.best
                    : ranked.all.slice(0, 5)
                }
                maxAbs={maxAbs}
                empty={t("finances.noBestYet")}
                onOpen={setDetail}
                t={t}
              />
              <PlaceList
                title={t("finances.worstPlaces")}
                icon={TrendingDown}
                tone="bad"
                rows={
                  ranked.worst.length > 0
                    ? ranked.worst
                    : [...ranked.all].reverse().slice(0, 5)
                }
                maxAbs={maxAbs}
                empty={t("finances.noWorstYet")}
                onOpen={setDetail}
                t={t}
              />
            </div>
          )}

          {places.length > 0 ? (
            <div className="overflow-hidden rounded-3xl border border-ops-card bg-ops-surface">
              <div className="border-b border-ops-card px-5 py-3.5">
                <p className="text-sm font-semibold text-ops-ink">
                  {t("finances.allPlaces", { count: ranked.all.length })}
                </p>
              </div>
              <ul className="divide-y divide-ops-card">
                {ranked.all.map((row) => (
                  <PlaceRowItem
                    key={row.key}
                    row={row}
                    maxAbs={maxAbs}
                    onOpen={() => setDetail(row)}
                    t={t}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : parcelRows.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t("finances.placesParcelsEmpty")}
          description={t("finances.placesParcelsEmptyHint")}
        />
      ) : (
        <ParcelsByPlaceList parcels={parcelRows} t={t} />
      )}

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.label ?? ""}
        description={
          detail
            ? detail.key.startsWith("g:")
              ? t("finances.placeGovDetail", {
                  count: detail.total,
                })
              : `${displayGovernorate(detail.governorate)}${
                  detail.city !== "—" ? ` · ${detail.city}` : ""
                }`
            : undefined
        }
        size="xl"
      >
        {detail ? (
          <PlaceDetailBody
            detail={detail}
            showCities={detail.key.startsWith("g:")}
            maxAbs={maxAbs}
            onOpenCity={(cityRow) => setDetail(cityRow)}
            t={t}
          />
        ) : null}
      </Modal>
    </section>
  );
}

function PlaceDetailBody({
  detail,
  showCities,
  maxAbs,
  onOpenCity,
  t,
}: {
  detail: PlaceRow;
  showCities: boolean;
  maxAbs: number;
  onOpenCity: (row: PlaceRow) => void;
  t: ReturnType<typeof useT>;
}) {
  const cityRows = useMemo(() => {
    if (!showCities) return [];
    const all = [...detail.parcelsInProgress, ...detail.parcelsDone];
    return buildPlaces(all, "city").sort((a, b) => {
      if (b.netProfit !== a.netProfit) return b.netProfit - a.netProfit;
      return a.label.localeCompare(b.label, "fr");
    });
  }, [detail, showCities]);

  const cityMaxAbs = useMemo(
    () => Math.max(1, ...cityRows.map((c) => Math.abs(c.score))),
    [cityRows],
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label={t("finances.placeDelivered")}
          value={String(detail.delivered)}
        />
        <MiniStat
          label={t("finances.placeInProgress")}
          value={String(detail.inProgress)}
        />
        <MiniStat
          label={t("finances.placeReturns")}
          value={String(detail.returns)}
        />
        <MiniStat
          label={t("finances.score")}
          value={scoreLabel(detail.score)}
          accent={
            detail.score > 0
              ? "text-emerald-700 dark:text-emerald-300"
              : detail.score < 0
                ? "text-ops-accent"
                : undefined
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label={t("finances.placeCa")}
          value={formatTnd(detail.ca)}
          hint={t("finances.placeCaHint")}
        />
        <MiniStat
          label={t("finances.placeFees")}
          value={formatTnd(detail.deliveryFees)}
          hint={t("finances.placeFeesHint")}
        />
        <MiniStat
          label={t("finances.placeCapital")}
          value={formatTnd(detail.capital)}
          hint={t("finances.placeCapitalHint")}
        />
        <MiniStat
          label={t("finances.placeNet")}
          value={formatTnd(detail.netProfit)}
          hint={t("finances.placeNetHint")}
          accent={
            detail.netProfit >= 0
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-ops-accent"
          }
        />
      </div>

      {detail.valueOpen > 0 ? (
        <p className="text-xs text-ops-ink/45">
          {t("finances.openValue")} ·{" "}
          <strong className="tabular-nums text-ops-ink">
            {formatTnd(detail.valueOpen)}
          </strong>
        </p>
      ) : null}

      <ScoreBar score={detail.score} maxAbs={maxAbs} />

      {showCities ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ops-ink">
            {t("finances.placeCities")}
            <span className="ms-1.5 font-normal text-ops-ink/35">
              ({cityRows.length})
            </span>
          </h3>
          {cityRows.length === 0 ? (
            <p className="text-xs text-ops-ink/40">
              {t("finances.placeCitiesEmpty")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-ops-card">
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>{t("finances.groupCity")}</th>
                    <th className={`${thClass} text-right`}>
                      {t("finances.placeDelivered")}
                    </th>
                    <th className={`${thClass} text-right`}>
                      {t("finances.placeInProgress")}
                    </th>
                    <th className={`${thClass} hidden text-right sm:table-cell`}>
                      {t("finances.placeReturns")}
                    </th>
                    <th className={`${thClass} text-right`}>
                      {t("finances.placeCa")}
                    </th>
                    <th className={`${thClass} hidden text-right md:table-cell`}>
                      {t("finances.placeFees")}
                    </th>
                    <th className={`${thClass} hidden text-right md:table-cell`}>
                      {t("finances.placeCapital")}
                    </th>
                    <th className={`${thClass} text-right`}>
                      {t("finances.placeNet")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cityRows.map((city) => (
                    <tr key={city.key} className={trClass}>
                      <td className={tdClass}>
                        <button
                          type="button"
                          onClick={() => onOpenCity(city)}
                          className="group flex w-full min-w-0 items-center justify-between gap-2 text-left"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ops-ink group-hover:text-ops-accent">
                              {city.label}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-ops-ink/40">
                              {city.total} {t("finances.parcelsShort")} ·{" "}
                              {t("finances.score")} {scoreLabel(city.score)}
                            </span>
                            <span className="mt-1.5 block max-w-[10rem]">
                              <ScoreBar
                                score={city.score}
                                maxAbs={cityMaxAbs}
                              />
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-ops-ink/25 group-hover:text-ops-accent" />
                        </button>
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {city.delivered}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {city.inProgress}
                      </td>
                      <td
                        className={`${tdClass} hidden text-right tabular-nums sm:table-cell`}
                      >
                        {city.returns}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {formatTnd(city.ca)}
                      </td>
                      <td
                        className={`${tdClass} hidden text-right tabular-nums md:table-cell`}
                      >
                        {formatTnd(city.deliveryFees)}
                      </td>
                      <td
                        className={`${tdClass} hidden text-right tabular-nums md:table-cell`}
                      >
                        {formatTnd(city.capital)}
                      </td>
                      <td
                        className={cn(
                          tdClass,
                          "text-right tabular-nums font-semibold",
                          city.netProfit >= 0
                            ? "text-ops-ink"
                            : "text-ops-accent",
                        )}
                      >
                        {formatTnd(city.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      <ParcelSection
        title={t("finances.placeSectionOpen")}
        count={detail.parcelsInProgress.length}
        parcels={detail.parcelsInProgress}
        empty={t("finances.placeSectionOpenEmpty")}
        showProfit={false}
        t={t}
      />
      <ParcelSection
        title={t("finances.placeSectionDone")}
        count={detail.parcelsDone.length}
        parcels={detail.parcelsDone}
        empty={t("finances.placeSectionDoneEmpty")}
        showProfit
        t={t}
      />
    </div>
  );
}

function ParcelSection({
  title,
  count,
  parcels,
  empty,
  showProfit,
  t,
}: {
  title: string;
  count: number;
  parcels: Parcel[];
  empty: string;
  showProfit: boolean;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-ops-ink">
        {title}
        <span className="ms-1.5 font-normal text-ops-ink/35">({count})</span>
      </h3>
      {parcels.length === 0 ? (
        <p className="text-xs text-ops-ink/40">{empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ops-card">
          <table className={tableClass}>
            <thead className={theadClass}>
              <tr>
                <th className={thClass}>{t("finances.colParcel")}</th>
                <th className={thClass}>{t("common.status")}</th>
                <th className={`${thClass} text-right`}>
                  {t("finances.colSale")}
                </th>
                {showProfit ? (
                  <th className={`${thClass} hidden text-right sm:table-cell`}>
                    {t("finances.profitCol")}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {parcels.map((p) => {
                const m = moneyOf(p);
                const sale = salePriceOf(m);
                const profit = parcelProfitOf(m);
                return (
                  <tr key={p.id} className={trClass}>
                    <td className={tdClass}>
                      <Link
                        href={`/expediteur/parcels/${p.id}`}
                        className="font-mono text-xs font-semibold text-ops-ink hover:text-ops-accent"
                      >
                        {p.code ?? `#${p.id}`}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-ops-ink/40">
                        {p.recipientName}
                      </p>
                    </td>
                    <td className={tdClass}>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>
                      {formatTnd(sale)}
                    </td>
                    {showProfit ? (
                      <td
                        className={cn(
                          "hidden text-right tabular-nums sm:table-cell",
                          tdClass,
                          (profit ?? 0) >= 0
                            ? "text-ops-ink"
                            : "text-ops-accent",
                        )}
                      >
                        {profit != null ? formatTnd(profit) : "—"}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ops-ink/40">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-lg font-extrabold tabular-nums sm:text-xl",
          accent ?? "text-ops-ink",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] leading-snug text-ops-ink/35">{hint}</p>
      ) : null}
    </div>
  );
}

function ParcelsByPlaceList({
  parcels,
  t,
}: {
  parcels: Parcel[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-ops-card bg-ops-surface">
      <div className="border-b border-ops-card px-5 py-3.5">
        <p className="text-sm font-semibold text-ops-ink">
          {t("finances.viewParcels")}
          <span className="ms-1.5 font-normal text-ops-ink/35">
            ({parcels.length})
          </span>
        </p>
      </div>
      <ul className="divide-y divide-ops-card">
        {parcels.map((p) => {
          const m = moneyOf(p);
          const sale = salePriceOf(m);
          const gov = displayGovernorate(p.governorate?.trim() || "—");
          const city = p.city?.trim() || "—";
          return (
            <li key={p.id}>
              <Link
                href={`/expediteur/parcels/${p.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-ops-ink/[0.03] active:bg-ops-ink/[0.05]"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ops-ink/[0.06] text-ops-ink/50">
                  <Package className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-mono text-xs font-semibold text-ops-ink">
                      {p.code ?? `#${p.id}`}
                    </p>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-ops-ink/45">
                    {city}
                    {gov !== "—" ? ` · ${gov}` : ""}
                    {p.recipientName ? ` · ${p.recipientName}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-ops-ink">
                  {formatTnd(sale)}
                </p>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-ops-ink/25"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PlaceList({
  title,
  icon: Icon,
  tone,
  rows,
  maxAbs,
  empty,
  onOpen,
  t,
}: {
  title: string;
  icon: typeof Trophy;
  tone: "good" | "bad";
  rows: PlaceRow[];
  maxAbs: number;
  empty: string;
  onOpen: (row: PlaceRow) => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-ops-card bg-ops-surface">
      <div className="flex items-center gap-2.5 border-b border-ops-card px-5 py-3.5">
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full",
            tone === "good"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-ops-accent/10 text-ops-accent",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h3 className="font-display text-base font-bold text-ops-ink">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ops-ink/40">{empty}</p>
      ) : (
        <ul className="divide-y divide-ops-card">
          {rows.map((row) => (
            <PlaceRowItem
              key={row.key}
              row={row}
              maxAbs={maxAbs}
              onOpen={() => onOpen(row)}
              t={t}
              compact
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PlaceRowItem({
  row,
  maxAbs,
  onOpen,
  t,
  compact = false,
}: {
  row: PlaceRow;
  maxAbs: number;
  onOpen: () => void;
  t: ReturnType<typeof useT>;
  compact?: boolean;
}) {
  const positive = row.score > 0;
  const negative = row.score < 0;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group w-full text-left transition hover:bg-ops-page/50",
          compact ? "px-4 py-3" : "px-5 py-3.5",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ops-ink">{row.label}</p>
            <p className="mt-0.5 text-[11px] text-ops-ink/40">
              {displayGovernorate(row.governorate)}
              {row.city !== "—" && row.city !== row.label
                ? ` · ${row.city}`
                : ""}
              {" · "}
              {row.total} {t("finances.parcelsShort")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={positive ? "success" : negative ? "danger" : "neutral"}>
              {scoreLabel(row.score)}
            </Badge>
            <span className="tabular-nums text-xs font-semibold text-ops-ink/50">
              {row.delivered}/{row.inProgress}
            </span>
            <ChevronRight className="h-4 w-4 text-ops-ink/20 transition group-hover:text-ops-accent" />
          </div>
        </div>
        <div className="mt-2.5">
          <ScoreBar score={row.score} maxAbs={maxAbs} />
        </div>
        {!compact ? (
          <p className="mt-1.5 text-[11px] text-ops-ink/40">
            {t("finances.placeNet")} {formatTnd(row.netProfit)}
            {row.valueOpen > 0
              ? ` · ${t("finances.openValue")} ${formatTnd(row.valueOpen)}`
              : ""}
          </p>
        ) : null}
      </button>
    </li>
  );
}
