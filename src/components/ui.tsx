"use client";

import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { AlertTriangle, Loader2, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useStatusLabel } from "@/i18n/hooks";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="flex flex-col items-center gap-4 text-center md:flex-row md:items-end md:justify-between md:text-left">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ops-ink/55">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ops-ink md:text-3xl">
          {title}
        </h1>
        {description ? (
          <div className="mx-auto mt-1 max-w-2xl text-sm text-ops-ink/50 md:mx-0">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-ops-card bg-ops-page/50 px-6 py-12 text-center">
      {Icon ? (
        <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-ops-accent/15 text-ops-accent">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <p className="font-display text-lg font-bold text-ops-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-ops-ink/50">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ rows = 4, label }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      {label ? <p className="text-center text-sm text-ops-ink/50">{label}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-ops-ink/[0.06]" />
        ))}
      </div>
    </div>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-ops-card bg-ops-surface p-5 shadow-ops", className)}>
      {children}
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ops-accent/25 bg-ops-accent/10 px-4 py-3 text-sm text-ops-accent"
    >
      <span className="inline-flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        {message}
      </span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="font-semibold underline-offset-2 hover:underline">
          Réessayer
        </button>
      ) : null}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold" | "success";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-ops-accent text-white shadow-sm hover:bg-ops-accent-soft",
  secondary:
    "border border-ops-card bg-ops-surface text-ops-ink hover:border-ops-accent/50 hover:text-ops-accent",
  ghost: "text-ops-ink/55 hover:bg-ops-ink/[0.06] hover:text-ops-ink",
  danger:
    "border border-ops-accent/30 bg-ops-accent/10 text-ops-accent hover:bg-ops-accent hover:text-white",
  gold: "bg-amber-500 text-[#0B0E14] shadow-sm hover:bg-amber-400",
  success: "bg-emerald-700 text-white shadow-sm hover:bg-emerald-600",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ops-page disabled:cursor-not-allowed disabled:opacity-50",
    BUTTON_VARIANT[variant],
    BUTTON_SIZE[size],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClass(variant, size), className)}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon className="h-4 w-4" aria-hidden />
      ) : null}
      {children}
    </button>
  );
}

export const inputClass =
  "w-full rounded-xl border border-ops-card bg-ops-surface px-3 py-2.5 text-sm text-ops-ink outline-none transition placeholder:text-ops-ink/40 focus:border-ops-accent focus:ring-2 focus:ring-ops-accent/20 disabled:cursor-not-allowed disabled:opacity-60";

function FieldShell({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label?: string;
  hint?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("block text-sm", className)}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block font-medium text-ops-ink">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-ops-accent">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ops-ink/50">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type FieldProps = { label?: string; hint?: string; error?: string | null; wrapperClassName?: string };

export function TextField({
  label,
  hint,
  error,
  wrapperClassName,
  className,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={wrapperClassName}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(inputClass, error && "border-ops-accent", className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  wrapperClassName,
  className,
  id,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={wrapperClassName}>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cn(inputClass, "pr-8", className)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  wrapperClassName,
  className,
  id,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={wrapperClassName}>
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cn(inputClass, "min-h-[88px] resize-y", className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Rechercher…",
  className,
  label = "Rechercher",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{label}</span>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-ink/40"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputClass, "py-2 pl-9")}
      />
    </label>
  );
}

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand" | "gold";

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral:
    "bg-ops-ink/[0.06] text-ops-ink/50 ring-ops-card dark:bg-white/10 dark:text-white/80 dark:ring-white/15",
  success:
    "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/30",
  warning:
    "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-400/30",
  danger: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-400/15 dark:text-red-300 dark:ring-red-400/30",
  info: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-400/15 dark:text-sky-300 dark:ring-sky-400/30",
  brand: "bg-ops-accent/15 text-ops-accent ring-ops-accent/20",
  gold: "bg-amber-500/10 text-ops-ink/55 ring-amber-500/25",
};

export function Badge({
  tone = "neutral",
  children,
  dot = false,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        BADGE_TONE[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

function opsStatusTone(status: string): { bg: string; ink: string } {
  if (status === "EN_ATTENTE" || status === "NON_SERIEUX")
    return { bg: "#FFAB00", ink: "#0B0E14" };
  if (status === "LIVRES" || status === "LIVRES_PAYES")
    return { bg: "#00875A", ink: "#FFFFFF" };
  if (
    status === "EN_COURS" ||
    status === "AFFECTE_LIVREUR" ||
    status === "A_ENLEVER" ||
    status === "ENLEVES"
  )
    return { bg: "#0065FF", ink: "#FFFFFF" };
  if (
    status === "AU_DEPOT" ||
    status === "EXPEDIE_DESTINATION" ||
    status === "ARRIVE_DESTINATION" ||
    status === "A_VERIFIER" ||
    status === "ECHANGES" ||
    status === "REMBOURSES"
  )
    return { bg: "#6554C0", ink: "#FFFFFF" };
  if (status.startsWith("RETOUR")) return { bg: "#E11D48", ink: "#FFFFFF" };
  return { bg: "#3F4654", ink: "#FFFFFF" };
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const labelOf = useStatusLabel();
  const meta = STATUS_META[status as StatusKey];
  const label = labelOf(status);
  if (!meta) return <Badge className={className}>{label}</Badge>;
  const tone = opsStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-tight",
        className,
      )}
      style={{ backgroundColor: tone.bg, color: tone.ink }}
      title={label}
    >
      <span aria-hidden className="shrink-0">
        {meta.emoji}
      </span>
      <span className="min-w-0">{label}</span>
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "brand" | "gold" | "success";
}) {
  const iconTone = {
    neutral: "bg-ops-surface-2 text-ops-ink",
    brand: "bg-ops-accent/15 text-ops-accent",
    gold: "bg-amber-500/15 text-ops-ink/55",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  }[tone];
  return (
    <div className="rounded-2xl border border-ops-card bg-ops-surface p-4 shadow-ops">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ops-ink/50">
          {label}
        </p>
        {Icon ? (
          <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", iconTone)}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ops-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ops-ink/50">{hint}</p> : null}
    </div>
  );
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-ops-card bg-ops-ink/[0.05] p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              active ? "bg-ops-surface text-ops-accent shadow-sm" : "text-ops-ink/50 hover:text-ops-ink",
            )}
          >
            {opt.label}
            {opt.count !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[10px]",
                  active ? "bg-ops-accent/15 text-ops-accent" : "bg-ops-surface-2 text-ops-ink/50",
                )}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ops-accent to-amber-600 text-xs font-bold text-white",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}

export function TableCard({
  children,
  toolbar,
  footer,
  className,
}: {
  children: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-ops-card bg-ops-surface text-ops-ink shadow-ops",
        className,
      )}
    >
      {toolbar ? (
        <div className="flex flex-col gap-3 border-b border-ops-card bg-ops-page/60 px-4 py-3 md:flex-row md:items-center md:justify-between">
          {toolbar}
        </div>
      ) : null}
      <div className="overflow-x-auto">{children}</div>
      {footer ? (
        <div className="border-t border-ops-card px-4 py-3 text-ops-ink/50">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export const tableClass = "min-w-full text-left text-sm text-ops-ink";
export const theadClass =
  "bg-ops-page/80 text-[11px] font-semibold uppercase tracking-[0.1em] text-ops-ink/45";
export const thClass = "px-4 py-3 font-semibold";
export const tdClass = "px-4 py-3 align-middle";
export const trClass =
  "border-t border-ops-card transition hover:bg-ops-ink/[0.04]";
