"use client";

import { Suspense } from "react";
import { ParcelsManager } from "@/components/ParcelsManager";
import { useT } from "@/i18n/locale-context";

function Body() {
  const t = useT();
  return (
    <ParcelsManager
      title={t("nav.parcels")}
      description={t("parcels.descAgency")}
      detailBasePath="/pickup/parcels"
      showPartyDetails
    />
  );
}

export default function Page() {
  const t = useT();
  return (
    <Suspense fallback={<p className="text-ink-muted">{t("common.loading")}</p>}>
      <Body />
    </Suspense>
  );
}
