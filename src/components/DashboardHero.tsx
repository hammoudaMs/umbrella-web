"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";
import { CalendarDays, Clock3, Coins } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { HeroVanScene } from "@/components/landing/HeroVanScene";
import { cn } from "@/lib/cn";

function formatSolde(n: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatGreetingDate(d: Date) {
  return d.toLocaleDateString("fr-TN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatGreetingTime(d: Date) {
  return d.toLocaleTimeString("fr-TN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type DashboardHeroAction = {
  href?: string;
  onClick?: () => void;
  label: string;
  primary?: boolean;
  icon?: ReactNode;
};

type DashboardHeroProps = {
  /** Overrides the default “Bonjour {name}” title. */
  title?: string;
  subtitle: string;
  actions?: DashboardHeroAction[];
  footer?: ReactNode;
  className?: string;
  solde?: number | null;
  showMeta?: boolean;
};

function ActionControl({ action }: { action: DashboardHeroAction }) {
  const className = cn(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition",
    action.primary
      ? "bg-ops-accent/95 text-white shadow-[0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm hover:bg-ops-accent-soft"
      : "border border-ops-card bg-ops-ink/[0.06] text-ops-ink hover:bg-ops-ink/[0.1]",
  );

  if (action.onClick) {
    return (
      <button type="button" onClick={action.onClick} className={className}>
        {action.icon}
        {action.label}
      </button>
    );
  }

  if (!action.href) return null;

  return (
    <Link href={action.href} className={className}>
      {action.icon}
      {action.label}
    </Link>
  );
}

/** Shared portal hero: animated landing van + optional solde. */
export function DashboardHero({
  title,
  subtitle,
  actions = [],
  footer,
  className,
  solde = null,
  showMeta = true,
}: DashboardHeroProps) {
  const { session } = useAuth();
  const now = new Date();
  const firstName = session?.user.name?.split(/\s+/)[0] ?? "";
  const heading =
    title ?? `Bonjour${firstName ? ` ${firstName}` : ""}`;

  return (
    <header className={className}>
      <section className="relative min-h-[200px] overflow-hidden rounded-2xl border border-ops-card bg-ops-surface text-ops-ink sm:min-h-[220px]">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-gradient-to-br from-ops-page via-ops-surface to-[#2a1518]" />
          <HeroVanScene variant="portal" />
          <div className="absolute inset-0 bg-gradient-to-r from-ops-page from-[0%] via-ops-page/92 via-[36%] to-transparent to-[62%]" />
          <div className="absolute inset-y-0 left-0 w-[min(100%,24rem)] bg-gradient-to-r from-ops-page via-ops-page/70 to-transparent sm:w-[28rem]" />
        </div>

        <div className="relative z-10 flex min-h-[200px] flex-col justify-between gap-5 px-5 py-6 sm:min-h-[220px] sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-7">
          <div className="relative z-10 flex min-w-0 max-w-[18rem] flex-col sm:max-w-md lg:max-w-lg">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ops-ink/70 drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">
              Umbrella Express
            </p>
            <h1 className="mt-2 font-display text-[1.75rem] font-extrabold leading-[1.15] tracking-tight text-ops-ink drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)] sm:text-3xl lg:text-4xl">
              {heading}
            </h1>
            <p className="mt-2 max-w-sm text-[13px] font-medium leading-snug text-ops-ink drop-shadow-[0_1px_10px_rgba(0,0,0,0.75)] sm:text-[15px] sm:leading-relaxed">
              {subtitle}
            </p>

            {solde != null ? (
              <div className="mt-4 inline-flex w-fit items-center gap-2.5 rounded-full border border-emerald-500/35 bg-black/55 px-3.5 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-md">
                <Coins
                  className="h-4 w-4 shrink-0 text-emerald-400"
                  aria-hidden
                />
                <span className="text-[12px] font-semibold uppercase tracking-wide text-emerald-300">
                  Solde
                </span>
                <span className="font-display text-[15px] font-extrabold tabular-nums text-white">
                  {formatSolde(solde)}
                </span>
              </div>
            ) : null}

            {showMeta ? (
              <p className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-medium capitalize text-ops-ink/80 drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                  {formatGreetingDate(now)}
                </span>
                <span className="text-ops-ink/35" aria-hidden>
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5 normal-case">
                  <Clock3 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                  {formatGreetingTime(now)}
                </span>
              </p>
            ) : null}
          </div>

          {actions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {actions.map((action) => (
                <ActionControl
                  key={`${action.label}-${action.href ?? "action"}`}
                  action={action}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </header>
  );
}

export function DashboardPromo({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-ops-card bg-ops-surface text-ops-ink",
        className,
      )}
    >
      <div className="relative flex flex-col items-center gap-5 px-5 py-6 text-center sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-8 lg:py-7 lg:text-left">
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-xl font-bold tracking-tight text-ops-ink sm:text-2xl">
            Livraison plus rapide, plus proche de vos clients
          </h2>
        </div>
        <div className="relative z-10 hidden h-28 w-48 shrink-0 lg:block lg:h-32 lg:w-56">
          <Image
            src="/assets/cargo-van-clean.png"
            alt=""
            fill
            className="object-contain object-right"
            sizes="224px"
          />
        </div>
      </div>
    </section>
  );
}
