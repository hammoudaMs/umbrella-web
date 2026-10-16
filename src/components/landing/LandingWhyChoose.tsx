"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { WHY_POINTS } from "@/components/landing/landing-data";
import { useT } from "@/i18n/locale-context";

export function LandingWhyChoose() {
  const t = useT();

  return (
    <section
      id="choisir"
      className="why-visual relative overflow-hidden bg-white px-5 py-10 sm:px-6 sm:py-12 md:px-10 md:py-14"
    >
      <div className="mx-auto w-full max-w-6xl">
        <header className="why-copy mx-auto w-full max-w-2xl text-center lg:mx-0 lg:text-start">
          <p className="reveal text-[10px] font-semibold uppercase tracking-[0.24em] text-[#986A36] sm:text-[11px]">
            {t("landing.whyEyebrow")}
          </p>
          <h2 className="reveal mt-1.5 font-display text-[clamp(1.55rem,3.6vw,2.35rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-black">
            {t("landing.whyTitle")}
          </h2>
        </header>

        <div className="mt-5 grid gap-5 sm:mt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-8 xl:gap-10">
          <figure className="why-media relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-[#1a1414] sm:aspect-[16/11] lg:aspect-[4/5] lg:max-h-[420px]">
              <Image
                src="/assets/livreur.png"
                alt={t("landing.whyImageAlt")}
                fill
                className="object-cover object-[center_18%]"
                sizes="(max-width: 1024px) 90vw, 440px"
                priority={false}
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent"
                aria-hidden
              />
              <figcaption className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4">
                <p className="font-display text-[12px] font-medium tracking-wide text-white/95 sm:text-[13px]">
                  {t("landing.whyCaption")}
                </p>
              </figcaption>
            </div>
          </figure>

          <div className="flex flex-col text-center lg:text-start">
            <p className="reveal max-w-xl text-[13px] leading-snug text-black/55 sm:text-[14px] lg:mx-0">
              {t("landing.whyLead")}
            </p>

            <ol className="why-list mt-3 flex flex-col border-t border-black/[0.08] text-start sm:mt-4">
              {WHY_POINTS.map((point) => (
                <li
                  key={point.n}
                  className="why-point group grid grid-cols-[2.25rem_1fr] gap-2.5 border-b border-black/[0.08] py-2.5 sm:grid-cols-[2.75rem_1fr] sm:gap-3 sm:py-3"
                >
                  <span className="pt-0.5 font-display text-[11px] font-bold tracking-[0.12em] text-[#986A36] sm:text-[12px]">
                    {point.n}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-[14px] font-semibold tracking-tight text-black transition group-hover:text-[#991211] sm:text-[15px]">
                      {t(point.titleKey)}
                    </h3>
                    <p className="mt-0.5 text-[12px] leading-snug text-black/50 sm:text-[13px]">
                      {t(point.bodyKey)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <Link
              href="/signup"
              className="reveal magnet mx-auto mt-4 inline-flex w-fit items-center gap-2 border-b border-[#991211] pb-0.5 text-[13px] font-semibold text-[#991211] transition hover:gap-3 sm:text-[14px] lg:mx-0"
            >
              {t("landing.whyCta")}
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
