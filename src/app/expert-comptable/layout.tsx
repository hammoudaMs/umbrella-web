"use client";

import { TenantPortal } from "@/tenants/TenantPortal";

export default function ExpertComptableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantPortal tenantId="expert">{children}</TenantPortal>;
}
