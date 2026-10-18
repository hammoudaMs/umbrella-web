"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, MapPin, Trophy, TrendingDown } from "lucide-react";
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
import { isDeliveredStatus } from "@/lib/sender-finance";
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
  finished: number;
  unfinished: number;
  total: number;
  score: number;
  valueOpen: number;
  valueFinished: number;
  parcels: Parcel[];
};

type GroupBy = "city" | "governorate";

const fieldClass =
  "w-full rounded-xl border border-ops-card bg-ops-surface px-3 py-2.5 text-sm text-ops-ink outline-none ring-ops-accent focus:ring-2 disabled:opacity-50";

function isActiveParcel(p: Parcel): boolean {
  return p.status !== "SUPPRIME";
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
        finished: 0,
        unfinished: 0,
        total: 0,
        score: 0,
        valueOpen: 0,
        valueFinished: 0,
        parcels: [],
      };
      map.set(key, row);
    }
    row.total += 1;
    row.parcels.push(p);
    const sale =
      p.unitSalePrice != null && Number.isFinite(toAmount(p.unitSalePrice))
        ? toAmount(p.unitSalePrice)
        : toAmount(p.price);
    if (isDeliveredStatus(p.status)) {
      row.finished += 1;
      row.valueFinished += sale;
    } else {
      row.unfinished += 1;
      row.valueOpen += sale;
    }
  }

  return Array.from(map.values()).map((row) => ({
    ...row,
    score: row.finished - row.unfinished,
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
      if (b.finished !== a.finished) return b.finished - a.finished;
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
    setGroupBy("city");
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ops-ink">
          {t("finances.placesTitle")}
        </h2>
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
                  ? "bg-ops-accent text-white"
                  : "text-ops-ink/45",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("finances.searchPlace")}
          className="col-span-2"
        />
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
        <button
          type="button"
          onClick={resetFilters}
          className="col-span-2 text-left text-[11px] font-semibold text-ops-ink/40"
        >
          {t("finances.resetFilters")}
        </button>
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
            rows={ranked.best.length > 0 ? ranked.best : ranked.all.slice(0, 5)}
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

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.label ?? ""}
        description={
          detail
            ? `${displayGovernorate(detail.governorate)}${
                groupBy === "city" && detail.city !== "—"
                  ? ` · ${detail.city}`
                  : ""
              }`
            : undefined
        }
        size="xl"
      >
        {detail ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MiniStat
                label={t("finances.finished")}
                value={String(detail.finished)}
              />
              <MiniStat
                label={t("finances.unfinished")}
                value={String(detail.unfinished)}
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
              <MiniStat
                label={t("finances.openValue")}
                value={formatTnd(detail.valueOpen)}
              />
            </div>
            <ScoreBar score={detail.score} maxAbs={maxAbs} />
            <div className="overflow-x-auto rounded-2xl border border-ops-card">
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>{t("finances.colParcel")}</th>
                    <th className={thClass}>{t("common.status")}</th>
                    <th className={`${thClass} text-right`}>
                      {t("finances.colSale")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detail.parcels.map((p) => {
                    const sale =
                      p.unitSalePrice != null
                        ? toAmount(p.unitSalePrice)
                        : toAmount(p.price);
                    return (
                      <tr key={p.id} className={trClass}>
                        <td className={tdClass}>
                          <Link
                            href={`/expediteur/parcels/${p.id}`}
                            className="font-mono text-xs font-semibold text-ops-ink hover:text-ops-accent"
                            onClick={() => setDetail(null)}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ops-ink/40">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-xl font-extrabold tabular-nums",
          accent ?? "text-ops-ink",
        )}
      >
        {value}
      </p>
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
              {row.finished}/{row.unfinished}
            </span>
            <ChevronRight className="h-4 w-4 text-ops-ink/20 transition group-hover:text-ops-accent" />
          </div>
        </div>
        <div className="mt-2.5">
          <ScoreBar score={row.score} maxAbs={maxAbs} />
        </div>
        {!compact && row.valueOpen > 0 ? (
          <p className="mt-1.5 text-[11px] text-ops-ink/40">
            {t("finances.openValue")} {formatTnd(row.valueOpen)}
          </p>
        ) : null}
      </button>
    </li>
  );
}
