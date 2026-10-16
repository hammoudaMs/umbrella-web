"use client";

import { SERVICES } from "@/components/landing/landing-data";
import { useT } from "@/i18n/locale-context";

export function LandingServices() {
  const t = useT();

  return (
    <section
      id="services"
      className="relative overflow-hidden bg-[#EFE8E0] px-5 py-10 sm:px-6 sm:py-12 md:px-10 md:py-14"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(153,18,17,0.1) 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-start">
          <p className="reveal text-[10px] font-semibold uppercase tracking-[0.24em] text-[#991211]/75 sm:text-[11px]">
            {t("landing.servicesEyebrow")}
          </p>
          <h2 className="reveal mt-1 font-display text-[clamp(1.55rem,3.6vw,2.35rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-black sm:mt-1.5">
            {t("landing.servicesTitle")}
          </h2>
          <p className="reveal mx-auto mt-1.5 max-w-md text-[13px] leading-snug text-black/55 sm:text-[14px] lg:mx-0">
            {t("landing.servicesLead")}
          </p>
        </header>

        <ul className="services-list mt-5 grid grid-cols-1 gap-x-8 border-t border-black/[0.08] text-center sm:mt-6 sm:grid-cols-2 sm:text-start lg:grid-cols-3">
          {SERVICES.map((service) => (
            <li
              key={service.n}
              className="service-row flex flex-col border-b border-black/[0.08] py-3 sm:py-3.5"
            >
              <span className="font-display text-[11px] font-bold tracking-[0.14em] text-[#986A36]">
                {service.n}
              </span>
              <h3 className="mt-1 font-display text-[15px] font-semibold tracking-tight text-black sm:text-[16px]">
                {t(service.titleKey)}
              </h3>
              <p className="mt-0.5 text-[12px] leading-snug text-black/50 sm:text-[13px]">
                {t(service.bodyKey)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
