"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Phone, Truck } from "lucide-react";
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
  buttonClass,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import type { Driver, Parcel } from "@/lib/domain";
import { PORTAL_BY_ROLE } from "@/lib/roles";
import { useApiQuery } from "@/lib/use-api";
import { useT } from "@/i18n/locale-context";

const ACTIVE = ["A_ENLEVER", "ENLEVES", "AU_DEPOT", "EN_COURS", "A_VERIFIER"];
const DELIVERED = ["LIVRES", "LIVRES_PAYES"];
const DAILY_CAPACITY = 8;

export default function FlottePage() {
  const t = useT();
  const { session } = useAuth();
  const base = session ? PORTAL_BY_ROLE[session.user.role] : "/admin";
  const drivers = useApiQuery<Driver[]>("/users/livreurs");
  const parcels = useApiQuery<Parcel[]>("/parcels");

  const fleet = useMemo(
    () =>
      (drivers.data ?? []).map((d) => {
        const assigned = (parcels.data ?? []).filter((p) => p.driver?.id === d.id);
        return {
          driver: d,
          assigned,
          active: assigned.filter((p) => ACTIVE.includes(p.status)),
          delivered: assigned.filter((p) => DELIVERED.includes(p.status)).length,
        };
      }),
    [drivers.data, parcels.data],
  );

  const loading = (drivers.loading && !drivers.data) || (parcels.loading && !parcels.data);
  const error = drivers.error ?? parcels.error;
  const totalActive = fleet.reduce((s, f) => s + f.active.length, 0);
  const unassigned = (parcels.data ?? []).filter((p) => p.mode === "INTERNAL" && !p.driver).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("misc.fleet.title")}
        description={t("misc.fleet.description")}
        actions={
          <Link href={`${base}/dispatch`} className={buttonClass("primary")}>
            <Truck className="h-4 w-4" aria-hidden />
            Ouvrir le dispatch
          </Link>
        }
      />

      {error ? (
        <ErrorBanner
          message={error}
          onRetry={() => void Promise.all([drivers.reload(), parcels.reload()])}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Livreurs actifs" value={fleet.length} icon={Truck} tone="brand" />
        <StatCard label="Colis en circulation" value={totalActive} tone="gold" />
        <StatCard label="À assigner" value={unassigned} hint="Colis INTERNAL sans livreur" />
      </div>

      {loading ? <LoadingBlock rows={2} label="Chargement de la flotte…" /> : null}

      {!loading && fleet.length === 0 ? (
        <EmptyState icon={Truck} title="Aucun livreur actif" description="Créez un compte livreur depuis Utilisateurs." />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {fleet.map(({ driver, assigned, active, delivered }) => {
          const load = Math.min(100, Math.round((active.length / DAILY_CAPACITY) * 100));
          return (
            <Panel key={driver.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={driver.name} className="h-11 w-11" />
                  <div>
                    <p className="font-display text-lg font-bold text-ops-ink">{driver.name}</p>
                    <p className="text-sm text-ops-ink/50">{driver.email}</p>
                  </div>
                </div>
                {driver.phone ? (
                  <a
                    href={`tel:${driver.phone}`}
                    className={buttonClass("secondary", "sm")}
                    aria-label={`Appeler ${driver.name}`}
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    Appeler
                  </a>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ops-ink">
                    {active.length} en cours · {delivered} livré(s)
                  </span>
                  <span className="text-ops-ink/50">Charge {load}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ops-surface-2" aria-hidden>
                  <div
                    className={`h-full rounded-full ${load > 80 ? "bg-ops-accent" : "bg-gold"}`}
                    style={{ width: `${load}%` }}
                  />
                </div>
              </div>

              <ul className="space-y-2 text-sm">
                {assigned.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 border-t border-ops-card/70 pt-2">
                    <span className="min-w-0">
                      <span className="block font-mono text-xs font-semibold text-ops-ink">{p.code}</span>
                      <span className="block truncate text-xs text-ops-ink/50">
                        {p.recipientName} · {p.city}
                      </span>
                    </span>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
                {assigned.length === 0 ? (
                  <li className="text-ops-ink/50">Aucun colis assigné</li>
                ) : null}
                {assigned.length > 5 ? (
                  <li className="text-xs text-ops-ink/50">+ {assigned.length - 5} autre(s)</li>
                ) : null}
              </ul>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
