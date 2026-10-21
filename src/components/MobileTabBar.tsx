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

  const createIndex = primary.findIndex((tab) => tab.action === "create-parcel");
  const createTab = createIndex >= 0 ? primary[createIndex] : null;
  const leftTabs =
    createIndex >= 0 ? primary.slice(0, createIndex) : primary;
  const rightTabs =
    createIndex >= 0 ? primary.slice(createIndex + 1) : [];

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
        <div className="mx-auto flex max-w-lg items-end px-1 pt-1">
          <ul className="flex min-w-0 flex-1 items-stretch justify-evenly">
            {leftTabs.map((tab) => (
              <TabLink
                key={tab.href}
                tab={tab}
                active={
                  !moreOpen && isTabActive(pathname, tab.href, homeHref)
                }
              />
            ))}
          </ul>

          {createTab ? (
            <CreateFab
              tab={createTab}
              active={!moreOpen && Boolean(createParcel?.createOpen)}
              onClick={() => createParcel?.openCreateParcel()}
            />
          ) : null}

          <ul className="flex min-w-0 flex-1 items-stretch justify-evenly">
            {rightTabs.map((tab) => (
              <TabLink
                key={tab.href}
                tab={tab}
                active={
                  !moreOpen && isTabActive(pathname, tab.href, homeHref)
                }
              />
            ))}
            {more.length > 0 ? (
              <li className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  className={cn(
                    "relative flex min-h-[3.75rem] w-full flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-[11px] font-semibold tracking-wide",
                    "transition-[color,transform] duration-300 ease-out",
                    moreOpen || moreActive
                      ? "-translate-y-1.5 text-ops-accent"
                      : "translate-y-0 text-ops-ink/55 hover:text-ops-ink/85",
                  )}
                >
                  <MoreHorizontal
                    className={cn(
                      "h-6 w-6 transition-transform duration-300 ease-out",
                      moreOpen || moreActive ? "scale-110" : "scale-100",
                    )}
                    strokeWidth={moreOpen || moreActive ? 2.4 : 2}
                  />
                  <span className="truncate">{t("mobile.more")}</span>
                  <span
                    className={cn(
                      "absolute bottom-0 h-0.5 w-8 rounded-full bg-ops-accent transition-all duration-300 ease-out",
                      moreOpen || moreActive
                        ? "scale-x-100 opacity-100"
                        : "scale-x-0 opacity-0",
                    )}
                    aria-hidden
                  />
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      </nav>
    </>
  );
}

function CreateFab({
  tab,
  active,
  onClick,
}: {
  tab: PortalNavDef;
  active: boolean;
  onClick: () => void;
}) {
  const t = useT();
  const Icon = tab.icon;
  return (
    <div className="relative z-10 flex w-[4.5rem] shrink-0 flex-col items-center justify-end pb-0.5">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative -mt-5 flex flex-col items-center justify-center gap-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent/50",
        )}
        aria-label={t(tab.labelKey)}
        aria-pressed={active}
      >
        <span
          className={cn(
            "inline-flex h-12 w-12 items-center justify-center rounded-full border-4 border-ops-page bg-ops-accent text-white shadow-[0_6px_16px_-4px_rgba(0,0,0,0.45)] transition hover:brightness-110",
            active && "brightness-110",
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={2.6} />
        </span>
        <span
          className={cn(
            "max-w-full truncate text-[10px] font-semibold tracking-wide",
            active ? "text-ops-accent" : "text-ops-ink/55",
          )}
        >
          {t(tab.labelKey)}
        </span>
      </button>
    </div>
  );
}

function TabLink({
  tab,
  active,
}: {
  tab: PortalNavDef;
  active: boolean;
}) {
  const t = useT();
  const Icon = tab.icon;
  return (
    <li className="min-w-0 flex-1">
      <Link
        href={tab.href}
        className={cn(
          "relative flex min-h-[3.75rem] w-full flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-[11px] font-semibold tracking-wide",
          "transition-[color,transform] duration-300 ease-out",
          active
            ? "-translate-y-1.5 text-ops-accent"
            : "translate-y-0 text-ops-ink/55 hover:text-ops-ink/85",
        )}
      >
        <Icon
          className={cn(
            "h-6 w-6 transition-transform duration-300 ease-out",
            active ? "scale-110" : "scale-100",
          )}
          strokeWidth={active ? 2.4 : 2}
        />
        <span className="truncate">{t(tab.labelKey)}</span>
        <span
          className={cn(
            "absolute bottom-0 h-0.5 w-8 rounded-full bg-ops-accent transition-all duration-300 ease-out",
            active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
          )}
          aria-hidden
        />
      </Link>
    </li>
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
