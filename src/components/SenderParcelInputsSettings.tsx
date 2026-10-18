"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { errorText, useToast } from "@/components/Feedback";
import { Button, Panel, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import {
  MAX_DEFS,
  MAX_LABEL,
  newInputDefId,
  normalizeInputDefs,
  type ParcelInputDef,
} from "@/lib/parcel-input-defs";

export function SenderParcelInputsSettings() {
  const { session, updateProfile } = useAuth();
  const toast = useToast();
  const [defs, setDefs] = useState<ParcelInputDef[]>(() =>
    normalizeInputDefs(session?.user.parcelInputDefs),
  );

  useEffect(() => {
    setDefs(normalizeInputDefs(session?.user.parcelInputDefs));
  }, [session?.user.parcelInputDefs]);
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!session || session.user.role !== "EXPEDITEUR") return null;

  function resetForm() {
    setLabel("");
    setRequired(false);
    setEditingId(null);
  }

  async function persist(next: ParcelInputDef[]) {
    setSaving(true);
    try {
      await updateProfile({ parcelInputDefs: next });
      setDefs(next);
      toast.success("Champs enregistrés");
      resetForm();
    } catch (err) {
      toast.error("Enregistrement impossible", errorText(err));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(def: ParcelInputDef) {
    setEditingId(def.id);
    setLabel(def.label);
    setRequired(def.required);
  }

  async function onSaveField() {
    const trimmed = label.trim();
    if (trimmed.length < 2) {
      toast.error("Libellé trop court");
      return;
    }
    if (trimmed.length > MAX_LABEL) {
      toast.error(`Libellé max ${MAX_LABEL} caractères`);
      return;
    }
    if (editingId) {
      const next = defs.map((d) =>
        d.id === editingId ? { ...d, label: trimmed, required } : d,
      );
      await persist(next);
      return;
    }
    if (defs.length >= MAX_DEFS) {
      toast.error(`Maximum ${MAX_DEFS} champs`);
      return;
    }
    const next = [
      ...defs,
      { id: newInputDefId(), label: trimmed, required },
    ];
    await persist(next);
  }

  async function onRemove(id: string) {
    await persist(defs.filter((d) => d.id !== id));
  }

  return (
    <Panel className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-ops-ink">
          Champs article (bordereau)
        </h2>
        <p className="mt-1 text-sm text-ops-ink/50">
          Ajoutez des champs optionnels (réf., marque, SKU…). Ils apparaissent à
          la création du colis et sur le bordereau.
        </p>
      </div>

      {defs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ops-card px-3 py-4 text-sm text-ops-ink/45">
          Aucun champ personnalisé pour l’instant.
        </p>
      ) : (
        <ul className="space-y-2">
          {defs.map((def) => (
            <li
              key={def.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ops-card bg-ops-page/50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ops-ink">
                  {def.label}
                </p>
                <p className="text-[11px] text-ops-ink/40">
                  {def.required ? "Obligatoire à la création" : "Optionnel"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  icon={Pencil}
                  onClick={() => startEdit(def)}
                >
                  Modifier
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  icon={Trash2}
                  disabled={saving}
                  onClick={() => void onRemove(def.id)}
                >
                  Suppr.
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-xl border border-ops-card bg-ops-page/40 p-3.5">
        <p className="text-sm font-semibold text-ops-ink">
          {editingId ? "Modifier le champ" : "Nouveau champ"}
        </p>
        <TextField
          label="Libellé"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex. Référence SKU"
          maxLength={MAX_LABEL}
        />
        <label className="flex items-center gap-2 text-sm text-ops-ink/70">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-4 w-4 accent-[#991211]"
          />
          Obligatoire à la création
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            icon={editingId ? Pencil : Plus}
            loading={saving}
            onClick={() => void onSaveField()}
          >
            {editingId ? "Enregistrer" : "Ajouter"}
          </Button>
          {editingId ? (
            <Button type="button" variant="secondary" onClick={resetForm}>
              Annuler
            </Button>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
