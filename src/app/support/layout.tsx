"use client";

import { TenantPortal } from "@/tenants/TenantPortal";

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantPortal tenantId="support">{children}</TenantPortal>;
}
