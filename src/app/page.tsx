"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { BrandLogo } from "@/components/landing/BrandLogo";
import { LandingContact } from "@/components/landing/LandingContact";
import { LandingCoverage } from "@/components/landing/LandingCoverage";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingScrollJourney } from "@/components/landing/LandingScrollJourney";
import { LandingServices } from "@/components/landing/LandingServices";
import { LandingWhyChoose } from "@/components/landing/LandingWhyChoose";
import { NAV_LINKS } from "@/components/landing/landing-data";
import { useLandingMotion } from "@/components/landing/useLandingMotion";
import { useT } from "@/i18n/locale-context";

export default function LandingPage() {
  const t = useT();
  const root = useRef<HTMLElement>(null);
  const [trackingCode, setTrackingCode] = useState("");
  useLandingMotion(root);

  function onTrack(e: FormEvent) {
    e.preventDefault();
    const code = trackingCode.trim();
    if (!code) return;
    window.location.href = `/track?code=${encodeURIComponent(code)}`;
  }

  return (
    <main ref={root} className="landing min-h-dvh bg-white text-black">
      <div
        className="progress-bar pointer-events-none fixed left-0 top-0 z-[60] h-0.5 w-full origin-left scale-x-0 bg-[#991211]"
        aria-hidden
      />

      <LandingHero
        trackingCode={trackingCode}
        onTrackingCodeChange={setTrackingCode}
        onTrack={onTrack}
      />

      <LandingScrollJourney />
      <LandingWhyChoose />
      <LandingCoverage />
      <LandingServices />
      <LandingFaq />
      <LandingContact />

      <footer className="landing-footer border-t border-black/[0.06] bg-white px-5 py-8 sm:px-6 md:px-10 md:py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <BrandLogo surface="dark" />
            <p className="mt-4 text-sm leading-relaxed text-black/45">
              {t("landing.footerBlurb")}
            </p>
          </div>
          <div className="flex flex-wrap gap-12 text-sm">
            <div>
              <p className="font-medium text-black">{t("landing.footerNav")}</p>
              <ul className="mt-3 space-y-2 text-black/45">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="transition hover:text-[#991211]">
                      {t(link.labelKey)}
                    </a>
                  </li>
                ))}
                <li>
                  <Link href="/login" className="transition hover:text-[#991211]">
                    {t("landing.signIn")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-black">{t("landing.footerLegal")}</p>
              <ul className="mt-3 space-y-2 text-black/45">
                <li>
                  <Link href="/contact" className="transition hover:text-[#991211]">
                    {t("landing.footerContact")}
                  </Link>
                </li>
                <li>
                  <a
                    href="tel:+21625025073"
                    className="keep-ltr transition hover:text-[#991211]"
                    dir="ltr"
                  >
                    +216 25 025 073
                  </a>
                </li>
                <li>
                  <Link href="/legal/cgu" className="transition hover:text-[#991211]">
                    {t("landing.footerCgu")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/confidentialite"
                    className="transition hover:text-[#991211]"
                  >
                    {t("landing.footerPrivacy")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-6xl border-t border-black/[0.06] pt-6 text-xs text-black/35">
          <span dir="ltr" className="keep-ltr">
            © {new Date().getFullYear()} {t("landing.footerCopy")}
          </span>
        </div>
      </footer>
    </main>
  );
}
