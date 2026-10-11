"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Layers, Printer, Package } from "lucide-react";
import { errorText, useToast } from "@/components/Feedback";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  Panel,
  StatusBadge,
  tableClass,
  tdClass,
  theadClass,
  thClass,
  trClass,
  buttonClass,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatTnd, type Parcel, type ReturnLot } from "@/lib/domain";
import { openReturnLotBordereauPdf } from "@/lib/parcel-report";
import { RETURN_STATUSES, type StatusKey } from "@/lib/status-meta";
import { useApiQuery } from "@/lib/use-api";
import { cn } from "@/lib/cn";

const MAX_LOT = 20;

export function ReturnLotManager() {
  const { session } = useAuth();
  const toast = useToast();
  const token = session?.accessToken;
  const {
    data: parcelsData,
    error: parcelsError,
    loading: parcelsLoading,
    reload: reloadParcels,
  } = useApiQuery<Parcel[]>("/parcels");
  const {
    data: lotsData,
    error: lotsError,
    loading: lotsLoading,
    reload: reloadLots,
  } = useApiQuery<ReturnLot[]>("/return-lots");

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  const returnParcels = useMemo(() => {
    const list = parcelsData ?? [];
    return list.filter((p) =>
      RETURN_STATUSES.includes(p.status as StatusKey),
    );
  }, [parcelsData]);

  const lots = lotsData ?? [];
  const openLotParcelIds = useMemo(() => {
    const ids = new Set<number>();
    for (const lot of lots) {
      if (lot.status !== "OPEN") continue;
      for (const p of lot.parcels) ids.add(p.id);
    }
    return ids;
  }, [lots]);

  const eligible = useMemo(
    () => returnParcels.filter((p) => !openLotParcelIds.has(p.id)),
    [returnParcels, openLotParcelIds],
  );

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= MAX_LOT) {
        toast.error("Limite atteinte", `Maximum ${MAX_LOT} colis par lot`);
        return prev;
      }
      next.add(id);
      return next;
    });
  }

  async function createLot() {
    if (!token || selected.size === 0) return;
    setCreating(true);
    try {
      const lot = await apiFetch<ReturnLot>("/return-lots", {
        method: "POST",
        token,
        body: JSON.stringify({ parcelIds: Array.from(selected) }),
      });
      toast.success("Lot créé", lot.code);
      openReturnLotBordereauPdf(lot);
      setSelected(new Set());
      await Promise.all([reloadLots(), reloadParcels()]);
    } catch (err) {
      toast.error("Création impossible", errorText(err));
    } finally {
      setCreating(false);
    }
  }

  const loading = parcelsLoading || lotsLoading;
  const error = parcelsError ?? lotsError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lots retour"
        description={`Regroupez jusqu’à ${MAX_LOT} colis retour, imprimez un bordereau, puis scannez le code du lot pour retrouver tous les colis.`}
        actions={
          <Button
            icon={Layers}
            disabled={selected.size === 0 || creating}
            loading={creating}
            onClick={() => void createLot()}
          >
            Créer lot ({selected.size}/{MAX_LOT})
          </Button>
        }
      />

      {error ? (
        <ErrorBanner
          message={error}
          onRetry={() => {
            void reloadParcels();
            void reloadLots();
          }}
        />
      ) : null}
      {loading ? <LoadingBlock rows={3} label="Chargement retours…" /> : null}

      <Panel className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-ops-ink">
            Colis éligibles
          </h2>
          <Badge tone="neutral">
            {selected.size} sélectionné{selected.size === 1 ? "" : "s"}
          </Badge>
        </div>
        {eligible.length === 0 && !loading ? (
          <EmptyState
            icon={Package}
            title="Aucun colis retour disponible"
            description="Les colis déjà dans un lot ouvert n’apparaissent plus ici."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Sel.</th>
                  <th className={thClass}>Code</th>
                  <th className={thClass}>Destinataire</th>
                  <th className={thClass}>Ville</th>
                  <th className={thClass}>Montant</th>
                  <th className={thClass}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {eligible.map((p) => {
                  const checked = selected.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={cn(trClass, checked && "bg-ops-accent/10")}
                      onClick={() => toggle(p.id)}
                    >
                      <td className={tdClass}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 accent-[#991211]"
                        />
                      </td>
                      <td className={`${tdClass} font-mono font-semibold`}>
                        {p.code ?? `#${p.id}`}
                      </td>
                      <td className={tdClass}>
                        <div className="font-medium">{p.recipientName}</div>
                        <div className="text-xs text-ops-ink/45">{p.phone}</div>
                      </td>
                      <td className={tdClass}>
                        {p.city}, {p.governorate}
                      </td>
                      <td className={tdClass}>{formatTnd(p.price)}</td>
                      <td className={tdClass}>
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel className="space-y-3">
        <h2 className="font-display text-lg font-bold text-ops-ink">
          Mes lots
        </h2>
        {lots.length === 0 && !loading ? (
          <EmptyState
            icon={Layers}
            title="Aucun lot"
            description="Sélectionnez des colis retour puis créez un bordereau lot."
          />
        ) : (
          <ul className="space-y-3">
            {lots.map((lot) => (
              <li
                key={lot.id}
                className="rounded-xl border border-ops-card bg-ops-page/50 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-lg font-bold text-ops-ink">
                      {lot.code}
                    </p>
                    <p className="mt-0.5 text-sm text-ops-ink/50">
                      {lot.itemCount} colis ·{" "}
                      {lot.status === "OPEN" ? "Ouvert" : "Fermé"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={Printer}
                      onClick={() => openReturnLotBordereauPdf(lot)}
                    >
                      Bordereau
                    </Button>
                    <Link
                      href={`/expediteur/parcels?q=${encodeURIComponent(lot.code)}`}
                      className={buttonClass("secondary")}
                    >
                      Voir
                    </Link>
                  </div>
                </div>
                <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                  {lot.parcels.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/expediteur/parcels/${p.id}`}
                        className="block truncate rounded-lg px-2 py-1 font-mono text-xs text-ops-accent hover:bg-ops-accent/10"
                      >
                        {p.code ?? `#${p.id}`} · {p.recipientName}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
