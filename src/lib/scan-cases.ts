import type { AppRole } from "@/lib/roles";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";
import { canTransition } from "@/lib/parcel-transitions";

export type ScanCaseId =
  | "LIVRAISON"
  | "RETOUR"
  | "ENTREE_DEPOT"
  | "DISPATCH";

export type ScanCase = {
  id: ScanCaseId;
  label: string;
  description: string;
  /** Who may select this case on the scanner. */
  roles: AppRole[];
  /** Must choose a livreur before scanning. */
  needsLivreur: boolean;
  /** Status path applied one step per scan. */
  steps: StatusKey[];
  demoCode: string;
};

export const SCAN_CASES: ScanCase[] = [
  {
    id: "LIVRAISON",
    label: "Livraison (cycle complet)",
    description:
      "Colis récupéré → Arrivé au dépôt → Expédié vers destination → Arrivé dest. → Affecté livreur → En cours → Livré",
    roles: [
      "SUPER_ADMIN",
      "ADMIN",
      "CHEF_AGENCE",
      "MAGASINIER",
      "LIVREUR",
    ],
    needsLivreur: true,
    steps: [
      "ENLEVES",
      "AU_DEPOT",
      "EXPEDIE_DESTINATION",
      "ARRIVE_DESTINATION",
      "AFFECTE_LIVREUR",
      "EN_COURS",
      "LIVRES",
    ],
    demoCode: "UMB-LIFE-001",
  },
  {
    id: "RETOUR",
    label: "Retour (annulation)",
    description:
      "Livraison annulée → Retour en agence → Transit expéditeur → Retour livré",
    roles: [
      "SUPER_ADMIN",
      "ADMIN",
      "CHEF_AGENCE",
      "MAGASINIER",
      "SUPPORT",
      "LIVREUR",
    ],
    needsLivreur: false,
    steps: [
      "LIVRAISON_ANNULEE",
      "RETOUR_DEPOT",
      "RETOUR_EXPEDITEURS",
      "RETOUR_RECU",
    ],
    demoCode: "UMB-LIFE-002",
  },
  {
    id: "ENTREE_DEPOT",
    label: "Entrée dépôt",
    description: "Réception : colis récupéré → arrivé au dépôt",
    roles: ["SUPER_ADMIN", "ADMIN", "CHEF_AGENCE", "MAGASINIER", "PICKUP"],
    needsLivreur: false,
    steps: ["ENLEVES", "AU_DEPOT"],
    demoCode: "UMB-LIFE-001",
  },
  {
    id: "DISPATCH",
    label: "Dispatch livreur",
    description: "Affecter un livreur puis mettre en cours de livraison",
    roles: ["SUPER_ADMIN", "ADMIN", "CHEF_AGENCE", "MAGASINIER"],
    needsLivreur: true,
    steps: ["AFFECTE_LIVREUR", "EN_COURS"],
    demoCode: "UMB-DEP-001",
  },
];

export function casesForRole(role: AppRole): ScanCase[] {
  return SCAN_CASES.filter((c) => c.roles.includes(role));
}

export function stepLabel(status: StatusKey): string {
  return STATUS_META[status]?.label ?? status;
}

/** Next status to apply for this case from the parcel's current status. */
export function nextCaseStatus(
  scanCase: ScanCase,
  currentStatus: string,
  role: AppRole,
): StatusKey | null {
  const idx = scanCase.steps.indexOf(currentStatus as StatusKey);
  if (idx >= 0) {
    const next = scanCase.steps[idx + 1];
    if (!next) return null;
    return canTransition(currentStatus, next, role).ok ? next : null;
  }

  for (const step of scanCase.steps) {
    if (canTransition(currentStatus, step, role).ok) return step;
  }
  return null;
}

export function caseProgress(
  scanCase: ScanCase,
  currentStatus: string,
): Array<{ key: StatusKey; label: string; done: boolean; current: boolean }> {
  let idx = scanCase.steps.indexOf(currentStatus as StatusKey);
  if (currentStatus === "A_ENLEVER" || currentStatus === "EN_ATTENTE") {
    idx = -1;
  }
  return scanCase.steps.map((key, i) => ({
    key,
    label: stepLabel(key),
    done: idx >= 0 && i < idx,
    current: idx >= 0 && i === idx,
  }));
}

/**
 * True when `next` is the natural sequential step for this case from `current`.
 * Otherwise the operator selected a mismatched case / wrong moment to scan.
 */
export function isExpectedCaseStep(
  scanCase: ScanCase,
  currentStatus: string,
  nextStatus: StatusKey,
): boolean {
  const nextIdx = scanCase.steps.indexOf(nextStatus);
  if (nextIdx < 0) return false;

  if (nextIdx === 0) {
    if (nextStatus === "LIVRAISON_ANNULEE") {
      return (
        currentStatus === "EN_COURS" ||
        currentStatus === "A_VERIFIER" ||
        currentStatus === "AFFECTE_LIVREUR" ||
        currentStatus === "ARRIVE_DESTINATION" ||
        currentStatus === "AU_DEPOT" ||
        currentStatus === "EXPEDIE_DESTINATION"
      );
    }
    if (nextStatus === "AFFECTE_LIVREUR") {
      return (
        currentStatus === "AU_DEPOT" ||
        currentStatus === "ARRIVE_DESTINATION" ||
        currentStatus === "EXPEDIE_DESTINATION" ||
        currentStatus === "RETOUR_DEPOT"
      );
    }
    return (
      currentStatus === "EN_ATTENTE" ||
      currentStatus === "A_ENLEVER" ||
      currentStatus === "ENLEVES"
    );
  }

  return currentStatus === scanCase.steps[nextIdx - 1];
}
