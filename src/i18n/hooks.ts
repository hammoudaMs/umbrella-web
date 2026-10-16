"use client";

import { useCallback } from "react";
import { useT } from "@/i18n/locale-context";
import { statusLabel } from "@/lib/portal-nav";
import { roleLabel, type AppRole } from "@/lib/roles";

export function useStatusLabel() {
  const t = useT();
  return useCallback((status: string) => statusLabel(status, t), [t]);
}

export function useRoleLabel() {
  const t = useT();
  return useCallback((role: AppRole) => roleLabel(role, t), [t]);
}
