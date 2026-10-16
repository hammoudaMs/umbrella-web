"use client";

import { useMemo, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Banknote,
  Clock3,
  MapPinned,
  Package,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { JourneyTruck } from "@/components/landing/JourneyTruck";
import {
  DepotIllustration,
  HomeIllustration,
} from "@/components/landing/JourneyLandmarks";
import { JOURNEY_STEP_KEYS } from "@/components/landing/landing-data";
import { useT } from "@/i18n/locale-context";

gsap.registerPlugin(useGSAP, ScrollTrigger, MotionPathPlugin);

const STEP_ICONS: Record<(typeof JOURNEY_STEP_KEYS)[number]["icon"], LucideIcon> = {
  pickup: Package,
  fast: Zap,
  local: MapPinned,
  safe: ShieldCheck,
  cod: Banknote,
  ontime: Clock3,
};

type StepTone = "white" | "cream" | "red" | "ink";

const TONE_CLASS: Record<
  StepTone,
  { card: string; icon: string; title: string; body: string; num: string }
> = {
  white: {
    card: "bg-white text-black ring-1 ring-black/[0.06]",
    icon: "bg-[#991211]/10 text-[#991211]",
    title: "text-black",
    body: "text-black/55",
    num: "text-black/25",
  },
  cream: {
    card: "bg-[#E5DBD4] text-black ring-1 ring-black/[0.05]",
    icon: "bg-black/[0.07] text-black",
    title: "text-black",
    body: "text-black/55",
    num: "text-black/20",
  },
  red: {
    card: "bg-[#991211] text-white ring-1 ring-white/10",
    icon: "bg-white/15 text-white",
    title: "text-white",
    body: "text-white/70",
    num: "text-white/30",
  },
  ink: {
    card: "bg-[#0A0A0A] text-white ring-1 ring-white/10",
    icon: "bg-white/12 text-white",
    title: "text-white",
    body: "text-white/65",
    num: "text-white/25",
  },
};

const PATH_D =
  "M50 260 C 160 260, 200 90, 350 90 C 500 90, 530 270, 680 270 C 820 270, 880 130, 950 110";

const NODES = [
  { cx: 50, cy: 260, at: 0 },
  { cx: 350, cy: 90, at: 0.35 },
  { cx: 680, cy: 270, at: 0.68 },
  { cx: 950, cy: 110, at: 1 },
] as const;

export function LandingScrollJourney() {
  const t = useT();
  const root = useRef<HTMLElement>(null);
  const steps = useMemo(
    () =>
      JOURNEY_STEP_KEYS.map((step) => ({
        ...step,
        title: t(step.titleKey),
        body: t(step.bodyKey),
        Icon: STEP_ICONS[step.icon],
      })),
    [t],
  );

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!root.current) return;

      const truck = root.current.querySelector<HTMLElement>(".journey-truck");
      const pathEl = root.current.querySelector<SVGPathElement>("#umbrella-journey-path");
      const progressEl = root.current.querySelector<SVGPathElement>("#umbrella-journey-progress");
      const track = root.current.querySelector<HTMLElement>(".journey-track");
      const mobileSteps = root.current.querySelectorAll<HTMLElement>(".journey-mobile-step");

      if (reduce) {
        gsap.set(".journey-step, .journey-mobile-step", { autoAlpha: 1, y: 0, scale: 1 });
        gsap.set(".journey-headline, .journey-landmark", {
          autoAlpha: 1,
          y: 0,
          scale: 1,
        });
        gsap.set(".journey-node", { opacity: 1 });
        return;
      }

      // Mobile: simple stagger, no path truck.
      if (mobileSteps.length && window.matchMedia("(max-width: 1023px)").matches) {
        gsap.set(".journey-headline", { autoAlpha: 0, y: 12 });
        gsap.set(mobileSteps, { autoAlpha: 0, y: 14 });
        ScrollTrigger.create({
          trigger: root.current,
          start: "top 70%",
          onEnter: () => {
            gsap.to(".journey-headline", { autoAlpha: 1, y: 0, duration: 0.4 });
            gsap.to(mobileSteps, {
              autoAlpha: 1,
              y: 0,
              stagger: 0.06,
              duration: 0.4,
              ease: "power2.out",
            });
          },
          onEnterBack: () => {
            gsap.set(".journey-headline", { autoAlpha: 1, y: 0 });
            gsap.set(mobileSteps, { autoAlpha: 1, y: 0 });
          },
        });
        return;
      }

      if (!truck || !pathEl || !track) return;

      const svg = pathEl.ownerSVGElement;
      if (!svg) return;

      const pathLen = progressEl?.getTotalLength() ?? 0;

      const rawPath = MotionPathPlugin.getRawPath(pathEl);
      MotionPathPlugin.cacheRawPathMeasurements(rawPath);

      const placeTruck = (progress: number) => {
        const point = MotionPathPlugin.getPositionOnPath(
          rawPath,
          progress,
          true,
        ) as { x: number; y: number; angle: number };
        const ctm = pathEl.getScreenCTM();
        if (!ctm) return;

        const svgPoint = svg.createSVGPoint();
        svgPoint.x = point.x;
        svgPoint.y = point.y;
        const screen = svgPoint.matrixTransform(ctm);
        const box = track.getBoundingClientRect();

        gsap.set(truck, {
          x: screen.x - box.left,
          y: screen.y - box.top,
          xPercent: -50,
          yPercent: -82,
          rotation: point.angle,
          transformOrigin: "50% 82%",
        });

        if (progressEl && pathLen) {
          gsap.set(progressEl, {
            strokeDashoffset: pathLen * (1 - progress),
          });
        }

        NODES.forEach((_, i) => {
          const lit = progress >= NODES[i].at - 0.02;
          gsap.to(`.journey-node-${i}`, {
            opacity: lit ? 1 : 0.4,
            duration: 0.25,
            overwrite: "auto",
          });
        });
      };

      const revealStep = (index: number) => {
        gsap.fromTo(
          `.journey-step-${index}`,
          { autoAlpha: 0, y: 22, scale: 0.9 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.45,
            ease: "power2.out",
            overwrite: "auto",
          },
        );
      };

      gsap.set(".journey-step", { autoAlpha: 0, y: 22, scale: 0.9 });
      gsap.set(".journey-headline", { autoAlpha: 0, y: 14 });
      gsap.set(".journey-landmark", { autoAlpha: 0, scale: 0.88, y: 10 });
      gsap.set(".journey-node", { opacity: 0.4 });
      if (progressEl && pathLen) {
        gsap.set(progressEl, {
          strokeDasharray: pathLen,
          strokeDashoffset: pathLen,
        });
      }
      placeTruck(0);

      let active: gsap.core.Timeline | null = null;

      const play = () => {
        gsap.set(".journey-step", { autoAlpha: 0, y: 22, scale: 0.9 });
        gsap.set(".journey-landmark", { autoAlpha: 0, scale: 0.88, y: 10 });
        gsap.set(".journey-node", { opacity: 0.4 });
        if (progressEl && pathLen) {
          gsap.set(progressEl, { strokeDashoffset: pathLen });
        }
        placeTruck(0);

        const revealed = new Set<number>();
        const progress = { t: 0 };
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

        tl.to(".journey-headline", { autoAlpha: 1, y: 0, duration: 0.45 }, 0)
          .to(
            ".journey-depot",
            { autoAlpha: 1, scale: 1, y: 0, duration: 0.45 },
            0.08,
          )
          .to(
            ".journey-home",
            { autoAlpha: 1, scale: 1, y: 0, duration: 0.45 },
            0.16,
          )
          .to(
            progress,
            {
              t: 1,
              duration: 4.2,
              ease: "power1.inOut",
              onUpdate: () => {
                placeTruck(progress.t);
                JOURNEY_STEP_KEYS.forEach((step, i) => {
                  if (!revealed.has(i) && progress.t >= step.at) {
                    revealed.add(i);
                    revealStep(i);
                  }
                });
              },
            },
            0.35,
          );

        return tl;
      };

      ScrollTrigger.create({
        trigger: root.current,
        start: "top 65%",
        onEnter: () => {
          active?.kill();
          active = play();
        },
        onEnterBack: () => {
          active?.kill();
          active = play();
        },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="parcours"
      className="relative overflow-hidden bg-[#EFE8E0] py-10 sm:py-12 md:py-14"
      aria-label={t("landing.journeyAria")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(153,18,17,0.12) 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-5 sm:px-6 md:px-10 lg:px-14">
        <div className="journey-headline relative z-20 mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-start">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#991211]/70 sm:text-[11px]">
            / {t("landing.journeyEyebrow")}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-black sm:text-3xl md:text-[2rem]">
            {t("landing.journeyTitle")}
          </h2>
          <p className="mx-auto mt-1 max-w-lg text-[13px] leading-snug text-black/55 sm:text-[14px] lg:mx-0">
            {t("landing.journeyBody")}
          </p>
        </div>

        {/* Mobile — compact centered step list (no overlapping path cards) */}
        <ul className="mt-4 grid grid-cols-2 content-start gap-2 sm:gap-2.5 lg:hidden">
          {steps.map((step, i) => {
            const Icon = step.Icon;
            const tone = TONE_CLASS[step.tone];
            const n = String(i + 1).padStart(2, "0");
            return (
              <li
                key={step.titleKey}
                className={`journey-mobile-step rounded-xl px-2.5 py-2.5 text-center sm:p-3 ${tone.card}`}
              >
                <span
                  className={`mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full sm:h-7 sm:w-7 ${tone.icon}`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <p className={`mt-1 font-display text-[10px] font-bold tracking-wide ${tone.num}`}>
                  {n}
                </p>
                <h3 className={`mt-0.5 font-display text-[13px] font-semibold ${tone.title}`}>
                  {step.title}
                </h3>
                <p className={`mt-0.5 text-[10px] leading-snug ${tone.body}`}>{step.body}</p>
              </li>
            );
          })}
        </ul>

        {/* Desktop — path + truck (fixed height, no viewport stretch) */}
        <div className="journey-track relative mt-4 hidden h-[320px] w-full lg:block xl:h-[340px]">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1000 360"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <path
              d={PATH_D}
              stroke="#D8D0BE"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.55"
            />
            <path
              d={PATH_D}
              stroke="#B8AFA0"
              strokeWidth="2"
              strokeDasharray="6 10"
              strokeLinecap="round"
            />
            <path
              id="umbrella-journey-progress"
              d={PATH_D}
              stroke="#991211"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              id="umbrella-journey-path"
              d={PATH_D}
              stroke="transparent"
              strokeWidth="3"
            />
            {NODES.map((node, i) => (
              <g key={node.cx} className={`journey-node journey-node-${i}`}>
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="11"
                  fill="#991211"
                  fillOpacity="0.12"
                />
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="5.5"
                  fill={i % 2 === 0 ? "#991211" : "#0A0A0A"}
                />
                <circle cx={node.cx} cy={node.cy} r="2" fill="#E5DBD4" />
              </g>
            ))}
          </svg>

          <div className="journey-landmark journey-depot absolute left-[0%] top-[48%] z-[11] w-[68px]">
            <DepotIllustration />
          </div>
          <div className="journey-landmark journey-home absolute right-[0%] top-[6%] z-[11] w-[64px]">
            <HomeIllustration />
          </div>

          <div className="pointer-events-none absolute inset-0 z-10">
            {steps.map((step, i) => {
              const Icon = step.Icon;
              const tone = TONE_CLASS[step.tone];
              const n = String(i + 1).padStart(2, "0");
              return (
                <article
                  key={step.titleKey}
                  className={`journey-step journey-step-${i} absolute w-[128px] -translate-x-1/2 rounded-xl p-3 ${tone.card}`}
                  style={step.style}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${tone.icon}`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span
                      className={`font-display text-[10px] font-bold tracking-wide ${tone.num}`}
                    >
                      {n}
                    </span>
                  </div>
                  <h3
                    className={`mt-1.5 font-display text-[13px] font-semibold ${tone.title}`}
                  >
                    {step.title}
                  </h3>
                  <p className={`mt-0.5 text-[11px] leading-snug ${tone.body}`}>
                    {step.body}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="journey-truck absolute left-0 top-0 z-20 w-[58px] will-change-transform">
            <JourneyTruck className="w-full" faceRight />
          </div>
        </div>
      </div>
    </section>
  );
}
