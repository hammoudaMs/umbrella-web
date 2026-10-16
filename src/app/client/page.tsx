"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LifeBuoy, PackageSearch } from "lucide-react";
import {
  DashboardHero,
  DashboardPromo,
} from "@/components/DashboardHero";
import {
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  Panel,
  StatCard,
  StatusBadge,
  buttonClass,
} from "@/components/ui";
import { formatTnd, type Parcel } from "@/lib/domain";
import { buildParcours } from "@/lib/parcel-parcours";
import { useApiQuery } from "@/lib/use-api";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/locale-context";

const IN_TRANSIT = new Set([
  "A_ENLEVER",
  "ENLEVES",
  "AU_DEPOT",
  "EXPEDIE_DESTINATION",
  "ARRIVE_DESTINATION",
  "AFFECTE_LIVREUR",
  "EN_COURS",
  "A_VERIFIER",
]);

export default function ClientPage() {
  const t = useT();
  const { data, error, loading, reload } = useApiQuery<Parcel[]>("/parcels");
  const parcels = useMemo(() => data ?? [], [data]);
  const inTransit = parcels.filter((p) => IN_TRANSIT.has(p.status)).length;
  const delivered = parcels.filter(
    (p) => p.status === "LIVRES" || p.status === "LIVRES_PAYES",
  ).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <DashboardHero
        subtitle={t("misc.client.subtitle")}
        actions={[
          { href: "/client/tickets", label: t("home.support") },
          { href: "/track", label: t("misc.client.trackCode"), primary: true },
        ]}
      />

      {error ? (
        <ErrorBanner message={error} onRetry={() => void reload()} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("parcels.title")}
          value={parcels.length}
          icon={PackageSearch}
          tone="brand"
        />
        <StatCard label={t("misc.client.statInTransit")} value={inTransit} tone="gold" />
        <StatCard label={t("misc.client.statDelivered")} value={delivered} tone="success" />
      </div>

      {loading && parcels.length === 0 ? (
        <LoadingBlock rows={2} label={t("common.loading")} />
      ) : null}

      {!loading && parcels.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={t("misc.client.emptyTitle")}
          description={t("misc.client.emptyDescription")}
          action={
            <Link href="/track" className={buttonClass("secondary")}>
              {t("misc.client.trackCode")}
            </Link>
          }
        />
      ) : null}

      <ul className="space-y-3">
        {parcels.map((p) => {
          const parcours = buildParcours(p.status);
          const doneCount = parcours.steps.filter((s) => s.done || s.current).length;
          const pct = Math.round((doneCount / parcours.steps.length) * 100);
          return (
            <li key={p.id}>
              <Panel className="space-y-4">
                <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:text-left">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-brand">
                      {p.code}
                    </p>
                    <p className="mt-1 font-display text-lg font-bold text-ink">
                      {p.designation ?? p.notes ?? t("misc.client.parcelFallback")}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {p.city}, {p.governorate} ·{" "}
                      {t("misc.client.codDue", { amount: formatTnd(p.price) })}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-cream-soft"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <ol className="mt-2 flex flex-wrap gap-1.5">
                    {parcours.steps.map((step) => (
                      <li
                        key={step.key}
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                          step.current && "bg-brand/15 text-brand",
                          step.done && "text-ink-muted line-through",
                          step.upcoming && "text-ink-muted/70",
                        )}
                      >
                        {step.label}
                      </li>
                    ))}
                  </ol>
                </div>
                {(p.status === "LIVRES" || p.status === "LIVRES_PAYES") ? (
                  <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-center text-xs font-semibold text-emerald-800">
                    {t("track.deliveredBanner")}
                  </p>
                ) : null}
                <div className="flex flex-col items-center gap-2 border-t border-cream pt-3 text-center sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:text-left">
                  <p className="text-xs text-ink-muted">
                    {t("misc.client.updatedOn")}{" "}
                    {new Date(p.updatedAt ?? p.createdAt).toLocaleDateString(
                      "fr-TN",
                    )}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Link
                      href={`/client/tickets?parcelId=${p.id}`}
                      className={buttonClass("secondary", "sm")}
                    >
                      {t("nav.tickets")}
                    </Link>
                    <Link
                      href={`/track?code=${encodeURIComponent(p.code ?? "")}`}
                      className={buttonClass("primary", "sm")}
                    >
                      {t("misc.client.viewTracking")}
                    </Link>
                  </div>
                </div>
              </Panel>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-center">
        <Link href="/client/tickets" className={buttonClass("secondary")}>
          <LifeBuoy className="h-4 w-4" aria-hidden />
          {t("home.openTicket")}
        </Link>
      </div>

      <DashboardPromo />
    </div>
  );
}
