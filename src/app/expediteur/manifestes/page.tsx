"use client";

import { PickupManifestManager } from "@/components/PickupManifestManager";

export default function ExpediteurManifestesPage() {
  return (
    <PickupManifestManager basePath="/expediteur" lockedKind="EN_ATTENTE" />
  );
}
