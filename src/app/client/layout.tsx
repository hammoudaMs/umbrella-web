"use client";

import { TenantPortal } from "@/tenants/TenantPortal";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantPortal tenantId="client">{children}</TenantPortal>;
}
