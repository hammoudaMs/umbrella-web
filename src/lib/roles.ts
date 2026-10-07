export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CHEF_AGENCE"
  | "SUPPORT"
  | "PICKUP"
  | "MAGASINIER"
  | "FINANCE"
  | "EXPEDITEUR"
  | "LIVREUR"
  | "CLIENT";

export const PORTAL_BY_ROLE: Record<AppRole, string> = {
  SUPER_ADMIN: "/super-admin",
  ADMIN: "/admin",
  CHEF_AGENCE: "/chef-agence",
  SUPPORT: "/support",
  PICKUP: "/pickup",
  MAGASINIER: "/magasinier",
  FINANCE: "/finance",
  EXPEDITEUR: "/expediteur",
  LIVREUR: "/livreur",
  CLIENT: "/client",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  CHEF_AGENCE: "Chef d'agence",
  SUPPORT: "Support",
  PICKUP: "Pickup",
  MAGASINIER: "Magasinier",
  FINANCE: "Finance",
  EXPEDITEUR: "Expéditeur",
  LIVREUR: "Livreur",
  CLIENT: "Client",
};

export const AGENCY_ROLES: AppRole[] = [
  "CHEF_AGENCE",
  "SUPPORT",
  "PICKUP",
  "MAGASINIER",
];

const MODE_ROLES: AppRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CHEF_AGENCE",
  "EXPEDITEUR",
];

/** Who can pick / see Navex vs Umbrella on create & lists. */
export function canSeeDeliveryMode(role?: AppRole | null): boolean {
  return !!role && MODE_ROLES.includes(role);
}

/** Who can switch an existing parcel INTERNAL ↔ EXTERNAL. */
export function canSwitchDeliveryMode(role?: AppRole | null): boolean {
  return !!role && MODE_ROLES.includes(role);
}

export function roleNeedsAgency(role: AppRole): boolean {
  return AGENCY_ROLES.includes(role);
}
