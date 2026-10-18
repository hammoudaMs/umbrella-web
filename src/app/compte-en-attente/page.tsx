"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock3, IdCard } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { SignupKycStep } from "@/components/SignupKycStep";
import { Button } from "@/components/ui";
import { KYC_TOKEN_STORAGE_KEY } from "@/lib/auth-context";
import { useT } from "@/i18n/locale-context";

export default function CompteEnAttentePage() {
  const t = useT();
  const [kycToken, setKycToken] = useState<string | null>(null);
  const [showKyc, setShowKyc] = useState(false);

  useEffect(() => {
    try {
      const token = sessionStorage.getItem(KYC_TOKEN_STORAGE_KEY);
      if (token) setKycToken(token);
    } catch {
      /* ignore */
    }
  }, []);

  if (showKyc && kycToken) {
    return (
      <AuthLayout
        title="Vérification d’identité"
        subtitle="Complétez CIN + selfie pour accélérer la validation"
        footer={
          <>
            {t("auth.alreadyValidated")}{" "}
            <Link
              href="/login"
              className="font-semibold text-brand hover:underline"
            >
              {t("auth.submit")}
            </Link>
          </>
        }
      >
        <SignupKycStep
          kycToken={kycToken}
          onDone={() => {
            try {
              sessionStorage.removeItem(KYC_TOKEN_STORAGE_KEY);
            } catch {
              /* ignore */
            }
            setKycToken(null);
            setShowKyc(false);
          }}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t("auth.pendingAccountTitle")}
      subtitle={t("auth.pendingAccountSubtitle")}
      footer={
        <>
          {t("auth.alreadyValidated")}{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            {t("auth.submit")}
          </Link>
        </>
      }
    >
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Clock3 className="h-7 w-7" aria-hidden />
        </div>
        <p className="text-sm leading-relaxed text-ink-muted">
          {t("auth.pendingAccountBody")}
        </p>
        {kycToken ? (
          <Button
            type="button"
            className="w-full"
            icon={IdCard}
            onClick={() => setShowKyc(true)}
          >
            Compléter la vérification (CIN)
          </Button>
        ) : null}
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center rounded-xl border border-ops-card bg-ops-surface px-4 py-2.5 text-sm font-semibold text-ops-ink transition hover:border-brand/40"
        >
          {t("auth.backToLogin")}
        </Link>
      </div>
    </AuthLayout>
  );
}
