"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { useT } from "@/i18n/locale-context";

export default function CompteEnAttentePage() {
  const t = useT();

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
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          {t("auth.backToLogin")}
        </Link>
      </div>
    </AuthLayout>
  );
}
