"use client";

import { TenantPortal } from "@/tenants/TenantPortal";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantPortal tenantId="finance">{children}</TenantPortal>;
}
