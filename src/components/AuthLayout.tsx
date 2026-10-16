"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { LocaleToggle } from "@/components/LocaleToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/i18n/locale-context";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useT();
  const highlights = [
    t("auth.highlightTrack"),
    t("auth.highlightCod"),
    t("auth.highlightFleet"),
  ];

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#1A1414] text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Image
            src="/assets/hero-van-night.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 52vw, 0px"
            className="object-cover object-[68%_48%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1A1414] from-[8%] via-[#1A1414]/88 via-[42%] to-[#1A1414]/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1414] from-[0%] via-transparent via-[45%] to-[#1A1414]/55" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/logo-umbrella.png"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
            />
            <span className="font-display text-2xl font-extrabold tracking-tight text-white">
              Umbrella Express
            </span>
          </Link>
          <div className="max-w-md space-y-6">
            <p className="font-display text-4xl font-extrabold leading-tight text-white">
              {t("auth.tagline")}
            </p>
            <ul className="space-y-3">
              {highlights.map((h) => (
                <li
                  key={h}
                  className="flex items-center gap-3 text-sm text-[#E5DBD4]"
                >
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-[#E8C07A]"
                    aria-hidden
                  />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/50">{t("auth.copyright")}</p>
        </div>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="absolute end-4 top-4 flex items-center gap-2">
          <LocaleToggle compact />
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 lg:hidden"
          >
            <Image
              src="/logo-umbrella.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <span className="font-display text-xl font-extrabold text-brand">
              Umbrella Express
            </span>
          </Link>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
          ) : null}
          <div className="mt-8">{children}</div>
          {footer ? (
            <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
