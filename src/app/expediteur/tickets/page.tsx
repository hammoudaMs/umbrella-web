"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TicketsManager } from "@/components/TicketsManager";
import { LoadingBlock } from "@/components/ui";

function Body() {
  const params = useSearchParams();
  const parcelIdRaw = params.get("parcelId");
  const parcelId = parcelIdRaw ? Number(parcelIdRaw) : undefined;
  return (
    <TicketsManager
      canCreate
      allowParcelKinds
      defaultParcelId={
        parcelId && Number.isFinite(parcelId) ? parcelId : undefined
      }
    />
  );
}

export default function ExpediteurTicketsPage() {
  return (
    <Suspense fallback={<LoadingBlock rows={3} label="Chargement…" />}>
      <Body />
    </Suspense>
  );
}
