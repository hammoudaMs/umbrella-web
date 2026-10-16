"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, Search, X } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { BrandLogo } from "@/components/landing/BrandLogo";
import { HeroVanScene } from "@/components/landing/HeroVanScene";
import { LandingMarquee } from "@/components/landing/LandingMarquee";
import { HERO_PHRASE_KEYS, NAV_LINKS } from "@/components/landing/landing-data";
import { LocaleToggle } from "@/components/LocaleToggle";
import { useLocale, useT } from "@/i18n/locale-context";

gsap.registerPlugin(useGSAP);

type LandingHeroProps = {
  trackingCode: string;
  onTrackingCodeChange: (value: string) => void;
  onTrack: (e: FormEvent) => void;
};

export function LandingHero({
  trackingCode,
  onTrackingCodeChange,
  onTrack,
}: LandingHeroProps) {
  const t = useT();
  const { locale } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const heroPhrases = HERO_PHRASE_KEYS.map((key) => t(key));

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!contentRef.current) return;
      const phrases = Array.from(
        contentRef.current.querySelectorAll<HTMLElement>(".hero-phrase"),
      );
      if (phrases.length < 2) return;

      if (reduce) {
        gsap.set(phrases, { autoAlpha: 0 });
        gsap.set(phrases[0], { autoAlpha: 1 });
        return;
      }

      gsap.set(phrases, { autoAlpha: 0, y: 10 });
      gsap.set(phrases[0], { autoAlpha: 1, y: 0 });

      let active = 0;
      const cycle = () => {
        const next = (active + 1) % phrases.length;
        const tl = gsap.timeline();
        phrases.forEach((el, i) => {
          if (i === next) {
            tl.fromTo(
              el,
              { autoAlpha: 0, y: 10 },
              { autoAlpha: 1, y: 0, duration: 0.32, ease: "power2.out" },
              0,
            );
          } else if (i === active) {
            tl.to(el, { autoAlpha: 0, y: -8, duration: 0.22, ease: "power2.in" }, 0);
          } else {
            gsap.set(el, { autoAlpha: 0 });
          }
        });
        active = next;
      };

      const loop = gsap.timeline({ repeat: -1, delay: 2.2 });
      loop.call(cycle).to({}, { duration: 2.4 });
    },
    { scope: contentRef, dependencies: [locale] },
  );

  return (
    <section className="hero-block relative isolate flex min-h-[100svh] flex-col overflow-x-hidden bg-[#1a0a0b] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-[#991211] via-[#6e0e10] to-[#1a0a0b]" />
        <HeroVanScene />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a0a0b] from-[0%] via-[#991211]/75 via-[32%] to-transparent to-[58%]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1a0a0b]/70 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #E5DBD4 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <header className="hero-chrome relative z-40 shrink-0">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-3 px-5 sm:h-14 sm:px-6 md:h-16 md:px-10 lg:px-14">
          <Link href="/" className="shrink-0" aria-label="Umbrella Express">
            <BrandLogo surface="dark" priority />
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex" aria-label={t("landing.navAria")}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-2 text-[13px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {t(link.labelKey)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LocaleToggle tone="on-dark" compact className="hidden sm:inline-flex" />
            <Link
              href="/login"
              className="magnet hidden rounded-full bg-white px-5 py-2.5 text-[13px] font-medium text-[#991211] transition hover:bg-white/90 sm:inline-flex"
            >
              {t("landing.signIn")}
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? t("landing.closeMenu") : t("landing.openMenu")}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div
          id="mobile-nav"
          className="fixed inset-0 z-50 flex flex-col bg-[#991211] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("landing.navAria")}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #E5DBD4 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative flex h-12 shrink-0 items-center justify-between px-5">
            <Link
              href="/"
              className="shrink-0"
              aria-label="Umbrella Express"
              onClick={() => setMenuOpen(false)}
            >
              <BrandLogo surface="dark" />
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white"
              aria-label={t("landing.closeMenu")}
              onClick={() => setMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav
            className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-6"
            aria-label={t("landing.navAria")}
          >
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#986A36]">
              {t("landing.menuLabel")}
            </p>
            <ul className="flex w-full max-w-xs flex-col items-center">
              {NAV_LINKS.map((link) => (
                <li key={link.href} className="w-full border-b border-white/15 first:border-t">
                  <a
                    href={link.href}
                    className="flex items-center justify-center px-3 py-3.5 text-[17px] font-medium tracking-tight text-white/95 transition active:bg-white/10"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t(link.labelKey)}
                  </a>
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="mt-7 inline-flex h-11 w-full max-w-xs items-center justify-center rounded-full bg-[#E5DBD4] text-[14px] font-semibold text-[#991211] transition active:bg-white"
              onClick={() => setMenuOpen(false)}
            >
              {t("landing.signIn")}
            </Link>
          </nav>
        </div>
      ) : null}

      <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end gap-6 px-5 pb-[38vw] pt-4 sm:justify-center sm:gap-7 sm:px-6 sm:pb-16 sm:pt-5 md:px-10 lg:justify-center lg:px-14 lg:pb-10 lg:pt-6">
        <div
          ref={contentRef}
          className="hero-content flex w-full max-w-lg flex-col items-center text-center lg:mx-0 lg:items-start lg:text-start"
        >
          <p className="hero-eyebrow text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E1D2A7] sm:text-xs">
            {t("landing.heroEyebrow")}
          </p>

          <h1 className="sr-only">{t("landing.heroSrOnly")}</h1>

          <div className="hero-3d-copy relative mt-3 h-[2.35em] w-full text-[clamp(2.05rem,6.8vw,3.75rem)] sm:mt-4">
            {heroPhrases.map((phrase, i) => (
              <p
                key={HERO_PHRASE_KEYS[i]}
                className={`hero-phrase absolute inset-x-0 top-0 select-none font-display text-[length:inherit] font-extrabold uppercase leading-[1.08] tracking-[-0.04em] text-white ${
                  i === 0 ? "opacity-100" : "opacity-0"
                }`}
                data-phrase={i}
                aria-hidden={i !== 0}
              >
                {phrase.split("\n").map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            ))}
          </div>

          <p className="hero-kicker mt-3.5 max-w-md text-[14px] leading-snug text-white/75 sm:mt-5 sm:text-base sm:leading-relaxed">
            {t("landing.heroKicker")}
          </p>

          <form onSubmit={onTrack} className="hero-track mt-4 w-full sm:mt-5">
            <label className="sr-only" htmlFor="track-code">
              {t("landing.trackPlaceholder")}
            </label>
            <div className="flex min-w-0 items-center gap-1.5 rounded-full bg-[#E5DBD4] p-1 sm:gap-2 sm:p-1.5">
              <input
                id="track-code"
                value={trackingCode}
                onChange={(e) => onTrackingCodeChange(e.target.value)}
                placeholder={t("landing.trackPlaceholder")}
                dir="ltr"
                className="keep-ltr min-w-0 flex-1 bg-transparent px-3.5 py-2 text-start text-[14px] text-[#1a1414] outline-none placeholder:text-[#1a1414]/40 sm:px-4 sm:py-2.5 sm:text-[15px]"
              />
              <button
                type="submit"
                className="magnet inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-[#991211] px-4 text-[13px] font-semibold text-white transition hover:bg-[#7a0e0e] sm:h-11 sm:px-6"
              >
                <Search className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t("landing.trackCta")}</span>
              </button>
            </div>
          </form>

          <div className="hero-ctas mt-3.5 flex w-full flex-col gap-2 sm:mt-6 sm:flex-row sm:items-center sm:justify-center sm:gap-3 lg:justify-start">
            <Link
              href="/login"
              className="magnet inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#E5DBD4] px-6 text-[14px] font-semibold text-[#991211] transition hover:bg-white sm:h-12 sm:px-7"
            >
              {t("landing.signIn")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
            <a
              href="#parcours"
              className="magnet inline-flex h-11 items-center justify-center rounded-full border border-white/35 px-6 text-[14px] font-medium text-white transition hover:border-white hover:bg-white/10 sm:h-12 sm:px-7"
            >
              {t("landing.seeJourney")}
            </a>
          </div>
        </div>
      </div>

      <LandingMarquee />
    </section>
  );
}
