"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Pencil, UserPlus, Users, X } from "lucide-react";
import { errorText, useConfirm, useToast } from "@/components/Feedback";
import { Modal } from "@/components/Modal";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchInput,
  SegmentedTabs,
  SelectField,
  TableCard,
  TextField,
  tableClass,
  tdClass,
  theadClass,
  thClass,
  trClass,
  type BadgeTone,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import type { ApprovalStatus, UserRow } from "@/lib/domain";
import type { Agency } from "@/lib/domain";
import { ROLE_LABEL, roleNeedsAgency, type AppRole } from "@/lib/roles";
import { SortableTh, useTableSort } from "@/lib/table-sort";
import { useApi, useApiQuery } from "@/lib/use-api";

type UserSortKey = "name" | "phone" | "role" | "isActive";

const USER_SORT = {
  name: (u: UserRow) => u.name,
  phone: (u: UserRow) => u.phone ?? "",
  role: (u: UserRow) => ROLE_LABEL[u.role],
  isActive: (u: UserRow) => (u.isActive ? 1 : 0),
} as const;

const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Refusé",
};

const APPROVAL_TONE: Record<ApprovalStatus, BadgeTone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const CREATABLE_ROLES: AppRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CHEF_AGENCE",
  "SUPPORT",
  "PICKUP",
  "MAGASINIER",
  "FINANCE",
  "EXPEDITEUR",
  "LIVREUR",
  "CLIENT",
];

const ROLE_TONE: Record<AppRole, BadgeTone> = {
  SUPER_ADMIN: "brand",
  ADMIN: "gold",
  CHEF_AGENCE: "warning",
  SUPPORT: "info",
  PICKUP: "success",
  MAGASINIER: "info",
  FINANCE: "gold",
  EXPEDITEUR: "info",
  LIVREUR: "success",
  CLIENT: "neutral",
};

type RoleFilter = "ALL" | AppRole;
type ApprovalFilter = "ALL" | ApprovalStatus;
type FormErrors = Partial<
  Record<"name" | "email" | "password" | "phone", string>
>;

function profileSummary(u: UserRow): string | null {
  if (u.role === "EXPEDITEUR") {
    const products = (u.productTypes ?? []).join(", ");
    const place = [u.city, u.governorate].filter(Boolean).join(", ");
    const parts = [products || null, place || null, u.address || null].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  }
  if (u.role === "LIVREUR") {
    const zone = u.homeZone?.name ?? null;
    const place = [u.city, u.governorate].filter(Boolean).join(", ");
    const parts = [zone, place || null, u.address || null].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  }
  return null;
}

function validateCreate(form: FormData): FormErrors {
  const errors: FormErrors = {};
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const phone = String(form.get("phone") ?? "").trim();
  if (name.length < 2) errors.name = "Nom trop court";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "Email invalide";
  if (password.length < 8) errors.password = "8 caractères minimum";
  if (phone && !/^[0-9]{8}$/.test(phone)) errors.phone = "8 chiffres";
  return errors;
}

function validateEdit(form: FormData): FormErrors {
  const errors: FormErrors = {};
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const phone = String(form.get("phone") ?? "").trim();
  if (name.length < 2) errors.name = "Nom trop court";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "Email invalide";
  if (password && password.length < 8) errors.password = "8 caractères minimum";
  if (phone && !/^[0-9]{8}$/.test(phone)) errors.phone = "8 chiffres";
  return errors;
}

export function UsersManager({
  allowSuperAdmin = false,
}: {
  allowSuperAdmin?: boolean;
}) {
  const { session } = useAuth();
  const request = useApi();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, loading, reload } = useApiQuery<UserRow[]>("/users");
  const agenciesQuery = useApiQuery<Agency[]>("/agencies");
  const users = useMemo(() => data ?? [], [data]);
  const agencies = useMemo(() => agenciesQuery.data ?? [], [agenciesQuery.data]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("ALL");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [draftRole, setDraftRole] = useState<AppRole>("EXPEDITEUR");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const roles = allowSuperAdmin
    ? CREATABLE_ROLES
    : CREATABLE_ROLES.filter(
        (r) => r !== "SUPER_ADMIN" && r !== "CHEF_AGENCE",
      );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const approval = u.approvalStatus ?? "APPROVED";
      return (
        (roleFilter === "ALL" || u.role === roleFilter) &&
        (approvalFilter === "ALL" || approval === approvalFilter) &&
        (!q ||
          [u.name, u.email, u.phone, u.shopName, u.governorate, u.city]
            .join(" ")
            .toLowerCase()
            .includes(q))
      );
    });
  }, [users, roleFilter, approvalFilter, query]);

  const pendingCount = users.filter((u) => (u.approvalStatus ?? "APPROVED") === "PENDING").length;

  const { sorted: visible, sortKey, sortDir, toggleSort } = useTableSort<
    UserRow,
    UserSortKey
  >(filtered, USER_SORT, "name");

  function canEdit(user: UserRow) {
    if (user.role === "SUPER_ADMIN" && !allowSuperAdmin) return false;
    return true;
  }

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nextErrors = validateCreate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      const role = String(form.get("role")) as AppRole;
      const agencyRaw = String(form.get("agencyId") ?? "");
      const user = await request<UserRow>("/users", "POST", {
        name: String(form.get("name")).trim(),
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
        phone: String(form.get("phone") ?? "").trim() || undefined,
        role,
        agencyId: roleNeedsAgency(role)
          ? Number(agencyRaw) || undefined
          : null,
      });
      toast.success("Compte créé", `${user.name} · ${ROLE_LABEL[user.role]}`);
      setCreating(false);
      await reload();
    } catch (err) {
      toast.error("Création impossible", errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function onEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    const nextErrors = validateEdit(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const password = String(form.get("password") ?? "");
    const role = String(form.get("role")) as AppRole;
    const agencyRaw = String(form.get("agencyId") ?? "");
    const payload: Record<string, unknown> = {
      name: String(form.get("name")).trim(),
      email: String(form.get("email")).trim(),
      phone: String(form.get("phone") ?? "").trim() || undefined,
      role,
      agencyId: roleNeedsAgency(role)
        ? Number(agencyRaw) || undefined
        : null,
    };
    if (password) payload.password = password;

    setSaving(true);
    try {
      const user = await request<UserRow>(
        `/users/${editing.id}`,
        "PATCH",
        payload,
      );
      toast.success("Compte mis à jour", `${user.name} · ${ROLE_LABEL[user.role]}`);
      setEditing(null);
      await reload();
    } catch (err) {
      toast.error("Modification impossible", errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: UserRow) {
    if (user.isActive) {
      const ok = await confirm({
        title: `Désactiver ${user.name} ?`,
        description:
          "Ce compte ne pourra plus se connecter tant qu'il n'est pas réactivé.",
        confirmLabel: "Désactiver",
        tone: "danger",
      });
      if (!ok) return;
    }
    setBusyId(user.id);
    try {
      await request(`/users/${user.id}/active`, "PATCH", {
        isActive: !user.isActive,
      });
      toast.success(
        user.isActive ? "Compte désactivé" : "Compte réactivé",
        user.name,
      );
      await reload();
    } catch (err) {
      toast.error("Action impossible", errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  async function setApproval(user: UserRow, status: "APPROVED" | "REJECTED") {
    if (status === "REJECTED") {
      const ok = await confirm({
        title: `Refuser ${user.name} ?`,
        description: "Ce compte ne pourra plus se connecter.",
        confirmLabel: "Refuser",
        tone: "danger",
      });
      if (!ok) return;
    }
    setBusyId(user.id);
    try {
      await request(`/users/${user.id}/approval`, "PATCH", { status });
      toast.success(
        status === "APPROVED" ? "Compte approuvé" : "Compte refusé",
        user.name,
      );
      await reload();
    } catch (err) {
      toast.error("Vérification impossible", errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  const countFor = (role: AppRole) => users.filter((u) => u.role === role).length;
  const countApproval = (status: ApprovalStatus) =>
    users.filter((u) => (u.approvalStatus ?? "APPROVED") === status).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description={`${users.length} compte(s) · ${pendingCount} en attente · ${users.filter((u) => !u.isActive).length} désactivé(s)`}
        actions={
          <Button
            icon={UserPlus}
            onClick={() => {
              setErrors({});
              setDraftRole(roles.includes("EXPEDITEUR") ? "EXPEDITEUR" : roles[0]!);
              setCreating(true);
            }}
          >
            Nouvel utilisateur
          </Button>
        }
      />

      {error ? (
        <ErrorBanner message={error} onRetry={() => void reload()} />
      ) : null}

      <TableCard
        toolbar={
          <>
            <SegmentedTabs<ApprovalFilter>
              label="Filtrer par vérification"
              value={approvalFilter}
              onChange={setApprovalFilter}
              options={[
                { value: "ALL", label: "Tous", count: users.length },
                {
                  value: "PENDING",
                  label: "En attente",
                  count: countApproval("PENDING"),
                },
                {
                  value: "APPROVED",
                  label: "Approuvés",
                  count: countApproval("APPROVED"),
                },
                {
                  value: "REJECTED",
                  label: "Refusés",
                  count: countApproval("REJECTED"),
                },
              ]}
            />
            <SegmentedTabs<RoleFilter>
              label="Filtrer par rôle"
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: "ALL", label: "Tous", count: users.length },
                ...roles.map((r) => ({
                  value: r,
                  label: ROLE_LABEL[r],
                  count: countFor(r),
                })),
              ]}
            />
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Nom, email, téléphone…"
              className="w-full md:w-64"
            />
          </>
        }
      >
        {loading && users.length === 0 ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl bg-ops-ink/[0.06]"
              />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="Aucun utilisateur"
              description="Aucun compte ne correspond à ce filtre."
            />
          </div>
        ) : (
          <table className={tableClass}>
            <thead className={theadClass}>
              <tr>
                <SortableTh
                  label="Utilisateur"
                  column="name"
                  activeKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableTh
                  label="Téléphone"
                  column="phone"
                  activeKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="hidden md:table-cell"
                />
                <SortableTh
                  label="Rôle"
                  column="role"
                  activeKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableTh
                  label="Statut"
                  column="isActive"
                  activeKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => {
                const isSelf = u.id === session?.user.id;
                const editable = canEdit(u);
                const approval = (u.approvalStatus ?? "APPROVED") as ApprovalStatus;
                const summary = profileSummary(u);
                const canVerify =
                  editable &&
                  !isSelf &&
                  (u.role === "EXPEDITEUR" || u.role === "LIVREUR");
                return (
                  <tr key={u.id} className={trClass}>
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ops-ink">
                            {u.name}
                            {isSelf ? (
                              <span className="ml-1.5 text-xs font-normal text-ops-ink/50">
                                (vous)
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-ops-ink/50">
                            {u.email}
                          </p>
                          {summary ? (
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-ops-ink/45">
                              {summary}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td
                      className={`${tdClass} hidden text-ops-ink/50 md:table-cell`}
                    >
                      {u.phone || "—"}
                    </td>
                    <td className={tdClass}>
                      <Badge tone={ROLE_TONE[u.role]}>
                        {ROLE_LABEL[u.role]}
                      </Badge>
                      {u.agency ? (
                        <p className="mt-1 text-[11px] text-ops-ink/45">
                          {u.agency.name}
                        </p>
                      ) : null}
                      {u.homeZone ? (
                        <p className="mt-1 text-[11px] text-ops-ink/45">
                          {u.homeZone.name}
                        </p>
                      ) : null}
                    </td>
                    <td className={tdClass}>
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge tone={APPROVAL_TONE[approval]} dot>
                          {APPROVAL_LABEL[approval]}
                        </Badge>
                        <Badge tone={u.isActive ? "success" : "neutral"} dot>
                          {u.isActive ? "Actif" : "Désactivé"}
                        </Badge>
                      </div>
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        {canVerify && approval === "PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              icon={Check}
                              loading={busyId === u.id}
                              onClick={() => void setApproval(u, "APPROVED")}
                            >
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={X}
                              loading={busyId === u.id}
                              onClick={() => void setApproval(u, "REJECTED")}
                            >
                              Refuser
                            </Button>
                          </>
                        ) : null}
                        {canVerify && approval === "REJECTED" ? (
                          <Button
                            size="sm"
                            variant="success"
                            icon={Check}
                            loading={busyId === u.id}
                            onClick={() => void setApproval(u, "APPROVED")}
                          >
                            Approuver
                          </Button>
                        ) : null}
                        {editable ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Pencil}
                            onClick={() => {
                              setErrors({});
                              setDraftRole(u.role);
                              setEditing(u);
                            }}
                          >
                            Modifier
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant={u.isActive ? "secondary" : "success"}
                          disabled={isSelf || !editable}
                          loading={busyId === u.id}
                          title={
                            isSelf
                              ? "Vous ne pouvez pas désactiver votre propre compte"
                              : !editable
                                ? "Compte hors périmètre"
                                : undefined
                          }
                          onClick={() => void toggleActive(u)}
                        >
                          {u.isActive ? "Désactiver" : "Activer"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableCard>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nouvel utilisateur"
        description="Le compte peut se connecter immédiatement avec ces identifiants."
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Annuler
            </Button>
            <Button type="submit" form="user-create-form" loading={saving}>
              Créer le compte
            </Button>
          </div>
        }
      >
        <form
          id="user-create-form"
          onSubmit={onCreate}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
        >
          <TextField
            name="name"
            label="Nom complet"
            autoComplete="off"
            error={errors.name}
            wrapperClassName="sm:col-span-2"
          />
          <TextField
            name="email"
            type="email"
            label="Email"
            autoComplete="off"
            error={errors.email}
          />
          <TextField
            name="phone"
            label="Téléphone"
            inputMode="numeric"
            placeholder="8 chiffres"
            error={errors.phone}
          />
          <TextField
            name="password"
            type="password"
            label="Mot de passe"
            autoComplete="new-password"
            hint="8 caractères minimum"
            error={errors.password}
          />
          <SelectField
            name="role"
            label="Rôle"
            value={draftRole}
            onChange={(e) => setDraftRole(e.target.value as AppRole)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </SelectField>
          {roleNeedsAgency(draftRole) ? (
            <SelectField
              name="agencyId"
              label="Agence (gouvernorat)"
              required
              wrapperClassName="sm:col-span-2"
            >
              <option value="">Choisir une agence…</option>
              {agencies
                .filter((a) => a.isActive)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.governorate}
                  </option>
                ))}
            </SelectField>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Modifier le compte"
        description={
          editing
            ? `${editing.name} · ${ROLE_LABEL[editing.role]}`
            : undefined
        }
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button type="submit" form="user-edit-form" loading={saving}>
              Enregistrer
            </Button>
          </div>
        }
      >
        {editing ? (
          <form
            id="user-edit-form"
            key={editing.id}
            onSubmit={onEdit}
            noValidate
            className="grid gap-4 sm:grid-cols-2"
          >
            <TextField
              name="name"
              label="Nom complet"
              defaultValue={editing.name}
              autoComplete="off"
              error={errors.name}
              wrapperClassName="sm:col-span-2"
            />
            <TextField
              name="email"
              type="email"
              label="Email"
              defaultValue={editing.email}
              autoComplete="off"
              error={errors.email}
            />
            <TextField
              name="phone"
              label="Téléphone"
              inputMode="numeric"
              placeholder="8 chiffres"
              defaultValue={editing.phone ?? ""}
              error={errors.phone}
            />
            <SelectField
              name="role"
              label="Rôle"
              defaultValue={editing.role}
              disabled={editing.id === session?.user.id}
              onChange={(e) => setDraftRole(e.target.value as AppRole)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </SelectField>
            {roleNeedsAgency(draftRole) || roleNeedsAgency(editing.role) ? (
              <SelectField
                name="agencyId"
                label="Agence (gouvernorat)"
                defaultValue={
                  editing.agencyId != null ? String(editing.agencyId) : ""
                }
                required={roleNeedsAgency(draftRole)}
                wrapperClassName="sm:col-span-2"
              >
                <option value="">Choisir une agence…</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.governorate}
                  </option>
                ))}
              </SelectField>
            ) : null}
            <TextField
              name="password"
              type="password"
              label="Nouveau mot de passe"
              autoComplete="new-password"
              hint="Laisser vide pour ne pas changer"
              error={errors.password}
              wrapperClassName="sm:col-span-2"
            />
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
