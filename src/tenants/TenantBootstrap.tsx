"use client";

import { useMemo, type ReactNode } from "react";
import { TenantProvider } from "@/tenants/context";
import type { TenantId } from "@/tenants/types";
import { TENANTS } from "@/tenants/registry";

function readTenantCookie(): TenantId | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("umbrella_tenant="));
  const raw = match?.split("=")[1];
  if (!raw) return null;
  const id = decodeURIComponent(raw) as TenantId;
  return TENANTS.some((t) => t.id === id) ? id : null;
}

export function TenantBootstrap({ children }: { children: ReactNode }) {
  const initial = useMemo(() => readTenantCookie(), []);
  return <TenantProvider initialTenantId={initial}>{children}</TenantProvider>;
}
