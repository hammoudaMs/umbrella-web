"use client";

import { Suspense } from "react";
import { ParcelsManager } from "@/components/ParcelsManager";
import { useT } from "@/i18n/locale-context";

function Body() {
  const t = useT();
  return (
    <ParcelsManager
      canCreate
      canEdit
      canDelete
      title={t("parcels.titleMine")}
      description={t("parcels.descSender")}
      detailBasePath="/expediteur/parcels"
    />
  );
}

export default function ExpediteurParcelsPage() {
  const t = useT();
  return (
    <Suspense fallback={<p className="text-ink-muted">{t("common.loading")}</p>}>
      <Body />
    </Suspense>
  );
}
