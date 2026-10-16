"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Box,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock,
  Coins,
  HandCoins,
  LifeBuoy,
  Package,
  RefreshCw,
  ShieldCheck,
  Truck,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { HeroVanScene } from "@/components/landing/HeroVanScene";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/cn";
import { type OpsKpi, type OpsKpiTone } from "@/lib/ops-status-kpis";
import type { PortalHomeConfig } from "@/lib/portal-home";
import { hexToRgba } from "@/lib/status-categories";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";
import { SortableTh, useTableSort } from "@/lib/table-sort";

export type { OpsKpi };

type PerfPeriod = "today" | "week" | "month" | "custom";

type PerfParcel = {
  status: string;
  createdAt: string;
  price: string | number;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function periodRange(
  period: PerfPeriod,
  customFrom: string,
  customTo: string,
): { from: Date; to: Date } {
  const now = new Date();
  if (period === "today") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }
  if (period === "week") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to: endOfDay(now) };
  }
  if (period === "month") {
    const from = startOfDay(now);
    from.setDate(1);
    return { from, to: endOfDay(now) };
  }
  const from = customFrom
    ? startOfDay(new Date(`${customFrom}T00:00:00`))
    : startOfDay(now);
  const to = customTo
    ? endOfDay(new Date(`${customTo}T00:00:00`))
    : endOfDay(now);
  return {
    from: from.getTime() <= to.getTime() ? from : to,
    to: from.getTime() <= to.getTime() ? to : from,
  };
}

function isDeliveredStatus(status: string) {
  return status === "LIVRES" || status === "LIVRES_PAYES";
}

type DayPoint = {
  date: string;
  label: string;
  total: number;
};

type RecentParcel = {
  id: number;
  code: string | null;
  recipientName: string;
  city: string;
  status: string;
  price: string | number;
  createdAt: string;
};

type RecentSortKey =
  | "code"
  | "recipientName"
  | "city"
  | "status"
  | "price"
  | "createdAt";

const RECENT_SORT = {
  code: (p: RecentParcel) => p.code ?? "",
  recipientName: (p: RecentParcel) => p.recipientName,
  city: (p: RecentParcel) => p.city,
  status: (p: RecentParcel) =>
    STATUS_META[p.status as StatusKey]?.label ?? p.status,
  price: (p: RecentParcel) => Number(p.price),
  createdAt: (p: RecentParcel) => p.createdAt,
} as const;

function formatMoney(n: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatGreetingDate(d: Date) {
  return d.toLocaleDateString("fr-TN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatGreetingTime(d: Date) {
  return d.toLocaleTimeString("fr-TN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(value: string | number) {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return `${new Intl.NumberFormat("fr-TN", {
    maximumFractionDigits: 3,
  }).format(n)} DT`;
}

function formatShortDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "short",
  });
}

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-TN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusVisual(status: string): {
  pill: string;
  box: string;
  label: string;
  Icon: LucideIcon;
} {
  if (status === "EN_ATTENTE" || status === "NON_SERIEUX")
    return {
      pill: "bg-[#FFAB00] text-[#0B0E14]",
      box: "bg-[#FFAB00] text-[#0B0E14]",
      label: "text-[#FFAB00]",
      Icon: Clock,
    };
  if (status === "LIVRES" || status === "LIVRES_PAYES")
    return {
      pill: "bg-[#00875A] text-white",
      box: "bg-[#00875A] text-white",
      label: "text-[#34d399]",
      Icon: CircleCheck,
    };
  if (status === "EN_COURS")
    return {
      pill: "bg-[#0065FF] text-white",
      box: "bg-[#0065FF] text-white",
      label: "text-[#60a5fa]",
      Icon: Truck,
    };
  if (status === "AU_DEPOT" || status === "A_VERIFIER" || status === "ECHANGES")
    return {
      pill: "bg-[#6554C0] text-white",
      box: "bg-[#6554C0] text-white",
      label: "text-[#a78bfa]",
      Icon: Package,
    };
  if (status === "A_ENLEVER" || status === "ENLEVES")
    return {
      pill: "bg-[#0065FF] text-white",
      box: "bg-[#0065FF] text-white",
      label: "text-[#60a5fa]",
      Icon: Truck,
    };
  if (status.startsWith("RETOUR"))
    return {
      pill: "bg-[#E11D48] text-white",
      box: "bg-[#E11D48] text-white",
      label: "text-[#fb7185]",
      Icon: X,
    };
  return {
    pill: "bg-zinc-600 text-white",
    box: "bg-zinc-600 text-white",
    label: "text-ops-ink/60",
    Icon: Package,
  };
}

const DELIVERED_TILES: { box: string; Icon: LucideIcon }[] = [
  { box: "bg-[#FFAB00]", Icon: Package },
  { box: "bg-[#00875A]", Icon: CircleCheck },
  { box: "bg-[#0065FF]", Icon: Truck },
  { box: "bg-[#6554C0]", Icon: Box },
];

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status as StatusKey];
  const { pill, Icon } = statusVisual(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold lg:gap-1 lg:px-2.5 lg:py-0.5 lg:text-[10px] ${pill}`}
    >
      <Icon className="h-3.5 w-3.5 lg:h-3 lg:w-3" strokeWidth={2.5} aria-hidden />
      {meta?.label ?? status}
    </span>
  );
}

const ICON_MAP: Record<OpsKpi["icon"], LucideIcon> = {
  package: Box,
  clock: Clock,
  truck: Truck,
  check: CircleCheck,
  return: RefreshCw,
  coins: Coins,
  alert: Clock,
};

type KpiTheme = {
  border: string;
  glow: string;
  wash: string;
  badge: string;
  watermark: string;
};

const KPI_TONE_THEME: Record<OpsKpiTone, KpiTheme> = {
  brand: {
    border: "border-[#E11D48]/40",
    glow: "shadow-[0_0_18px_rgba(225,29,72,0.22)]",
    wash: "bg-[#E11D48]/[0.12]",
    badge: "bg-[#E11D48]",
    watermark: "text-[#E11D48]",
  },
  green: {
    border: "border-[#00875A]/45",
    glow: "shadow-[0_0_18px_rgba(0,135,90,0.2)]",
    wash: "bg-[#00875A]/[0.12]",
    badge: "bg-[#00875A]",
    watermark: "text-[#00875A]",
  },
  sky: {
    border: "border-[#0EA5E9]/45",
    glow: "shadow-[0_0_18px_rgba(14,165,233,0.22)]",
    wash: "bg-[#0EA5E9]/[0.12]",
    badge: "bg-[#0EA5E9]",
    watermark: "text-[#0EA5E9]",
  },
  blue: {
    border: "border-[#0065FF]/45",
    glow: "shadow-[0_0_18px_rgba(0,101,255,0.2)]",
    wash: "bg-[#0065FF]/[0.12]",
    badge: "bg-[#0065FF]",
    watermark: "text-[#0065FF]",
  },
  rose: {
    border: "border-[#F43F5E]/45",
    glow: "shadow-[0_0_18px_rgba(244,63,94,0.22)]",
    wash: "bg-[#F43F5E]/[0.12]",
    badge: "bg-[#F43F5E]",
    watermark: "text-[#F43F5E]",
  },
  violet: {
    border: "border-[#6554C0]/45",
    glow: "shadow-[0_0_18px_rgba(101,84,192,0.22)]",
    wash: "bg-[#6554C0]/[0.12]",
    badge: "bg-[#6554C0]",
    watermark: "text-[#6554C0]",
  },
  teal: {
    border: "border-[#14B8A6]/45",
    glow: "shadow-[0_0_18px_rgba(20,184,166,0.22)]",
    wash: "bg-[#14B8A6]/[0.12]",
    badge: "bg-[#14B8A6]",
    watermark: "text-[#14B8A6]",
  },
  amber: {
    border: "border-[#F59E0B]/45",
    glow: "shadow-[0_0_18px_rgba(245,158,11,0.2)]",
    wash: "bg-[#F59E0B]/[0.12]",
    badge: "bg-[#F59E0B]",
    watermark: "text-[#F59E0B]",
  },
  orange: {
    border: "border-[#FFAB00]/45",
    glow: "shadow-[0_0_18px_rgba(255,171,0,0.2)]",
    wash: "bg-[#FFAB00]/[0.12]",
    badge: "bg-[#FFAB00]",
    watermark: "text-[#FFAB00]",
  },
  slate: {
    border: "border-[#64748B]/45",
    glow: "shadow-[0_0_18px_rgba(100,116,139,0.2)]",
    wash: "bg-[#64748B]/[0.12]",
    badge: "bg-[#64748B]",
    watermark: "text-[#64748B]",
  },
  gold: {
    border: "border-[#986A36]/45",
    glow: "shadow-[0_0_18px_rgba(152,106,54,0.2)]",
    wash: "bg-[#986A36]/[0.12]",
    badge: "bg-[#986A36]",
    watermark: "text-[#986A36]",
  },
  pink: {
    border: "border-[#EC4899]/45",
    glow: "shadow-[0_0_18px_rgba(236,72,153,0.2)]",
    wash: "bg-[#EC4899]/[0.12]",
    badge: "bg-[#EC4899]",
    watermark: "text-[#EC4899]",
  },
};

function OpsKpiCard({
  kpi,
  className,
}: {
  kpi: OpsKpi;
  className?: string;
}) {
  const Icon = ICON_MAP[kpi.icon] ?? ICON_MAP.package;
  const theme = KPI_TONE_THEME[kpi.tone];
  const color = kpi.color?.startsWith("#") ? kpi.color : null;
  const deltaTone =
    kpi.deltaTone === "down"
      ? "text-rose-400"
      : kpi.deltaTone === "flat"
        ? "text-ops-ink/45"
        : "text-emerald-400";

  return (
    <Link
      href={kpi.href}
      className={cn(
        "relative min-h-[5.5rem] min-w-0 overflow-hidden rounded-2xl border bg-ops-surface px-3 py-3 transition hover:brightness-110 lg:min-h-0 lg:px-4 lg:py-4",
        color ? "border-transparent" : theme.border,
        color ? undefined : theme.glow,
        className,
      )}
      style={
        color
          ? {
              borderColor: hexToRgba(color, 0.45),
              boxShadow: `0 0 18px ${hexToRgba(color, 0.22)}`,
            }
          : undefined
      }
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          color ? undefined : theme.wash,
        )}
        style={color ? { backgroundColor: hexToRgba(color, 0.12) } : undefined}
        aria-hidden
      />
      <Icon
        className={cn(
          "pointer-events-none absolute -bottom-2 -right-1 h-14 w-14 opacity-[0.12] lg:h-[4.75rem] lg:w-[4.75rem]",
          color ? undefined : theme.watermark,
        )}
        style={color ? { color } : undefined}
        strokeWidth={1.15}
        aria-hidden
      />
      <div className="relative flex items-start gap-3 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-x-3">
        <span
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white lg:col-start-1 lg:row-span-3 lg:h-11 lg:w-11",
            color ? undefined : theme.badge,
          )}
          style={color ? { backgroundColor: color } : undefined}
        >
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1 lg:contents">
          <p className="truncate text-[14px] font-semibold leading-tight text-ops-ink lg:col-start-2 lg:row-start-1 lg:text-[13px] lg:font-medium">
            {kpi.label}
          </p>
          <p className="mt-1.5 font-display text-[1.75rem] font-extrabold leading-none tabular-nums tracking-tight text-ops-ink lg:col-start-2 lg:row-start-2 lg:mt-0 lg:text-[1.65rem]">
            {kpi.value}
          </p>
          {kpi.delta ? (
            <p className="mt-1.5 text-[12px] leading-tight lg:col-start-2 lg:row-start-3 lg:text-[11px]">
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${deltaTone}`}
              >
                {kpi.deltaTone === "down" ? (
                  <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : kpi.deltaTone === "up" ? (
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : null}
                {kpi.delta}
              </span>
              <span className="ml-1 font-normal text-ops-ink/45">
                vs hier
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export type ExpediteurAsideData = {
  eligibleCount: number;
  eligibleAmount: number;
  returnCount: number;
  openTicketCount: number;
  openTickets: Array<{
    id: number;
    title: string;
    status: string;
    parcel?: { code: string | null } | null;
  }>;
  disponible: number;
  enDemande: number;
};

type OpsDashboardProps = {
  basePath: string;
  firstName: string;
  home: PortalHomeConfig;
  kpis: OpsKpi[];
  revenue: number;
  /** Cash balance held by the user (e.g. livreur), shown in the hero. */
  solde?: number | null;
  inProgress: number;
  delivered: number;
  deliveryRate: number;
  /** Full parcel list for period-filtered Performance metrics. */
  performanceParcels?: PerfParcel[];
  last7Days: DayPoint[];
  recent: RecentParcel[];
  returns: RecentParcel[];
  deliveredRecent: RecentParcel[];
  expediteurAside?: ExpediteurAsideData | null;
  onCreateParcel?: () => void;
};

/** Dark ops board — same visual language on phone and desktop (mock-identical). */
export function MobileOpsDashboard(props: OpsDashboardProps) {
  return <OpsDashboardBoard {...props} />;
}

export function OpsDashboardBoard({
  basePath,
  firstName,
  home,
  kpis,
  solde = null,
  performanceParcels = [],
  last7Days,
  recent,
  returns,
  deliveredRecent,
  expediteurAside = null,
  onCreateParcel,
}: OpsDashboardProps) {
  const t = useT();
  const periodLabels: Record<PerfPeriod, string> = {
    today: t("common.today"),
    week: t("common.week"),
    month: t("common.month"),
    custom: t("common.custom"),
  };
  const now = new Date();
  const maxDay = Math.max(1, ...last7Days.map((d) => d.total));
  const analyticsHref = `${basePath}/analytics`;
  const parcelsHref = `${basePath}/parcels`;
  const paymentsHref = `${basePath}/payments`;
  const ticketsHref = `${basePath}/tickets`;
  const retoursHref = home.retoursHref;
  const isExpediteurAside = home.asideMode === "expediteur";
  const {
    subtitle,
    showNouveauCta,
    showChart,
    showPerformance,
    showRevenue,
    showReturns,
    showDeliveredRecent,
    showAnalyticsLink,
    primaryHref,
    primaryLabel,
    primaryHint,
    primaryIcon,
    primaryAction,
    shortcuts,
  } = home;
  const createInPlace =
    (primaryAction === "create-parcel" ||
      shortcuts.some((s) => s.action === "create-parcel" && s.primary)) &&
    typeof onCreateParcel === "function";
  const PrimaryIcon =
    primaryIcon === "truck"
      ? Truck
      : primaryIcon === "return"
        ? RefreshCw
        : Package;

  const [perfPeriod, setPerfPeriod] = useState<PerfPeriod>("week");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(() =>
    startOfDay(now).toISOString().slice(0, 10),
  );
  const [customTo, setCustomTo] = useState(() =>
    endOfDay(now).toISOString().slice(0, 10),
  );
  const periodMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!periodOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!periodMenuRef.current?.contains(event.target as Node)) {
        setPeriodOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPeriodOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [periodOpen]);

  const perfStats = useMemo(() => {
    const { from, to } = periodRange(perfPeriod, customFrom, customTo);
    const source =
      performanceParcels.length > 0
        ? performanceParcels
        : recent.map((p) => ({
            status: p.status,
            createdAt: p.createdAt,
            price: p.price,
          }));
    const inRange = source.filter((p) => {
      const at = new Date(p.createdAt).getTime();
      return at >= from.getTime() && at <= to.getTime();
    });
    const total = inRange.length;
    const deliveredCount = inRange.filter((p) =>
      isDeliveredStatus(p.status),
    ).length;
    const rate = total ? Math.round((deliveredCount / total) * 100) : 0;
    const periodRevenue = inRange.reduce(
      (sum, p) => sum + Number(p.price || 0),
      0,
    );
    return { total, deliveredCount, rate, periodRevenue };
  }, [customFrom, customTo, perfPeriod, performanceParcels, recent]);

  const {
    sorted: recentSorted,
    sortKey: recentSortKey,
    sortDir: recentSortDir,
    toggleSort: toggleRecentSort,
  } = useTableSort<RecentParcel, RecentSortKey>(
    recent,
    RECENT_SORT,
    "createdAt",
    "desc",
  );

  return (
    <div className="ops-board -mx-3 -mt-2 space-y-3 bg-ops-page px-3 pb-3 pt-1 text-ops-ink md:-mx-4 md:px-4 lg:-mx-5 lg:space-y-3 lg:px-5 lg:pb-2 lg:pt-0">
      <section className="relative min-h-[220px] overflow-hidden rounded-2xl border border-ops-card bg-ops-surface sm:min-h-[240px]">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-gradient-to-br from-ops-page via-ops-surface to-[#241014]" />
          <HeroVanScene variant="portal" />
          <div className="absolute inset-0 bg-gradient-to-r from-ops-page from-[0%] via-ops-page/88 via-[32%] to-transparent to-[58%]" />
          <div className="absolute inset-y-0 left-0 w-[min(100%,22rem)] bg-gradient-to-r from-ops-page/90 via-ops-page/55 to-transparent sm:w-[26rem]" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ops-page/55 to-transparent" />
        </div>
        <div className="relative z-10 flex min-h-[220px] flex-col justify-between gap-5 px-4 py-5 sm:min-h-[240px] sm:flex-row sm:items-end sm:px-5 lg:px-6 lg:py-6">
          <div className="relative z-10 flex min-w-0 max-w-[17.5rem] flex-col sm:max-w-[20rem]">
            <h1 className="font-display text-[1.65rem] font-extrabold leading-[1.15] tracking-tight text-ops-ink drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] sm:text-[1.85rem]">
              Bonjour{firstName ? ` ${firstName}` : ""}
            </h1>
            <p className="mt-2 max-w-[16rem] text-[13px] leading-snug text-ops-ink/75 sm:text-[14px] sm:leading-relaxed">
              {subtitle}
            </p>

            {solde != null ? (
              <div className="mt-4 inline-flex w-fit items-center gap-2.5 rounded-full border border-emerald-500/35 bg-black/45 px-3.5 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.35)] backdrop-blur-md dark:bg-black/50">
                <Coins
                  className="h-4 w-4 shrink-0 text-emerald-400"
                  aria-hidden
                />
                <span className="text-[12px] font-semibold uppercase tracking-wide text-emerald-300/90">
                  Solde
                </span>
                <span className="font-display text-[15px] font-extrabold tabular-nums text-white">
                  {formatMoney(solde)}
                </span>
              </div>
            ) : null}

            <p className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] capitalize text-ops-ink/55">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                {formatGreetingDate(now)}
              </span>
              <span className="text-ops-ink/25" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 normal-case">
                <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                {formatGreetingTime(now)}
              </span>
            </p>
          </div>

          {createInPlace ? (
            <button
              type="button"
              onClick={onCreateParcel}
              className="hidden min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-ops-accent/95 px-5 py-3 text-[15px] font-semibold text-white shadow-[0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-ops-accent-soft lg:inline-flex"
            >
              <PrimaryIcon className="h-5 w-5" />
              {primaryLabel}
            </button>
          ) : (
            <Link
              href={primaryHref}
              className="hidden min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-ops-accent/95 px-5 py-3 text-[15px] font-semibold text-white shadow-[0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-ops-accent-soft lg:inline-flex"
            >
              <PrimaryIcon className="h-5 w-5" />
              {primaryLabel}
            </Link>
          )}
        </div>
      </section>

      {showNouveauCta ? (
        createInPlace ? (
          <button
            type="button"
            onClick={onCreateParcel}
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-ops-accent px-4 py-3.5 text-left text-white shadow-[0_10px_28px_rgba(225,29,72,0.32)] transition hover:bg-ops-accent-soft lg:hidden"
          >
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <PrimaryIcon className="h-6 w-6" strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-bold leading-tight">
                {primaryLabel}
              </span>
              <span className="mt-0.5 block text-[13px] text-white/80">
                {primaryHint}
              </span>
            </span>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
              <ArrowRight className="h-5 w-5" />
            </span>
          </button>
        ) : (
          <Link
            href={primaryHref}
            className="flex min-h-14 items-center gap-3 rounded-2xl bg-ops-accent px-4 py-3.5 text-white shadow-[0_10px_28px_rgba(225,29,72,0.32)] transition hover:bg-ops-accent-soft lg:hidden"
          >
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <PrimaryIcon className="h-6 w-6" strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-bold leading-tight">
                {primaryLabel}
              </span>
              <span className="mt-0.5 block text-[13px] text-white/80">
                {primaryHint}
              </span>
            </span>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
              <ArrowRight className="h-5 w-5" />
            </span>
          </Link>
        )
      ) : null}

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-8">
        {kpis.map((kpi) => (
          <OpsKpiCard key={`${kpi.label}-${kpi.href}`} kpi={kpi} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-3">
          {showChart || showPerformance ? (
          <div className="grid shrink-0 grid-cols-1 items-stretch gap-3 lg:grid-cols-12">
            {showChart ? (
            <section className={`flex h-full flex-col rounded-2xl border border-ops-card bg-ops-surface p-3.5 shadow-ops ${showPerformance ? "lg:col-span-8" : "lg:col-span-12"}`}>
              <div className="flex shrink-0 items-center justify-between gap-2">
                <h2 className="text-[17px] font-semibold text-ops-ink lg:text-[15px]">
                  {t("mobile.deliveryTrend")}
                  <span className="mt-0.5 block text-[13px] font-medium text-ops-ink/45 lg:ml-1 lg:mt-0 lg:inline">
                    {t("mobile.deliveryTrendDays")}
                  </span>
                </h2>
                {showAnalyticsLink ? (
                <Link
                  href={analyticsHref}
                  className="shrink-0 text-[14px] font-semibold text-ops-accent lg:text-[12px]"
                >
                  {t("mobile.detailLink")}
                </Link>
                ) : null}
              </div>
              <div className="mt-2.5 flex min-h-[11rem] flex-1 gap-2 lg:min-h-0">
                <div className="flex w-7 shrink-0 flex-col" aria-hidden>
                  <div className="h-4 shrink-0" />
                  <div className="relative min-h-[7rem] flex-1 border-r border-ops-ink/20">
                    {Array.from({ length: maxDay + 1 }, (_, i) => maxDay - i).map(
                      (tick) => (
                        <span
                          key={tick}
                          className="absolute right-1.5 -translate-y-1/2 text-[10px] leading-none tabular-nums text-ops-ink/40"
                          style={{
                            top:
                              maxDay === 0
                                ? "100%"
                                : `${((maxDay - tick) / maxDay) * 100}%`,
                          }}
                        >
                          {tick}
                        </span>
                      ),
                    )}
                  </div>
                  <div className="h-4 shrink-0" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex min-h-[7rem] flex-1 gap-1 border-b border-ops-ink/15">
                    {last7Days.map((d) => {
                      const pct = maxDay > 0 ? (d.total / maxDay) * 100 : 0;
                      return (
                        <div
                          key={d.date}
                          className="relative flex min-h-0 min-w-0 flex-1 items-end justify-center"
                        >
                          {d.total > 0 ? (
                            <div
                              className="relative w-[58%] rounded-t-md bg-gradient-to-t from-[#991211] to-[#E11D48]"
                              style={{ height: `${pct}%` }}
                            >
                              <span className="absolute bottom-full left-1/2 mb-0.5 -translate-x-1/2 text-[11px] font-semibold leading-none tabular-nums text-ops-ink">
                                {d.total}
                              </span>
                            </div>
                          ) : (
                            <span className="absolute bottom-0 left-1/2 mb-0.5 -translate-x-1/2 text-[11px] font-semibold leading-none tabular-nums text-ops-ink">
                              0
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 flex shrink-0 gap-1">
                    {last7Days.map((d) => (
                      <span
                        key={`${d.date}-label`}
                        className="min-w-0 flex-1 text-center text-[10px] leading-none text-ops-ink/40"
                      >
                        {d.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            ) : null}

            {showPerformance ? (
            <section className={`flex h-full flex-col rounded-2xl border border-ops-card bg-ops-surface p-3.5 shadow-ops ${showChart ? "lg:col-span-4" : "lg:col-span-12"}`}>
              <div className="relative flex shrink-0 items-center justify-between gap-2">
                <h2 className="text-[17px] font-semibold text-ops-ink lg:text-[15px]">
                  {t("mobile.performance")}
                </h2>
                <div className="relative" ref={periodMenuRef}>
                  <button
                    type="button"
                    onClick={() => setPeriodOpen((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-full border border-ops-card bg-ops-ink/[0.04] px-2.5 py-1 text-[12px] font-semibold text-ops-ink/80 transition hover:bg-ops-ink/[0.08]"
                    aria-expanded={periodOpen}
                    aria-haspopup="listbox"
                  >
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    {periodLabels[perfPeriod]}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                  </button>
                  {periodOpen ? (
                    <div
                      role="listbox"
                      aria-label="Période"
                      className="absolute right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-xl border border-ops-card bg-ops-page py-1 shadow-ops"
                    >
                      {(
                        [
                          "today",
                          "week",
                          "month",
                          "custom",
                        ] as const satisfies readonly PerfPeriod[]
                      ).map((key) => (
                        <button
                          key={key}
                          type="button"
                          role="option"
                          aria-selected={perfPeriod === key}
                          onClick={() => {
                            setPerfPeriod(key);
                            if (key !== "custom") setPeriodOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center px-3 py-2 text-left text-[13px] font-semibold transition",
                            perfPeriod === key
                              ? "bg-ops-accent/10 text-ops-accent"
                              : "text-ops-ink/80 hover:bg-ops-ink/[0.06]",
                          )}
                        >
                          {periodLabels[key]}
                        </button>
                      ))}
                      {perfPeriod === "custom" ? (
                        <div className="space-y-2 border-t border-ops-ink/10 px-3 py-2.5">
                          <label className="block text-[11px] font-medium text-ops-ink/50">
                            Du
                            <input
                              type="date"
                              value={customFrom}
                              onChange={(e) => setCustomFrom(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-ops-card bg-ops-surface px-2 py-1.5 text-[12px] text-ops-ink outline-none focus:border-ops-accent/40"
                            />
                          </label>
                          <label className="block text-[11px] font-medium text-ops-ink/50">
                            Au
                            <input
                              type="date"
                              value={customTo}
                              onChange={(e) => setCustomTo(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-ops-card bg-ops-surface px-2 py-1.5 text-[12px] text-ops-ink outline-none focus:border-ops-accent/40"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setPeriodOpen(false)}
                            className="w-full rounded-lg bg-ops-accent px-2 py-1.5 text-[12px] font-semibold text-white"
                          >
                            Appliquer
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid flex-1 grid-cols-2 items-center gap-3 lg:grid-cols-1 lg:justify-items-center lg:gap-4">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="relative inline-flex h-[5.5rem] w-[5.5rem] items-center justify-center lg:h-28 lg:w-28">
                    <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden>
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        className="text-ops-ink/10"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="#E11D48"
                        strokeWidth="3"
                        strokeDasharray={`${Math.min(100, Math.max(0, perfStats.rate)) * 0.94} 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute flex flex-col items-center leading-none">
                      <span className="font-display text-lg font-extrabold tabular-nums text-ops-ink lg:text-xl">
                        {perfStats.rate}%
                      </span>
                      <span className="mt-1 text-[11px] font-semibold tabular-nums text-ops-ink/55 lg:text-[12px]">
                        {perfStats.deliveredCount} / {perfStats.total}
                      </span>
                    </span>
                  </span>
                  <span className="text-center text-[12px] font-medium text-ops-ink/55">
                    Taux de livraison
                  </span>
                </div>
                {showRevenue ? (
                <div className="flex flex-col items-center gap-1 border-ops-ink/10 lg:w-full lg:border-t lg:pt-3">
                  <span className="font-display text-xl font-extrabold tabular-nums text-ops-ink lg:text-2xl">
                    {formatMoney(perfStats.periodRevenue)}
                  </span>
                  <span className="text-center text-[12px] font-medium text-ops-ink/55">
                    Chiffre d&apos;affaires
                  </span>
                </div>
                ) : null}
              </div>
            </section>
            ) : null}
          </div>
          ) : null}

          <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-ops-card bg-ops-surface p-4 shadow-ops">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[18px] font-semibold text-ops-ink lg:text-[16px]">
                Derniers colis
              </h2>
              <Link
                href={parcelsHref}
                className="text-[14px] font-semibold text-ops-accent"
              >
                Voir tout →
              </Link>
            </div>

            <div className="mt-3 hidden flex-1 lg:block">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-ops-card text-[12px] uppercase tracking-[0.08em] text-ops-ink/40">
                    <SortableTh
                      label="N° de colis"
                      column="code"
                      activeKey={recentSortKey}
                      sortDir={recentSortDir}
                      onSort={toggleRecentSort}
                      className="pb-2.5 pr-3"
                      buttonClassName="uppercase tracking-[0.08em]"
                    />
                    <SortableTh
                      label="Client"
                      column="recipientName"
                      activeKey={recentSortKey}
                      sortDir={recentSortDir}
                      onSort={toggleRecentSort}
                      className="pb-2.5 pr-3"
                      buttonClassName="uppercase tracking-[0.08em]"
                    />
                    <SortableTh
                      label="Ville"
                      column="city"
                      activeKey={recentSortKey}
                      sortDir={recentSortDir}
                      onSort={toggleRecentSort}
                      className="pb-2.5 pr-3"
                      buttonClassName="uppercase tracking-[0.08em]"
                    />
                    <SortableTh
                      label="Statut"
                      column="status"
                      activeKey={recentSortKey}
                      sortDir={recentSortDir}
                      onSort={toggleRecentSort}
                      className="pb-2.5 pr-3"
                      buttonClassName="uppercase tracking-[0.08em]"
                    />
                    <SortableTh
                      label="Montant"
                      column="price"
                      activeKey={recentSortKey}
                      sortDir={recentSortDir}
                      onSort={toggleRecentSort}
                      className="pb-2.5 pr-3"
                      buttonClassName="uppercase tracking-[0.08em]"
                    />
                    <SortableTh
                      label="Date"
                      column="createdAt"
                      activeKey={recentSortKey}
                      sortDir={recentSortDir}
                      onSort={toggleRecentSort}
                      className="pb-2.5"
                      buttonClassName="uppercase tracking-[0.08em]"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ops-ink/[0.08]">
                  {recentSorted.slice(0, 12).map((p) => (
                    <tr key={p.id} className="hover:bg-ops-ink/[0.03]">
                      <td className="py-3.5 pr-3">
                        <Link
                          href={`${basePath}/parcels/${p.id}`}
                          className="font-mono text-[14px] font-bold text-ops-accent"
                        >
                          {p.code ?? `#${p.id}`}
                        </Link>
                      </td>
                      <td className="py-3.5 pr-3 text-[14px] font-medium text-ops-ink/90">
                        {p.recipientName}
                      </td>
                      <td className="py-3.5 pr-3 text-[14px] text-ops-ink/55">
                        {p.city}
                      </td>
                      <td className="py-3.5 pr-3">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="py-3.5 pr-3 text-[14px] font-bold tabular-nums">
                        {formatPrice(p.price)}
                      </td>
                      <td className="py-3.5 text-[13px] text-ops-ink/45">
                        <span className="inline-flex items-center gap-1">
                          {formatShortDate(p.createdAt)}
                          <ChevronRight
                            className="h-4 w-4 text-ops-ink/25"
                            aria-hidden
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-2 divide-y divide-ops-ink/[0.08] lg:hidden">
              {recent.length === 0 ? (
                <li className="py-8 text-center text-base text-ops-ink/40">
                  Aucun colis récent
                </li>
              ) : (
                recent.slice(0, 12).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`${basePath}/parcels/${p.id}`}
                      className="flex min-h-[4.75rem] items-center justify-between gap-3 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[15px] font-bold text-ops-accent">
                          {p.code ?? `#${p.id}`}
                        </p>
                        <p className="mt-0.5 truncate text-[15px] font-semibold">
                          {p.recipientName}
                        </p>
                        <p className="mt-0.5 text-[13px] text-ops-ink/45">
                          {p.city} · {formatShortDate(p.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-right">
                        <div>
                          <StatusPill status={p.status} />
                          <p className="mt-1.5 text-[15px] font-extrabold tabular-nums">
                            {formatPrice(p.price)}
                          </p>
                        </div>
                        <ChevronRight
                          className="h-5 w-5 text-ops-ink/30"
                          aria-hidden
                        />
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>

          {showReturns ? (
          <section className="shrink-0 rounded-2xl border border-ops-card bg-ops-surface p-3.5 shadow-ops">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[17px] font-semibold text-ops-ink lg:text-[15px]">
                Derniers retours
              </h2>
              <Link
                href={retoursHref}
                className="text-[14px] font-semibold text-ops-accent lg:text-[12px]"
              >
                Voir tout →
              </Link>
            </div>
            {returns.length === 0 ? (
              <p className="mt-2 text-center text-[14px] text-ops-ink/40">
                Aucun retour
              </p>
            ) : (
              <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {returns.slice(0, 3).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`${basePath}/parcels/${p.id}`}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-ops-card px-3 py-2.5 transition hover:bg-ops-ink/[0.05]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[13px] font-bold text-ops-accent">
                          {p.code ?? `#${p.id}`}
                        </p>
                        <p className="truncate text-[12px] text-ops-ink/45">
                          {p.city} · {formatShortDate(p.createdAt)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#FFAB00] px-2.5 py-1 text-[11px] font-bold text-[#0B0E14]">
                        {STATUS_META[p.status as StatusKey]?.label ?? p.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-3">
          <section className="rounded-2xl border border-ops-card bg-ops-surface p-3.5 shadow-ops">
            <h2 className="text-[17px] font-semibold text-ops-ink lg:text-[15px]">
              Actions rapides
            </h2>
            <ul className="mt-2.5 space-y-1.5">
              {shortcuts.map((s) => {
                const Icon = s.icon;
                const className = cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition",
                  s.primary
                    ? "bg-ops-accent text-white shadow-[0_8px_20px_rgba(225,29,72,0.28)] hover:bg-ops-accent-soft"
                    : "border border-ops-card bg-ops-ink/[0.03] hover:bg-ops-ink/[0.07]",
                );
                const body = (
                  <>
                      <span
                        className={cn(
                          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white",
                          s.primary ? "bg-white/20" : s.tone,
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2.25} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-[14px] font-semibold leading-tight",
                            s.primary ? "text-white" : "text-ops-ink",
                          )}
                        >
                          {s.label}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block text-[11px] leading-tight",
                            s.primary ? "text-white/75" : "text-ops-ink/45",
                          )}
                        >
                          {s.hint}
                        </span>
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0",
                          s.primary ? "text-white/70" : "text-ops-ink/30",
                        )}
                        aria-hidden
                      />
                  </>
                );
                return (
                  <li key={s.label}>
                    {s.action === "create-parcel" && onCreateParcel ? (
                      <button type="button" onClick={onCreateParcel} className={className}>
                        {body}
                      </button>
                    ) : (
                      <Link href={s.href} className={className}>
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="overflow-hidden rounded-2xl border border-ops-card bg-ops-surface shadow-ops">
            <div className="flex items-center justify-between gap-3 px-3.5 py-3">
              <div className="min-w-0">
                <h2 className="font-display text-[14px] font-bold leading-snug text-ops-ink">
                  Livraison plus rapide, plus proche de vos clients
                </h2>
              </div>
              <div className="relative h-12 w-24 shrink-0">
                <Image
                  src="/assets/cargo-van-clean.png"
                  alt=""
                  fill
                  className="object-contain object-right"
                  sizes="96px"
                />
              </div>
            </div>
          </section>

          {isExpediteurAside && expediteurAside ? (
            <>
              <section className="rounded-2xl border border-ops-card bg-ops-surface p-3.5 shadow-ops">
                <h2 className="text-[17px] font-semibold text-ops-ink lg:text-[15px]">
                  {t("mobile.toDo")}
                </h2>
                <ul className="mt-2.5 space-y-1.5">
                  {expediteurAside.eligibleCount > 0 ? (
                    <li>
                      <Link
                        href={paymentsHref}
                        className="flex min-h-12 items-center gap-3 rounded-xl border border-ops-card px-2.5 py-2 transition hover:bg-ops-ink/[0.05]"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                          <HandCoins className="h-4 w-4" strokeWidth={2.25} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-ops-ink">
                            {t("mobile.todoPay", {
                              count: expediteurAside.eligibleCount,
                            })}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-ops-ink/45">
                            {t("mobile.todoPayHint", {
                              amount: formatPrice(expediteurAside.eligibleAmount),
                            })}
                          </span>
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-ops-ink/30"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ) : null}
                  {expediteurAside.returnCount > 0 ? (
                    <li>
                      <Link
                        href={retoursHref}
                        className="flex min-h-12 items-center gap-3 rounded-xl border border-ops-card px-2.5 py-2 transition hover:bg-ops-ink/[0.05]"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                          <RefreshCw className="h-4 w-4" strokeWidth={2.25} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-ops-ink">
                            {t("mobile.todoReturns", {
                              count: expediteurAside.returnCount,
                            })}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-ops-ink/45">
                            {t("mobile.todoReturnsHint")}
                          </span>
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-ops-ink/30"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ) : null}
                  {expediteurAside.openTicketCount > 0 ? (
                    <li>
                      <Link
                        href={ticketsHref}
                        className="flex min-h-12 items-center gap-3 rounded-xl border border-ops-card px-2.5 py-2 transition hover:bg-ops-ink/[0.05]"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white">
                          <LifeBuoy className="h-4 w-4" strokeWidth={2.25} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-ops-ink">
                            {t("mobile.todoTickets", {
                              count: expediteurAside.openTicketCount,
                            })}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-ops-ink/45">
                            {t("mobile.todoTicketsHint")}
                          </span>
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-ops-ink/30"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ) : null}
                  {expediteurAside.eligibleCount === 0 &&
                  expediteurAside.returnCount === 0 &&
                  expediteurAside.openTicketCount === 0 ? (
                    <li className="py-4 text-center text-[14px] text-ops-ink/40">
                      {t("mobile.toDoEmpty")}
                    </li>
                  ) : null}
                </ul>
              </section>

              <section className="rounded-2xl border border-ops-card bg-ops-surface p-3.5 shadow-ops">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[17px] font-semibold text-ops-ink lg:text-[15px]">
                    {t("mobile.money")}
                  </h2>
                  <Link
                    href={paymentsHref}
                    className="text-[14px] font-semibold text-ops-accent lg:text-[12px]"
                  >
                    {t("mobile.moneySeePayments")} →
                  </Link>
                </div>
                <ul className="mt-3 space-y-2">
                  <li className="flex items-center justify-between gap-3 rounded-xl bg-ops-ink/[0.04] px-3 py-2.5">
                    <span className="inline-flex items-center gap-2 text-[12px] text-ops-ink/55">
                      <Wallet className="h-4 w-4 text-ops-accent" aria-hidden />
                      {t("mobile.moneyAvailable")}
                    </span>
                    <span className="font-display text-[15px] font-bold tabular-nums text-ops-ink">
                      {formatPrice(expediteurAside.disponible)}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3 rounded-xl bg-ops-ink/[0.04] px-3 py-2.5">
                    <span className="inline-flex items-center gap-2 text-[12px] text-ops-ink/55">
                      <Banknote className="h-4 w-4 text-amber-500" aria-hidden />
                      {t("mobile.moneyPending")}
                    </span>
                    <span className="font-display text-[15px] font-bold tabular-nums text-ops-ink">
                      {formatPrice(expediteurAside.enDemande)}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3 rounded-xl bg-emerald-500/10 px-3 py-2.5">
                    <span className="inline-flex items-center gap-2 text-[12px] text-ops-ink/55">
                      <HandCoins className="h-4 w-4 text-emerald-600" aria-hidden />
                      {t("mobile.moneyReady")}
                    </span>
                    <span className="font-display text-[15px] font-bold tabular-nums text-emerald-700">
                      {formatPrice(expediteurAside.eligibleAmount)}
                    </span>
                  </li>
                </ul>
              </section>

              <section className="flex flex-1 flex-col rounded-2xl border border-ops-card bg-ops-surface p-3.5 shadow-ops">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[17px] font-semibold text-ops-ink lg:text-[15px]">
                    {t("mobile.openTickets")}
                  </h2>
                  <Link
                    href={ticketsHref}
                    className="text-[14px] font-semibold text-ops-accent lg:text-[12px]"
                  >
                    {t("common.seeAll")} →
                  </Link>
                </div>
                <ul className="mt-2 flex flex-1 flex-col justify-start gap-0.5">
                  {expediteurAside.openTickets.length === 0 ? (
                    <li className="py-4 text-center text-[14px] text-ops-ink/40">
                      {t("mobile.ticketsEmpty")}
                    </li>
                  ) : (
                    expediteurAside.openTickets.map((ticket) => (
                      <li key={ticket.id}>
                        <Link
                          href={ticketsHref}
                          className="flex min-h-11 items-center gap-2.5 rounded-xl px-1 py-1.5 transition hover:bg-ops-ink/[0.05]"
                        >
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600/15 text-sky-600">
                            <LifeBuoy className="h-4 w-4" strokeWidth={2.25} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-ops-ink">
                              #{ticket.id} · {ticket.title}
                            </span>
                            <span className="block truncate text-[11px] text-ops-ink/45">
                              {ticket.parcel?.code ?? t("mobile.todoTicketsHint")}
                            </span>
                          </span>
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-ops-ink/30"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </>
          ) : (
            <>
              <section className="rounded-2xl border border-ops-card bg-ops-surface p-3.5 shadow-ops">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[17px] font-semibold text-ops-ink lg:text-[15px]">
                    {t("mobile.recentActivity")}
                  </h2>
                  <Link
                    href={parcelsHref}
                    className="text-[14px] font-semibold text-ops-accent lg:text-[12px]"
                  >
                    {t("common.seeAll")} →
                  </Link>
                </div>
                <ul className="mt-2 space-y-0.5">
                  {recent.length === 0 ? (
                    <li className="py-4 text-center text-[14px] text-ops-ink/40">
                      {t("mobile.noActivity")}
                    </li>
                  ) : (
                    recent.slice(0, 4).map((p) => {
                      const meta = STATUS_META[p.status as StatusKey];
                      const { box, label, Icon } = statusVisual(p.status);
                      return (
                        <li key={p.id}>
                          <Link
                            href={`${basePath}/parcels/${p.id}`}
                            className="flex min-h-11 items-center gap-2.5 rounded-xl px-1 py-1.5 transition hover:bg-ops-ink/[0.05]"
                          >
                            <span
                              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${box}`}
                            >
                              <Icon className="h-4 w-4" strokeWidth={2.25} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-semibold text-ops-ink">
                                {t("mobile.parcelLine", { code: p.code ?? p.id })}
                              </span>
                              <span
                                className={`block truncate text-[11px] font-medium ${label}`}
                              >
                                {meta?.label ?? p.status}
                              </span>
                            </span>
                            <ChevronRight
                              className="h-4 w-4 shrink-0 text-ops-ink/30"
                              aria-hidden
                            />
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
              </section>

              {showDeliveredRecent ? (
                <section className="flex flex-1 flex-col rounded-2xl border border-ops-card bg-ops-surface p-3.5 shadow-ops">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[17px] font-semibold text-ops-ink lg:text-[15px]">
                      {t("mobile.recentDelivered")}
                    </h2>
                    <Link
                      href={`${parcelsHref}?status=LIVRES`}
                      className="text-[14px] font-semibold text-ops-accent lg:text-[12px]"
                    >
                      {t("common.seeAll")} →
                    </Link>
                  </div>
                  <ul className="mt-2 flex flex-1 flex-col justify-start gap-0.5">
                    {deliveredRecent.length === 0 ? (
                      <li className="py-4 text-center text-[14px] text-ops-ink/40">
                        {t("mobile.noRecentDelivered")}
                      </li>
                    ) : (
                      deliveredRecent.slice(0, 5).map((p, index) => {
                        const tile = DELIVERED_TILES[index % DELIVERED_TILES.length];
                        const TileIcon = tile.Icon;
                        return (
                          <li key={p.id}>
                            <Link
                              href={`${basePath}/parcels/${p.id}`}
                              className="flex min-h-11 items-center gap-2.5 rounded-xl px-1 py-1.5 transition hover:bg-ops-ink/[0.05]"
                            >
                              <span
                                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${tile.box}`}
                              >
                                <TileIcon className="h-4 w-4" strokeWidth={2.25} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-mono text-[13px] font-bold text-ops-ink">
                                  {p.code ?? `#${p.id}`}
                                </p>
                                <p className="truncate text-[11px] text-ops-ink/45">
                                  {p.city} · {formatPrice(p.price)}
                                </p>
                              </div>
                              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-ops-ink/40">
                                {formatTime(p.createdAt)}
                                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                              </span>
                            </Link>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </aside>
      </div>

      <footer className="flex flex-col gap-2 border-t border-ops-card pt-3 text-[12px] text-ops-ink/40 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Umbrella Express © {now.getFullYear()}. Tous droits réservés.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Système en ligne
          <ShieldCheck className="h-3.5 w-3.5 text-ops-ink/35" aria-hidden />
        </span>
      </footer>
    </div>
  );
}
