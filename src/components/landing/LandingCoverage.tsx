"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useT } from "@/i18n/locale-context";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const MENTION = "TUNISIA";

type LogoDot = {
  id: string;
  x: number;
  y: number;
  tone: "red" | "light";
  size: "sm" | "md" | "lg";
};

/** Full top-down umbrella — centered on Tunisia map plate. */
const CANOPY = {
  cx: 52,
  cy: 42,
  rx: 24,
  ry: 19,
  segments: 6,
} as const;

function buildUmbrellaLogoDots(): LogoDot[] {
  const { cx, cy, rx, ry, segments } = CANOPY;
  const dots: LogoDot[] = [];
  let n = 0;

  const push = (
    x: number,
    y: number,
    tone: "red" | "light",
    size: LogoDot["size"] = "sm",
  ) => {
    dots.push({ id: `d-${n++}`, x, y, tone, size });
  };

  // Center tip
  push(cx, cy, "red", "lg");

  for (let s = 0; s < segments; s += 1) {
    const a0 = (s / segments) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((s + 1) / segments) * Math.PI * 2 - Math.PI / 2;
    const panelTone: "red" | "light" = s % 2 === 0 ? "light" : "red";

    for (let r = 0.22; r <= 1; r += 0.13) {
      const steps = r > 0.65 ? 5 : 3;
      for (let i = 1; i < steps; i += 1) {
        const t = i / steps;
        const a = a0 + (a1 - a0) * t;
        push(
          cx + Math.cos(a) * rx * r,
          cy + Math.sin(a) * ry * r,
          panelTone,
          r > 0.85 ? "md" : "sm",
        );
      }
      // Seam ridge (light)
      push(
        cx + Math.cos(a0) * rx * r,
        cy + Math.sin(a0) * ry * r,
        "light",
        "sm",
      );
    }
  }

  // Inner highlight ring (stays inside canopy — no alone outer dots)
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    push(
      cx + Math.cos(a) * rx * 0.38,
      cy + Math.sin(a) * ry * 0.38,
      "light",
      "sm",
    );
  }

  return dots;
}

function buildRibLinks(): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const { cx, cy, rx, ry, segments } = CANOPY;
  const ribs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let s = 0; s < segments; s += 1) {
    const a = (s / segments) * Math.PI * 2 - Math.PI / 2;
    ribs.push({
      x1: cx,
      y1: cy,
      x2: cx + Math.cos(a) * rx,
      y2: cy + Math.sin(a) * ry,
    });
  }
  return ribs;
}

const SIZE_PX: Record<LogoDot["size"], string> = {
  sm: "h-1 w-1",
  md: "h-1.5 w-1.5",
  lg: "h-2 w-2",
};

export function LandingCoverage() {
  const t = useT();
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const logoDots = useMemo(() => buildUmbrellaLogoDots(), []);
  const ribs = useMemo(() => buildRibLinks(), []);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const scope = root.current;
      if (!scope) return;

      if (reduce) {
        gsap.set(
          scope.querySelectorAll(
            ".cov-copy, .cov-foot, .cov-stage, .cov-dot, .cov-letter, .cov-signal, .cov-hud, .cov-rib, .cov-packet, .cov-map",
          ),
          { clearProps: "all", autoAlpha: 1, y: 0, scale: 1 },
        );
        gsap.set(".cov-scan", { autoAlpha: 0 });
        gsap.set(".cov-signal-courier", { left: "100%", autoAlpha: 0 });
        return;
      }

      gsap.set(".cov-copy", { autoAlpha: 0, y: 26 });
      gsap.set(".cov-foot", { autoAlpha: 0, y: 16 });
      gsap.set(".cov-stage", { autoAlpha: 0, scale: 0.96 });
      gsap.set(".cov-dot", { autoAlpha: 0, scale: 0.2 });
      gsap.set(".cov-letter", { autoAlpha: 0, y: 14, rotateX: -40 });
      gsap.set(".cov-signal", { autoAlpha: 0, y: 8 });
      gsap.set(".cov-signal-node", { scale: 0.6, opacity: 0.35 });
      gsap.set(".cov-signal-courier", {
        left: "0%",
        xPercent: -50,
        yPercent: -50,
        top: "50%",
        autoAlpha: 0,
        scale: 0.8,
      });
      gsap.set(".cov-hud", { autoAlpha: 0, y: -8 });
      gsap.set(".cov-rib", { strokeDashoffset: 80 });
      gsap.set(".cov-scan", { top: "0%", yPercent: -50, autoAlpha: 0 });
      gsap.set(".cov-grid", { autoAlpha: 0 });
      gsap.set(".cov-map", { filter: "brightness(1) saturate(1)" });
      gsap.set(".cov-word", { letterSpacing: "0.32em" });
      gsap.set(".cov-letter-fill", {
        transformOrigin: "50% 80%",
        transformPerspective: 600,
      });

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
          ".cov-rib",
          {
            strokeDashoffset: 0,
            duration: 0.9,
            stagger: 0.05,
            ease: "power2.inOut",
          },
          0.3,
        )
        .to(
          ".cov-dot",
          { autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.008 },
          0.45,
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
        .to(".cov-signal", { autoAlpha: 1, y: 0, duration: 0.5 }, 1.1)
        .to(
          ".cov-signal-node",
          { scale: 1, opacity: 1, duration: 0.35, stagger: 0.12, ease: "power2.out" },
          1.2,
        )
        .to(".cov-foot", { autoAlpha: 1, y: 0, duration: 0.5 }, 1.05);

      const runCourier = (duration = 2.1) =>
        gsap
          .timeline()
          .set(".cov-signal-courier", {
            left: "0%",
            xPercent: -50,
            autoAlpha: 0,
            scale: 0.75,
          })
          .to(".cov-signal-courier", {
            autoAlpha: 1,
            scale: 1,
            duration: 0.18,
            ease: "power2.out",
          })
          .to(
            ".cov-signal-courier",
            { left: "100%", duration, ease: "power1.inOut" },
            0,
          )
          .to(
            ".cov-signal-courier",
            {
              autoAlpha: 0,
              scale: 0.75,
              duration: 0.2,
              ease: "power2.in",
            },
            "-=0.2",
          )
          .to(
            ".cov-signal-node-sud",
            {
              scale: 1.45,
              duration: 0.2,
              ease: "power2.out",
              yoyo: true,
              repeat: 1,
            },
            "-=0.12",
          );

      const courierLoop = gsap.timeline({
        repeat: -1,
        repeatDelay: 0.9,
        scrollTrigger: {
          trigger: scope,
          start: "top 75%",
          toggleActions: "play pause play pause",
        },
      });
      courierLoop.add(runCourier(2.15), 1.45);

      const pulseTunisia = () => {
        const fills = scope.querySelectorAll<HTMLElement>(".cov-letter-fill");
        const outlines = scope.querySelectorAll<HTMLElement>(".cov-letter-outline");

        gsap
          .timeline()
          .to(".cov-map", {
            filter: "brightness(1.45) saturate(1.3)",
            scale: 1.03,
            transformOrigin: "50% 50%",
            duration: 0.32,
            ease: "power2.out",
          })
          .to(
            ".cov-dot",
            {
              scale: 1.28,
              duration: 0.24,
              stagger: { each: 0.004, from: "center" },
              ease: "power2.out",
            },
            0,
          )
          .fromTo(
            fills,
            {
              y: 10,
              rotateX: -55,
              scale: 0.86,
              color: "#991211",
              textShadow: "0 0 0 rgba(255,90,70,0)",
            },
            {
              y: 0,
              rotateX: 0,
              scale: 1.08,
              color: "#F0E6DC",
              textShadow: "0 0 18px rgba(255,90,70,0.75)",
              duration: 0.42,
              stagger: 0.045,
              ease: "back.out(1.7)",
            },
            0,
          )
          .fromTo(
            outlines,
            { y: 8, autoAlpha: 0.35 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.38,
              stagger: 0.045,
              ease: "power2.out",
            },
            0.02,
          )
          .to(
            ".cov-word",
            { letterSpacing: "0.42em", duration: 0.35, ease: "power2.out" },
            0,
          )
          .to(
            fills,
            {
              scale: 1,
              color: "#c24a44",
              textShadow: "0 0 0 rgba(255,90,70,0)",
              duration: 0.55,
              stagger: 0.03,
              ease: "power3.out",
            },
            0.45,
          )
          .to(
            ".cov-word",
            { letterSpacing: "0.32em", duration: 0.55, ease: "power3.out" },
            0.45,
          )
          .to(".cov-map", {
            filter: "brightness(1) saturate(1)",
            scale: 1,
            duration: 0.6,
            ease: "power3.out",
          }, 0.4)
          .to(
            ".cov-dot",
            { scale: 1, duration: 0.45, stagger: 0.003, ease: "power2.inOut" },
            0.4,
          );
      };

      const scanLoop = gsap.timeline({
        repeat: -1,
        repeatDelay: 1.1,
        scrollTrigger: {
          trigger: scope,
          start: "top 75%",
          toggleActions: "play pause play pause",
        },
      });

      scanLoop
        .set(".cov-scan", { top: "0%", yPercent: -50, autoAlpha: 0 })
        .to(".cov-scan", {
          autoAlpha: 0.85,
          duration: 0.25,
          ease: "power1.out",
        })
        .to(
          ".cov-scan",
          {
            top: "100%",
            duration: 2.6,
            ease: "none",
          },
          0,
        )
        .to(
          ".cov-scan",
          { autoAlpha: 0, duration: 0.28, ease: "power1.in" },
          "-=0.28",
        )
        .call(pulseTunisia);

      gsap.to(".cov-grid-drift", {
        backgroundPosition: "0px 72px",
        duration: 14,
        ease: "none",
        repeat: -1,
      });

      scope.querySelectorAll<SVGPathElement>(".cov-rib").forEach((el, i) => {
        gsap.to(el, {
          strokeDashoffset: -80,
          duration: 4 + i * 0.2,
          ease: "none",
          repeat: -1,
        });
      });

      scope.querySelectorAll<SVGCircleElement>(".cov-packet").forEach((el, i) => {
        const path = scope.querySelector<SVGPathElement>(
          `.cov-rib[data-i="${i % ribs.length}"]`,
        );
        if (!path) return;
        const len = path.getTotalLength();
        const prog = { t: 0 };
        gsap.set(el, { opacity: 0.85 });
        gsap.to(prog, {
          t: 1,
          duration: 2.2 + (i % 3) * 0.35,
          ease: "none",
          repeat: -1,
          delay: i * 0.3,
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
          { scale: 0.5, opacity: 0.45 },
          {
            scale: 2.1,
            opacity: 0,
            duration: 2.4,
            ease: "power1.out",
            repeat: -1,
            delay: i * 0.35,
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
    { scope: root, dependencies: [ribs.length] },
  );

  return (
    <section
      ref={root}
      id="couverture"
      className="relative isolate overflow-hidden bg-[#050505] text-white"
      aria-label={t("landing.coverageAria")}
    >
      <div
        className="cov-grid cov-grid-drift pointer-events-none absolute inset-0 z-0 h-full min-h-full w-full opacity-[0.18]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(rgba(153,18,17,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(153,18,17,0.38) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px",
          backgroundRepeat: "repeat",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04] mix-blend-overlay"
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

            <div className="cov-parallax relative aspect-[3/4] w-full overflow-hidden">
              <Image
                src="/landing/tunisia-map.png?v=no-hubs"
                alt={t("landing.coverageImageAlt")}
                fill
                className="cov-map object-contain object-center will-change-transform"
                sizes="(max-width: 768px) 300px, 380px"
                priority={false}
                quality={95}
                unoptimized
              />

              <div
                className="cov-scan pointer-events-none absolute inset-x-0 z-[5] h-[16%] min-h-[48px]"
                aria-hidden
                style={{
                  background:
                    "linear-gradient(180deg, transparent 0%, rgba(255,70,60,0.18) 40%, rgba(153,18,17,0.4) 50%, rgba(255,70,60,0.18) 60%, transparent 100%)",
                  boxShadow: "0 0 28px rgba(153,18,17,0.4)",
                }}
              />

              <svg
                className="pointer-events-none absolute inset-0 z-[6] h-full w-full overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                {ribs.map((rib, i) => (
                  <path
                    key={`rib-${i}`}
                    className="cov-rib"
                    data-i={i}
                    d={`M ${rib.x1} ${rib.y1} L ${rib.x2} ${rib.y2}`}
                    fill="none"
                    stroke="#991211"
                    strokeOpacity={0.4}
                    strokeWidth={0.28}
                    strokeDasharray="2.5 3.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {ribs.map((_, i) => (
                  <circle
                    key={`p-${i}`}
                    className="cov-packet"
                    r={0.55}
                    fill="#E5DBD4"
                    opacity={0}
                  />
                ))}
              </svg>

              {logoDots.map((d) => {
                const isLight = d.tone === "light";
                const pulse = d.size === "lg";
                return (
                  <div
                    key={d.id}
                    className="cov-dot absolute z-10"
                    style={{ left: `${d.x}%`, top: `${d.y}%` }}
                    aria-hidden
                  >
                    {pulse ? (
                      <span className="cov-pulse absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#991211]/35" />
                    ) : null}
                    <span
                      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${SIZE_PX[d.size]} ${
                        isLight
                          ? "bg-[#F0E6DC] shadow-[0_0_10px_3px_rgba(240,230,220,0.7)]"
                          : "bg-[#991211] shadow-[0_0_9px_2px_rgba(153,18,17,0.75)]"
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            <div
              className="keep-ltr relative mt-2 flex flex-col items-center [perspective:600px]"
              dir="ltr"
              aria-hidden
            >
              <p className="cov-word relative font-display text-[clamp(1.65rem,5vw,2.35rem)] font-semibold uppercase tracking-[0.32em] text-transparent">
                <span
                  className="absolute inset-0"
                  style={{ WebkitTextStroke: "1px rgba(153,18,17,0.55)" }}
                >
                  {MENTION.split("").map((ch, i) => (
                    <span
                      key={`o-${i}`}
                      className="cov-letter cov-letter-outline inline-block"
                    >
                      {ch}
                    </span>
                  ))}
                </span>
                <span className="relative text-[#c24a44]">
                  {MENTION.split("").map((ch, i) => (
                    <span
                      key={`f-${i}`}
                      className="cov-letter cov-letter-fill inline-block will-change-transform"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      {ch}
                    </span>
                  ))}
                </span>
              </p>
              <div
                className="cov-signal mt-3 flex w-full max-w-[220px] flex-col items-center gap-2"
                aria-hidden
              >
                <div className="relative h-3 w-full">
                  <span className="cov-signal-node absolute left-0 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F0E6DC] shadow-[0_0_8px_rgba(240,230,220,0.7)]" />
                  <span className="cov-signal-node cov-signal-node-sud absolute right-0 top-1/2 h-1.5 w-1.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F0E6DC] shadow-[0_0_8px_rgba(240,230,220,0.7)]" />
                  <span className="cov-signal-courier absolute top-1/2 h-2 w-2 rounded-full bg-[#991211] shadow-[0_0_12px_3px_rgba(153,18,17,0.85)]" />
                </div>
                <p className="flex w-full items-center justify-between font-mono text-[9px] uppercase tracking-[0.28em] text-white/35">
                  <span>Nord</span>
                  <span>Sud</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
