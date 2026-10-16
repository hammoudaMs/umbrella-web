import type { AppRole } from "@/lib/roles";

/**
 * Role-based tenant surface. Each tenant is a deployable portal that can later
 * live on its own subdomain (e.g. livreur.umbrella.tn) without sharing shell/nav.
 */
export type TenantId =
  | "super-admin"
  | "admin"
  | "expert"
  | "chef"
  | "support"
  | "pickup"
  | "magasinier"
  | "finance"
  | "expediteur"
  | "livreur"
  | "client";

export type TenantShellKind =
  | "ops"
  | "money"
  | "fleet"
  | "sender"
  | "driver"
  | "recipient";

export type TenantDefinition = {
  id: TenantId;
  /** DNS label: livreur.umbrella.tn → "livreur" */
  subdomain: string;
  /** Path prefix while still on a shared host */
  portalPath: string;
  /** Roles allowed on this tenant (usually one) */
  roles: AppRole[];
  label: string;
  subtitle: string;
  shell: TenantShellKind;
  /** Public marketing entry allowed without auth */
  publicEntry?: boolean;
};

export type ResolvedTenant = {
  tenant: TenantDefinition;
  /** How the request was bound to the tenant */
  source: "subdomain" | "path" | "role" | "header";
};
