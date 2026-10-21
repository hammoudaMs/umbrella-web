import type { AppRole } from "@/lib/roles";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";

export const STATUS_CATEGORY_ICONS = [
  "package",
  "clock",
  "truck",
  "check",
  "return",
  "coins",
  "alert",
] as const;

export type StatusCategoryIcon = (typeof STATUS_CATEGORY_ICONS)[number];

export const TOTAL_CATEGORY_KEY = "TOTAL";

export const JOURNEY_LIVRAISON_KEYS = [
  "EN_ATTENTE",
  "ENLEVES",
  "AU_DEPOT",
  "EXPEDIE_DESTINATION",
  "ARRIVE_DESTINATION",
  "AFFECTE_LIVREUR",
  "EN_COURS",
  "LIVRES",
] as const;

export const JOURNEY_RETOUR_KEYS = [
  "LIVRAISON_ANNULEE",
  "RETOUR_DEPOT",
  "RETOUR_EXPEDITEURS",
  "RETOUR_RECU",
] as const;

export const JOURNEY_STEP_KEYS = [
  ...JOURNEY_LIVRAISON_KEYS,
  ...JOURNEY_RETOUR_KEYS,
] as const;

export type JourneyStepKey = (typeof JOURNEY_STEP_KEYS)[number];

export const JOURNEY_VISIBILITY_ROLES: AppRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "EXPERT_COMPTABLE",
  "CHEF_AGENCE",
  "SUPPORT",
  "PICKUP",
  "MAGASINIER",
  "FINANCE",
  "EXPEDITEUR",
  "LIVREUR",
  "CLIENT",
];

export type StatusCategory = {
  id: number;
  key: string;
  label: string;
  color: string;
  icon: StatusCategoryIcon;
  sortOrder: number;
  isActive: boolean;
  showInJourney: boolean;
  visibleRoles: string[];
};

export type StatusCategoryInput = {
  key: string;
  label: string;
  color: string;
  icon: StatusCategoryIcon;
  sortOrder?: number;
  isActive?: boolean;
  showInJourney?: boolean;
  visibleRoles?: string[];
};

export function isJourneyStepKey(key: string): key is JourneyStepKey {
  return (JOURNEY_STEP_KEYS as readonly string[]).includes(key);
}

export function journeyVisibleForRole(
  category: Pick<StatusCategory, "showInJourney" | "visibleRoles">,
  role?: string | null,
): boolean {
  if (category.showInJourney === false) return false;
  const roles = category.visibleRoles ?? [];
  if (!roles.length) return true;
  if (!role) return false;
  return roles.includes(role);
}

export const STATUS_CATEGORY_ICON_LABELS: Record<StatusCategoryIcon, string> = {
  package: "Colis",
  clock: "Horloge",
  truck: "Camion",
  check: "Validé",
  return: "Retour",
  coins: "Pièces",
  alert: "Alerte",
};

export const CREATABLE_CATEGORY_KEYS: Array<{ key: string; label: string }> = [
  { key: TOTAL_CATEGORY_KEY, label: "Total" },
  ...Object.entries(STATUS_META).map(([key, meta]) => ({
    key,
    label: meta.label,
  })),
];

export const DEFAULT_STATUS_CATEGORIES: Omit<
  StatusCategory,
  "id" | "isActive" | "showInJourney" | "visibleRoles"
>[] = [
  {
    key: TOTAL_CATEGORY_KEY,
    label: "Total",
    color: "#E11D48",
    icon: "package",
    sortOrder: 0,
  },
  {
    key: "EN_ATTENTE",
    label: "En attente de collecte",
    color: "#00875A",
    icon: "clock",
    sortOrder: 1,
  },
  {
    key: "ENLEVES",
    label: "Colis récupéré",
    color: "#A78BFA",
    icon: "package",
    sortOrder: 2,
  },
  {
    key: "AU_DEPOT",
    label: "Au dépôt",
    color: "#0EA5E9",
    icon: "truck",
    sortOrder: 3,
  },
  {
    key: "EXPEDIE_DESTINATION",
    label: "Au dépôt",
    color: "#38BDF8",
    icon: "truck",
    sortOrder: 4,
  },
  {
    key: "ARRIVE_DESTINATION",
    label: "Au dépôt",
    color: "#0EA5E9",
    icon: "truck",
    sortOrder: 5,
  },
  {
    key: "AFFECTE_LIVREUR",
    label: "En cours de livraison",
    color: "#0065FF",
    icon: "truck",
    sortOrder: 6,
  },
  {
    key: "EN_COURS",
    label: "En cours de livraison",
    color: "#0065FF",
    icon: "truck",
    sortOrder: 7,
  },
  {
    key: "A_VERIFIER",
    label: "À vérifier",
    color: "#EC4899",
    icon: "alert",
    sortOrder: 8,
  },
  {
    key: "LIVRES",
    label: "Livré",
    color: "#6554C0",
    icon: "check",
    sortOrder: 9,
  },
  {
    key: "LIVRAISON_ANNULEE",
    label: "Livraison annulée",
    color: "#FB7185",
    icon: "alert",
    sortOrder: 10,
  },
  {
    key: "LIVRES_PAYES",
    label: "Livré payé",
    color: "#14B8A6",
    icon: "coins",
    sortOrder: 11,
  },
  {
    key: "RETOUR_DEPOT",
    label: "Retour en agence",
    color: "#FFAB00",
    icon: "return",
    sortOrder: 12,
  },
  {
    key: "RETOUR_EXPEDITEURS",
    label: "En transit vers l’expéditeur",
    color: "#F87171",
    icon: "return",
    sortOrder: 13,
  },
  {
    key: "RETOUR_RECU",
    label: "Retour livré à l’expéditeur",
    color: "#EF4444",
    icon: "return",
    sortOrder: 14,
  },
];

export function isStatusCategoryIcon(
  value: string,
): value is StatusCategoryIcon {
  return (STATUS_CATEGORY_ICONS as readonly string[]).includes(value);
}

export function activeStatusKeys(categories: StatusCategory[]): StatusKey[] {
  return categories
    .filter(
      (c) => c.isActive && c.key !== TOTAL_CATEGORY_KEY,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => c.key as StatusKey);
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return `rgba(225, 29, 72, ${alpha})`;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) {
    return `rgba(225, 29, 72, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
