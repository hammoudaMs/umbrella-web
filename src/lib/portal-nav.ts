import type { TranslateFn } from "@/i18n/types";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";

export { DASHBOARD_STATUS_KEYS } from "@/lib/dashboard-statuses";

/** Full status list for counts / analytics. */
export const STATUS_ORDER: StatusKey[] = [
  "NON_SERIEUX",
  "EN_ATTENTE",
  "A_ENLEVER",
  "ENLEVES",
  "AU_DEPOT",
  "RETOUR_DEPOT",
  "EN_COURS",
  "A_VERIFIER",
  "LIVRES",
  "LIVRES_PAYES",
  "ECHANGES",
  "REMBOURSES",
  "RETOUR_DEFINITIF",
  "RETOUR_INTER_AGENCE",
  "RETOUR_EXPEDITEURS",
  "RETOUR_RECU",
  "SAISIE_DOUANE",
];

export function colisStatusHref(basePath: string, status: StatusKey) {
  return `${basePath}/parcels?status=${encodeURIComponent(status)}`;
}

export function statusLabel(status: string, t?: TranslateFn): string {
  if (t) {
    const key = `status.${status}`;
    const value = t(key);
    if (value !== key) return value;
  }
  return STATUS_META[status as StatusKey]?.label ?? status;
}
