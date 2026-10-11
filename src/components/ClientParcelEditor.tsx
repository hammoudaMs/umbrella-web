"use client";

import { FormEvent, useState } from "react";
import { Save } from "lucide-react";
import { errorText, useToast } from "@/components/Feedback";
import { Button, Panel, TextField, TextAreaField } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { Parcel } from "@/lib/domain";

const CLIENT_EDITABLE = ["EN_ATTENTE", "A_ENLEVER", "NON_SERIEUX"];

export function ClientParcelEditor({
  parcel,
  onSaved,
}: {
  parcel: Parcel;
  onSaved: () => void | Promise<void>;
}) {
  const request = useApi();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  if (!CLIENT_EDITABLE.includes(parcel.status)) {
    return (
      <Panel>
        <p className="text-sm text-ops-ink/55">
          Vos coordonnées de livraison ne sont plus modifiables (colis déjà
          enlevé ou plus avancé). Contactez le support pour une correction.
        </p>
      </Panel>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const recipientName = String(form.get("recipientName") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const phone2 = String(form.get("phone2") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const governorate = String(form.get("governorate") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();
    if (recipientName.length < 2 || !/^[0-9]{8}$/.test(phone) || address.length < 3) {
      toast.error("Vérifiez nom, téléphone (8 chiffres) et adresse");
      return;
    }
    setSaving(true);
    try {
      await request(`/parcels/${parcel.id}`, "PATCH", {
        recipientName,
        phone,
        phone2: phone2 || undefined,
        address,
        city,
        governorate,
        notes: notes || undefined,
      });
      toast.success("Coordonnées mises à jour");
      await onSaved();
    } catch (err) {
      toast.error("Enregistrement impossible", errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <h2 className="font-display text-lg font-bold text-ops-ink">
        Modifier mes infos de livraison
      </h2>
      <p className="mt-1 text-sm text-ops-ink/50">
        Avant enlèvement, vous pouvez corriger le destinataire et l’adresse.
      </p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <TextField
          name="recipientName"
          label="Destinataire"
          defaultValue={parcel.recipientName}
          required
          minLength={2}
        />
        <TextField
          name="phone"
          label="Téléphone"
          defaultValue={parcel.phone}
          required
          inputMode="numeric"
          pattern="[0-9]{8}"
        />
        <TextField
          name="phone2"
          label="Téléphone 2"
          defaultValue={parcel.phone2 ?? ""}
          inputMode="numeric"
        />
        <TextField
          name="governorate"
          label="Gouvernorat"
          defaultValue={parcel.governorate}
          required
        />
        <TextField
          name="city"
          label="Ville"
          defaultValue={parcel.city}
          required
        />
        <div className="sm:col-span-2">
          <TextAreaField
            name="address"
            label="Adresse"
            defaultValue={parcel.address}
            required
            rows={2}
          />
        </div>
        <div className="sm:col-span-2">
          <TextAreaField
            name="notes"
            label="Notes"
            defaultValue={parcel.notes ?? ""}
            rows={2}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" icon={Save} loading={saving}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Panel>
  );
}
