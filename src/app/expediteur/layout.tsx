"use client";

import { TenantPortal } from "@/tenants/TenantPortal";

export default function ExpediteurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantPortal tenantId="expediteur">{children}</TenantPortal>;
}
