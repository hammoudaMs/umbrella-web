"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { StatusCard } from "@/lib/api";
import { cn } from "@/lib/cn";
import { DASHBOARD_STATUS_KEYS } from "@/lib/dashboard-statuses";
import { useStatusLabel } from "@/i18n/hooks";
import { STATUS_META, type StatusKey } from "@/lib/status-meta";

gsap.registerPlugin(useGSAP);

export function StatusBoard({
  items,
  basePath,
}: {
  items: StatusCard[];
  basePath: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const statusLabelFn = useStatusLabel();

  const visible = useMemo(() => {
    const byKey = new Map(items.map((item) => [item.key, item]));
    return DASHBOARD_STATUS_KEYS.map((key) => {
      const found = byKey.get(key);
      return (
        found ?? {
          key,
          label: statusLabelFn(key),
          tone: "custom",
          count: 0,
        }
      );
    });
  }, [items, statusLabelFn]);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>(".status-card");
      gsap.fromTo(
        cards,
        { opacity: 0, y: 6 },
        {
          opacity: 1,
          y: 0,
          duration: 0.22,
          stagger: 0.02,
          ease: "power2.out",
          clearProps: "transform",
        },
      );
    },
    { scope: root, dependencies: [visible] },
  );

  return (
    <nav
      ref={root}
      aria-label="Statuts colis"
      className="rounded-2xl border border-ops-card bg-ops-surface p-1.5"
    >
      {/* Mobile: 3×3 grille. Desktop: wider strip. Never horizontal scroll. */}
      <ul
        className="m-0 grid list-none grid-cols-3 gap-1 p-0 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9"
        style={{ display: "grid" }}
      >
        {visible.map((item) => {
          const meta = STATUS_META[item.key as StatusKey];
          const href = `${basePath}/parcels?status=${encodeURIComponent(item.key)}`;
          const empty = item.count === 0;
          const emoji = meta?.emoji ?? "📋";
          const label = statusLabelFn(item.key);
          const color = meta?.color ?? "#E5DBD4";
          const ink = meta?.ink ?? "#1A1414";

          return (
            <li key={item.key} className="min-w-0">
              <Link
                href={href}
                className={cn(
                  "status-card flex h-full min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center transition",
                  "md:min-h-0 md:flex-row md:items-center md:justify-start md:gap-2 md:px-2.5 md:py-2 md:text-left",
                  "hover:bg-ops-accent/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  empty && "opacity-50",
                )}
              >
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm md:h-9 md:w-9 md:text-base"
                  style={{ backgroundColor: color, color: ink }}
                  aria-hidden
                >
                  {emoji}
                </span>
                <span className="min-w-0 w-full md:w-auto">
                  <span className="block font-display text-base font-extrabold leading-none tabular-nums text-ops-accent md:text-lg">
                    {item.count}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] font-semibold leading-tight text-ops-ink md:text-[11px]">
                    {label}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
