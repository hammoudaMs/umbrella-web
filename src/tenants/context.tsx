"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getTenant } from "@/tenants/registry";
import {
  resolveTenantFromPath,
  resolveTenantFromRole,
  tenantHomeUrl,
} from "@/tenants/resolve";
import type { TenantDefinition, TenantId } from "@/tenants/types";

type TenantContextValue = {
  tenant: TenantDefinition | null;
  tenantId: TenantId | null;
  homeUrl: string;
  shell: TenantDefinition["shell"] | null;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  children,
  initialTenantId = null,
}: {
  children: ReactNode;
  /** Set from middleware `x-umbrella-tenant` when on a tenant subdomain */
  initialTenantId?: TenantId | null;
}) {
  const pathname = usePathname() ?? "/";
  const { session } = useAuth();

  const value = useMemo<TenantContextValue>(() => {
    const fromPath = resolveTenantFromPath(pathname)?.tenant ?? null;
    const fromHeader = initialTenantId ? getTenant(initialTenantId) : null;
    const fromRole = session?.user.role
      ? resolveTenantFromRole(session.user.role).tenant
      : null;

    const active = fromPath ?? fromHeader ?? fromRole;
    return {
      tenant: active,
      tenantId: active?.id ?? null,
      homeUrl: active ? tenantHomeUrl(active) : "/",
      shell: active?.shell ?? null,
    };
  }, [pathname, session?.user.role, initialTenantId]);

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    return { tenant: null, tenantId: null, homeUrl: "/", shell: null };
  }
  return ctx;
}
