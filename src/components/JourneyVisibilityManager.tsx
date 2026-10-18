"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Route, Save } from "lucide-react";
import { errorText, useToast } from "@/components/Feedback";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  Panel,
} from "@/components/ui";
import {
  JOURNEY_LIVRAISON_KEYS,
  JOURNEY_RETOUR_KEYS,
  JOURNEY_VISIBILITY_ROLES,
  isJourneyStepKey,
  type StatusCategory,
} from "@/lib/status-categories";
import { ROLE_LABEL, type AppRole } from "@/lib/roles";
import { STATUS_META } from "@/lib/status-meta";
import { useApi, useApiQuery } from "@/lib/use-api";
import { cn } from "@/lib/cn";

type JourneyDraft = {
  id: number;
  key: string;
  label: string;
  showInJourney: boolean;
  visibleRoles: string[];
};

function stepLabel(key: string, fallback?: string): string {
  return STATUS_META[key as keyof typeof STATUS_META]?.label ?? fallback ?? key;
}

function sameRoles(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((role, i) => role === right[i]);
}

function buildDrafts(categories: StatusCategory[]): JourneyDraft[] {
  const byKey = new Map(categories.map((c) => [c.key, c]));
  const order = [...JOURNEY_LIVRAISON_KEYS, ...JOURNEY_RETOUR_KEYS];
  return order
    .map((key) => {
      const row = byKey.get(key);
      if (!row) return null;
      return {
        id: row.id,
        key: row.key,
        label: row.label || stepLabel(key),
        showInJourney: row.showInJourney !== false,
        visibleRoles: [...(row.visibleRoles ?? [])],
      } satisfies JourneyDraft;
    })
    .filter((row): row is JourneyDraft => row != null);
}

function draftsEqual(a: JourneyDraft[], b: JourneyDraft[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, i) => {
    const other = b[i];
    if (!other) return false;
    return (
      row.id === other.id &&
      row.showInJourney === other.showInJourney &&
      sameRoles(row.visibleRoles, other.visibleRoles)
    );
  });
}

export function JourneyVisibilityManager() {
  const request = useApi();
  const toast = useToast();
  const { data, error, loading, reload } =
    useApiQuery<StatusCategory[]>("/status-categories");
  const categories = useMemo(() => data ?? [], [data]);
  const baseline = useMemo(() => buildDrafts(categories), [categories]);
  const [drafts, setDrafts] = useState<JourneyDraft[] | null>(null);
  const [saving, setSaving] = useState(false);

  const rows = drafts ?? baseline;
  const dirty = drafts != null && !draftsEqual(drafts, baseline);

  function patchRow(key: string, patch: Partial<JourneyDraft>) {
    setDrafts((prev) => {
      const source =
        prev ??
        baseline.map((row) => ({
          ...row,
          visibleRoles: [...row.visibleRoles],
        }));
      return source.map((row) =>
        row.key === key ? { ...row, ...patch } : row,
      );
    });
  }

  function onRoleClick(key: string, role: AppRole) {
    setDrafts((prev) => {
      const source =
        prev ??
        baseline.map((row) => ({
          ...row,
          visibleRoles: [...row.visibleRoles],
        }));
      return source.map((row) => {
        if (row.key !== key) return row;
        if (row.visibleRoles.length === 0) {
          return { ...row, visibleRoles: [role] };
        }
        const has = row.visibleRoles.includes(role);
        const next = has
          ? row.visibleRoles.filter((r) => r !== role)
          : [...row.visibleRoles, role];
        return { ...row, visibleRoles: next };
      });
    });
  }

  async function onSave() {
    if (!drafts?.length) return;
    setSaving(true);
    try {
      const changed = drafts.filter((row) => {
        const base = baseline.find((b) => b.id === row.id);
        if (!base) return true;
        return (
          base.showInJourney !== row.showInJourney ||
          !sameRoles(base.visibleRoles, row.visibleRoles)
        );
      });
      await Promise.all(
        changed.map((row) =>
          request(`/status-categories/${row.id}`, "PATCH", {
            showInJourney: row.showInJourney,
            visibleRoles: row.visibleRoles,
          }),
        ),
      );
      toast.success(
        "Parcours mis à jour",
        `${changed.length} étape${changed.length > 1 ? "s" : ""} enregistrée${changed.length > 1 ? "s" : ""}`,
      );
      setDrafts(null);
      await reload();
    } catch (err) {
      toast.error("Enregistrement impossible", errorText(err));
    } finally {
      setSaving(false);
    }
  }

  const livraison = rows.filter((r) =>
    (JOURNEY_LIVRAISON_KEYS as readonly string[]).includes(r.key),
  );
  const retour = rows.filter((r) =>
    (JOURNEY_RETOUR_KEYS as readonly string[]).includes(r.key),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parcours livraison"
        description="Choisissez les étapes visibles sur le détail colis, et pour quels rôles. Liste vide = visible pour tous."
        actions={
          <Button
            icon={Save}
            disabled={!dirty || saving}
            onClick={() => void onSave()}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        }
      />

      {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}
      {loading && rows.length === 0 ? <LoadingBlock rows={3} /> : null}

      {!loading && rows.length === 0 ? (
        <EmptyState
          icon={Route}
          title="Aucune étape de parcours"
          description="Les statuts de parcours seront créés automatiquement au prochain chargement API."
        />
      ) : null}

      {livraison.length > 0 ? (
        <JourneySection
          title="Livraison"
          rows={livraison}
          onToggleVisible={(key, show) =>
            patchRow(key, { showInJourney: show })
          }
          onRoleClick={onRoleClick}
          onAllRoles={(key) => patchRow(key, { visibleRoles: [] })}
        />
      ) : null}

      {retour.length > 0 ? (
        <JourneySection
          title="Retour"
          rows={retour}
          onToggleVisible={(key, show) =>
            patchRow(key, { showInJourney: show })
          }
          onRoleClick={onRoleClick}
          onAllRoles={(key) => patchRow(key, { visibleRoles: [] })}
        />
      ) : null}

      {dirty ? (
        <p className="text-xs text-ops-ink/45">
          Modifications non enregistrées — cliquez sur Enregistrer.
        </p>
      ) : null}
    </div>
  );
}

function JourneySection({
  title,
  rows,
  onToggleVisible,
  onRoleClick,
  onAllRoles,
}: {
  title: string;
  rows: JourneyDraft[];
  onToggleVisible: (key: string, show: boolean) => void;
  onRoleClick: (key: string, role: AppRole) => void;
  onAllRoles: (key: string) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-bold text-ops-ink">{title}</h2>
      <ol className="space-y-3">
        {rows.map((row, index) => {
          const allRoles = row.visibleRoles.length === 0;
          return (
            <Panel key={row.key} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      row.showInJourney
                        ? "bg-ops-accent text-white"
                        : "bg-ops-card text-ops-ink/40",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-ops-ink">
                      {isJourneyStepKey(row.key)
                        ? stepLabel(row.key, row.label)
                        : row.label}
                    </p>
                    <p className="truncate text-xs text-ops-ink/45">{row.key}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {row.showInJourney ? (
                    <Badge tone="success">Visible</Badge>
                  ) : (
                    <Badge tone="warning">Masquée</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={row.showInJourney ? EyeOff : Eye}
                    onClick={() =>
                      onToggleVisible(row.key, !row.showInJourney)
                    }
                  >
                    {row.showInJourney ? "Masquer" : "Afficher"}
                  </Button>
                </div>
              </div>

              {row.showInJourney ? (
                <div className="space-y-2 border-t border-ops-card pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ops-ink/45">
                      Visible pour
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAllRoles(row.key)}
                      disabled={allRoles}
                    >
                      Tous les rôles
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {JOURNEY_VISIBILITY_ROLES.map((role) => {
                      const active =
                        allRoles || row.visibleRoles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => onRoleClick(row.key, role)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                            active
                              ? "border-ops-accent/40 bg-ops-accent/10 text-ops-ink"
                              : "border-ops-card bg-transparent text-ops-ink/40",
                          )}
                        >
                          {ROLE_LABEL[role]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-ops-ink/40">
                    {allRoles
                      ? "Tous les rôles voient cette étape."
                      : `${row.visibleRoles.length} rôle${row.visibleRoles.length > 1 ? "s" : ""} sélectionné${row.visibleRoles.length > 1 ? "s" : ""}.`}
                  </p>
                </div>
              ) : null}
            </Panel>
          );
        })}
      </ol>
    </section>
  );
}
