"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MobileOpsDashboard } from "@/components/MobileOpsDashboard";
import { OpsDashboardLoader } from "@/components/OpsDashboardLoader";
import { EmptyState, ErrorBanner } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLiveReload } from "@/lib/data-refresh";
import {
  PARCEL_CREATED_EVENT,
  useOptionalPortalCreateParcel,
} from "@/lib/portal-create-parcel";
import { countByParcelStatus } from "@/lib/dashboard-statuses";
import { buildOpsStatusKpis } from "@/lib/ops-status-kpis";
import { useT } from "@/i18n/locale-context";
import { portalHomeFor } from "@/lib/portal-home";
import type { AppRole } from "@/lib/roles";
import type { StatusCategory } from "@/lib/status-categories";
import { isStatusCategoryIcon } from "@/lib/status-categories";
import { LayoutDashboard } from "lucide-react";
import { toAmount, type Payment, type Ticket } from "@/lib/domain";

gsap.registerPlugin(useGSAP);

const PAYMENT_ACTIVE: Payment["status"][] = [
  "EN_DEMANDE",
  "VALIDE_FINANCE",
  "VALIDE_CHEF",
  "VALIDE_EXPERT",
  "APPROUVE",
  "PAYE",
];

function normalizePaymentStatus(status: Payment["status"]): Payment["status"] {
  return status === "APPROUVE" ? "VALIDE_FINANCE" : status;
}

type AnalyticsPayload = {
  kpis: {
    total: number;
    external: number;
    internal: number;
    delivered: number;
    inProgress: number;
    returns: number;
    awaiting: number;
    exchanges?: number;
    revenue: number;
    deliveryRate: number;
    returnRate: number;
  };
  soldes?: {
    disponible: number;
    enDemande: number;
    aVerser: number;
    verse: number;
  };
  last7Days: Array<{
    date: string;
    label: string;
    total: number;
    delivered: number;
    external: number;
    internal: number;
  }>;
};

type RecentParcel = {
  id: number;
  code: string | null;
  recipientName: string;
  phone?: string;
  city: string;
  status: string;
  mode: "EXTERNAL" | "INTERNAL";
  price: string | number;
  createdAt: string;
};

const emptyAnalytics = (): AnalyticsPayload => ({
  kpis: {
    total: 0,
    external: 0,
    internal: 0,
    delivered: 0,
    inProgress: 0,
    returns: 0,
    awaiting: 0,
    exchanges: 0,
    revenue: 0,
    deliveryRate: 0,
    returnRate: 0,
  },
  soldes: { disponible: 0, enDemande: 0, aVerser: 0, verse: 0 },
  last7Days: Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      date: key,
      label: key.slice(5),
      total: 0,
      delivered: 0,
      external: 0,
      internal: 0,
    };
  }),
});

export function AdminNavexDashboard({
  basePath,
  role,
}: {
  basePath: string;
  role: AppRole;
}) {
  const { session } = useAuth();
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const home = useMemo(() => portalHomeFor(role, t), [role, t]);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [categories, setCategories] = useState<StatusCategory[]>([]);
  const [parcels, setParcels] = useState<RecentParcel[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const createParcel = useOptionalPortalCreateParcel();
  const token = session?.accessToken;
  const isExpediteurHome = home.asideMode === "expediteur";

  const loadDashboard = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!token) return;
      if (!opts?.silent) setLoading(true);
      Promise.all([
        apiFetch<AnalyticsPayload>("/dashboard/analytics", { token }).catch(
          () => emptyAnalytics(),
        ),
        apiFetch<RecentParcel[]>("/parcels", { token }),
        apiFetch<StatusCategory[]>("/status-categories", { token }).catch(
          () => [] as StatusCategory[],
        ),
        isExpediteurHome
          ? apiFetch<Payment[]>("/payments", { token }).catch(() => [] as Payment[])
          : Promise.resolve([] as Payment[]),
        isExpediteurHome
          ? apiFetch<Ticket[]>("/tickets", { token }).catch(() => [] as Ticket[])
          : Promise.resolve([] as Ticket[]),
      ])
        .then(([stats, list, cats, paymentList, ticketList]) => {
          setAnalytics(stats ?? emptyAnalytics());
          setParcels(list);
          setCategories(
            cats.filter((c) => isStatusCategoryIcon(String(c.icon))),
          );
          setPayments(paymentList);
          setTickets(ticketList);
          setError(null);
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => {
          if (!opts?.silent) setLoading(false);
        });
    },
    [token, isExpediteurHome],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const onCreated = () => loadDashboard({ silent: true });
    window.addEventListener(PARCEL_CREATED_EVENT, onCreated);
    return () => window.removeEventListener(PARCEL_CREATED_EVENT, onCreated);
  }, [loadDashboard]);

  useLiveReload(() => loadDashboard({ silent: true }), {
    enabled: Boolean(token),
  });

  const recent = useMemo(() => parcels.slice(0, 12), [parcels]);
  const returns = useMemo(
    () => parcels.filter((p) => p.status.startsWith("RETOUR")).slice(0, 5),
    [parcels],
  );
  const deliveredRecent = useMemo(
    () =>
      parcels
        .filter((p) => p.status === "LIVRES" || p.status === "LIVRES_PAYES")
        .slice(0, 8),
    [parcels],
  );

  const expediteurAside = useMemo(() => {
    if (!isExpediteurHome) return null;
    const requested = new Set(
      payments
        .filter((p) => PAYMENT_ACTIVE.includes(normalizePaymentStatus(p.status)))
        .flatMap((p) => p.items.map((i) => i.parcel.id)),
    );
    const eligible = parcels.filter(
      (p) =>
        (p.status === "LIVRES" || p.status === "LIVRES_PAYES") &&
        !requested.has(p.id),
    );
    const eligibleAmount = eligible.reduce((s, p) => s + toAmount(p.price), 0);
    const returnCount = parcels.filter((p) =>
      ["RETOUR_DEPOT", "RETOUR_EXPEDITEURS", "RETOUR_RECU"].includes(p.status),
    ).length;
    const openAll = tickets.filter((t) => t.status === "EN_COURS");
    const enDemande = payments
      .filter((p) => {
        const s = normalizePaymentStatus(p.status);
        return (
          s === "EN_DEMANDE" ||
          s === "VALIDE_FINANCE" ||
          s === "VALIDE_CHEF" ||
          s === "VALIDE_EXPERT"
        );
      })
      .reduce((s, p) => s + toAmount(p.amount), 0);
    return {
      eligibleCount: eligible.length,
      eligibleAmount,
      returnCount,
      openTicketCount: openAll.length,
      openTickets: openAll.slice(0, 5),
      disponible: analytics?.soldes?.disponible ?? 0,
      enDemande,
    };
  }, [analytics?.soldes?.disponible, isExpediteurHome, parcels, payments, tickets]);

  const statusKpis = useMemo(() => {
    const countsByStatus = countByParcelStatus(parcels);
    const totalCount = parcels.filter((p) => p.status !== "SUPPRIME").length;

    return buildOpsStatusKpis({
      basePath,
      countsByStatus,
      totalLabel: home.totalLabel,
      totalCount,
      categories,
      statusKeysFilter: home.kpiStatusKeys,
      hrefBase: home.kpiHrefBase,
    });
  }, [
    basePath,
    categories,
    home.kpiHrefBase,
    home.kpiStatusKeys,
    home.totalLabel,
    parcels,
  ]);

  useGSAP(
    () => {
      if (loading) return;
      gsap.fromTo(
        ".ops-board > *",
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.035,
          duration: 0.3,
          ease: "power2.out",
          clearProps: "transform",
        },
      );
    },
    { scope: root, dependencies: [loading, analytics] },
  );

  const kpis = analytics?.kpis;
  const firstName = session?.user.name?.split(/\s+/)[0] ?? "";
  const canCreateOnHome =
    home.primaryAction === "create-parcel" ||
    home.shortcuts.some((s) => s.action === "create-parcel");

  return (
    <div ref={root} className="space-y-4">
      {error ? (
        <ErrorBanner message={error} onRetry={() => loadDashboard()} />
      ) : null}

      {loading ? <OpsDashboardLoader /> : null}

      {!loading && !error && !kpis ? (
        <EmptyState
          icon={LayoutDashboard}
          title={t("home.emptyDashboardTitle")}
          description={t("home.emptyDashboardBody")}
          action={
            canCreateOnHome ? (
              <button
                type="button"
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
                onClick={() => createParcel?.openCreateParcel()}
              >
                {home.primaryLabel}
              </button>
            ) : undefined
          }
        />
      ) : null}

      {!loading && !error && kpis ? (
        <MobileOpsDashboard
          basePath={basePath}
          firstName={firstName}
          home={home}
          kpis={statusKpis}
          revenue={kpis.revenue}
          solde={home.showSolde ? (analytics?.soldes?.disponible ?? 0) : null}
          inProgress={kpis.inProgress}
          delivered={kpis.delivered}
          deliveryRate={kpis.deliveryRate}
          performanceParcels={parcels}
          last7Days={analytics?.last7Days ?? []}
          recent={recent}
          returns={returns}
          deliveredRecent={deliveredRecent}
          expediteurAside={expediteurAside}
          onCreateParcel={
            canCreateOnHome
              ? () => createParcel?.openCreateParcel()
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
