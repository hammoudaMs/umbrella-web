"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MobileOpsDashboard } from "@/components/MobileOpsDashboard";
import { OpsDashboardLoader } from "@/components/OpsDashboardLoader";
import { ParcelsManager } from "@/components/ParcelsManager";
import { apiFetch, type StatusCard } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { buildOpsStatusKpis } from "@/lib/ops-status-kpis";
import { portalHomeFor } from "@/lib/portal-home";
import type { AppRole } from "@/lib/roles";
import type { StatusCategory } from "@/lib/status-categories";
import { isStatusCategoryIcon } from "@/lib/status-categories";

gsap.registerPlugin(useGSAP);

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
  const root = useRef<HTMLDivElement>(null);
  const home = useMemo(() => portalHomeFor(role), [role]);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [statusCards, setStatusCards] = useState<StatusCard[]>([]);
  const [categories, setCategories] = useState<StatusCategory[]>([]);
  const [parcels, setParcels] = useState<RecentParcel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const token = session?.accessToken;

  const loadDashboard = useCallback(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch<StatusCard[]>("/dashboard/status-counts", { token }),
      apiFetch<AnalyticsPayload>("/dashboard/analytics", { token }).catch(
        () => emptyAnalytics(),
      ),
      apiFetch<RecentParcel[]>("/parcels", { token }),
      apiFetch<StatusCategory[]>("/status-categories", { token }).catch(
        () => [] as StatusCategory[],
      ),
    ])
      .then(([counts, stats, list, cats]) => {
        setStatusCards(counts);
        setAnalytics(stats ?? emptyAnalytics());
        setParcels(list);
        setCategories(
          cats.filter((c) => isStatusCategoryIcon(String(c.icon))),
        );
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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

  const statusKpis = useMemo(() => {
    const countsByStatus = new Map(
      statusCards.map((card) => [card.key, card.count] as const),
    );
    const filteredTotal = home.kpiStatusKeys?.length
      ? home.kpiStatusKeys.reduce(
          (sum, key) => sum + (countsByStatus.get(key) ?? 0),
          0,
        )
      : analytics?.kpis.total;

    return buildOpsStatusKpis({
      basePath,
      countsByStatus,
      totalLabel: home.totalLabel,
      totalCount: filteredTotal,
      categories,
      statusKeysFilter: home.kpiStatusKeys,
      hrefBase: home.kpiHrefBase,
    });
  }, [
    analytics?.kpis.total,
    basePath,
    categories,
    home.kpiHrefBase,
    home.kpiStatusKeys,
    home.totalLabel,
    statusCards,
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
    <div ref={root}>
      {error ? (
        <p className="mb-4 rounded-xl border border-[#E11D48]/40 bg-[#E11D48]/10 px-4 py-3 text-center text-sm font-medium text-[#fb7185]">
          {error}
        </p>
      ) : null}

      {loading ? <OpsDashboardLoader /> : null}

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
          onCreateParcel={
            canCreateOnHome ? () => setCreateOpen(true) : undefined
          }
        />
      ) : null}

      {canCreateOnHome ? (
        <Suspense fallback={null}>
          <ParcelsManager
            canCreate
            createOnly
            createOpen={createOpen}
            onCreateOpenChange={setCreateOpen}
            onCreated={() => loadDashboard()}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
