"use client";

import { TicketsManager } from "@/components/TicketsManager";

export default function AdminTicketsPage() {
  return <TicketsManager canCreate canResolve allowParcelKinds />;
}
