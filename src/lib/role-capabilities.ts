import { isMoneyRole, type AppRole } from "@/lib/roles";

function has(role: AppRole | null | undefined, allowed: AppRole[]): boolean {
  return !!role && allowed.includes(role);
}

const OPS_ADMIN: AppRole[] = ["SUPER_ADMIN", "ADMIN"];

/** Create / edit parcels (Nouveau). */
export function canCreateParcel(role?: AppRole | null): boolean {
  return has(role, [
    ...OPS_ADMIN,
    "CHEF_AGENCE",
    "EXPEDITEUR",
  ]);
}

/** Create pickup manifests (lists for collection). */
export function canCreatePickupManifest(role?: AppRole | null): boolean {
  return has(role, [
    ...OPS_ADMIN,
    "CHEF_AGENCE",
    "PICKUP",
    "EXPEDITEUR",
  ]);
}

/** Close manifeste with décharge + CIN (not sender). */
export function canClosePickupManifest(role?: AppRole | null): boolean {
  return has(role, [
    ...OPS_ADMIN,
    "CHEF_AGENCE",
    "PICKUP",
    "MAGASINIER",
  ]);
}

/** Staff may prepare a payout from disponible parcels (not expéditeur). */
export function canRequestPayment(role?: AppRole | null): boolean {
  return isMoneyRole(role) || has(role, [...OPS_ADMIN]);
}

/** Finance / Chef / Expert payment moderation chain. */
export function canModeratePayments(role?: AppRole | null): boolean {
  return isMoneyRole(role);
}

export function canDispatch(role?: AppRole | null): boolean {
  return has(role, [...OPS_ADMIN, "CHEF_AGENCE"]);
}

export function canManageReturns(role?: AppRole | null): boolean {
  return has(role, [
    ...OPS_ADMIN,
    "CHEF_AGENCE",
    "SUPPORT",
    "MAGASINIER",
  ]);
}

/** Livreur COD versement + receipt. */
export function canVersement(role?: AppRole | null): boolean {
  return role === "LIVREUR";
}

/** Magasinier / money staff cloture of livreur deposits. */
export function canClotureDeposits(role?: AppRole | null): boolean {
  return has(role, [
    ...OPS_ADMIN,
    "MAGASINIER",
    "CHEF_AGENCE",
    "FINANCE",
    "EXPERT_COMPTABLE",
  ]);
}

/** Hub / warehouse scanner (not client track-style lookup). */
export function canSeeWarehouseScanner(role?: AppRole | null): boolean {
  return has(role, [
    ...OPS_ADMIN,
    "CHEF_AGENCE",
    "PICKUP",
    "MAGASINIER",
    "SUPPORT",
    "LIVREUR",
  ]);
}

/** In-portal messaging (ops chat). */
export function canUseMessages(role?: AppRole | null): boolean {
  return has(role, [
    ...OPS_ADMIN,
    "CHEF_AGENCE",
    "SUPPORT",
    "EXPEDITEUR",
    "LIVREUR",
    "CLIENT",
  ]);
}

export function canManageStock(role?: AppRole | null): boolean {
  return role === "EXPEDITEUR";
}

export function canSeeSenderFinances(role?: AppRole | null): boolean {
  return role === "EXPEDITEUR";
}

export function canManageAgencies(role?: AppRole | null): boolean {
  return role === "SUPER_ADMIN";
}

export function canManageStatusCategories(role?: AppRole | null): boolean {
  return role === "SUPER_ADMIN";
}

export function canManageDeliveryRoutes(role?: AppRole | null): boolean {
  return role === "SUPER_ADMIN";
}
