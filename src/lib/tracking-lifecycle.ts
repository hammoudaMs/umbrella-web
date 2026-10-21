import {
  STATUS_META,
  TRACKING_LIFECYCLE_DELIVERY,
  TRACKING_LIFECYCLE_RETURN,
  type StatusKey,
} from "@/lib/status-meta";
import { isStatusKey } from "@/lib/parcel-transitions";

export type TrackingStep = {
  key: StatusKey;
  label: string;
  done: boolean;
  current: boolean;
};

function activeLifecycle(status: string): StatusKey[] {
  if (
    status === "LIVRAISON_ANNULEE" ||
    status === "RETOUR_DEPOT" ||
    status === "RETOUR_EXPEDITEURS" ||
    status === "RETOUR_RECU" ||
    status === "RETOUR_INTER_AGENCE" ||
    status === "RETOUR_DEFINITIF" ||
    status === "SAISIE_DOUANE"
  ) {
    return TRACKING_LIFECYCLE_RETURN;
  }
  return TRACKING_LIFECYCLE_DELIVERY;
}

/** Steps for public / client tracking UI based on current status. */
export function trackingStepsFor(status: string): TrackingStep[] {
  const lifecycle = activeLifecycle(status);
  let currentKey: StatusKey | null = null;
  if (isStatusKey(status)) {
    if (status === "A_ENLEVER") currentKey = "EN_ATTENTE";
    else if (status === "LIVRES_PAYES" || status === "ECHANGES") {
      currentKey = "LIVRES";
    } else if (lifecycle.includes(status)) {
      currentKey = status;
    }
  }
  const idx = currentKey ? lifecycle.indexOf(currentKey) : -1;

  return lifecycle.map((key, i) => ({
    key,
    label: STATUS_META[key].trackingLabel,
    done: idx >= 0 && i < idx,
    current: idx >= 0 && i === idx,
  }));
}
