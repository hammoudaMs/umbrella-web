"use client";

import { useLocale } from "@/i18n/locale-context";
import { LOCALE_META } from "@/i18n/types";
import { cn } from "@/lib/cn";

export function LocaleToggle({
  className,
  tone = "default",
  compact = false,
}: {
  className?: string;
  tone?: "default" | "on-dark" | "on-light";
  compact?: boolean;
}) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label={locale === "tn" ? "اللغة" : "Langue"}
      className={cn(
        "inline-flex items-center rounded-xl p-0.5 text-xs font-semibold",
        tone === "on-dark" && "bg-ops-ink/[0.06]",
        tone === "on-light" && "border border-ops-card bg-ops-surface",
        tone === "default" && "border border-ops-card bg-ops-surface",
        className,
      )}
    >
      {(["fr", "tn"] as const).map((code) => {
        const active = locale === code;
        const meta = LOCALE_META[code];
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            className={cn(
              "rounded-lg px-2.5 py-1.5 transition",
              active
                ? "bg-ops-accent text-white shadow-sm"
                : "text-ops-ink/55 hover:text-ops-ink",
              tone === "on-dark" &&
                !active &&
                "text-ops-ink/50 hover:bg-ops-ink/[0.06] hover:text-ops-ink",
            )}
          >
            {compact ? meta.short : meta.native}
          </button>
        );
      })}
    </div>
  );
}
