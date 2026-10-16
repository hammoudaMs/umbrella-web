import type { AppRole } from "@/lib/roles";
import type { TenantDefinition, TenantId } from "@/tenants/types";

/**
 * Canonical catalog of role-based tenants.
 * Subdomain today → rewrite to portalPath; later each row can become its own deploy.
 */
export const TENANTS: readonly TenantDefinition[] = [
  {
    id: "super-admin",
    subdomain: "super",
    portalPath: "/super-admin",
    roles: ["SUPER_ADMIN"],
    label: "Super Admin",
    subtitle: "Pilotage réseau & configuration",
    shell: "ops",
  },
  {
    id: "admin",
    subdomain: "admin",
    portalPath: "/admin",
    roles: ["ADMIN"],
    label: "Admin",
    subtitle: "Opérations & supervision",
    shell: "ops",
  },
  {
    id: "expert",
    subdomain: "expert",
    portalPath: "/expert-comptable",
    roles: ["EXPERT_COMPTABLE"],
    label: "Expert comptable",
    subtitle: "Caisses, COD & paiements réseau",
    shell: "money",
  },
  {
    id: "chef",
    subdomain: "chef",
    portalPath: "/chef-agence",
    roles: ["CHEF_AGENCE"],
    label: "Chef d'agence",
    subtitle: "Agence, flotte & caisses locales",
    shell: "ops",
  },
  {
    id: "support",
    subdomain: "support",
    portalPath: "/support",
    roles: ["SUPPORT"],
    label: "Support",
    subtitle: "Tickets & assistance",
    shell: "ops",
  },
  {
    id: "pickup",
    subdomain: "pickup",
    portalPath: "/pickup",
    roles: ["PICKUP"],
    label: "Pickup",
    subtitle: "Enlèvements & décharges",
    shell: "fleet",
  },
  {
    id: "magasinier",
    subdomain: "magasinier",
    portalPath: "/magasinier",
    roles: ["MAGASINIER"],
    label: "Magasinier",
    subtitle: "Dépôt, clôture livreurs & retours",
    shell: "fleet",
  },
  {
    id: "finance",
    subdomain: "finance",
    portalPath: "/finance",
    roles: ["FINANCE"],
    label: "Responsable finance",
    subtitle: "Caisses agence & paiements",
    shell: "money",
  },
  {
    id: "expediteur",
    subdomain: "expediteur",
    portalPath: "/expediteur",
    roles: ["EXPEDITEUR"],
    label: "Expéditeur",
    subtitle: "Envois, paiements & retours",
    shell: "sender",
  },
  {
    id: "livreur",
    subdomain: "livreur",
    portalPath: "/livreur",
    roles: ["LIVREUR"],
    label: "Livreur",
    subtitle: "Tournée, COD & versements",
    shell: "driver",
  },
  {
    id: "client",
    subdomain: "client",
    portalPath: "/client",
    roles: ["CLIENT"],
    label: "Client",
    subtitle: "Suivi de colis & support",
    shell: "recipient",
  },
] as const;

const byId = new Map<TenantId, TenantDefinition>(
  TENANTS.map((t) => [t.id, t]),
);
const bySubdomain = new Map<string, TenantDefinition>(
  TENANTS.map((t) => [t.subdomain, t]),
);
const byRole = new Map<AppRole, TenantDefinition>();
for (const t of TENANTS) {
  for (const role of t.roles) byRole.set(role, t);
}

const ALL_ROLES: AppRole[] = [
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
for (const role of ALL_ROLES) {
  if (!byRole.has(role)) {
    throw new Error(`Tenant registry missing role: ${role}`);
  }
}

export function getTenant(id: TenantId): TenantDefinition {
  const t = byId.get(id);
  if (!t) throw new Error(`Unknown tenant: ${id}`);
  return t;
}

export function tenantBySubdomain(
  subdomain: string | null | undefined,
): TenantDefinition | null {
  if (!subdomain) return null;
  return bySubdomain.get(subdomain.toLowerCase()) ?? null;
}

export function tenantByPortalPath(
  pathname: string,
): TenantDefinition | null {
  const path = pathname.split("?")[0] ?? pathname;
  if (!path.startsWith("/")) return null;
  const hit = TENANTS.find(
    (t) => path === t.portalPath || path.startsWith(`${t.portalPath}/`),
  );
  return hit ?? null;
}

export function tenantByRole(role: AppRole): TenantDefinition {
  const t = byRole.get(role);
  if (!t) throw new Error(`No tenant for role: ${role}`);
  return t;
}

/** Path home for a role (path mode) — derived from TENANTS, never hand-synced. */
export const PORTAL_BY_ROLE: Record<AppRole, string> = (() => {
  const map = {} as Record<AppRole, string>;
  for (const t of TENANTS) {
    for (const role of t.roles) map[role] = t.portalPath;
  }
  return map;
})();

export const TENANT_HEADER = "x-umbrella-tenant";
export const HUB_SUBDOMAINS = new Set(["www", "app", "login", "mail"]);
