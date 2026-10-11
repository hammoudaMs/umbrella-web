"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronRight,
  LogOut,
  RotateCcw,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";
import { portalSidebarLinks } from "@/lib/portal-nav-config";
import { PORTAL_BY_ROLE, ROLE_LABEL, type AppRole } from "@/lib/roles";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { MobileTabBar } from "@/components/MobileTabBar";
import { SupportBotWidget } from "@/components/SupportBotWidget";
import { useConfirm, useToast } from "@/components/Feedback";
import { Avatar } from "@/components/ui";

export type PortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type PortalNavSection = {
  title: string;
  items: PortalNavItem[];
};

type PortalShellProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
  role: AppRole;
  sections?: PortalNavSection[];
  links?: PortalNavItem[];
};

function navItemActive(pathname: string, href: string) {
  if (pathname === href) return true;
  const depth = href.split("/").filter(Boolean).length;
  if (depth < 2) return false;
  return pathname.startsWith(`${href}/`);
}

export function PortalShell({
  children,
  title,
  subtitle,
  sections,
  links,
  role,
}: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut, isMock, resetDemo } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const portalPrefix = PORTAL_BY_ROLE[role];
  const [accountOpen, setAccountOpen] = useState(false);
  const settingsHref = `${portalPrefix}/settings`;

  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [accountOpen]);

  async function onResetDemo() {
    const ok = await confirm({
      title: "Réinitialiser la démo ?",
      description:
        "Toutes les modifications (colis, tickets, paiements, utilisateurs) seront remplacées par les données de démonstration d'origine.",
      confirmLabel: "Réinitialiser",
      tone: "danger",
    });
    if (!ok) return;
    resetDemo();
    toast.success("Démo réinitialisée", "Les données d'origine sont restaurées.");
    router.refresh();
  }

  async function onSignOut() {
    await signOut();
    router.replace("/login");
  }

  const flatItems = useMemo<PortalNavItem[]>(() => {
    if (sections?.length) return sections.flatMap((s) => s.items);
    if (links?.length) return links;
    return portalSidebarLinks(role);
  }, [sections, links, role]);

  const roleLabel = ROLE_LABEL[role];
  const userName = session?.user.name ?? "";
  const firstName = userName.split(/\s+/)[0] || userName;

  return (
    <div className="portal-shell flex min-h-screen text-ops-ink">
      <aside className="portal-sidebar sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col overflow-hidden lg:flex">
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 px-4 pb-3 pt-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-umbrella.png"
                alt=""
                width={40}
                height={40}
                className="h-9 w-9 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-bold tracking-tight text-ops-ink">
                  {title}
                </p>
                <p className="truncate text-[12px] text-ops-ink/45">{subtitle}</p>
              </div>
            </div>
            {isMock ? (
              <p className="mt-2.5 inline-flex rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-[#E1D2A7]">
                Mode démo
              </p>
            ) : null}
          </div>

          <nav className="portal-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-3">
            <div className="space-y-0.5">
              {flatItems.map((item) => {
                const Icon = item.icon;
                const active = navItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition",
                      active
                        ? "bg-gradient-to-r from-ops-accent to-[#7f1d1d] text-white shadow-[0_0_20px_rgba(225,29,72,0.25)]"
                        : "text-ops-ink/55 hover:bg-ops-ink/[0.05] hover:text-ops-ink/90",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        active ? "opacity-100" : "opacity-80",
                      )}
                      strokeWidth={1.9}
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="relative z-10 shrink-0 space-y-3 px-3 pb-3.5 pt-1">
            <Link
              href={settingsHref}
              className="flex items-center gap-2.5 rounded-xl px-1 py-1.5 transition hover:bg-ops-ink/[0.04]"
            >
              <Avatar name={userName} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ops-ink">
                  {firstName}
                </p>
                <p className="truncate text-[11px] text-ops-ink/45">
                  {roleLabel}
                </p>
              </div>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-ops-ink/35"
                aria-hidden
              />
            </Link>

            <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px]">
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="inline-flex items-center gap-1.5 text-ops-ink/45 transition hover:text-ops-ink/80"
              >
                <LogOut className="h-3.5 w-3.5" />
                Déconnexion
              </button>
              {isMock ? (
                <button
                  type="button"
                  onClick={() => void onResetDemo()}
                  className="inline-flex items-center gap-1.5 text-ops-ink/45 transition hover:text-ops-ink/80"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset démo
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="portal-header sticky top-0 z-40 border-b backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 md:h-16 md:gap-4 md:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 lg:hidden">
              <Image
                src="/logo-umbrella.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold leading-tight">
                  {title}
                </p>
                <p className="truncate text-[11px] text-ops-ink/50">
                  {subtitle}
                </p>
              </div>
            </div>

            <form
              className="hidden min-w-0 max-w-xl flex-1 lg:block"
              action={`${portalPrefix}/parcels`}
              method="get"
              role="search"
            >
              <label className="sr-only" htmlFor="portal-search">
                Rechercher
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-ops-card bg-ops-ink/[0.04] px-3 py-2.5 transition focus-within:border-ops-ink/20 focus-within:bg-ops-ink/[0.06]">
                <Search
                  className="h-4 w-4 shrink-0 text-ops-ink/35"
                  aria-hidden
                />
                <input
                  id="portal-search"
                  name="q"
                  placeholder="Rechercher un colis, un client, une référence…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-ops-ink outline-none placeholder:text-ops-ink/30"
                />
              </div>
            </form>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
              <ThemeToggle tone="on-dark" iconOnly />
              {session ? (
                <NotificationsMenu
                  role={role}
                  userId={session.user.id}
                  portalPrefix={portalPrefix}
                  tone="on-dark"
                />
              ) : null}
              <Link
                href={settingsHref}
                className="hidden items-center gap-2 rounded-xl py-1 pl-1 pr-2.5 text-sm font-medium text-ops-ink/90 transition hover:bg-ops-ink/[0.06] lg:inline-flex"
              >
                <Avatar name={userName} className="h-8 w-8" />
                <span className="max-w-[120px] truncate">{userName}</span>
              </Link>
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                className="inline-flex items-center rounded-xl p-1 text-ops-ink/90 transition hover:bg-ops-ink/[0.06] lg:hidden"
                aria-label="Compte"
                aria-expanded={accountOpen}
              >
                <Avatar name={userName} className="h-8 w-8" />
              </button>
            </div>
          </div>
        </header>
        <main className="w-full flex-1 overflow-x-hidden p-3 pb-24 text-ops-ink md:p-4 md:pb-24 lg:px-5 lg:py-3 lg:pb-3">
          {children}
        </main>
        <MobileTabBar role={role} />
      </div>

      {accountOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Fermer le compte"
            onClick={() => setAccountOpen(false)}
          />
          <div className="absolute inset-x-0 top-[3.75rem] mx-auto w-full max-w-lg px-3 md:top-[4.25rem]">
            <div
              role="dialog"
              aria-label="Compte"
              className="rounded-2xl border border-ops-card bg-ops-page p-3 shadow-ops"
            >
              <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                <Avatar name={userName} className="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ops-ink">
                    {userName}
                  </p>
                  <p className="truncate text-[12px] text-ops-ink/45">
                    {roleLabel}
                  </p>
                </div>
              </div>

              <ul className="mt-1 space-y-0.5 border-t border-ops-ink/10 pt-2">
                <li>
                  <Link
                    href={settingsHref}
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-semibold text-ops-ink/80 transition hover:bg-ops-ink/[0.06]"
                  >
                    <Settings className="h-5 w-5 shrink-0" strokeWidth={2} />
                    <span>Paramètres</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-ops-ink/35" />
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      void onSignOut();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-semibold text-ops-ink/80 transition hover:bg-ops-ink/[0.06]"
                  >
                    <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} />
                    <span>Déconnexion</span>
                  </button>
                </li>
                {isMock ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        void onResetDemo();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-semibold text-ops-ink/80 transition hover:bg-ops-ink/[0.06]"
                    >
                      <RotateCcw className="h-5 w-5 shrink-0" strokeWidth={2} />
                      <span>Reset démo</span>
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {session?.accessToken ? <SupportBotWidget /> : null}
    </div>
  );
}
