"use client";

import { TicketsManager } from "@/components/TicketsManager";

export default function SupportTicketsPage() {
  return <TicketsManager canCreate canResolve allowParcelKinds />;
}
