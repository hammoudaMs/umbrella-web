"use client";

import { useState } from "react";
import { FAQ_ITEMS } from "@/components/landing/landing-data";
import { useT } from "@/i18n/locale-context";

export function LandingFaq() {
  const t = useT();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="relative overflow-hidden bg-white px-5 py-10 sm:px-6 sm:py-12 md:px-10 md:py-14"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-10">
        <header className="mx-auto w-full max-w-md shrink-0 text-center lg:mx-0 lg:max-w-none lg:text-start">
          <p className="reveal text-[10px] font-semibold uppercase tracking-[0.24em] text-[#986A36] sm:text-[11px]">
            {t("landing.faqEyebrow")}
          </p>
          <h2 className="reveal mt-1.5 font-display text-[clamp(1.55rem,3.6vw,2.35rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-black">
            {t("landing.faqTitle")}
          </h2>
          <p className="reveal mx-auto mt-2 max-w-sm text-[13px] leading-snug text-black/55 sm:text-[14px] lg:mx-0">
            {t("landing.faqLead")}
          </p>
        </header>

        <ul className="faq-list flex flex-col border-t border-black/[0.08] lg:min-h-0">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <li
                key={item.qKey}
                className="faq-item border-b border-black/[0.08] first:border-t-0"
              >
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 py-3 text-start sm:gap-4 sm:py-3.5 md:py-4"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="font-display text-[13px] font-medium leading-snug text-black sm:text-[14px] md:text-[15px]">
                    {t(item.qKey)}
                  </span>
                  <span
                    className={`mt-0.5 shrink-0 font-display text-lg leading-none text-[#986A36] transition duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-2 text-[12px] leading-snug text-black/50 sm:pb-2.5 sm:text-[13px] sm:leading-relaxed">
                      {t(item.aKey)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
