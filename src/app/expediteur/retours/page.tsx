"use client";

import { Suspense } from "react";
import { ParcelsManager } from "@/components/ParcelsManager";
import { ReturnLotManager } from "@/components/ReturnLotManager";
import { LoadingBlock } from "@/components/ui";
import { useT } from "@/i18n/locale-context";

function Body() {
  const t = useT();
  return (
    <div className="space-y-10">
      <ReturnLotManager />
      <ParcelsManager
        returnsOnly
        title={t("retours.titleMine")}
        description={t("retours.descMine")}
        detailBasePath="/expediteur/parcels"
      />
    </div>
  );
}

export default function ExpediteurRetoursPage() {
  const t = useT();
  return (
    <Suspense fallback={<LoadingBlock rows={3} label={t("common.loading")} />}>
      <Body />
    </Suspense>
  );
}
