"use client";

import { RequireRole } from "@/components/RequireRole";
import { portalSidebarLinks } from "@/lib/portal-nav-config";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireRole
      roles={["FINANCE"]}
      title="Finance"
      subtitle="Flux d’argent"
      links={portalSidebarLinks("FINANCE")}
    >
      {children}
    </RequireRole>
  );
}
