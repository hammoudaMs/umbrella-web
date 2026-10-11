"use client";

import { Suspense } from "react";
import { ParcelsManager } from "@/components/ParcelsManager";
import { ReturnLotManager } from "@/components/ReturnLotManager";
import { LoadingBlock } from "@/components/ui";

function Body() {
  return (
    <div className="space-y-10">
      <ReturnLotManager />
      <ParcelsManager
        returnsOnly
        title="Mes retours"
        description="Tous les colis en statut retour"
        detailBasePath="/expediteur/parcels"
      />
    </div>
  );
}

export default function ExpediteurRetoursPage() {
  return (
    <Suspense fallback={<LoadingBlock rows={3} label="Chargement…" />}>
      <Body />
    </Suspense>
  );
}
