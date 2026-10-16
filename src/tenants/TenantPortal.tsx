"use client";

import { RequireRole } from "@/components/RequireRole";
import { portalSidebarLinks } from "@/lib/portal-nav-config";
import { useT } from "@/i18n/locale-context";
import { getTenant } from "@/tenants/registry";
import type { TenantId } from "@/tenants/types";

/**
 * Binds a Next.js route segment to a single role-based tenant shell.
 * Nav, title and allowed roles come from the tenant registry — not duplicated per layout.
 */
export function TenantPortal({
  tenantId,
  children,
}: {
  tenantId: TenantId;
  children: React.ReactNode;
}) {
  const tenant = getTenant(tenantId);
  const primaryRole = tenant.roles[0];
  const t = useT();

  return (
    <div data-tenant={tenant.id} data-tenant-shell={tenant.shell}>
      <RequireRole
        roles={tenant.roles}
        title={t(`tenants.${tenant.id}.label`)}
        subtitle={t(`tenants.${tenant.id}.subtitle`)}
        links={portalSidebarLinks(primaryRole)}
      >
        {children}
      </RequireRole>
    </div>
  );
}
