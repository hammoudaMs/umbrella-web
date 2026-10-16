export type {
  TenantDefinition,
  TenantId,
  TenantShellKind,
  ResolvedTenant,
} from "@/tenants/types";
export {
  TENANTS,
  TENANT_HEADER,
  PORTAL_BY_ROLE,
  getTenant,
  tenantByRole,
  tenantBySubdomain,
  tenantByPortalPath,
} from "@/tenants/registry";
export {
  tenantMode,
  tenantRootDomain,
  extractSubdomain,
  resolveTenantFromHost,
  resolveTenantFromPath,
  resolveTenantFromRole,
  tenantHomeUrl,
  roleHomeUrl,
  isPathInsideTenant,
} from "@/tenants/resolve";
export { TenantProvider, useTenant } from "@/tenants/context";
export { TenantPortal } from "@/tenants/TenantPortal";
