"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreateParcelWizard } from "@/components/CreateParcelWizard";
import { errorText, useConfirm, useToast } from "@/components/Feedback";
import { Modal } from "@/components/Modal";
import { ParcelDetailTable } from "@/components/ParcelDetailTable";
import { StatusFilterBar } from "@/components/StatusFilterBar";
import { ZoneField } from "@/components/ZoneField";
import { Button, ErrorBanner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { Parcel, Zone } from "@/lib/domain";
import { USE_MOCK } from "@/lib/mock-mode";
import {
  RETURN_STATUSES,
  STATUS_META,
  type StatusKey,
} from "@/lib/status-meta";
import { useStatusLabel } from "@/i18n/hooks";
import { canAssignParcelZone } from "@/lib/roles";
import { useApi, useApiQuery } from "@/lib/use-api";
import { upsertZone } from "@/lib/zone-book";

const SENDER_EDITABLE_STATUSES = ["EN_ATTENTE", "NON_SERIEUX"];

function FieldLabel({
  children,
  htmlFor,
}: {
  children: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-ops-ink"
    >
      {children}
    </label>
  );
}

const fieldClass =
  "w-full rounded-xl border border-ops-card bg-ops-page px-3 py-2.5 text-sm text-ops-ink outline-none ring-ops-accent focus:ring-2";

export function ParcelsManager({
  canCreate = false,
  canEdit = false,
  canDelete = false,
  title = "Colis",
  description: _description,
  defaultOpenCreate = false,
  returnsOnly = false,
  detailBasePath,
  showPartyDetails = false,
  createOnly = false,
  createOpen,
  onCreateOpenChange,
  onCreated,
}: {
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  title?: string;
  description?: string;
  defaultOpenCreate?: boolean;
  returnsOnly?: boolean;
  detailBasePath?: string;
  showPartyDetails?: boolean;
  createOnly?: boolean;
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const { session } = useAuth();
  const statusLabelFn = useStatusLabel();
  const role = session?.user.role;
  const showZones = canAssignParcelZone(role);
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");
  const codeQuery = searchParams.get("q")?.trim() ?? "";
  const request = useApi();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, loading, reload } = useApiQuery<Parcel[]>(
    createOnly ? null : "/parcels",
  );
  const parcels = useMemo(() => data ?? [], [data]);
  const [internalOpenForm, setInternalOpenForm] = useState(defaultOpenCreate);
  const openForm = createOpen ?? internalOpenForm;
  const setOpenForm = (open: boolean) => {
    onCreateOpenChange?.(open);
    if (createOpen === undefined) setInternalOpenForm(open);
  };
  const [editing, setEditing] = useState<Parcel | null>(null);
  const [saving, setSaving] = useState(false);
  const [editZoneName, setEditZoneName] = useState<string | null>(null);

  function canEditRow(row: Parcel) {
    if (!canEdit) return false;
    return (
      role !== "EXPEDITEUR" || SENDER_EDITABLE_STATUSES.includes(row.status)
    );
  }

  const filtered = useMemo(() => {
    let list = parcels;
    if (returnsOnly) {
      list = list.filter((p) =>
        RETURN_STATUSES.includes(p.status as StatusKey),
      );
    } else if (statusFilter) {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (codeQuery) {
      const q = codeQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.code?.toLowerCase().includes(q) ||
          String(p.id) === codeQuery ||
          p.recipientName.toLowerCase().includes(q) ||
          p.phone.includes(codeQuery),
      );
    }
    return list;
  }, [parcels, statusFilter, returnsOnly, codeQuery]);

  const heading = codeQuery
    ? `Recherche « ${codeQuery} »`
    : statusFilter && STATUS_META[statusFilter as StatusKey]
      ? statusLabelFn(statusFilter)
      : returnsOnly
        ? "Mes retours"
        : title;

  async function resolveZonePayload(name: string | null) {
    if (!name?.trim()) {
      return { zoneName: null as string | null, zoneId: null as number | null };
    }
    const trimmed = name.trim();
    upsertZone({ name: trimmed });
    if (USE_MOCK) return { zoneName: trimmed, zoneId: null as number | null };
    try {
      const list = await apiFetch<Zone[]>("/zones", {
        token: session?.accessToken,
      });
      const hit = list.find(
        (z) =>
          z.name.localeCompare(trimmed, "fr", { sensitivity: "base" }) === 0,
      );
      if (hit) return { zoneName: trimmed, zoneId: hit.id };
      const created = await request<Zone>("/zones", "POST", { name: trimmed });
      return { zoneName: trimmed, zoneId: created.id };
    } catch {
      return { zoneName: trimmed, zoneId: null as number | null };
    }
  }

  function closeCreate() {
    setOpenForm(false);
  }

  function closeEdit() {
    setEditing(null);
  }

  async function onUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const zonePayload = showZones
        ? await resolveZonePayload(editZoneName)
        : { zoneName: null as string | null, zoneId: null as number | null };
      await request(`/parcels/${editing.id}`, "PATCH", {
        recipientName: form.get("recipientName"),
        phone: form.get("phone"),
        address: form.get("address"),
        price: Number(form.get("price")),
        notes: String(form.get("notes") || "").trim() || undefined,
        ...(showZones && zonePayload.zoneId != null
          ? { zoneId: zonePayload.zoneId }
          : showZones
            ? { zoneName: zonePayload.zoneName }
            : {}),
      });
      closeEdit();
      toast.success("Colis mis à jour");
      await reload();
    } catch (err) {
      toast.error("Mise à jour impossible", errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: Parcel) {
    if (!canDelete) return;
    const ok = await confirm({
      title: `Supprimer ${row.code ?? `#${row.id}`} ?`,
      description: `${row.recipientName} · ${row.city}`,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await request(`/parcels/${row.id}`, "DELETE");
      closeEdit();
      toast.success("Colis supprimé");
      await reload();
    } catch (err) {
      toast.error("Suppression impossible", errorText(err));
    }
  }

  const createWizard =
    canCreate ? (
      <CreateParcelWizard
        open={openForm}
        onClose={closeCreate}
        onCreated={() => {
          if (!createOnly) void reload();
          onCreated?.();
        }}
      />
    ) : null;

  if (createOnly) {
    return createWizard;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <ErrorBanner message={error} onRetry={() => void reload()} />
      ) : null}

      {!returnsOnly ? <StatusFilterBar parcels={parcels} /> : null}

      <ParcelDetailTable
        rows={filtered}
        loading={loading && parcels.length === 0}
        detailBasePath={detailBasePath}
        reportTitle={heading || title}
        showPartyDetails={showPartyDetails}
        multiSelect={role === "EXPEDITEUR" && statusFilter === "EN_ATTENTE"}
        canEditRow={canEdit ? canEditRow : undefined}
        onEdit={
          canEdit
            ? (row) => {
                setOpenForm(false);
                setEditZoneName(row.zone?.name ?? null);
                setEditing(row);
              }
            : undefined
        }
      />

      {createWizard}

      <Modal
        open={Boolean(editing && canEdit)}
        onClose={closeEdit}
        title={editing ? `Modifier ${editing.code ?? editing.id}` : "Modifier"}
        description="Mettez à jour les infos destinataire"
        size="md"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {canDelete && editing ? (
              <Button variant="danger" onClick={() => void onDelete(editing)}>
                Supprimer
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="secondary" onClick={closeEdit}>
                Annuler
              </Button>
              <Button type="submit" form="parcel-edit-form" loading={saving}>
                Enregistrer
              </Button>
            </div>
          </div>
        }
      >
        {editing ? (
          <form
            id="parcel-edit-form"
            onSubmit={onUpdate}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="edit-recipientName">Nom</FieldLabel>
              <input
                id="edit-recipientName"
                name="recipientName"
                defaultValue={editing.recipientName}
                required
                className={fieldClass}
              />
            </div>
            <div>
              <FieldLabel htmlFor="edit-phone">Téléphone</FieldLabel>
              <input
                id="edit-phone"
                name="phone"
                defaultValue={editing.phone}
                required
                inputMode="numeric"
                className={fieldClass}
              />
            </div>
            <div>
              <FieldLabel htmlFor="edit-price">Prix (TND)</FieldLabel>
              <input
                id="edit-price"
                name="price"
                type="number"
                step="0.001"
                defaultValue={Number(editing.price)}
                required
                inputMode="decimal"
                className={fieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="edit-address">Adresse</FieldLabel>
              <input
                id="edit-address"
                name="address"
                defaultValue={editing.address}
                required
                className={fieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="edit-notes">Remarques</FieldLabel>
              <input
                id="edit-notes"
                name="notes"
                defaultValue={editing.notes ?? ""}
                className={fieldClass}
              />
            </div>
            {showZones ? (
              <div className="sm:col-span-2">
                <ZoneField
                  value={editZoneName}
                  onChange={setEditZoneName}
                  canManage
                  fieldClass={fieldClass}
                />
              </div>
            ) : null}
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
