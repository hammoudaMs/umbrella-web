"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Lock, Printer, Package, X } from "lucide-react";
import { DocumentUploadField } from "@/components/DocumentUploadField";
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
import { useT } from "@/i18n/locale-context";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  formatTnd,
  type Parcel,
  type PickupManifest,
  type PickupManifestKind,
} from "@/lib/domain";
import { mediaUrl } from "@/lib/media";
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
  const t = useT();
  const manifestKindLabel = (kind: PickupManifestKind) =>
    kind === "EN_ATTENTE"
      ? t("parcels.kindEnAttente")
      : t("parcels.kindPreEnlevement");
  const token = session?.accessToken;
  const role = session?.user.role;
  const isSender = role === "EXPEDITEUR";
  const canCreatePre =
    !isSender &&
    ["PICKUP", "MAGASINIER", "CHEF_AGENCE", "ADMIN", "SUPER_ADMIN"].includes(
      role ?? "",
    );
  const canCloseManifest = !isSender;

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
  const [closeTarget, setCloseTarget] = useState<PickupManifest | null>(null);
  const [dechargeUrl, setDechargeUrl] = useState<string | null>(null);
  const [cinUrl, setCinUrl] = useState<string | null>(null);
  const [closingBusy, setClosingBusy] = useState(false);

  async function confirmClose() {
    if (!token || !closeTarget) return;
    if (!dechargeUrl || !cinUrl) {
      toast.error("Décharge cachetée et CIN obligatoires");
      return;
    }
    setClosingBusy(true);
    try {
      await apiFetch(`/pickup-manifests/${closeTarget.id}/close`, {
        method: "POST",
        token,
        body: JSON.stringify({ dechargeUrl, cinUrl }),
      });
      toast.success("Manifeste clôturé", "Décharge + CIN enregistrés");
      setCloseTarget(null);
      setDechargeUrl(null);
      setCinUrl(null);
      await reloadManifests();
    } catch (err) {
      toast.error("Clôture impossible", errorText(err));
    } finally {
      setClosingBusy(false);
    }
  }

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
    const requiredStatus = KIND_STATUS[activeKind];
    const parcelIds = Array.from(selected).filter((id) =>
      eligible.some((p) => p.id === id && p.status === requiredStatus),
    );
    if (parcelIds.length === 0) {
      toast.error(
        "Aucun colis éligible",
        activeKind === "EN_ATTENTE"
          ? "Seuls les colis « En attente de collecte » peuvent entrer dans ce manifeste."
          : "Seuls les colis pré-enlèvement (à enlever) sont acceptés.",
      );
      setSelected(new Set());
      return;
    }
    setCreating(true);
    try {
      const manifest = await apiFetch<PickupManifest>("/pickup-manifests", {
        method: "POST",
        token,
        body: JSON.stringify({
          kind: activeKind,
          parcelIds,
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
  const kindLabel = manifestKindLabel(activeKind);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          lockedKind
            ? t("parcels.manifestTitleKind", { kind: manifestKindLabel(lockedKind) })
            : t("parcels.manifestTitle")
        }
        description={t("parcels.manifestDescription", { max: MAX_MANIFEST })}
        actions={
          <Button
            icon={ClipboardList}
            disabled={selected.size === 0 || creating}
            loading={creating}
            onClick={() => void createManifest()}
          >
            {t("parcels.createManifest", {
              selected: selected.size,
              max: MAX_MANIFEST,
            })}
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
              {manifestKindLabel(kind)}
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
        <LoadingBlock rows={3} label={t("parcels.loadingManifests")} />
      ) : null}

      <Panel className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-ops-ink">
            {t("parcels.parcelsKind", { kind: kindLabel })}
          </h2>
          <Badge tone="neutral">
            {t("parcels.selectedCount", { count: selected.size })}
          </Badge>
        </div>
        {eligible.length === 0 && !loading ? (
          <EmptyState
            icon={Package}
            title={t("parcels.emptyKindTitle", { kind: kindLabel })}
            description={t("parcels.emptyKindDescription")}
          />
        ) : (
          <>
            <ul className="space-y-2.5 md:hidden">
              {eligible.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition",
                        checked
                          ? "border-ops-accent/40 bg-ops-accent/10"
                          : "border-ops-card bg-ops-page/40",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-4 w-4 shrink-0 accent-[#991211]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[12px] font-semibold text-ops-ink">
                            {p.code ?? `#${p.id}`}
                          </span>
                          <span className="shrink-0 font-display text-[14px] font-bold tabular-nums text-ops-ink">
                            {formatTnd(p.price)}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-[14px] font-semibold text-ops-ink">
                          {p.recipientName}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-ops-ink/45">
                          {p.city}
                          {p.phone ? ` · ${p.phone}` : ""}
                        </span>
                        <span className="mt-2 block">
                          <StatusBadge status={p.status} />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>{t("parcels.select")}</th>
                    <th className={thClass}>{t("parcels.code")}</th>
                    <th className={thClass}>{t("parcels.recipient")}</th>
                    <th className={thClass}>{t("parcels.city")}</th>
                    <th className={thClass}>{t("common.amount")}</th>
                    <th className={thClass}>{t("common.status")}</th>
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
          </>
        )}
      </Panel>

      <Panel className="space-y-3">
        <h2 className="font-display text-lg font-bold text-ops-ink">
          {t("parcels.manifestsKind", { kind: kindLabel })}
        </h2>
        {manifests.length === 0 && !loading ? (
          <EmptyState
            icon={ClipboardList}
            title={t("parcels.emptyManifestTitle")}
            description={t("parcels.emptyManifestDescription")}
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
                      {m.status === "OPEN"
                        ? t("parcels.manifestOpen")
                        : t("parcels.manifestClosed")}
                      {m.sender?.name ? ` · ${m.sender.name}` : ""}
                    </p>
                    {m.dechargeUrl && m.cinUrl ? (
                      <p className="mt-1 flex flex-wrap gap-3 text-xs">
                        <a
                          href={mediaUrl(m.dechargeUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-brand underline"
                        >
                          {t("parcels.decharge")}
                        </a>
                        <a
                          href={mediaUrl(m.cinUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-brand underline"
                        >
                          CIN
                        </a>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={Printer}
                      onClick={() => openPickupManifestBordereauPdf(m)}
                    >
                      {t("parcels.bordereau")}
                    </Button>
                    {m.status === "OPEN" && canCloseManifest ? (
                      <Button
                        type="button"
                        size="sm"
                        icon={Lock}
                        onClick={() => {
                          setCloseTarget(m);
                          setDechargeUrl(null);
                          setCinUrl(null);
                        }}
                      >
                        {t("parcels.closeManifest")}
                      </Button>
                    ) : null}
                    <Link
                      href={`${basePath}/parcels?q=${encodeURIComponent(m.code)}`}
                      className={buttonClass("secondary")}
                    >
                      {t("common.open")}
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

      {closeTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ops-ink/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-manifest-title"
        >
          <Panel className="relative w-full max-w-lg space-y-4 shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-1 text-ops-ink/45 hover:bg-ops-ink/5 hover:text-ops-ink"
              onClick={() => {
                if (closingBusy) return;
                setCloseTarget(null);
              }}
              aria-label={t("common.close")}
            >
              <X className="h-5 w-5" />
            </button>
            <div>
              <h2
                id="close-manifest-title"
                className="font-display text-lg font-bold text-ops-ink"
              >
                {t("parcels.closeManifestTitle", { code: closeTarget.code })}
              </h2>
              <p className="mt-1 text-sm text-ops-ink/50">
                {t("parcels.closeManifestDescription")}
              </p>
            </div>
            <DocumentUploadField
              label={t("parcels.dechargeStamped")}
              kind="decharge"
              value={dechargeUrl}
              onChange={setDechargeUrl}
              required
              hint="Photo ou scan de la décharge tamponnée."
              capture
            />
            <DocumentUploadField
              label="CIN"
              kind="cin"
              value={cinUrl}
              onChange={setCinUrl}
              required
              hint="Photo recto de la pièce d’identité."
              capture
            />
            <div className="flex flex-wrap justify-end gap-2 border-t border-ops-card pt-3">
              <Button
                type="button"
                variant="secondary"
                disabled={closingBusy}
                onClick={() => setCloseTarget(null)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                icon={Lock}
                loading={closingBusy}
                disabled={!dechargeUrl || !cinUrl}
                onClick={() => void confirmClose()}
              >
                {t("parcels.validateClose")}
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
