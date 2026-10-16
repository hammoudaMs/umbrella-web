"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PublicTrackForm } from "@/components/PublicTrackForm";
import { LoadingBlock } from "@/components/ui";
import { useT } from "@/i18n/locale-context";

function TrackInner() {
  const params = useSearchParams();
  const code = params.get("code") ?? "";
  return <PublicTrackForm initialCode={code} />;
}

export default function TrackPage() {
  const t = useT();
  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-soft to-page px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
          Umbrella Express
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold text-ink">
          {t("track.pageTitle")}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{t("track.pageSubtitle")}</p>
      </div>
      <div className="mt-10">
        <Suspense fallback={<LoadingBlock rows={2} label={t("common.loading")} />}>
          <TrackInner />
        </Suspense>
      </div>
    </main>
  );
}
