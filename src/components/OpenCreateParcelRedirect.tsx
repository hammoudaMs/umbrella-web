"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useOptionalPortalCreateParcel } from "@/lib/portal-create-parcel";

/** Opens the shell create modal and returns to the portal home (no full-page create). */
export function OpenCreateParcelRedirect({ homeHref }: { homeHref: string }) {
  const router = useRouter();
  const createParcel = useOptionalPortalCreateParcel();
  const openCreateParcel = createParcel?.openCreateParcel;
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    openCreateParcel?.();
    router.replace(homeHref);
  }, [homeHref, openCreateParcel, router]);

  return null;
}
