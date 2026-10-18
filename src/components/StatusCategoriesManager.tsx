"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Box,
  CircleCheck,
  Clock,
  Coins,
  Palette,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Trash2,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { errorText, useConfirm, useToast } from "@/components/Feedback";
import { Modal } from "@/components/Modal";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  Panel,
  SelectField,
  TextField,
} from "@/components/ui";
import { hexToRgba } from "@/lib/status-categories";
import {
  CREATABLE_CATEGORY_KEYS,
  STATUS_CATEGORY_ICON_LABELS,
  STATUS_CATEGORY_ICONS,
  TOTAL_CATEGORY_KEY,
  type StatusCategory,
  type StatusCategoryIcon,
} from "@/lib/status-categories";
import { useApi, useApiQuery } from "@/lib/use-api";

const ICON_MAP: Record<StatusCategoryIcon, LucideIcon> = {
  package: Box,
  clock: Clock,
  truck: Truck,
  check: CircleCheck,
  return: RefreshCw,
  coins: Coins,
  alert: Clock,
};

type Draft = {
  id: number | null;
  key: string;
  label: string;
  color: string;
  icon: StatusCategoryIcon;
  sortOrder: number;
};

const EMPTY_DRAFT: Draft = {
  id: null,
  key: "EN_ATTENTE",
  label: "En attente",
  color: "#00875A",
  icon: "clock",
  sortOrder: 0,
};

export function StatusCategoriesManager() {
  const request = useApi();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, loading, reload } =
    useApiQuery<StatusCategory[]>("/status-categories");
  const categories = useMemo(() => data ?? [], [data]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const usedKeys = useMemo(
    () => new Set(categories.map((c) => c.key)),
    [categories],
  );

  const availableKeys = useMemo(() => {
    if (draft?.id) {
      return CREATABLE_CATEGORY_KEYS.filter(
        (item) => item.key === draft.key || !usedKeys.has(item.key),
      );
    }
    return CREATABLE_CATEGORY_KEYS.filter((item) => !usedKeys.has(item.key));
  }, [draft?.id, draft?.key, usedKeys]);

  function openCreate() {
    const first = availableKeys[0];
    setDraft({
      ...EMPTY_DRAFT,
      key: first?.key ?? "EN_ATTENTE",
      label: first?.label ?? "Nouvelle catégorie",
      sortOrder: categories.length,
    });
  }

  function openEdit(category: StatusCategory) {
    setDraft({
      id: category.id,
      key: category.key,
      label: category.label,
      color: category.color,
      icon: category.icon,
      sortOrder: category.sortOrder,
    });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const body = {
      key: draft.key,
      label: draft.label.trim(),
      color: draft.color.toUpperCase(),
      icon: draft.icon,
      sortOrder: draft.sortOrder,
    };
    setSaving(true);
    try {
      if (draft.id) {
        await request(`/status-categories/${draft.id}`, "PATCH", body);
      } else {
        await request("/status-categories", "POST", body);
      }
      toast.success(
        draft.id ? "Catégorie mise à jour" : "Catégorie créée",
        body.label,
      );
      setDraft(null);
      await reload();
    } catch (err) {
      toast.error("Enregistrement impossible", errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: StatusCategory) {
    setBusyId(category.id);
    try {
      await request(`/status-categories/${category.id}`, "PATCH", {
        isActive: !category.isActive,
      });
      toast.success(
        category.isActive ? "Catégorie masquée" : "Catégorie affichée",
        category.label,
      );
      await reload();
    } catch (err) {
      toast.error("Action impossible", errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(category: StatusCategory) {
    const ok = await confirm({
      title: `Supprimer « ${category.label} » ?`,
      description:
        "La carte disparaîtra du tableau de bord. Les colis ne sont pas affectés.",
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(category.id);
    try {
      await request(`/status-categories/${category.id}`, "DELETE");
      toast.success("Catégorie supprimée", category.label);
      await reload();
    } catch (err) {
      toast.error("Suppression impossible", errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catégories KPI"
        description="Couleurs et icônes des cartes statut du tableau de bord (super admin uniquement)."
        actions={
          <Button
            icon={Plus}
            onClick={openCreate}
            disabled={availableKeys.length === 0}
          >
            Nouvelle catégorie
          </Button>
        }
      />

      {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}
      {loading && categories.length === 0 ? <LoadingBlock rows={3} /> : null}

      {!loading && categories.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="Aucune catégorie"
          description="Ajoutez des catégories pour personnaliser les cartes KPI."
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const Icon = ICON_MAP[category.icon] ?? Box;
          return (
            <Panel
              key={category.id}
              className={category.isActive ? "min-w-0" : "min-w-0 opacity-70"}
            >
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-display text-lg font-bold text-ops-ink">
                      {category.label}
                    </h2>
                    <p className="truncate text-xs text-ops-ink/45">
                      {category.key}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>
                    <span
                      className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.color}
                  </Badge>
                  <Badge>
                    {STATUS_CATEGORY_ICON_LABELS[category.icon]}
                  </Badge>
                  {!category.isActive ? (
                    <Badge tone="warning">Masquée</Badge>
                  ) : null}
                </div>
                <div className="flex w-full flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Pencil}
                    aria-label="Modifier"
                    onClick={() => openEdit(category)}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Power}
                    aria-label="Activer ou masquer"
                    disabled={busyId === category.id}
                    onClick={() => void toggleActive(category)}
                  >
                    {category.isActive ? "Masquer" : "Afficher"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    aria-label="Supprimer"
                    disabled={busyId === category.id}
                    onClick={() => void remove(category)}
                  >
                    Suppr.
                  </Button>
                </div>
              </div>
              <div
                className="relative mt-4 overflow-hidden rounded-2xl border bg-ops-surface px-3 py-3"
                style={{
                  borderColor: hexToRgba(category.color, 0.45),
                  boxShadow: `0 0 18px ${hexToRgba(category.color, 0.18)}`,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ backgroundColor: hexToRgba(category.color, 0.12) }}
                />
                <Icon
                  className="pointer-events-none absolute -bottom-2 -right-1 h-14 w-14 opacity-[0.12]"
                  style={{ color: category.color }}
                  strokeWidth={1.15}
                />
                <div className="relative flex items-center gap-3">
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ops-ink">
                      {category.label}
                    </p>
                    <p className="font-display text-xl font-extrabold text-ops-ink">
                      —
                    </p>
                  </div>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Modifier la catégorie" : "Nouvelle catégorie"}
      >
        {draft ? (
          <form className="space-y-4" onSubmit={(e) => void onSave(e)}>
            <SelectField
              label="Statut"
              value={draft.key}
              disabled={Boolean(draft.id)}
              onChange={(e) => {
                const key = e.target.value;
                const meta = CREATABLE_CATEGORY_KEYS.find((k) => k.key === key);
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        key,
                        label:
                          prev.label.trim() === "" ||
                          prev.label ===
                            CREATABLE_CATEGORY_KEYS.find(
                              (k) => k.key === prev.key,
                            )?.label
                            ? (meta?.label ?? prev.label)
                            : prev.label,
                      }
                    : prev,
                );
              }}
            >
              {availableKeys.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label} ({item.key})
                </option>
              ))}
            </SelectField>

            <TextField
              label="Libellé"
              value={draft.label}
              onChange={(e) =>
                setDraft((prev) =>
                  prev ? { ...prev, label: e.target.value } : prev,
                )
              }
              required
              minLength={2}
            />

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <TextField
                label="Couleur"
                value={draft.color}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, color: e.target.value } : prev,
                  )
                }
                pattern="^#[0-9A-Fa-f]{6}$"
                required
              />
              <label className="flex flex-col gap-1.5 text-sm font-medium text-ops-ink">
                Aperçu
                <input
                  type="color"
                  value={draft.color}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev
                        ? { ...prev, color: e.target.value.toUpperCase() }
                        : prev,
                    )
                  }
                  className="h-11 w-full cursor-pointer rounded-xl border border-ops-ink/15 bg-transparent p-1 sm:w-16"
                />
              </label>
            </div>

            <SelectField
              label="Icône"
              value={draft.icon}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        icon: e.target.value as StatusCategoryIcon,
                      }
                    : prev,
                )
              }
            >
              {STATUS_CATEGORY_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {STATUS_CATEGORY_ICON_LABELS[icon]}
                </option>
              ))}
            </SelectField>

            <TextField
              label="Ordre"
              type="number"
              min={0}
              value={String(draft.sortOrder)}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        sortOrder: Number(e.target.value) || 0,
                      }
                    : prev,
                )
              }
            />

            {draft.key === TOTAL_CATEGORY_KEY ? (
              <p className="text-xs text-ops-ink/50">
                La carte Total agrège le volume global (hors filtre statut).
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDraft(null)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
