"use client";

import { ZonesManager } from "@/components/ZonesManager";
import { useT } from "@/i18n/locale-context";

export default function LivreurZonesPage() {
  const t = useT();
  return (
    <ZonesManager
      canCreate
      canDelete={false}
      title={t("zones.titleTour")}
      description={t("zones.descTour")}
    />
  );
}
