"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { AppRole } from "@/lib/roles";
import {
  PortalShell,
  type PortalNavItem,
  type PortalNavSection,
} from "@/components/PortalShell";
import { useT } from "@/i18n/locale-context";
import { roleHomeUrl } from "@/tenants/resolve";

type RequireRoleProps = {
  children: React.ReactNode;
  roles: AppRole[];
  title: string;
  subtitle: string;
  links?: PortalNavItem[];
  sections?: PortalNavSection[];
};

function Guard({
  children,
  roles,
  title,
  subtitle,
  links,
  sections,
}: RequireRoleProps) {
  const { session, ready } = useAuth();
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!roles.includes(session.user.role)) {
      const home = roleHomeUrl(session.user.role);
      if (home.startsWith("http")) {
        window.location.assign(home);
        return;
      }
      router.replace(home || "/login");
    }
  }, [ready, session, roles, router]);

  if (!ready || !session || !roles.includes(session.user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-muted">
        {t("common.sessionCheck")}
      </div>
    );
  }

  return (
    <PortalShell
      title={title}
      subtitle={subtitle}
      links={links}
      sections={sections}
      role={session.user.role}
    >
      {children}
    </PortalShell>
  );
}

export function RequireRole(props: RequireRoleProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-ink-muted">
          …
        </div>
      }
    >
      <Guard {...props} />
    </Suspense>
  );
}
