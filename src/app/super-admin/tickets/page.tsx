"use client";

import { TicketsManager } from "@/components/TicketsManager";

export default function SuperAdminTicketsPage() {
  return <TicketsManager canCreate canResolve allowParcelKinds />;
}
