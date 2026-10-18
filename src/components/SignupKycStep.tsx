"use client";

import { useState } from "react";
import { IdCard, ShieldCheck } from "lucide-react";
import { DocumentUploadField } from "@/components/DocumentUploadField";
import { errorText, useToast } from "@/components/Feedback";
import { Button, ErrorBanner } from "@/components/ui";
import { apiFetch } from "@/lib/api";

type Props = {
  kycToken: string;
  userName?: string;
  onDone: () => void;
};

export function SignupKycStep({ kycToken, userName, onDone }: Props) {
  const toast = useToast();
  const [cinFrontUrl, setCinFrontUrl] = useState<string | null>(null);
  const [cinBackUrl, setCinBackUrl] = useState<string | null>(null);
  const [selfieWithCinUrl, setSelfieWithCinUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!cinFrontUrl || !cinBackUrl || !selfieWithCinUrl) {
      setError("Ajoutez le CIN recto, le CIN verso et le selfie avec la pièce.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/auth/kyc", {
        method: "POST",
        token: kycToken,
        body: JSON.stringify({
          cinFrontUrl,
          cinBackUrl,
          selfieWithCinUrl,
        }),
      });
      toast.success("Vérification envoyée", "Notre équipe va valider votre compte.");
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-brand/20 bg-brand/[0.06] px-4 py-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <div>
            <p className="text-sm font-semibold text-ops-ink">
              Vérification d’identité
              {userName ? ` · ${userName}` : ""}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ops-ink/55">
              Après vos informations, envoyez votre CIN (recto + verso) et un
              selfie tenant la pièce (ou un document officiel équivalent).
            </p>
          </div>
        </div>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <DocumentUploadField
        label="CIN — recto"
        kind="cin-front"
        value={cinFrontUrl}
        onChange={setCinFrontUrl}
        token={kycToken}
        uploadPath="/auth/kyc/upload"
        required
        capture
        hint="Photo nette de la face avant de la carte d’identité."
      />
      <DocumentUploadField
        label="CIN — verso"
        kind="cin-back"
        value={cinBackUrl}
        onChange={setCinBackUrl}
        token={kycToken}
        uploadPath="/auth/kyc/upload"
        required
        capture
        hint="Photo nette de la face arrière."
      />
      <DocumentUploadField
        label="Selfie avec CIN / document"
        kind="selfie-cin"
        value={selfieWithCinUrl}
        onChange={setSelfieWithCinUrl}
        token={kycToken}
        uploadPath="/auth/kyc/upload"
        required
        capture
        hint="Votre visage + la pièce tenue à côté (ou document officiel)."
      />

      <Button
        type="button"
        className="w-full"
        icon={IdCard}
        loading={busy}
        onClick={() => void onSubmit()}
      >
        Envoyer pour vérification
      </Button>
    </div>
  );
}
