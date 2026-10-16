"use client";

import { TenantPortal } from "@/tenants/TenantPortal";

export default function ChefAgenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantPortal tenantId="chef">{children}</TenantPortal>;
}
