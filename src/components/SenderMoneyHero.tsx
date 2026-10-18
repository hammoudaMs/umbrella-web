import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type MoneyHeroMetric = {
  label: string;
  value: ReactNode;
};

export function SenderMoneyHero({
  label,
  value,
  hint,
  metrics,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  metrics?: MoneyHeroMetric[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-ops-card bg-ops-surface p-5 sm:p-6",
        className,
      )}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ops-ink/40">
          {label}
        </p>
        <p className="mt-2 font-display text-4xl font-extrabold leading-none tracking-tight text-ops-ink tabular-nums">
          {value}
        </p>
        {hint ? (
          <p className="mt-2 text-sm text-ops-ink/45">{hint}</p>
        ) : null}
      </div>

      {metrics && metrics.length > 0 ? (
        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-ops-card pt-5">
          {metrics.map((m) => (
            <div key={m.label} className="min-w-0 text-center sm:text-left">
              <dt className="truncate text-xs text-ops-ink/40">{m.label}</dt>
              <dd className="mt-1 truncate font-display text-lg font-bold tabular-nums text-ops-ink sm:text-xl">
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

export function SenderSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold tracking-tight text-ops-ink sm:text-xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-ops-ink/45">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
