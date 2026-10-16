"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { errorText, useToast } from "@/components/Feedback";
import { Button, ErrorBanner, TextField } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { useT } from "@/i18n/locale-context";

function ResetPasswordForm() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromUrl = params.get("token") ?? "";
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: token.trim(), password }),
      });
      toast.success(t("auth.resetSuccess"));
      router.replace("/login");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      {error ? <ErrorBanner message={error} /> : null}
      {!tokenFromUrl ? (
        <TextField
          label={t("auth.resetToken")}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
      ) : null}
      <TextField
        label={t("auth.password")}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        required
      />
      <TextField
        label={t("auth.confirmPassword")}
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        required
      />
      <Button type="submit" icon={KeyRound} className="w-full" loading={busy}>
        {t("auth.resetSubmit")}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const t = useT();
  return (
    <AuthLayout
      title={t("auth.resetPasswordTitle")}
      subtitle={t("auth.resetPasswordSubtitle")}
      footer={
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t("auth.backToLogin")}
        </Link>
      }
    >
      <Suspense fallback={<p className="text-sm text-ink-muted">{t("common.loading")}</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
