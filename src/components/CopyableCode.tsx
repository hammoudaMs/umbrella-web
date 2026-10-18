"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/Feedback";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/locale-context";

type Size = "sm" | "md" | "lg";

const TEXT: Record<Size, string> = {
  sm: "text-[11px] font-medium",
  md: "text-sm font-semibold",
  lg: "text-lg font-bold tracking-wide",
};

const ICON: Record<Size, string> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

type Props = {
  code: string | null | undefined;
  fallback?: string;
  size?: Size;
  className?: string;
  textClassName?: string;
  /** When set, wraps the code text (e.g. Link). Copy stays outside. */
  renderCode?: (display: string) => ReactNode;
  iconOnly?: boolean;
};

export function CopyableCode({
  code,
  fallback,
  size = "md",
  className,
  textClassName,
  renderCode,
  iconOnly = false,
}: Props) {
  const t = useT();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const display = (code?.trim() || fallback || "").trim();

  if (!display) return null;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      toast.success("Code copié", display);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copie impossible", display);
    }
  }

  const Icon = copied ? Check : Copy;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5",
        className,
      )}
    >
      {!iconOnly ? (
        <span
          className={cn(
            "keep-ltr min-w-0 truncate font-mono text-ops-ink",
            TEXT[size],
            textClassName,
          )}
          dir="ltr"
        >
          {renderCode ? renderCode(display) : display}
        </span>
      ) : null}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void onCopy();
        }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md text-ops-ink/45 transition print:hidden",
          "hover:bg-ops-card hover:text-ops-accent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent/40",
          size === "lg" ? "h-8 w-8" : size === "md" ? "h-7 w-7" : "h-6 w-6",
          copied && "text-emerald-600 hover:text-emerald-600",
        )}
        aria-label={t("common.copy")}
        title={t("common.copy")}
      >
        <Icon className={ICON[size]} strokeWidth={2.25} aria-hidden />
      </button>
    </span>
  );
}
