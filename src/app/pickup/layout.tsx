"use client";

import { TenantPortal } from "@/tenants/TenantPortal";

export default function PickupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantPortal tenantId="pickup">{children}</TenantPortal>;
}
