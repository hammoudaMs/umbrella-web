import type { AppRole } from "@/lib/roles";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";

const TRANSITIONS: Record<StatusKey, readonly StatusKey[]> = {
  EN_ATTENTE: [
    "A_ENLEVER",
    "ENLEVES",
    "AU_DEPOT",
    "RETOUR_EXPEDITEURS",
    "NON_SERIEUX",
    "SAISIE_DOUANE",
  ],
  A_ENLEVER: ["ENLEVES", "AU_DEPOT", "RETOUR_EXPEDITEURS", "NON_SERIEUX"],
  ENLEVES: ["AU_DEPOT", "RETOUR_DEPOT"],
  AU_DEPOT: [
    "EXPEDIE_DESTINATION",
    "ARRIVE_DESTINATION",
    "AFFECTE_LIVREUR",
    "RETOUR_DEPOT",
    "RETOUR_INTER_AGENCE",
    "RETOUR_EXPEDITEURS",
    "SAISIE_DOUANE",
  ],
  EXPEDIE_DESTINATION: ["ARRIVE_DESTINATION", "RETOUR_DEPOT"],
  ARRIVE_DESTINATION: [
    "AFFECTE_LIVREUR",
    "RETOUR_DEPOT",
    "RETOUR_INTER_AGENCE",
  ],
  AFFECTE_LIVREUR: ["EN_COURS", "RETOUR_DEPOT", "LIVRAISON_ANNULEE"],
  RETOUR_DEPOT: [
    "AU_DEPOT",
    "ARRIVE_DESTINATION",
    "AFFECTE_LIVREUR",
    "RETOUR_EXPEDITEURS",
    "RETOUR_INTER_AGENCE",
    "RETOUR_DEFINITIF",
    "RETOUR_RECU",
  ],
  EN_COURS: [
    "LIVRES",
    "LIVRAISON_ANNULEE",
    "A_VERIFIER",
    "ECHANGES",
    "RETOUR_DEPOT",
    "NON_SERIEUX",
  ],
  A_VERIFIER: [
    "EN_COURS",
    "LIVRES",
    "LIVRAISON_ANNULEE",
    "ECHANGES",
    "RETOUR_DEPOT",
    "NON_SERIEUX",
  ],
  LIVRES: ["LIVRES_PAYES", "REMBOURSES", "RETOUR_DEPOT"],
  LIVRES_PAYES: ["REMBOURSES"],
  ECHANGES: ["LIVRES", "EN_COURS", "RETOUR_DEPOT"],
  REMBOURSES: [],
  LIVRAISON_ANNULEE: ["RETOUR_DEPOT", "RETOUR_EXPEDITEURS"],
  RETOUR_DEFINITIF: ["REMBOURSES"],
  RETOUR_INTER_AGENCE: ["RETOUR_DEPOT", "RETOUR_RECU", "RETOUR_DEFINITIF"],
  RETOUR_EXPEDITEURS: ["RETOUR_RECU", "RETOUR_DEFINITIF"],
  RETOUR_RECU: ["REMBOURSES", "RETOUR_DEFINITIF"],
  SAISIE_DOUANE: ["RETOUR_DEFINITIF", "REMBOURSES"],
  NON_SERIEUX: ["EN_ATTENTE", "A_ENLEVER", "RETOUR_EXPEDITEURS"],
};

const LIVREUR_TARGETS = new Set<StatusKey>([
  "ENLEVES",
  "AU_DEPOT",
  "AFFECTE_LIVREUR",
  "EN_COURS",
  "A_VERIFIER",
  "LIVRES",
  "LIVRES_PAYES",
  "ECHANGES",
  "LIVRAISON_ANNULEE",
  "RETOUR_DEPOT",
  "RETOUR_EXPEDITEURS",
  "NON_SERIEUX",
]);

const PICKUP_TARGETS = new Set<StatusKey>([
  "A_ENLEVER",
  "ENLEVES",
  "AU_DEPOT",
]);

const MAGASINIER_TARGETS = new Set<StatusKey>([
  "ENLEVES",
  "AU_DEPOT",
  "EXPEDIE_DESTINATION",
  "ARRIVE_DESTINATION",
  "AFFECTE_LIVREUR",
  "EN_COURS",
  "LIVRAISON_ANNULEE",
  "RETOUR_DEPOT",
  "RETOUR_INTER_AGENCE",
  "RETOUR_EXPEDITEURS",
  "RETOUR_RECU",
]);

const SUPPORT_TARGETS = new Set<StatusKey>([
  "LIVRAISON_ANNULEE",
  "RETOUR_DEPOT",
  "RETOUR_INTER_AGENCE",
  "RETOUR_EXPEDITEURS",
  "RETOUR_RECU",
  "RETOUR_DEFINITIF",
]);

export const EXPEDITEUR_VERIFY_FROM = new Set<StatusKey>([
  "RETOUR_EXPEDITEURS",
  "RETOUR_DEPOT",
  "RETOUR_INTER_AGENCE",
]);

const COMMENT_REQUIRED = new Set<StatusKey>([
  "A_VERIFIER",
  "LIVRAISON_ANNULEE",
  "RETOUR_DEPOT",
  "RETOUR_EXPEDITEURS",
  "RETOUR_DEFINITIF",
  "RETOUR_INTER_AGENCE",
  "NON_SERIEUX",
  "ECHANGES",
  "SAISIE_DOUANE",
  "REMBOURSES",
]);

export const REASON_VISIBLE_STATUSES = new Set<StatusKey>([
  "A_VERIFIER",
  "LIVRAISON_ANNULEE",
  "RETOUR_DEPOT",
  "RETOUR_INTER_AGENCE",
  "RETOUR_EXPEDITEURS",
  "RETOUR_RECU",
  "RETOUR_DEFINITIF",
  "NON_SERIEUX",
]);

export function isStatusKey(value: string): value is StatusKey {
  return value in STATUS_META;
}

export function allowedTargets(from: string): StatusKey[] {
  if (!isStatusKey(from)) return [];
  return [...TRANSITIONS[from]];
}

export function requiresComment(
  to: string,
  from: string,
  role?: AppRole,
): boolean {
  if (from === to) return false;
  if (isStatusKey(to) && COMMENT_REQUIRED.has(to)) return true;
  if (to === "RETOUR_RECU" && role === "SUPPORT") return true;
  return false;
}

export function canPassReturnVerification(
  status: string,
  role: AppRole | undefined,
): boolean {
  if (role !== "EXPEDITEUR" && role !== "SUPPORT") return false;
  return isStatusKey(status) && EXPEDITEUR_VERIFY_FROM.has(status);
}

export function canTransition(
  from: string,
  to: string,
  role: AppRole,
): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: true };
  if (!isStatusKey(from) || !isStatusKey(to)) {
    return { ok: false, reason: "Statut invalide" };
  }
  if (!TRANSITIONS[from].includes(to)) {
    const a = STATUS_META[from]?.label ?? from;
    const b = STATUS_META[to]?.label ?? to;
    return { ok: false, reason: `Impossible : ${a} → ${b}` };
  }
  if (role === "LIVREUR" && !LIVREUR_TARGETS.has(to)) {
    return {
      ok: false,
      reason: `Action réservée au dépôt (${STATUS_META[to].label})`,
    };
  }
  if (role === "PICKUP" && !PICKUP_TARGETS.has(to)) {
    return {
      ok: false,
      reason: `Pickup : transition non autorisée vers ${STATUS_META[to].label}`,
    };
  }
  if (role === "MAGASINIER" && !MAGASINIER_TARGETS.has(to)) {
    return {
      ok: false,
      reason: `Magasinier : transition non autorisée vers ${STATUS_META[to].label}`,
    };
  }
  if (role === "SUPPORT" && !SUPPORT_TARGETS.has(to)) {
    return {
      ok: false,
      reason: "Support : seuls les retours peuvent être vérifiés",
    };
  }
  if (role === "EXPEDITEUR") {
    if (to !== "RETOUR_RECU") {
      return {
        ok: false,
        reason:
          "Expéditeur : seule la validation du retour (passer la vérification) est autorisée",
      };
    }
    if (!EXPEDITEUR_VERIFY_FROM.has(from)) {
      return {
        ok: false,
        reason: "Ce colis n’est pas en attente de vérification retour",
      };
    }
  }
  return { ok: true };
}

export function selectableStatuses(
  current: string,
  role: AppRole,
): StatusKey[] {
  const next = allowedTargets(current).filter((to) =>
    canTransition(current, to, role).ok,
  );
  if (isStatusKey(current) && !next.includes(current)) {
    return [current, ...next];
  }
  return next;
}
