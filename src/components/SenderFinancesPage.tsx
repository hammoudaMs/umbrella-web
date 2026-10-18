"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  HandCoins,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  PageHeader,
  StatCard,
  TableCard,
  tableClass,
  tdClass,
  theadClass,
  thClass,
  trClass,
} from "@/components/ui";
import { formatTnd, toAmount, type Parcel } from "@/lib/domain";
import {
  deliveryFeeOf,
  isDeliveredStatus,
  isReturnStatus,
  netPayoutOf,
  parcelProfitOf,
  returnFeeOf,
  salePriceOf,
} from "@/lib/sender-finance";
import { useApiQuery } from "@/lib/use-api";

type AnalyticsPayload = {
  soldes?: {
    disponible: number;
    enDemande: number;
    aVerser: number;
    enPipeline?: number;
    verse: number;
    encaisse: number;
    retoursMontant: number;
    retoursFrais: number;
    fraisLivraison?: number;
    profit?: number;
    ventes?: number;
  };
  kpis?: {
    delivered: number;
    returns: number;
    profit?: number;
    ventes?: number;
  };
};

function moneyOf(p: Parcel) {
  return {
    price: toAmount(p.price),
    unitSalePrice:
      p.unitSalePrice != null ? toAmount(p.unitSalePrice) : null,
    deliveryFee: toAmount(p.deliveryFee ?? 0),
    returnFee: toAmount(p.returnFee ?? 0),
    status: p.status,
  };
}

export function SenderFinancesPage() {
  const analytics = useApiQuery<AnalyticsPayload>("/dashboard/analytics");
  const parcels = useApiQuery<Parcel[]>("/parcels");

  const soldes = analytics.data?.soldes;
  const rows = useMemo(() => {
    const list = parcels.data ?? [];
    return list
      .filter((p) => isDeliveredStatus(p.status) || isReturnStatus(p.status))
      .slice(0, 80)
      .map((p) => {
        const m = moneyOf(p);
        return {
          id: p.id,
          code: p.code ?? `#${p.id}`,
          status: p.status,
          sale: salePriceOf(m),
          cod: m.price,
          deliveryFee: deliveryFeeOf(m),
          returnFee: isReturnStatus(p.status) ? returnFeeOf(m) : 0,
          net: isDeliveredStatus(p.status) ? netPayoutOf(m) : 0,
          profit: parcelProfitOf(m),
        };
      });
  }, [parcels.data]);

  const error = analytics.error || parcels.error;
  const loading = analytics.loading || parcels.loading;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Finances"
        description="Fonds disponibles, marge (vente − livraison − retours) et versements."
        actions={
          <Link
            href="/expediteur/payments"
            className="inline-flex items-center gap-1.5 rounded-xl bg-ops-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Demander un versement
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Disponible"
          value={loading ? "…" : formatTnd(soldes?.disponible ?? 0)}
          hint="Net prêt à demander"
          tone="brand"
        />
        <StatCard
          icon={HandCoins}
          label="En pipeline"
          value={
            loading
              ? "…"
              : formatTnd(
                  soldes?.enPipeline ??
                    (soldes?.enDemande ?? 0) + (soldes?.aVerser ?? 0),
                )
          }
          hint="Demandes en cours"
        />
        <StatCard
          icon={TrendingUp}
          label="Marge"
          value={loading ? "…" : formatTnd(soldes?.profit ?? 0)}
          hint="Ventes − frais"
          tone="success"
        />
        <StatCard
          icon={TrendingDown}
          label="Frais totaux"
          value={
            loading
              ? "…"
              : formatTnd(
                  (soldes?.fraisLivraison ?? 0) + (soldes?.retoursFrais ?? 0),
                )
          }
          hint={`Liv. ${formatTnd(soldes?.fraisLivraison ?? 0)} · Ret. ${formatTnd(soldes?.retoursFrais ?? 0)}`}
        />
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Ventes (livrés)", value: formatTnd(soldes?.ventes ?? 0) },
          { label: "Net encaissé", value: formatTnd(soldes?.encaisse ?? 0) },
          { label: "Déjà versé", value: formatTnd(soldes?.verse ?? 0) },
          {
            label: "En demande",
            value: formatTnd(soldes?.enDemande ?? 0),
          },
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-ops-card bg-ops-surface px-3 py-2.5"
          >
            <p className="text-[11px] font-semibold text-ops-ink/50">
              {card.label}
            </p>
            <p className="font-display text-base font-extrabold tabular-nums text-ops-ink">
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <TableCard
        toolbar={
          <div>
            <p className="text-sm font-semibold text-ops-ink">Détail par colis</p>
            <p className="text-xs text-ops-ink/50">
              Profit = vente − livraison (− retour si applicable). Versement =
              COD − livraison.
            </p>
          </div>
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Aucun colis clôturé"
            description="Les colis livrés ou retournés apparaissent ici avec la marge."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Colis</th>
                  <th className={thClass}>Vente</th>
                  <th className={thClass}>COD</th>
                  <th className={thClass}>Livraison</th>
                  <th className={thClass}>Retour</th>
                  <th className={thClass}>Net</th>
                  <th className={`${thClass} text-right`}>Profit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={trClass}>
                    <td className={tdClass}>
                      <Link
                        href={`/expediteur/parcels/${r.id}`}
                        className="font-mono text-xs font-semibold text-ops-ink hover:text-ops-accent"
                      >
                        {r.code}
                      </Link>
                      <div className="mt-0.5">
                        <Badge
                          tone={
                            isReturnStatus(r.status) ? "danger" : "success"
                          }
                        >
                          {isReturnStatus(r.status) ? "Retour" : "Livré"}
                        </Badge>
                      </div>
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatTnd(r.sale)}
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatTnd(r.cod)}
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatTnd(r.deliveryFee)}
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      {r.returnFee ? formatTnd(r.returnFee) : "—"}
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      {isDeliveredStatus(r.status)
                        ? formatTnd(r.net)
                        : "—"}
                    </td>
                    <td
                      className={`${tdClass} text-right font-semibold tabular-nums ${
                        (r.profit ?? 0) >= 0
                          ? "text-emerald-700"
                          : "text-ops-accent"
                      }`}
                    >
                      {r.profit != null ? formatTnd(r.profit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </div>
  );
}
