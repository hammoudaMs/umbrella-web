"use client";

import { TenantPortal } from "@/tenants/TenantPortal";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantPortal tenantId="admin">{children}</TenantPortal>;
}
