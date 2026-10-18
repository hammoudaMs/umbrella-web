import type { AppRole } from "@/lib/roles";
import {
  ACTION_TONE_CLASS,
  livreurActionsFor,
  type LivreurAction,
} from "@/lib/livreur-actions";
import {
  allowedTargets,
  canTransition,
  requiresComment,
} from "@/lib/parcel-transitions";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";

export type ScanAction = {
  id: string;
  label: string;
  status: StatusKey;
  tone: LivreurAction["tone"];
  needsComment?: boolean;
  commentLabel?: string;
  /** Requires picking a livreur before applying (EN_COURS dispatch). */
  needsDriver?: boolean;
};

const OPS_LABELS: Partial<Record<StatusKey, string>> = {
  AU_DEPOT: "Arrivé au dépôt",
  EXPEDIE_DESTINATION: "Expédier vers destination",
  ARRIVE_DESTINATION: "Arrivé dépôt destination",
  AFFECTE_LIVREUR: "Affecter livreur",
  EN_COURS: "En cours de livraison",
  LIVRAISON_ANNULEE: "Livraison annulée",
  RETOUR_DEPOT: "Retour en agence",
  RETOUR_INTER_AGENCE: "Retour inter-agence",
  RETOUR_EXPEDITEURS: "Transit vers expéditeur",
  RETOUR_RECU: "Retour livré expéditeur",
  ENLEVES: "Colis récupéré",
  A_ENLEVER: "En attente de collecte",
  LIVRES: "Livré",
  LIVRES_PAYES: "Livré payé",
  A_VERIFIER: "À vérifier",
  ECHANGES: "Échange",
};

function gateRole(role: AppRole): AppRole {
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "CHEF_AGENCE") {
    return "ADMIN";
  }
  return role;
}

function prioritize(actions: ScanAction[], role: AppRole): ScanAction[] {
  if (role !== "MAGASINIER" && role !== "PICKUP" && role !== "CHEF_AGENCE") {
    return actions;
  }
  const order = [
    "AU_DEPOT",
    "EXPEDIE_DESTINATION",
    "ARRIVE_DESTINATION",
    "AFFECTE_LIVREUR",
    "EN_COURS",
    "LIVRAISON_ANNULEE",
    "RETOUR_DEPOT",
    "RETOUR_EXPEDITEURS",
    "RETOUR_RECU",
  ];
  return [...actions].sort((a, b) => {
    const ia = order.indexOf(a.status);
    const ib = order.indexOf(b.status);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export function scanActionsFor(status: string, role: AppRole): ScanAction[] {
  const gate = gateRole(role);

  if (role === "LIVREUR") {
    return livreurActionsFor(status)
      .filter((a) => a.status !== status && canTransition(status, a.status, gate).ok)
      .map((a) => ({
        id: a.id,
        label: a.label,
        status: a.status,
        tone: a.tone,
        needsComment:
          Boolean(a.needsComment) || requiresComment(a.status, status, role),
        commentLabel: a.commentLabel,
      }));
  }

  const fromLivreur = livreurActionsFor(status)
    .filter((a) => a.status !== status && canTransition(status, a.status, gate).ok)
    .map((a) => ({
      id: a.id,
      label: OPS_LABELS[a.status] ?? a.label,
      status: a.status,
      tone: a.tone,
      needsComment:
        Boolean(a.needsComment) || requiresComment(a.status, status, role),
      commentLabel:
        a.status === "RETOUR_RECU" && role === "SUPPORT"
          ? "Pourquoi annulé ?"
          : a.commentLabel,
      needsDriver: a.status === "AFFECTE_LIVREUR",
    }));

  const covered = new Set(fromLivreur.map((a) => a.status));
  const extras: ScanAction[] = allowedTargets(status)
    .filter((to) => !covered.has(to) && canTransition(status, to, role).ok)
    .map((to) => ({
      id: to,
      label: OPS_LABELS[to] ?? STATUS_META[to].label,
      status: to,
      tone:
        to === "AU_DEPOT" || to === "ARRIVE_DESTINATION"
          ? ("primary" as const)
          : to === "LIVRAISON_ANNULEE" || to.startsWith("RETOUR")
            ? ("warn" as const)
            : to === "AFFECTE_LIVREUR" || to === "EN_COURS"
              ? ("success" as const)
              : ("neutral" as const),
      needsComment: requiresComment(to, status, role),
      commentLabel:
        to === "RETOUR_RECU" && role === "SUPPORT"
          ? "Pourquoi annulé ?"
          : "Motif",
      needsDriver: to === "AFFECTE_LIVREUR",
    }));

  return prioritize([...fromLivreur, ...extras], role);
}

export function canScanMutate(role: AppRole): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "CHEF_AGENCE" ||
    role === "MAGASINIER" ||
    role === "PICKUP" ||
    role === "SUPPORT" ||
    role === "LIVREUR"
  );
}

export { ACTION_TONE_CLASS };
