"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useT } from "@/i18n/locale-context";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const MENTION = "TUNISIA";

type Hub = {
  id: string;
  x: number;
  y: number;
  labelKey: string;
  side?: "left";
  code: string;
};

/** Normalized 0–100 coords on the map plate. */
const HUBS: readonly Hub[] = [
  { id: "tunis", x: 56, y: 12, labelKey: "landing.hubTunis", code: "36.8N" },
  { id: "sousse", x: 58, y: 32, labelKey: "landing.hubSousse", code: "35.8N" },
  { id: "sfax", x: 55, y: 48, labelKey: "landing.hubSfax", code: "34.7N" },
  {
    id: "gafsa",
    x: 34,
    y: 52,
    labelKey: "landing.hubGafsa",
    side: "left",
    code: "34.4N",
  },
  { id: "gabes", x: 56, y: 62, labelKey: "landing.hubGabes", code: "33.8N" },
  { id: "medenine", x: 58, y: 74, labelKey: "landing.hubMedenine", code: "33.3N" },
] as const;

const LINKS: ReadonlyArray<readonly [string, string]> = [
  ["tunis", "sousse"],
  ["sousse", "sfax"],
  ["sfax", "gabes"],
  ["gabes", "medenine"],
  ["sfax", "gafsa"],
  ["gafsa", "gabes"],
];

function hub(id: string): Hub {
  const found = HUBS.find((h) => h.id === id);
  if (!found) throw new Error(`Unknown hub ${id}`);
  return found;
}

export function LandingCoverage() {
  const t = useT();
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const scope = root.current;
      if (!scope) return;

      if (reduce) {
        gsap.set(
          scope.querySelectorAll(
            ".cov-copy, .cov-foot, .cov-stage, .cov-hub, .cov-letter, .cov-reflect, .cov-hud, .cov-link, .cov-packet",
          ),
          { clearProps: "all", autoAlpha: 1, y: 0, scale: 1 },
        );
        return;
      }

      gsap.set(".cov-copy", { autoAlpha: 0, y: 26 });
      gsap.set(".cov-foot", { autoAlpha: 0, y: 16 });
      gsap.set(".cov-stage", { autoAlpha: 0, scale: 0.96 });
      gsap.set(".cov-hub", { autoAlpha: 0, scale: 0.4 });
      gsap.set(".cov-letter", { autoAlpha: 0, y: 14, rotateX: -40 });
      gsap.set(".cov-reflect", { autoAlpha: 0 });
      gsap.set(".cov-hud", { autoAlpha: 0, y: -8 });
      gsap.set(".cov-link", { strokeDashoffset: 120 });
      gsap.set(".cov-scan", { yPercent: -120, autoAlpha: 0 });
      gsap.set(".cov-grid", { autoAlpha: 0 });

      const enter = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: scope, start: "top 70%", once: true },
      });

      enter
        .to(".cov-copy", { autoAlpha: 1, y: 0, duration: 0.7 }, 0)
        .to(".cov-hud", { autoAlpha: 1, y: 0, duration: 0.45 }, 0.08)
        .to(".cov-grid", { autoAlpha: 1, duration: 0.6 }, 0.1)
        .to(".cov-stage", { autoAlpha: 1, scale: 1, duration: 0.9 }, 0.12)
        .to(
          ".cov-link",
          {
            strokeDashoffset: 0,
            duration: 1.1,
            stagger: 0.08,
            ease: "power2.inOut",
          },
          0.35,
        )
        .to(
          ".cov-hub",
          { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.07 },
          0.55,
        )
        .to(
          ".cov-letter",
          {
            autoAlpha: 1,
            y: 0,
            rotateX: 0,
            duration: 0.4,
            stagger: 0.04,
            ease: "power2.out",
          },
          0.85,
        )
        .to(".cov-reflect", { autoAlpha: 1, duration: 0.55 }, 1.15)
        .to(".cov-foot", { autoAlpha: 1, y: 0, duration: 0.5 }, 1.05);

      gsap.to(".cov-scan", {
        yPercent: 120,
        autoAlpha: 0.7,
        duration: 2.8,
        ease: "none",
        repeat: -1,
        repeatDelay: 1.2,
        scrollTrigger: {
          trigger: scope,
          start: "top 75%",
          toggleActions: "play pause play pause",
        },
      });

      gsap.to(".cov-grid-drift", {
        backgroundPosition: "40px 40px",
        duration: 18,
        ease: "none",
        repeat: -1,
      });

      scope.querySelectorAll<SVGPathElement>(".cov-link").forEach((el, i) => {
        gsap.to(el, {
          strokeDashoffset: -120,
          duration: 3.2 + i * 0.25,
          ease: "none",
          repeat: -1,
        });
      });

      scope.querySelectorAll<SVGCircleElement>(".cov-packet").forEach((el, i) => {
        const path = scope.querySelector<SVGPathElement>(
          `.cov-link[data-i="${i % LINKS.length}"]`,
        );
        if (!path) return;
        const len = path.getTotalLength();
        const prog = { t: 0 };
        gsap.set(el, { opacity: 0.9 });
        gsap.to(prog, {
          t: 1,
          duration: 2.4 + (i % 3) * 0.4,
          ease: "none",
          repeat: -1,
          delay: i * 0.35,
          onUpdate: () => {
            const p = path.getPointAtLength(prog.t * len);
            el.setAttribute("cx", String(p.x));
            el.setAttribute("cy", String(p.y));
          },
        });
      });

      scope.querySelectorAll<HTMLElement>(".cov-pulse").forEach((el, i) => {
        gsap.fromTo(
          el,
          { scale: 0.5, opacity: 0.55 },
          {
            scale: 2.25,
            opacity: 0,
            duration: 2.2,
            ease: "power1.out",
            repeat: -1,
            delay: i * 0.28,
          },
        );
      });

      gsap.to(".cov-ring", {
        rotate: 360,
        duration: 48,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });

      gsap.to(".cov-ring-inner", {
        rotate: -360,
        duration: 32,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });

      gsap.to(".cov-live-dot", {
        opacity: 0.25,
        duration: 0.9,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      const stageEl = stage.current;
      if (stageEl && window.matchMedia("(pointer: fine)").matches) {
        const onMove = (e: MouseEvent) => {
          const r = stageEl.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(".cov-parallax", {
            x: px * 12,
            y: py * 10,
            duration: 0.6,
            ease: "power2.out",
          });
          gsap.to(".cov-parallax-deep", {
            x: px * 6,
            y: py * 5,
            duration: 0.8,
            ease: "power2.out",
          });
        };
        const onLeave = () => {
          gsap.to(".cov-parallax, .cov-parallax-deep", {
            x: 0,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
          });
        };
        stageEl.addEventListener("mousemove", onMove);
        stageEl.addEventListener("mouseleave", onLeave);
      }
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="couverture"
      className="relative isolate overflow-hidden bg-[#050505] text-white"
      aria-label={t("landing.coverageAria")}
    >
      {/* Perspective floor grid */}
      <div
        className="cov-grid cov-grid-drift pointer-events-none absolute inset-0 opacity-[0.12]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(rgba(153,18,17,0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(153,18,17,0.28) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 28%, black 70%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 28%, black 70%, transparent 100%)",
          transform: "perspective(700px) rotateX(58deg) translateY(18%) scale(1.35)",
          transformOrigin: "center top",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
        }}
      />

      <div className="relative z-10 mx-auto grid min-h-[min(92dvh,740px)] w-full max-w-6xl grid-cols-1 items-stretch gap-8 px-5 py-12 sm:px-6 sm:py-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-4 md:px-10 md:py-16 lg:min-h-[660px]">
        <div className="relative z-10 flex flex-col justify-between gap-12 md:py-8 lg:py-12">
          <header className="cov-copy max-w-md">
            <div className="cov-hud mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
              <span className="cov-live-dot inline-block h-1.5 w-1.5 rounded-full bg-[#e11d1d]" />
              <span>{t("landing.coverageHudLive")}</span>
              <span className="text-white/20">/</span>
              <span>{t("landing.coverageHudNodes")}</span>
            </div>
            <h2 className="font-display text-[clamp(1.75rem,3.8vw,2.55rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-white">
              {t("landing.coverageTitle")}
            </h2>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-white/45 sm:text-[14px]">
              {t("landing.coverageLead")}
            </p>
          </header>

          <div className="cov-foot space-y-4">
            <p className="max-w-xs text-[12px] leading-snug text-white/35 sm:text-[13px]">
              {t("landing.coverageFoot")}
            </p>
            <Link
              href="/signup"
              className="magnet inline-flex w-fit items-center gap-2 border-b border-[#991211] pb-0.5 text-[13px] font-semibold text-white/90 transition hover:gap-3 hover:text-white sm:text-[14px]"
            >
              {t("landing.coverageCta")}
            </Link>
          </div>
        </div>

        <div
          ref={stage}
          className="cov-stage relative flex flex-col items-center justify-center"
        >
          <div className="relative w-full max-w-[300px] sm:max-w-[340px] md:max-w-[380px]">
            {/* HUD corner brackets */}
            <div className="cov-hud pointer-events-none absolute -inset-3 z-20 sm:-inset-4" aria-hidden>
              <span className="absolute left-0 top-0 h-4 w-4 border-l border-t border-[#991211]/70" />
              <span className="absolute right-0 top-0 h-4 w-4 border-r border-t border-[#991211]/70" />
              <span className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-[#991211]/70" />
              <span className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-[#991211]/70" />
              <span className="absolute left-5 top-0 font-mono text-[8px] tracking-[0.2em] text-[#991211]/80">
                TN-GRID
              </span>
              <span className="absolute right-5 top-0 font-mono text-[8px] tracking-[0.2em] text-white/30">
                v2.1
              </span>
            </div>

            <div className="cov-parallax-deep pointer-events-none absolute inset-[-12%] z-0" aria-hidden>
              <div className="cov-ring absolute inset-[4%] rounded-full border border-[#991211]/15" />
              <div className="cov-ring-inner absolute inset-[14%] rounded-full border border-dashed border-white/[0.07]" />
            </div>

            <div className="cov-parallax relative aspect-[3/4] w-full">
              <Image
                src="/landing/tunisia-map.png"
                alt={t("landing.coverageImageAlt")}
                fill
                className="object-contain object-center"
                sizes="(max-width: 768px) 300px, 380px"
                priority={false}
                quality={95}
              />

              {/* Lidar scan */}
              <div
                className="cov-scan pointer-events-none absolute inset-x-0 top-0 z-[5] h-[18%]"
                aria-hidden
                style={{
                  background:
                    "linear-gradient(180deg, transparent 0%, rgba(255,70,60,0.14) 45%, transparent 100%)",
                  boxShadow: "0 0 24px rgba(153,18,17,0.25)",
                }}
              />

              {/* Network links + packets */}
              <svg
                className="pointer-events-none absolute inset-0 z-[6] h-full w-full overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                {LINKS.map(([a, b], i) => {
                  const ha = hub(a);
                  const hb = hub(b);
                  const d = `M ${ha.x} ${ha.y} L ${hb.x} ${hb.y}`;
                  return (
                    <path
                      key={`${a}-${b}`}
                      className="cov-link"
                      data-i={i}
                      d={d}
                      fill="none"
                      stroke="#991211"
                      strokeOpacity={0.55}
                      strokeWidth={0.35}
                      strokeDasharray="3 4"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
                {LINKS.map((_, i) => (
                  <circle
                    key={`p-${i}`}
                    className="cov-packet"
                    r={0.7}
                    fill="#ff6b5a"
                    opacity={0}
                  />
                ))}
              </svg>

              {HUBS.map((h) => {
                const left = h.side === "left";
                return (
                  <div
                    key={h.id}
                    className="cov-hub absolute z-10"
                    style={{ left: `${h.x}%`, top: `${h.y}%` }}
                  >
                    <span className="cov-pulse absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#991211]/40" />
                    <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_2px_rgba(255,80,70,0.55)]" />
                    <div
                      className={`absolute top-1/2 flex -translate-y-1/2 flex-col ${
                        left
                          ? "right-3 items-end sm:right-3.5"
                          : "left-3 items-start sm:left-3.5"
                      }`}
                    >
                      <span className="whitespace-nowrap font-display text-[10px] font-medium tracking-[0.12em] text-white/90 sm:text-[11px]">
                        {t(h.labelKey)}
                      </span>
                      <span className="mt-0.5 font-mono text-[8px] tracking-[0.14em] text-[#991211]/90">
                        {h.code}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="keep-ltr relative mt-2 flex flex-col items-center [perspective:600px]"
              dir="ltr"
              aria-hidden
            >
              <p className="relative font-display text-[clamp(1.65rem,5vw,2.35rem)] font-semibold uppercase tracking-[0.32em] text-transparent">
                <span
                  className="absolute inset-0"
                  style={{ WebkitTextStroke: "1px rgba(153,18,17,0.55)" }}
                >
                  {MENTION.split("").map((ch, i) => (
                    <span key={`o-${i}`} className="cov-letter inline-block">
                      {ch}
                    </span>
                  ))}
                </span>
                <span className="relative text-[#c24a44]">
                  {MENTION.split("").map((ch, i) => (
                    <span key={`f-${i}`} className="cov-letter inline-block">
                      {ch}
                    </span>
                  ))}
                </span>
              </p>
              <p
                className="cov-reflect pointer-events-none mt-0.5 select-none font-display text-[clamp(1.65rem,5vw,2.35rem)] font-semibold uppercase tracking-[0.32em] text-[#991211]/30"
                style={{
                  transform: "scaleY(-1)",
                  maskImage:
                    "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 72%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 72%)",
                }}
              >
                {MENTION}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
