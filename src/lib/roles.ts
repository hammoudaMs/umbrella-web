import type { TranslateFn } from "@/i18n/types";

export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "EXPERT_COMPTABLE"
  | "CHEF_AGENCE"
  | "SUPPORT"
  | "PICKUP"
  | "MAGASINIER"
  | "FINANCE"
  | "EXPEDITEUR"
  | "LIVREUR"
  | "CLIENT";

/** Re-exported from tenant registry — single source of portal paths. */
export { PORTAL_BY_ROLE } from "@/tenants/registry";

/** French fallback for non-React / server contexts. Prefer `roleLabel(role, t)`. */
export const ROLE_LABEL: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  EXPERT_COMPTABLE: "Expert comptable",
  CHEF_AGENCE: "Chef d'agence",
  SUPPORT: "Support",
  PICKUP: "Pickup",
  MAGASINIER: "Magasinier",
  FINANCE: "Responsable finance",
  EXPEDITEUR: "Expéditeur",
  LIVREUR: "Livreur",
  CLIENT: "Client",
};

export function roleLabel(role: AppRole, t?: TranslateFn): string {
  if (t) {
    const key = `roles.${role}`;
    const value = t(key);
    if (value !== key) return value;
  }
  return ROLE_LABEL[role];
}

export const AGENCY_ROLES: AppRole[] = [
  "CHEF_AGENCE",
  "SUPPORT",
  "PICKUP",
  "MAGASINIER",
  "FINANCE",
];

const MODE_ROLES: AppRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CHEF_AGENCE",
];

/** Who can pick / see Navex vs Umbrella on create & ops lists. */
export function canSeeDeliveryMode(role?: AppRole | null): boolean {
  return !!role && MODE_ROLES.includes(role);
}

const ZONE_ASSIGN_ROLES: AppRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CHEF_AGENCE",
  "LIVREUR",
];

/** Ops zones (livreur tour) — not for expéditeur address entry. */
export function canAssignParcelZone(role?: AppRole | null): boolean {
  return !!role && ZONE_ASSIGN_ROLES.includes(role);
}

/** Who can switch an existing parcel INTERNAL ↔ EXTERNAL. */
export function canSwitchDeliveryMode(role?: AppRole | null): boolean {
  return !!role && MODE_ROLES.includes(role);
}

export function roleNeedsAgency(role: AppRole): boolean {
  return AGENCY_ROLES.includes(role);
}

/** Money hierarchy: Expert → Chef agence → Responsable finance */
export function isMoneyRole(role?: AppRole | null): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "EXPERT_COMPTABLE" ||
    role === "CHEF_AGENCE" ||
    role === "FINANCE"
  );
}
