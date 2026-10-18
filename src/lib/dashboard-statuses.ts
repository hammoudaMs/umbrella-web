import type { StatusKey } from "@/lib/status-meta";

/** Primary tracking statuses on dashboard + parcels filter bar. */
export const DASHBOARD_STATUS_KEYS: StatusKey[] = [
  "EN_ATTENTE",
  "ENLEVES",
  "AU_DEPOT",
  "EXPEDIE_DESTINATION",
  "ARRIVE_DESTINATION",
  "AFFECTE_LIVREUR",
  "EN_COURS",
  "A_VERIFIER",
  "LIVRES",
  "LIVRAISON_ANNULEE",
  "RETOUR_DEPOT",
  "RETOUR_EXPEDITEURS",
  "RETOUR_RECU",
];

/** Statuses rolled into a primary filter key for counts + list filtering. */
const STATUS_ALIASES: Partial<Record<StatusKey, StatusKey[]>> = {
  EN_ATTENTE: ["A_ENLEVER"],
  LIVRES: ["LIVRES_PAYES"],
};

/** Alias-only keys — already counted under their primary status. */
export const STATUS_ALIAS_KEYS = new Set(
  Object.values(STATUS_ALIASES).flat(),
);

export function statusKeysMatching(filter: string): string[] {
  const aliases = STATUS_ALIASES[filter as StatusKey];
  return aliases ? [filter, ...aliases] : [filter];
}

export function countForStatusKey(
  key: string,
  counts: Map<string, number> | Record<string, number>,
): number {
  const get = (k: string) =>
    counts instanceof Map ? (counts.get(k) ?? 0) : (counts[k] ?? 0);
  return statusKeysMatching(key).reduce((sum, k) => sum + get(k), 0);
}

export function countByParcelStatus(
  parcels: Array<{ status: string }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of parcels) {
    if (p.status === "SUPPRIME") continue;
    map.set(p.status, (map.get(p.status) ?? 0) + 1);
  }
  return map;
}
