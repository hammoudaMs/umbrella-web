import type { AppRole } from "@/lib/roles";
import {
  HUB_SUBDOMAINS,
  PORTAL_BY_ROLE,
  tenantByPortalPath,
  tenantByRole,
  tenantBySubdomain,
} from "@/tenants/registry";
import type { ResolvedTenant, TenantDefinition } from "@/tenants/types";

export type TenantMode = "path" | "subdomain";

export function tenantRootDomain(): string {
  return (
    process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN?.trim() ||
    process.env.TENANT_ROOT_DOMAIN?.trim() ||
    "localhost"
  );
}

export function tenantMode(): TenantMode {
  const raw = (
    process.env.NEXT_PUBLIC_TENANT_MODE ??
    process.env.TENANT_MODE ??
    "path"
  )
    .trim()
    .toLowerCase();
  return raw === "subdomain" ? "subdomain" : "path";
}

/** Extract first label of host when it is a subdomain of the root domain. */
export function extractSubdomain(
  hostHeader: string | null,
  root = tenantRootDomain(),
): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  const rootHost = root.toLowerCase();

  if (host === rootHost || host === `www.${rootHost}`) return null;

  if (rootHost === "localhost" || rootHost.endsWith(".localhost")) {
    if (host.endsWith(".localhost")) {
      const label = host.slice(0, -".localhost".length);
      if (!label || label.includes(".")) return null;
      return label;
    }
    return null;
  }

  if (!host.endsWith(`.${rootHost}`)) return null;
  const label = host.slice(0, -(rootHost.length + 1));
  if (!label || label.includes(".")) return null;
  if (HUB_SUBDOMAINS.has(label)) return null;
  return label;
}

export function resolveTenantFromHost(
  hostHeader: string | null,
): ResolvedTenant | null {
  const sub = extractSubdomain(hostHeader);
  const tenant = tenantBySubdomain(sub);
  if (!tenant) return null;
  return { tenant, source: "subdomain" };
}

export function resolveTenantFromPath(
  pathname: string,
): ResolvedTenant | null {
  const tenant = tenantByPortalPath(pathname);
  if (!tenant) return null;
  return { tenant, source: "path" };
}

export function resolveTenantFromRole(role: AppRole): ResolvedTenant {
  return { tenant: tenantByRole(role), source: "role" };
}

/**
 * Absolute or relative home URL for a tenant.
 * Subdomain mode → https://livreur.umbrella.tn/
 * Path mode → /livreur
 */
export function tenantHomeUrl(
  tenant: TenantDefinition,
  opts?: { protocol?: string; port?: string },
): string {
  if (tenantMode() !== "subdomain") return tenant.portalPath;

  const root = tenantRootDomain();
  const protocol =
    opts?.protocol ??
    (typeof window !== "undefined" ? window.location.protocol.replace(":", "") : "https");
  const port =
    opts?.port ??
    (typeof window !== "undefined" && window.location.port
      ? window.location.port
      : "");
  const portSuffix = port && port !== "80" && port !== "443" ? `:${port}` : "";
  const host =
    root === "localhost"
      ? `${tenant.subdomain}.localhost${portSuffix}`
      : `${tenant.subdomain}.${root}${portSuffix}`;
  return `${protocol}://${host}/`;
}

export function roleHomeUrl(role: AppRole): string {
  return tenantHomeUrl(tenantByRole(role));
}

export function isPathInsideTenant(
  pathname: string,
  tenant: TenantDefinition,
): boolean {
  return (
    pathname === tenant.portalPath ||
    pathname.startsWith(`${tenant.portalPath}/`)
  );
}

export { PORTAL_BY_ROLE };
