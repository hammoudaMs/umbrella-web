"use client";

import { TenantPortal } from "@/tenants/TenantPortal";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantPortal tenantId="super-admin">{children}</TenantPortal>;
}
