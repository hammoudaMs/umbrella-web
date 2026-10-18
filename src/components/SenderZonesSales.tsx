"use client";

import { useMemo, useState } from "react";
import { MapPin, Package, TrendingUp, Wallet } from "lucide-react";
import {
  EmptyState,
  ErrorBanner,
  PageHeader,
  Panel,
  SearchInput,
} from "@/components/ui";
import { formatTnd, type Parcel } from "@/lib/domain";
import { displayGovernorate } from "@/lib/normalize-text";
import { citiesForGovernorate, governoratesWithCities } from "@/lib/tunisia-address";
import { useApiQuery } from "@/lib/use-api";

const DELIVERED = new Set(["LIVRES", "LIVRES_PAYES"]);

type SortKey = "delivered" | "revenue" | "rate" | "total";
type ScopeKey = "delivered" | "all";

type ZoneRow = {
  key: string;
  label: string;
  governorate: string;
  city: string;
  total: number;
  delivered: number;
  revenue: number;
  avgPrice: number;
  rate: number;
};

const fieldClass =
  "w-full rounded-xl border border-ops-card bg-ops-page px-3 py-2.5 text-sm text-ops-ink outline-none ring-ops-accent focus:ring-2";

function parcelPrice(p: Parcel): number {
  const n = typeof p.price === "number" ? p.price : Number(p.price);
  return Number.isFinite(n) ? n : 0;
}

function zoneKeyOf(p: Parcel): string {
  if (p.zone?.id != null) return `z:${p.zone.id}`;
  if (p.zoneId != null) return `z:${p.zoneId}`;
  const city = p.city?.trim() || "Sans ville";
  const gov = p.governorate?.trim() || "Sans gouvernorat";
  return `c:${gov}|${city}`;
}

function zoneLabelOf(p: Parcel): string {
  const name = p.zone?.name?.trim();
  if (name) return name;
  return p.city?.trim() || "Sans zone";
}

function toDayStart(iso: string): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function toDayEnd(iso: string): number {
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function SenderZonesSales() {
  const { data, error, loading, reload } = useApiQuery<Parcel[]>("/parcels");
  const parcels = useMemo(() => data ?? [], [data]);

  const [query, setQuery] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scope, setScope] = useState<ScopeKey>("delivered");
  const [sortKey, setSortKey] = useState<SortKey>("delivered");

  const cityOptions = useMemo(
    () => (governorate ? citiesForGovernorate(governorate) : []),
    [governorate],
  );

  const filteredParcels = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = priceMin.trim() === "" ? null : Number(priceMin);
    const max = priceMax.trim() === "" ? null : Number(priceMax);
    const from = dateFrom ? toDayStart(dateFrom) : null;
    const to = dateTo ? toDayEnd(dateTo) : null;

    return parcels.filter((p) => {
      if (p.status === "SUPPRIME") return false;
      if (governorate && p.governorate !== governorate) return false;
      if (city && p.city !== city) return false;
      const price = parcelPrice(p);
      if (min != null && Number.isFinite(min) && price < min) return false;
      if (max != null && Number.isFinite(max) && price > max) return false;
      const created = new Date(p.createdAt).getTime();
      if (from != null && created < from) return false;
      if (to != null && created > to) return false;
      if (q) {
        const hay = [
          p.zone?.name,
          p.city,
          p.governorate,
          p.code,
          p.recipientName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [parcels, query, governorate, city, priceMin, priceMax, dateFrom, dateTo]);

  const zoneRows = useMemo(() => {
    const map = new Map<string, ZoneRow>();
    for (const p of filteredParcels) {
      const key = zoneKeyOf(p);
      let row = map.get(key);
      if (!row) {
        row = {
          key,
          label: zoneLabelOf(p),
          governorate: p.governorate,
          city: p.city,
          total: 0,
          delivered: 0,
          revenue: 0,
          avgPrice: 0,
          rate: 0,
        };
        map.set(key, row);
      }
      row.total += 1;
      if (DELIVERED.has(p.status)) {
        row.delivered += 1;
        row.revenue += parcelPrice(p);
      }
    }

    const rows = Array.from(map.values()).map((row) => ({
      ...row,
      avgPrice: row.delivered > 0 ? row.revenue / row.delivered : 0,
      rate: row.total > 0 ? (row.delivered / row.total) * 100 : 0,
    }));

    const scoped =
      scope === "delivered" ? rows.filter((r) => r.delivered > 0) : rows;

    const dir = 1;
    scoped.sort((a, b) => {
      const by =
        sortKey === "revenue"
          ? b.revenue - a.revenue
          : sortKey === "rate"
            ? b.rate - a.rate
            : sortKey === "total"
              ? b.total - a.total
              : b.delivered - a.delivered;
      if (by !== 0) return by * dir;
      return a.label.localeCompare(b.label, "fr");
    });
    return scoped;
  }, [filteredParcels, scope, sortKey]);

  const totals = useMemo(() => {
    return zoneRows.reduce(
      (acc, row) => {
        acc.zones += 1;
        acc.delivered += row.delivered;
        acc.revenue += row.revenue;
        acc.total += row.total;
        return acc;
      },
      { zones: 0, delivered: 0, revenue: 0, total: 0 },
    );
  }, [zoneRows]);

  function resetFilters() {
    setQuery("");
    setGovernorate("");
    setCity("");
    setPriceMin("");
    setPriceMax("");
    setDateFrom("");
    setDateTo("");
    setScope("delivered");
    setSortKey("delivered");
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Expéditeur"
        title="Zones les plus vendeuses"
        description="Classement des zones / villes selon les colis livrés, avec filtres gouvernorat, prix et période."
      />

      {error ? (
        <ErrorBanner message={error} onRetry={() => void reload()} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={MapPin}
          label="Zones"
          value={String(totals.zones)}
          hint="Après filtres"
        />
        <Kpi
          icon={Package}
          label="Colis livrés"
          value={String(totals.delivered)}
          hint={`${totals.total} colis filtrés`}
        />
        <Kpi
          icon={Wallet}
          label="CA livré"
          value={formatTnd(totals.revenue)}
          hint="LIVRES + LIVRES_PAYES"
        />
        <Kpi
          icon={TrendingUp}
          label="Taux livraison"
          value={
            totals.total > 0
              ? `${Math.round((totals.delivered / totals.total) * 100)}%`
              : "—"
          }
          hint="Sur le périmètre filtré"
        />
      </div>

      <Panel className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ops-ink">Filtres</p>
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-semibold text-ops-ink/45 transition hover:text-ops-accent"
          >
            Réinitialiser
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Zone, ville, code…"
            className="sm:col-span-2 lg:col-span-1"
          />
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ops-ink/40">
              Gouvernorat
            </label>
            <select
              className={fieldClass}
              value={governorate}
              onChange={(e) => {
                setGovernorate(e.target.value);
                setCity("");
              }}
            >
              <option value="">Tous</option>
              {Object.keys(governoratesWithCities).map((gov) => (
                <option key={gov} value={gov}>
                  {displayGovernorate(gov)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ops-ink/40">
              Ville
            </label>
            <select
              className={fieldClass}
              value={city}
              disabled={!governorate}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">Toutes</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ops-ink/40">
              Prix min (TND)
            </label>
            <input
              type="number"
              min={0}
              step="0.001"
              inputMode="decimal"
              className={fieldClass}
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ops-ink/40">
              Prix max (TND)
            </label>
            <input
              type="number"
              min={0}
              step="0.001"
              inputMode="decimal"
              className={fieldClass}
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="—"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ops-ink/40">
              Du
            </label>
            <input
              type="date"
              className={fieldClass}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ops-ink/40">
              Au
            </label>
            <input
              type="date"
              className={fieldClass}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ops-ink/40">
              Périmètre
            </label>
            <select
              className={fieldClass}
              value={scope}
              onChange={(e) => setScope(e.target.value as ScopeKey)}
            >
              <option value="delivered">Zones avec au moins 1 livré</option>
              <option value="all">Toutes les zones (filtrées)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ops-ink/40">
              Trier par
            </label>
            <select
              className={fieldClass}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="delivered">Colis livrés</option>
              <option value="revenue">CA livré</option>
              <option value="rate">Taux de livraison</option>
              <option value="total">Volume total</option>
            </select>
          </div>
        </div>
      </Panel>

      {loading && parcels.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-ops-ink/[0.06]"
            />
          ))}
        </div>
      ) : zoneRows.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Aucune zone"
          description="Aucun colis livré ne correspond à ces filtres."
        />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {zoneRows.map((row, index) => (
              <li
                key={row.key}
                className="rounded-2xl border border-ops-card bg-ops-surface px-3.5 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-ops-ink/35">
                      #{index + 1}
                    </p>
                    <p className="truncate text-[15px] font-semibold text-ops-ink">
                      {row.label}
                    </p>
                    <p className="truncate text-[12px] text-ops-ink/45">
                      {row.city}
                      {row.governorate
                        ? ` · ${displayGovernorate(row.governorate)}`
                        : ""}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-[15px] font-bold text-ops-ink">
                    {row.delivered} livrés
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ops-ink/45">
                  <span>CA {formatTnd(row.revenue)}</span>
                  <span>Moy. {formatTnd(row.avgPrice)}</span>
                  <span>{Math.round(row.rate)}% livrés</span>
                  <span>{row.total} colis</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ops-ink/[0.06]">
                  <div
                    className="h-full rounded-full bg-ops-accent"
                    style={{
                      width: `${Math.min(100, Math.max(4, row.rate))}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl border border-ops-card bg-ops-surface md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-ops-card bg-ops-page/60 text-[11px] font-semibold uppercase tracking-wide text-ops-ink/40">
                  <tr>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Zone / ville</th>
                    <th className="px-3 py-2.5">Gouvernorat</th>
                    <th className="px-3 py-2.5 text-right">Livrés</th>
                    <th className="px-3 py-2.5 text-right">CA</th>
                    <th className="px-3 py-2.5 text-right">Prix moy.</th>
                    <th className="px-3 py-2.5 text-right">Taux</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneRows.map((row, index) => (
                    <tr
                      key={row.key}
                      className="border-b border-ops-card/70 last:border-0"
                    >
                      <td className="px-3 py-2.5 text-ops-ink/35">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-ops-ink">{row.label}</p>
                        <p className="text-[11px] text-ops-ink/40">{row.city}</p>
                      </td>
                      <td className="px-3 py-2.5 text-ops-ink/60">
                        {displayGovernorate(row.governorate)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-ops-ink">
                        {row.delivered}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ops-ink">
                        {formatTnd(row.revenue)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ops-ink/60">
                        {formatTnd(row.avgPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ops-ink/60">
                        {Math.round(row.rate)}%
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ops-ink/45">
                        {row.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-ops-card bg-ops-surface px-3.5 py-3">
      <div className="flex items-center gap-2 text-ops-ink/40">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </p>
      </div>
      <p className="mt-1.5 font-display text-xl font-bold text-ops-ink">{value}</p>
      <p className="mt-0.5 text-[11px] text-ops-ink/40">{hint}</p>
    </div>
  );
}
