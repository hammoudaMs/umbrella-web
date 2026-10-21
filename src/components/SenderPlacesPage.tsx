"use client";

import { SenderPlacePerformance } from "@/components/SenderPlacePerformance";
import { ErrorBanner } from "@/components/ui";
import { useT } from "@/i18n/locale-context";
import type { Parcel } from "@/lib/domain";
import { useApiQuery } from "@/lib/use-api";

export function SenderPlacesPage() {
  const t = useT();
  const parcels = useApiQuery<Parcel[]>("/parcels");
  const list = (parcels.data ?? []).filter((p) => p.status !== "SUPPRIME");

  return (
    <div className="w-full space-y-5 pb-8 lg:space-y-6">
      <header>
        <h1 className="font-display text-xl font-extrabold tracking-tight text-ops-ink lg:text-3xl">
          {t("finances.placesTitle")}
        </h1>
        <p className="mt-1 text-sm text-ops-ink/50">{t("finances.placesLead")}</p>
      </header>

      {parcels.error ? (
        <ErrorBanner
          message={parcels.error}
          onRetry={() => void parcels.reload()}
        />
      ) : null}

      <SenderPlacePerformance parcels={list} />
    </div>
  );
}
