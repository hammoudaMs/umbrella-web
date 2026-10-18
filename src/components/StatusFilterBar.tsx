"use client";

import { useMemo, type ComponentType } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Ban,
  Building2,
  CheckCircle2,
  LayoutGrid,
  Package,
  PackageCheck,
  RotateCcw,
  Truck,
  UserRound,
  Hourglass,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { DASHBOARD_STATUS_KEYS } from "@/lib/dashboard-statuses";
import { REASON_VISIBLE_STATUSES } from "@/lib/parcel-transitions";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";

type Countable = { status: string };

const SHORT_LABEL: Partial<Record<StatusKey, string>> = {
  EN_ATTENTE: "En attente",
  A_ENLEVER: "En attente",
  ENLEVES: "Récupéré",
  AU_DEPOT: "Au dépôt",
  EXPEDIE_DESTINATION: "Expédié",
  ARRIVE_DESTINATION: "Destination",
  AFFECTE_LIVREUR: "Affecté",
  EN_COURS: "En livraison",
  LIVRES: "Livré",
  LIVRES_PAYES: "Payé",
  LIVRAISON_ANNULEE: "Annulé",
  RETOUR_DEPOT: "Retour",
  RETOUR_EXPEDITEURS: "Retour exp.",
  RETOUR_RECU: "Retour reçu",
  RETOUR_DEFINITIF: "Retour déf.",
  RETOUR_INTER_AGENCE: "Inter-agence",
  A_VERIFIER: "À vérifier",
  NON_SERIEUX: "Non sérieux",
};

const STATUS_ICON: Partial<
  Record<StatusKey, ComponentType<LucideProps>>
> = {
  EN_ATTENTE: Hourglass,
  A_ENLEVER: Hourglass,
  ENLEVES: PackageCheck,
  AU_DEPOT: Building2,
  EXPEDIE_DESTINATION: Truck,
  ARRIVE_DESTINATION: Building2,
  AFFECTE_LIVREUR: UserRound,
  EN_COURS: Truck,
  LIVRES: CheckCircle2,
  LIVRES_PAYES: CheckCircle2,
  LIVRAISON_ANNULEE: Ban,
  RETOUR_DEPOT: RotateCcw,
  RETOUR_EXPEDITEURS: RotateCcw,
  RETOUR_RECU: Package,
  RETOUR_DEFINITIF: Ban,
  RETOUR_INTER_AGENCE: RotateCcw,
  A_VERIFIER: Package,
  NON_SERIEUX: Ban,
};

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function StatusFilterBar({ parcels }: { parcels: Countable[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("status");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const parcel of parcels) {
      map.set(parcel.status, (map.get(parcel.status) ?? 0) + 1);
    }
    return map;
  }, [parcels]);

  const keys = useMemo(() => {
    const withCount = DASHBOARD_STATUS_KEYS.filter(
      (key) => (counts.get(key) ?? 0) > 0 || current === key,
    );
    if (current && !withCount.includes(current as StatusKey)) {
      return [...withCount, current as StatusKey];
    }
    return withCount;
  }, [counts, current]);

  function go(status: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (status) params.set("status", status);
    else params.delete("status");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-2">
      <div
        role="tablist"
        aria-label="Filtrer par statut"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
      >
        <FilterChip
          label="Tous"
          count={parcels.length}
          active={!current}
          color="#991211"
          onClick={() => go(null)}
          Icon={LayoutGrid}
        />
        {keys.map((key) => {
          const meta = STATUS_META[key];
          const Icon = STATUS_ICON[key] ?? Package;
          return (
            <FilterChip
              key={key}
              label={SHORT_LABEL[key] ?? meta?.label ?? key}
              title={meta?.label ?? key}
              count={counts.get(key) ?? 0}
              active={current === key}
              color={meta?.color ?? "#64748b"}
              onClick={() => go(key)}
              Icon={Icon}
            />
          );
        })}
      </div>
      {current ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => go(null)}
            className="text-[11px] font-medium text-ops-ink/40 transition hover:text-ops-accent"
          >
            Effacer le filtre
          </button>
          {REASON_VISIBLE_STATUSES.has(current as StatusKey) ? (
            <p className="text-[11px] font-medium text-ops-accent/80">
              Motif d’annulation / vérification affiché sur chaque colis
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  title,
  count,
  active,
  color,
  onClick,
  Icon,
}: {
  label: string;
  title?: string;
  count: number;
  active: boolean;
  color: string;
  onClick: () => void;
  Icon: ComponentType<LucideProps>;
}) {
  return (
    <button
      type="button"
      role="tab"
      title={title ?? label}
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        active
          ? "border-transparent text-ops-ink"
          : "border-ops-card bg-ops-surface text-ops-ink/70 hover:border-ops-ink/15 hover:text-ops-ink",
        count === 0 && !active ? "opacity-45" : null,
      )}
      style={
        active
          ? {
              backgroundColor: hexToRgba(color, 0.16),
              boxShadow: `inset 0 0 0 1px ${hexToRgba(color, 0.45)}`,
            }
          : undefined
      }
    >
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: hexToRgba(color, active ? 0.28 : 0.14),
          color,
        }}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-tight tracking-tight">
        {label}
      </span>
      <span
        className={cn(
          "shrink-0 font-display text-[14px] font-bold tabular-nums leading-none",
          active ? "text-ops-ink" : "text-ops-ink/40",
        )}
      >
        {count}
      </span>
    </button>
  );
}
