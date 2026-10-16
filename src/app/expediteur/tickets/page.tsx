"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TicketsManager } from "@/components/TicketsManager";
import { LoadingBlock } from "@/components/ui";
import { useT } from "@/i18n/locale-context";

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
  const t = useT();
  return (
    <Suspense fallback={<LoadingBlock rows={3} label={t("common.loading")} />}>
      <Body />
    </Suspense>
  );
}
