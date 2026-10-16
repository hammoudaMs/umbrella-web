"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/cn";

export function ThemeToggle({
  className,
  tone = "default",
  iconOnly = false,
}: {
  className?: string;
  tone?: "default" | "on-dark" | "on-light";
  iconOnly?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const t = useT();
  const isDark = theme === "dark";
  const isIconDark = iconOnly || tone === "on-dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        isDark ? t("common.themeToggleLight") : t("common.themeToggleDark")
      }
      title={isDark ? t("common.themeLight") : t("common.themeDark")}
      className={cn(
        "inline-flex items-center justify-center transition",
        isIconDark
          ? "h-10 w-10 rounded-xl border-0 bg-transparent text-ops-ink/70 hover:bg-ops-ink/[0.06] hover:text-ops-ink"
          : "h-10 gap-2 rounded-lg border px-3 text-sm font-semibold",
        tone === "on-light" &&
          !isIconDark &&
          "border-ops-card bg-ops-surface text-ops-ink hover:border-ops-accent/50 hover:text-ops-accent",
        tone === "default" &&
          !isIconDark &&
          "border-ops-card bg-ops-surface text-ops-ink hover:border-ops-accent/50 hover:text-ops-accent",
        className,
      )}
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      ) : (
        <Moon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      )}
      {!isIconDark ? (
        <span className="hidden sm:inline">
          {isDark ? t("common.themeLight") : t("common.themeDark")}
        </span>
      ) : null}
    </button>
  );
}
