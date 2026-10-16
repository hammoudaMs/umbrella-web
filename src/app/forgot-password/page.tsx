"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { MailCheck, Send } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { errorText, useToast } from "@/components/Feedback";
import { Button, TextField, buttonClass } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { useT } from "@/i18n/locale-context";

type ForgotResponse = {
  ok: boolean;
  message?: string;
  resetToken?: string;
};

export default function ForgotPasswordPage() {
  const toast = useToast();
  const t = useT();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setBusy(true);
    try {
      const res = await apiFetch<ForgotResponse>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSentTo(email);
      setDevToken(res.resetToken ?? null);
    } catch (err) {
      toast.error(t("auth.forgotSendFailed"), errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={t("auth.forgotPasswordTitle")}
      subtitle={t("auth.forgotPasswordSubtitle")}
      footer={
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t("auth.backToLogin")}
        </Link>
      }
    >
      {sentTo ? (
        <div className="rounded-2xl border border-cream bg-surface p-6 text-center shadow-soft">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <MailCheck className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-4 font-display text-lg font-bold text-ink">
            {t("auth.forgotRequestRecorded")}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {t("auth.forgotRequestBody", { email: sentTo })}
          </p>
          {devToken ? (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs text-ink">
              <p className="font-semibold">{t("auth.forgotDevTokenHint")}</p>
              <Link
                href={`/reset-password?token=${encodeURIComponent(devToken)}`}
                className="mt-2 inline-block break-all font-semibold text-brand hover:underline"
              >
                {t("auth.resetPasswordTitle")}
              </Link>
            </div>
          ) : null}
          <Link href="/contact" className={`${buttonClass("secondary")} mt-5`}>
            {t("auth.contactSupport")}
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <TextField
            name="email"
            type="email"
            label={t("common.email")}
            autoComplete="email"
            required
          />
          <Button type="submit" icon={Send} className="w-full" loading={busy}>
            {t("auth.sendResetLink")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
