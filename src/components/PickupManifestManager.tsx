"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Printer, Package } from "lucide-react";
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
import {
  formatTnd,
  PICKUP_MANIFEST_KIND_LABEL,
  type Parcel,
  type PickupManifest,
  type PickupManifestKind,
} from "@/lib/domain";
import { openPickupManifestBordereauPdf } from "@/lib/parcel-report";
import { useApiQuery } from "@/lib/use-api";
import { cn } from "@/lib/cn";

const MAX_MANIFEST = 20;

const KIND_STATUS: Record<PickupManifestKind, string> = {
  EN_ATTENTE: "EN_ATTENTE",
  PRE_ENLEVEMENT: "A_ENLEVER",
};

type Props = {
  basePath: string;
  /** If set, only this kind is shown (e.g. expediteur EN_ATTENTE). */
  lockedKind?: PickupManifestKind;
};

export function PickupManifestManager({ basePath, lockedKind }: Props) {
  const { session } = useAuth();
  const toast = useToast();
  const token = session?.accessToken;
  const role = session?.user.role;
  const canCreatePre =
    role !== "EXPEDITEUR" &&
    ["PICKUP", "MAGASINIER", "CHEF_AGENCE", "ADMIN", "SUPER_ADMIN"].includes(
      role ?? "",
    );

  const kinds: PickupManifestKind[] = lockedKind
    ? [lockedKind]
    : canCreatePre
      ? ["EN_ATTENTE", "PRE_ENLEVEMENT"]
      : ["EN_ATTENTE"];

  const [activeKind, setActiveKind] = useState<PickupManifestKind>(
    lockedKind ?? "EN_ATTENTE",
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  const listUrl =
    lockedKind || kinds.length === 1
      ? `/pickup-manifests?kind=${lockedKind ?? kinds[0]}`
      : "/pickup-manifests";

  const {
    data: parcelsData,
    error: parcelsError,
    loading: parcelsLoading,
    reload: reloadParcels,
  } = useApiQuery<Parcel[]>("/parcels");
  const {
    data: manifestsData,
    error: manifestsError,
    loading: manifestsLoading,
    reload: reloadManifests,
  } = useApiQuery<PickupManifest[]>(listUrl);

  const manifests = useMemo(() => {
    const list = manifestsData ?? [];
    return list.filter((m) => m.manifestKind === activeKind);
  }, [manifestsData, activeKind]);

  const openParcelIds = useMemo(() => {
    const ids = new Set<number>();
    for (const m of manifestsData ?? []) {
      if (m.status !== "OPEN") continue;
      for (const p of m.parcels) ids.add(p.id);
    }
    return ids;
  }, [manifestsData]);

  const eligible = useMemo(() => {
    const status = KIND_STATUS[activeKind];
    return (parcelsData ?? []).filter(
      (p) => p.status === status && !openParcelIds.has(p.id),
    );
  }, [parcelsData, activeKind, openParcelIds]);

  function switchKind(kind: PickupManifestKind) {
    setActiveKind(kind);
    setSelected(new Set());
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= MAX_MANIFEST) {
        toast.error(
          "Limite atteinte",
          `Maximum ${MAX_MANIFEST} colis par manifeste`,
        );
        return prev;
      }
      next.add(id);
      return next;
    });
  }

  async function createManifest() {
    if (!token || selected.size === 0) return;
    setCreating(true);
    try {
      const manifest = await apiFetch<PickupManifest>("/pickup-manifests", {
        method: "POST",
        token,
        body: JSON.stringify({
          kind: activeKind,
          parcelIds: Array.from(selected),
        }),
      });
      toast.success("Manifeste créé", manifest.code);
      openPickupManifestBordereauPdf(manifest);
      setSelected(new Set());
      await Promise.all([reloadManifests(), reloadParcels()]);
    } catch (err) {
      toast.error("Création impossible", errorText(err));
    } finally {
      setCreating(false);
    }
  }

  const loading = parcelsLoading || manifestsLoading;
  const error = parcelsError ?? manifestsError;
  const kindLabel = PICKUP_MANIFEST_KIND_LABEL[activeKind];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          lockedKind
            ? `Manifeste · ${PICKUP_MANIFEST_KIND_LABEL[lockedKind]}`
            : "Manifestes enlèvement"
        }
        description={`Regroupez jusqu’à ${MAX_MANIFEST} colis, imprimez le bordereau, puis scannez le code pour retrouver tous les colis.`}
        actions={
          <Button
            icon={ClipboardList}
            disabled={selected.size === 0 || creating}
            loading={creating}
            onClick={() => void createManifest()}
          >
            Créer ({selected.size}/{MAX_MANIFEST})
          </Button>
        }
      />

      {kinds.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {kinds.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => switchKind(kind)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition",
                activeKind === kind
                  ? "bg-ops-accent text-white"
                  : "bg-ops-card text-ops-ink/70 hover:bg-ops-accent/10",
              )}
            >
              {PICKUP_MANIFEST_KIND_LABEL[kind]}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <ErrorBanner
          message={error}
          onRetry={() => {
            void reloadParcels();
            void reloadManifests();
          }}
        />
      ) : null}
      {loading ? (
        <LoadingBlock rows={3} label="Chargement manifestes…" />
      ) : null}

      <Panel className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-ops-ink">
            Colis {kindLabel.toLowerCase()}
          </h2>
          <Badge tone="neutral">
            {selected.size} sélectionné{selected.size === 1 ? "" : "s"}
          </Badge>
        </div>
        {eligible.length === 0 && !loading ? (
          <EmptyState
            icon={Package}
            title={`Aucun colis « ${kindLabel.toLowerCase()} »`}
            description="Les colis déjà dans un manifeste ouvert n’apparaissent plus ici."
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
          Manifestes {kindLabel.toLowerCase()}
        </h2>
        {manifests.length === 0 && !loading ? (
          <EmptyState
            icon={ClipboardList}
            title="Aucun manifeste"
            description="Sélectionnez des colis puis créez un bordereau."
          />
        ) : (
          <ul className="space-y-3">
            {manifests.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-ops-card bg-ops-page/50 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-lg font-bold text-ops-ink">
                      {m.code}
                    </p>
                    <p className="mt-0.5 text-sm text-ops-ink/50">
                      {m.itemCount} colis ·{" "}
                      {m.status === "OPEN" ? "Ouvert" : "Fermé"}
                      {m.sender?.name ? ` · ${m.sender.name}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={Printer}
                      onClick={() => openPickupManifestBordereauPdf(m)}
                    >
                      Bordereau
                    </Button>
                    <Link
                      href={`${basePath}/parcels?q=${encodeURIComponent(m.code)}`}
                      className={buttonClass("secondary")}
                    >
                      Voir
                    </Link>
                  </div>
                </div>
                <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                  {m.parcels.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`${basePath}/parcels/${p.id}`}
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
