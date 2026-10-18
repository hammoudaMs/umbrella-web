"use client";

import { useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { errorText, useConfirm, useToast } from "@/components/Feedback";
import { Button, Panel } from "@/components/ui";
import type { Parcel } from "@/lib/domain";
import { canPassReturnVerification } from "@/lib/parcel-transitions";
import type { AppRole } from "@/lib/roles";
import { useApi } from "@/lib/use-api";

type Props = {
  parcel: Parcel;
  role: AppRole | undefined;
  onDone: () => void | Promise<void>;
  compact?: boolean;
};

export function ReturnVerificationActions({
  parcel,
  role,
  onDone,
  compact = false,
}: Props) {
  const request = useApi();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [motif, setMotif] = useState(parcel.statusReason ?? "");

  if (!canPassReturnVerification(parcel.status, role)) return null;

  const isSupport = role === "SUPPORT";
  const isSender = role === "EXPEDITEUR";

  async function passVerification() {
    if (isSupport && !motif.trim()) {
      toast.error(
        "Motif requis",
        "Indiquez pourquoi la commande a été annulée / le retour vérifié.",
      );
      return;
    }

    const ok = await confirm({
      title: isSender
        ? "Passer la vérification ?"
        : "Vérifier ce retour ?",
      description: isSender
        ? "Le colis passera en « Retour reçu ». Vous pouvez laisser le support le faire à votre place."
        : "Le motif d’annulation sera visible pour l’expéditeur dans les filtres.",
      confirmLabel: isSender ? "Passer la vérification" : "Valider le retour",
    });
    if (!ok) return;

    setBusy(true);
    try {
      await request(`/parcels/${parcel.id}/status`, "PATCH", {
        status: "RETOUR_RECU",
        ...(isSupport ? { comment: motif.trim() } : {}),
      });
      toast.success(
        isSender ? "Vérification passée" : "Retour vérifié",
        parcel.code ?? `#${parcel.id}`,
      );
      await onDone();
    } catch (err) {
      toast.error("Vérification impossible", errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    if (!isSender) return null;
    return (
      <Button
        type="button"
        size="sm"
        icon={CheckCircle2}
        loading={busy}
        onClick={() => void passVerification()}
      >
        Passer vérif.
      </Button>
    );
  }

  return (
    <Panel className="space-y-3 border-ops-accent/25 bg-ops-accent/[0.04]">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-ops-accent" />
        <div>
          <h3 className="text-sm font-bold text-ops-ink">
            {isSender
              ? "Vérification du retour"
              : "Vérification support"}
          </h3>
          <p className="mt-1 text-xs text-ops-ink/55">
            {isSender
              ? "Après enlèvement / retour : passez la vérification, ou laissez le support le faire avec un motif."
              : "Indiquez pourquoi la commande a été annulée — l’expéditeur verra ce motif dans ses filtres."}
          </p>
        </div>
      </div>

      {parcel.statusReason ? (
        <p className="rounded-xl border border-ops-card bg-ops-page/60 px-3 py-2 text-xs text-ops-ink">
          <span className="font-semibold text-ops-ink/45">Motif actuel · </span>
          {parcel.statusReason}
        </p>
      ) : null}

      {isSupport ? (
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ops-ink/45">
            Pourquoi annulé / vérifié ?
          </span>
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-ops-card bg-ops-surface px-3 py-2 text-sm text-ops-ink outline-none focus:border-ops-accent/40"
            placeholder="Ex. Client refuse — taille incorrecte"
          />
        </label>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          icon={CheckCircle2}
          loading={busy}
          onClick={() => void passVerification()}
        >
          {isSender ? "Passer la vérification" : "Vérifier le retour"}
        </Button>
        {isSender ? (
          <p className="self-center text-[11px] text-ops-ink/40">
            Ou laissez le support le faire
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
