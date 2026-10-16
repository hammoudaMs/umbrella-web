"use client";

import { MARQUEE_STAT_KEYS } from "@/components/landing/landing-data";
import { useT } from "@/i18n/locale-context";

function MarqueeSequence({
  labels,
  duplicate = false,
}: {
  labels: string[];
  duplicate?: boolean;
}) {
  return (
    <ul
      className="flex shrink-0 list-none items-center"
      aria-hidden={duplicate || undefined}
    >
      {labels.map((stat) => (
        <li
          key={`${duplicate ? "b" : "a"}-${stat}`}
          className="inline-flex shrink-0 items-center"
        >
          <span className="whitespace-nowrap px-3.5 text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-white sm:px-6 sm:text-[11px] sm:tracking-[0.18em]">
            {stat}
          </span>
          <span
            className="select-none text-[10px] font-light leading-none text-white/35 sm:text-[11px]"
            aria-hidden
          >
            /
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Seamless infinite status strip.
 * Two identical sequences + CSS translate -50% = no seam hitch.
 */
export function LandingMarquee() {
  const t = useT();
  const labels = MARQUEE_STAT_KEYS.map((key) => t(key));

  return (
    <div
      className="marquee-band relative z-30 h-10 shrink-0 overflow-hidden border-t border-white/10 bg-[#7a0e0e] sm:h-11"
      aria-hidden
    >
      <div className="marquee-track flex h-full w-max items-center will-change-transform">
        <MarqueeSequence labels={labels} />
        <MarqueeSequence labels={labels} duplicate />
      </div>
    </div>
  );
}
