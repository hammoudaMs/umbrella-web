"use client";

import { useMemo, useState } from "react";
import { LayoutList, MapPinned, RefreshCw, Truck } from "lucide-react";
import { errorText, useToast } from "@/components/Feedback";
import { PlacesSmartView } from "@/components/PlacesSmartView";
import {
  Button,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchInput,
  SegmentedTabs,
  StatCard,
  StatusBadge,
  TableCard,
  inputClass,
  tableClass,
  tdClass,
  theadClass,
  thClass,
  trClass,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";
import type { Driver, Parcel, Zone } from "@/lib/domain";
import { canSeeDeliveryMode } from "@/lib/roles";
import { useStatusLabel } from "@/i18n/hooks";
import {
  requiresComment,
  selectableStatuses,
} from "@/lib/parcel-transitions";
import type { AppRole } from "@/lib/roles";
import { SortableTh, useTableSort } from "@/lib/table-sort";
import { useApi, useApiQuery } from "@/lib/use-api";

const ACTIVE_STATUSES = ["A_ENLEVER", "ENLEVES", "AU_DEPOT", "EN_COURS", "A_VERIFIER"];

type DispatchSortKey = "code" | "recipientName" | "status" | "driver";

const DISPATCH_SORT_BASE = {
  code: (p: Parcel) => p.code ?? "",
  recipientName: (p: Parcel) => p.recipientName,
  driver: (p: Parcel) => p.driver?.name ?? "",
} as const;

type Filter = "ALL" | "UNASSIGNED" | "ACTIVE";

const selectClass = cn(inputClass, "h-8 w-auto py-1 text-xs");

export function DispatchManager({ staffMode = false }: { staffMode?: boolean }) {
  const { session } = useAuth();
  const statusLabelFn = useStatusLabel();
  const dispatchSort = useMemo(
    () => ({
      ...DISPATCH_SORT_BASE,
      status: (p: Parcel) => statusLabelFn(p.status),
    }),
    [statusLabelFn],
  );
  const showModes = canSeeDeliveryMode(session?.user.role);
  const request = useApi();
  const toast = useToast();
  const parcelsQuery = useApiQuery<Parcel[]>("/parcels");
  const driversQuery = useApiQuery<Driver[]>(staffMode ? "/users/livreurs" : null);
  const zonesQuery = useApiQuery<Zone[]>(staffMode ? "/zones" : null);
  const [syncing, setSyncing] = useState(false);
  const [byPlaces, setByPlaces] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const parcels = useMemo(() => parcelsQuery.data ?? [], [parcelsQuery.data]);
  const drivers = driversQuery.data ?? [];
  const activeZones = (zonesQuery.data ?? []).filter((z) => z.isActive);

  const stats = useMemo(
    () => ({
      unassigned: parcels.filter((p) => p.mode === "INTERNAL" && !p.driver).length,
      active: parcels.filter((p) => ACTIVE_STATUSES.includes(p.status)).length,
      delivered: parcels.filter((p) => p.status === "LIVRES" || p.status === "LIVRES_PAYES").length,
    }),
    [parcels],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parcels.filter((p) => {
      if (filter === "UNASSIGNED" && (p.mode !== "INTERNAL" || p.driver)) return false;
      if (filter === "ACTIVE" && !ACTIVE_STATUSES.includes(p.status)) return false;
      if (!q) return true;
      return [p.code, p.recipientName, p.city, p.governorate, p.driver?.name]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [parcels, filter, query]);

  const { sorted: visible, sortKey, sortDir, toggleSort } = useTableSort<
    Parcel,
    DispatchSortKey
  >(filtered, dispatchSort, "code");

  const role = (session?.user.role ?? "LIVREUR") as AppRole;

  async function assign(parcel: Parcel, driverId: number) {
    setBusyId(parcel.id);
    try {
      await request(`/parcels/${parcel.id}/assign`, "PATCH", { driverId });
      const driver = drivers.find((d) => d.id === driverId);
      toast.success(`${parcel.code ?? `#${parcel.id}`} assigné`, driver?.name);
      await parcelsQuery.reload();
    } catch (err) {
      toast.error("Assignation impossible", errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  async function assignPlace(items: Parcel[], driverId: number) {
    const internal = items.filter((p) => p.mode === "INTERNAL");
    if (internal.length === 0) {
      toast.info("Aucun colis INTERNAL à assigner dans ce lieu");
      return;
    }
    try {
      await Promise.all(
        internal.map((p) => request(`/parcels/${p.id}/assign`, "PATCH", { driverId })),
      );
      const driver = drivers.find((d) => d.id === driverId);
      toast.success(`${internal.length} colis assignés`, driver?.name);
      await parcelsQuery.reload();
    } catch (err) {
      toast.error("Assignation partielle", errorText(err));
      await parcelsQuery.reload();
    }
  }

  async function setStatus(parcel: Parcel, status: string) {
    let comment: string | undefined;
    if (requiresComment(status, parcel.status)) {
      const typed = window.prompt(
        `Motif pour « ${statusLabelFn(status)} »`,
      );
      if (typed == null || !typed.trim()) {
        toast.info("Statut annulé", "Un motif est obligatoire");
        return;
      }
      comment = typed.trim();
    }
    setBusyId(parcel.id);
    try {
      await request(`/parcels/${parcel.id}/status`, "PATCH", {
        status,
        comment,
      });
      toast.success(
        `${parcel.code ?? `#${parcel.id}`} → ${statusLabelFn(status)}`,
      );
      await parcelsQuery.reload();
    } catch (err) {
      toast.error("Statut non modifié", errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  async function syncExternal() {
    setSyncing(true);
    try {
      const res = await request<{ checked: number; updated: number; enabled?: boolean }>(
        "/parcels/sync-external",
        "POST",
      );
      if (res.enabled === false) {
        toast.info(
          "Synchronisation Navex désactivée",
          `${res.checked} colis réseau. Activez NAVEX_ENABLED avec une clé API pour synchroniser.`,
        );
      } else {
        toast.success("Synchronisation terminée", `${res.updated}/${res.checked} colis mis à jour`);
        await parcelsQuery.reload();
      }
    } catch (err) {
      toast.error("Synchronisation impossible", errorText(err));
    } finally {
      setSyncing(false);
    }
  }

  function driverSelect(p: Parcel, className?: string) {
    if (p.mode !== "INTERNAL") {
      return <span className="text-xs text-ops-ink/50">{showModes ? "EXTERNAL" : "Réseau partenaire"}</span>;
    }
    return (
      <select
        aria-label={`Livreur pour ${p.code ?? p.id}`}
        className={cn(selectClass, className)}
        value={p.driver?.id ?? ""}
        disabled={busyId === p.id}
        onChange={(e) => {
          const id = Number(e.target.value);
          if (id) void assign(p, id);
        }}
      >
        <option value="">Assigner…</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    );
  }

  function statusSelect(p: Parcel, className?: string) {
    const options = selectableStatuses(p.status, role);
    return (
      <select
        aria-label={`Statut de ${p.code ?? p.id}`}
        className={cn(selectClass, className)}
        value={p.status}
        disabled={busyId === p.id}
        onChange={(e) => {
          const next = e.target.value;
          if (next === p.status) return;
          void setStatus(p, next);
        }}
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {statusLabelFn(s)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={staffMode ? "Dispatch" : "Mes colis"}
        description={
          staffMode
            ? "Assignez les livreurs par colis ou par lieu, et suivez les statuts"
            : "Mettez à jour le statut de vos colis assignés"
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={byPlaces ? LayoutList : MapPinned}
              onClick={() => setByPlaces((v) => !v)}
            >
              {byPlaces ? "Vue tableau" : "Vue par lieux"}
            </Button>
            {staffMode ? (
              <Button variant="gold" icon={RefreshCw} loading={syncing} onClick={() => void syncExternal()}>
                Sync Navex
              </Button>
            ) : null}
          </>
        }
      />

      {parcelsQuery.error ? (
        <ErrorBanner message={parcelsQuery.error} onRetry={() => void parcelsQuery.reload()} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {staffMode ? (
          <StatCard label="À assigner" value={stats.unassigned} hint="Colis INTERNAL sans livreur" icon={Truck} tone="brand" />
        ) : null}
        <StatCard label="En circulation" value={stats.active} icon={MapPinned} tone="gold" />
        <StatCard label="Livrés" value={stats.delivered} tone="success" />
      </div>

      {byPlaces ? (
        <PlacesSmartView
          items={visible}
          title="Dispatch par lieux"
          description="Assignez un livreur à tout un quartier ou une ville d’un clic"
          renderPlaceActions={
            staffMode
              ? (_label, items) => (
                  <select
                    aria-label="Assigner tout le lieu"
                    className="rounded-lg border-0 bg-white/95 px-2 py-1.5 text-xs font-semibold text-[#1A1414]"
                    defaultValue=""
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (id) void assignPlace(items, id);
                      e.target.value = "";
                    }}
                  >
                    <option value="">Assigner le lieu…</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )
              : undefined
          }
          renderItem={(p) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ops-card bg-ops-surface px-4 py-3">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-ops-accent keep-ltr">{p.code}</p>
                <p className="font-semibold text-ops-ink">{p.recipientName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={p.status} />
                  {p.driver ? <span className="text-xs text-ops-ink/50">{p.driver.name}</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {staffMode ? driverSelect(p) : null}
                {statusSelect(p)}
              </div>
            </div>
          )}
        />
      ) : (
        <TableCard
          toolbar={
            <>
              <SegmentedTabs<Filter>
                label="Filtrer le dispatch"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "ALL", label: "Tous", count: parcels.length },
                  ...(staffMode
                    ? [{ value: "UNASSIGNED" as const, label: "À assigner", count: stats.unassigned }]
                    : []),
                  { value: "ACTIVE", label: "En circulation", count: stats.active },
                ]}
              />
              <SearchInput value={query} onChange={setQuery} placeholder="Code, ville, livreur…" className="w-full md:w-64" />
            </>
          }
        >
          {parcelsQuery.loading && parcels.length === 0 ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-ops-ink/[0.06]" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Truck} title="Aucun colis" description="Rien à dispatcher pour ce filtre." />
            </div>
          ) : (
            <>
              <ul className="divide-y divide-ops-card md:hidden">
                {visible.map((p) => (
                  <li key={p.id} className="space-y-3 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-bold text-ops-ink keep-ltr">
                        {p.code ?? `#${p.id}`}
                      </p>
                      {showModes ? (
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ops-ink/40">
                          {p.mode === "INTERNAL" ? "Umbrella" : "Navex"}
                        </p>
                      ) : null}
                      <p className="mt-1.5 text-[15px] font-semibold text-ops-ink">
                        {p.recipientName}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ops-ink/45">
                        {p.city}, {p.governorate}
                      </p>
                      <div className="mt-2">
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {staffMode ? driverSelect(p, "h-10 w-full text-sm") : null}
                      {statusSelect(p, "h-10 w-full text-sm")}
                    </div>
                  </li>
                ))}
              </ul>
              <table className={cn(tableClass, "hidden md:table")}>
                <thead className={theadClass}>
                  <tr>
                    <SortableTh
                      label="Colis"
                      column="code"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableTh
                      label="Destinataire"
                      column="recipientName"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableTh
                      label="Statut"
                      column="status"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    {staffMode ? (
                      <SortableTh
                        label="Livreur"
                        column="driver"
                        activeKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                      />
                    ) : null}
                    <th className={thClass}>Changer le statut</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id} className={trClass}>
                      <td className={tdClass}>
                        <p className="font-mono text-xs font-semibold text-ops-ink keep-ltr">
                          {p.code}
                        </p>
                        {showModes ? (
                          <p className="text-[10px] font-semibold uppercase text-ops-ink/50">
                            {p.mode}
                          </p>
                        ) : null}
                      </td>
                      <td className={tdClass}>
                        <p className="font-medium text-ops-ink">{p.recipientName}</p>
                        <p className="text-xs text-ops-ink/50">
                          {p.city}, {p.governorate}
                        </p>
                      </td>
                      <td className={tdClass}>
                        <StatusBadge status={p.status} />
                      </td>
                      {staffMode ? (
                        <td className={tdClass}>{driverSelect(p)}</td>
                      ) : null}
                      <td className={tdClass}>{statusSelect(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </TableCard>
      )}

      {staffMode && activeZones.length > 0 ? (
        <p className="text-xs text-ops-ink/50">
          Zones actives : {activeZones.map((z) => z.name).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
