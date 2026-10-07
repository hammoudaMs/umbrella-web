import {
  DEFAULT_STATUS_CATEGORIES,
  TOTAL_CATEGORY_KEY,
  type StatusCategory,
  type StatusCategoryIcon,
} from "@/lib/status-categories";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";

/** Unique visual tone per KPI card (fallback when no custom color). */
export type OpsKpiTone =
  | "brand"
  | "green"
  | "sky"
  | "blue"
  | "rose"
  | "violet"
  | "teal"
  | "amber"
  | "orange"
  | "slate"
  | "gold"
  | "pink";

export type OpsKpi = {
  label: string;
  value: string;
  href: string;
  icon: StatusCategoryIcon;
  tone: OpsKpiTone;
  /** Hex color chosen by super-admin; drives card chrome when set. */
  color: string;
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  accent: string;
  glow: string;
};

const TONE_BY_KEY: Partial<Record<string, OpsKpiTone>> = {
  [TOTAL_CATEGORY_KEY]: "brand",
  NON_SERIEUX: "rose",
  EN_ATTENTE: "green",
  A_ENLEVER: "pink",
  ENLEVES: "violet",
  AU_DEPOT: "sky",
  EXPEDIE_DESTINATION: "blue",
  ARRIVE_DESTINATION: "sky",
  AFFECTE_LIVREUR: "violet",
  RETOUR_DEPOT: "orange",
  EN_COURS: "blue",
  A_VERIFIER: "pink",
  LIVRES: "violet",
  LIVRES_PAYES: "teal",
  ECHANGES: "gold",
  REMBOURSES: "amber",
  LIVRAISON_ANNULEE: "rose",
  RETOUR_DEFINITIF: "orange",
  RETOUR_INTER_AGENCE: "amber",
  RETOUR_EXPEDITEURS: "gold",
  RETOUR_RECU: "slate",
  SAISIE_DOUANE: "slate",
};

function categoryList(
  categories?: StatusCategory[] | null,
): Array<Pick<StatusCategory, "key" | "label" | "color" | "icon" | "sortOrder" | "isActive">> {
  if (categories && categories.length > 0) {
    return [...categories]
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }
  return DEFAULT_STATUS_CATEGORIES.map((c) => ({ ...c, isActive: true }));
}

/** Build ops KPI cards from real status counts + category styling. */
export function buildOpsStatusKpis({
  basePath,
  countsByStatus,
  totalLabel,
  totalCount,
  categories,
  statusKeysFilter,
  hrefBase,
}: {
  basePath: string;
  countsByStatus: Map<string, number> | Record<string, number>;
  totalLabel?: string;
  /** When set, Total card uses this (e.g. all parcels) instead of sum of status keys. */
  totalCount?: number;
  categories?: StatusCategory[] | null;
  /** When set, only Total + these status keys are shown. */
  statusKeysFilter?: string[] | null;
  /** Override KPI link base (defaults to `${basePath}/parcels`). */
  hrefBase?: string;
}): OpsKpi[] {
  const linkBase = hrefBase ?? `${basePath}/parcels`;
  const get = (key: string) => {
    if (countsByStatus instanceof Map) return countsByStatus.get(key) ?? 0;
    return countsByStatus[key] ?? 0;
  };

  const filter = statusKeysFilter?.length
    ? new Set(statusKeysFilter)
    : null;
  const active = categoryList(categories).filter(
    (c) => c.key === TOTAL_CATEGORY_KEY || !filter || filter.has(c.key),
  );
  const statusKeys = active
    .map((c) => c.key)
    .filter((key) => key !== TOTAL_CATEGORY_KEY);
  const keyedTotal = statusKeys.reduce((sum, key) => sum + get(key), 0);

  return active.map((cat) => {
    const isTotal = cat.key === TOTAL_CATEGORY_KEY;
    const label =
      isTotal && totalLabel
        ? totalLabel
        : cat.label || STATUS_META[cat.key as StatusKey]?.label || cat.key;
    const value = isTotal
      ? String(totalCount ?? keyedTotal)
      : String(get(cat.key));
    const href = isTotal
      ? linkBase
      : `${linkBase}${linkBase.includes("?") ? "&" : "?"}status=${encodeURIComponent(cat.key)}`;

    return {
      label,
      value,
      href,
      icon: cat.icon,
      tone: TONE_BY_KEY[cat.key] ?? "slate",
      color: cat.color,
      accent: "",
      glow: "",
    };
  });
}

export function countByStatus(
  parcels: Array<{ status: string }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of parcels) {
    map.set(p.status, (map.get(p.status) ?? 0) + 1);
  }
  return map;
}
