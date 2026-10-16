"use client";

import { TenantPortal } from "@/tenants/TenantPortal";

export default function MagasinierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantPortal tenantId="magasinier">{children}</TenantPortal>;
}
