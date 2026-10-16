"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AppRole } from "@/lib/roles";
import {
  portalMobileMore,
  portalMobilePrimary,
  type PortalNavDef,
} from "@/lib/portal-nav-config";
import { useOptionalPortalCreateParcel } from "@/lib/portal-create-parcel";
import { useT } from "@/i18n/locale-context";

function isTabActive(pathname: string, href: string, homeHref: string) {
  if (pathname === href) return true;
  if (href === homeHref) return false;
  return pathname.startsWith(`${href}/`);
}

export function MobileTabBar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const t = useT();
  const createParcel = useOptionalPortalCreateParcel();
  const primary = portalMobilePrimary(role);
  const more = portalMobileMore(role);
  const homeHref = primary[0]?.href ?? "";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = more.some((item) =>
    item.action === "create-parcel"
      ? false
      : isTabActive(pathname, item.href, homeHref),
  );
  const cols = more.length > 0 ? primary.length + 1 : primary.length;

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <>
      {moreOpen && more.length > 0 ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label={t("common.close")}
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] mx-auto w-full max-w-lg px-3">
            <div className="rounded-2xl border border-ops-card bg-ops-page p-2 shadow-ops">
              <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ops-ink/45">
                {t("mobile.more")}
              </p>
              <ul className="grid grid-cols-2 gap-1">
                {more.map((item) => (
                  <MoreLink
                    key={item.href}
                    item={item}
                    active={isTabActive(pathname, item.href, homeHref)}
                    onNavigate={() => setMoreOpen(false)}
                    onCreateParcel={() => {
                      setMoreOpen(false);
                      createParcel?.openCreateParcel();
                    }}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label={t("landing.navAria")}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-ops-ink/10 bg-ops-page/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul
          className="mx-auto grid max-w-lg px-1 pt-1"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {primary.map((tab) => {
            const Icon = tab.icon;
            const isCreate = tab.action === "create-parcel";
            const active = isCreate
              ? Boolean(createParcel?.createOpen)
              : isTabActive(pathname, tab.href, homeHref);
            const className = cn(
              "relative flex min-h-[3.75rem] w-full flex-col items-center justify-center gap-1 px-1 py-2.5 text-[11px] font-semibold tracking-wide transition",
              active
                ? "text-ops-accent"
                : "text-ops-ink/55 hover:text-ops-ink/85",
            );
            const content = (
              <>
                <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 2} />
                <span className="truncate">{t(tab.labelKey)}</span>
                {active ? (
                  <span
                    className="absolute bottom-0 h-0.5 w-8 rounded-full bg-ops-accent"
                    aria-hidden
                  />
                ) : null}
              </>
            );
            return (
              <li key={tab.href}>
                {isCreate ? (
                  <button
                    type="button"
                    className={className}
                    onClick={() => createParcel?.openCreateParcel()}
                  >
                    {content}
                  </button>
                ) : (
                  <Link href={tab.href} className={className}>
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
          {more.length > 0 ? (
            <li>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className={cn(
                  "relative flex min-h-[3.75rem] w-full flex-col items-center justify-center gap-1 px-1 py-2.5 text-[11px] font-semibold tracking-wide transition",
                  moreOpen || moreActive
                    ? "text-ops-accent"
                    : "text-ops-ink/55 hover:text-ops-ink/85",
                )}
              >
                <MoreHorizontal
                  className="h-6 w-6"
                  strokeWidth={moreOpen || moreActive ? 2.4 : 2}
                />
                <span>{t("mobile.more")}</span>
                {moreOpen || moreActive ? (
                  <span
                    className="absolute bottom-0 h-0.5 w-8 rounded-full bg-ops-accent"
                    aria-hidden
                  />
                ) : null}
              </button>
            </li>
          ) : null}
        </ul>
      </nav>
    </>
  );
}

function MoreLink({
  item,
  active,
  onNavigate,
  onCreateParcel,
}: {
  item: PortalNavDef;
  active: boolean;
  onNavigate: () => void;
  onCreateParcel: () => void;
}) {
  const t = useT();
  const Icon = item.icon;
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-semibold transition",
    active
      ? "bg-ops-accent/15 text-ops-accent"
      : "text-ops-ink/80 hover:bg-ops-ink/[0.06]",
  );
  if (item.action === "create-parcel") {
    return (
      <li>
        <button type="button" onClick={onCreateParcel} className={className}>
          <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
          <span className="truncate">{t(item.labelKey)}</span>
        </button>
      </li>
    );
  }
  return (
    <li>
      <Link href={item.href} onClick={onNavigate} className={className}>
        <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
        <span className="truncate">{t(item.labelKey)}</span>
      </Link>
    </li>
  );
}
