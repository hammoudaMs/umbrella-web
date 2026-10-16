"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PortalCreateParcelContextValue = {
  createOpen: boolean;
  openCreateParcel: () => void;
  setCreateOpen: (open: boolean) => void;
};

const PortalCreateParcelContext =
  createContext<PortalCreateParcelContextValue | null>(null);

export function PortalCreateParcelProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const openCreateParcel = useCallback(() => setCreateOpen(true), []);

  const value = useMemo(
    () => ({ createOpen, openCreateParcel, setCreateOpen }),
    [createOpen, openCreateParcel],
  );

  return (
    <PortalCreateParcelContext.Provider value={value}>
      {children}
    </PortalCreateParcelContext.Provider>
  );
}

export function usePortalCreateParcel() {
  const ctx = useContext(PortalCreateParcelContext);
  if (!ctx) {
    throw new Error(
      "usePortalCreateParcel must be used within PortalCreateParcelProvider",
    );
  }
  return ctx;
}

/** Safe for surfaces that may render outside the portal shell. */
export function useOptionalPortalCreateParcel() {
  return useContext(PortalCreateParcelContext);
}

export const CREATE_PARCEL_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "CHEF_AGENCE",
  "EXPEDITEUR",
] as const;

export const PARCEL_CREATED_EVENT = "umbrella:parcel-created";

export function emitParcelCreated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PARCEL_CREATED_EVENT));
}
