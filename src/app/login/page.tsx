"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button, ErrorBanner, TextField } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTenant } from "@/tenants/context";
import { TENANTS } from "@/tenants/registry";
import { roleHomeUrl, tenantHomeUrl } from "@/tenants/resolve";
import type { TenantId } from "@/tenants/types";
import { useT } from "@/i18n/locale-context";

const DEMO_ACCOUNTS = [
  { email: "super@umbrella.tn", password: "Super@12345", labelKey: "roles.SUPER_ADMIN", tenant: "super-admin" },
  { email: "admin@umbrella.tn", password: "Admin@12345", labelKey: "roles.ADMIN", tenant: "admin" },
  { email: "expert@umbrella.tn", password: "Expert@12345", labelKey: "roles.EXPERT_COMPTABLE", tenant: "expert" },
  { email: "chef@umbrella.tn", password: "Chef@12345", labelKey: "roles.CHEF_AGENCE", tenant: "chef" },
  { email: "finance@umbrella.tn", password: "Finance@12345", labelKey: "roles.FINANCE", tenant: "finance" },
  { email: "support@umbrella.tn", password: "Support@12345", labelKey: "roles.SUPPORT", tenant: "support" },
  { email: "pickup@umbrella.tn", password: "Pickup@12345", labelKey: "roles.PICKUP", tenant: "pickup" },
  { email: "magasinier@umbrella.tn", password: "Magasin@12345", labelKey: "roles.MAGASINIER", tenant: "magasinier" },
  { email: "expediteur@umbrella.tn", password: "Expediteur@12345", labelKey: "roles.EXPEDITEUR", tenant: "expediteur" },
  { email: "livreur@umbrella.tn", password: "Livreur@12345", labelKey: "roles.LIVREUR", tenant: "livreur" },
  { email: "client@umbrella.tn", password: "Client@12345", labelKey: "roles.CLIENT", tenant: "client" },
] as const;

function LoginForm() {
  const { signIn, isMock } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  const { tenant: cookieTenant } = useTenant();
  const tenantParam = searchParams.get("tenant");
  const boundTenant = useMemo(() => {
    if (tenantParam) {
      return TENANTS.find((x) => x.id === (tenantParam as TenantId)) ?? null;
    }
    return cookieTenant;
  }, [tenantParam, cookieTenant]);

  const demoAccounts = useMemo(() => {
    if (!boundTenant) return DEMO_ACCOUNTS;
    return DEMO_ACCOUNTS.filter((a) => a.tenant === boundTenant.id);
  }, [boundTenant]);

  function goHome(
    role: Parameters<typeof roleHomeUrl>[0],
    nextPath?: string | null,
  ) {
    const home = roleHomeUrl(role);
    if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
      router.replace(nextPath);
      return;
    }
    if (home.startsWith("http")) {
      window.location.assign(home);
      return;
    }
    router.replace(home);
  }

  async function loginWith(nextEmail: string, nextPassword: string) {
    setPicked(nextEmail);
    setEmail(nextEmail);
    setPassword(nextPassword);
    setLoading(true);
    setError(null);
    try {
      const session = await signIn(nextEmail, nextPassword);
      if (boundTenant && !boundTenant.roles.includes(session.user.role)) {
        setError(
          t("auth.wrongTenant", {
            label: t(`tenants.${boundTenant.id}.label`),
            url: tenantHomeUrl(boundTenant),
          }),
        );
        setLoading(false);
        return;
      }
      const next = searchParams.get("next");
      goHome(session.user.role, next);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ACCOUNT_PENDING") {
        router.replace("/compte-en-attente");
        return;
      }
      setError(err instanceof Error ? err.message : t("auth.loginFailed"));
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await loginWith(email, password);
  }

  const title = boundTenant
    ? t("auth.loginTenant", { label: t(`tenants.${boundTenant.id}.label`) })
    : t("auth.loginTitle");

  const subtitle = boundTenant
    ? `${t(`tenants.${boundTenant.id}.subtitle`)}${isMock ? t("auth.subtitleDemo") : ""}`
    : `${t("auth.subtitleDefault")}${isMock ? t("auth.subtitleDemo") : ""}`;

  return (
    <AuthLayout
      title={title}
      subtitle={subtitle}
      footer={
        <>
          {t("auth.footerInvite")}
          {boundTenant ? ` (${boundTenant.subdomain}.…)` : ""}.{" "}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            {t("auth.signupTitle")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label={t("auth.emailOrPhone")}
          type="text"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint={t("auth.hintClient")}
        />
        <TextField
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-ink-muted hover:text-brand"
          >
            {t("auth.forgot")}
          </Link>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
        <Button type="submit" icon={LogIn} loading={loading} className="w-full">
          {t("auth.submit")}
        </Button>
      </form>

      {isMock ? (
        <div className="mt-8 rounded-2xl border border-cream bg-cream-soft/30 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {t("auth.demoAccounts")}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={loading}
                onClick={() => void loginWith(acc.email, acc.password)}
                className={`rounded-xl border bg-surface px-3 py-2 text-left transition hover:border-brand disabled:opacity-60 ${
                  picked === acc.email
                    ? "border-brand ring-1 ring-brand/30"
                    : "border-cream"
                }`}
              >
                <span className="block text-sm font-semibold text-ink">
                  {t(acc.labelKey)}
                </span>
                <span className="block truncate text-[11px] text-ink-muted keep-ltr">
                  {acc.email}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-center text-sm text-ink-muted">…</p>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
