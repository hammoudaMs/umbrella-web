"use client";

import { TenantPortal } from "@/tenants/TenantPortal";

export default function LivreurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantPortal tenantId="livreur">{children}</TenantPortal>;
}
