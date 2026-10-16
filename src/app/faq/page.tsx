"use client";

import { useMemo } from "react";
import { PageHeader, Panel } from "@/components/ui";
import { useT } from "@/i18n/locale-context";

export default function FaqPage() {
  const t = useT();

  const faq = useMemo(
    () => [
      { q: t("misc.faqApp.q1"), a: t("misc.faqApp.a1") },
      { q: t("misc.faqApp.q2"), a: t("misc.faqApp.a2") },
      { q: t("misc.faqApp.q3"), a: t("misc.faqApp.a3") },
    ],
    [t],
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <PageHeader title={t("landing.navFaq")} description={t("landing.faqTitle")} />
      <div className="mt-8 space-y-3">
        {faq.map((item) => (
          <Panel key={item.q}>
            <h2 className="font-display text-lg font-bold text-ink">{item.q}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.a}</p>
          </Panel>
        ))}
      </div>
    </main>
  );
}
