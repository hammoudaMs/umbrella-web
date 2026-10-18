import {
  Banknote,
  BarChart3,
  Box,
  Boxes,
  Building2,
  ClipboardList,
  CreditCard,
  Home,
  MapPin,
  MessageSquare,
  Package,
  Palette,
  RefreshCw,
  Route,
  Scale,
  ScanLine,
  Settings,
  Ticket,
  Truck,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { PORTAL_BY_ROLE, type AppRole } from "@/lib/roles";

export type PortalNavDef = {
  href: string;
  /** i18n key under `nav.*` */
  labelKey: string;
  icon: LucideIcon;
  /** Shown as a primary bottom-tab item on mobile. */
  mobilePrimary?: boolean;
  /** Open in-place UI instead of navigating (e.g. create parcel modal). */
  action?: "create-parcel";
};

function withMessages(base: string, items: PortalNavDef[]): PortalNavDef[] {
  const settingsIdx = items.findIndex(
    (i) =>
      i.href.endsWith("/settings") ||
      i.labelKey === "nav.profile" ||
      i.labelKey === "nav.settings",
  );
  const msg: PortalNavDef = {
    href: `${base}/messages`,
    labelKey: "nav.messages",
    icon: MessageSquare,
  };
  if (settingsIdx >= 0) {
    return [...items.slice(0, settingsIdx), msg, ...items.slice(settingsIdx)];
  }
  return [...items, msg];
}

export function portalNavFor(role: AppRole): PortalNavDef[] {
  const base = PORTAL_BY_ROLE[role];

  if (role === "LIVREUR") {
    return withMessages(base, [
      { href: base, labelKey: "nav.today", icon: Home, mobilePrimary: true },
      {
        href: `${base}/parcels`,
        labelKey: "nav.parcels",
        icon: Package,
        mobilePrimary: true,
      },
      {
        href: `${base}/versement`,
        labelKey: "nav.versement",
        icon: Banknote,
        mobilePrimary: true,
      },
      { href: `${base}/zones`, labelKey: "nav.zones", icon: MapPin },
      { href: `${base}/scanner`, labelKey: "nav.scanner", icon: ScanLine },
      { href: `${base}/settings`, labelKey: "nav.profile", icon: Settings },
    ]);
  }

  if (role === "CLIENT") {
    return withMessages(base, [
      { href: base, labelKey: "nav.home", icon: Home, mobilePrimary: true },
      {
        href: `${base}/parcels`,
        labelKey: "nav.parcels",
        icon: Package,
        mobilePrimary: true,
      },
      {
        href: "/track",
        labelKey: "nav.track",
        icon: Route,
        mobilePrimary: true,
      },
      { href: `${base}/scanner`, labelKey: "nav.scanner", icon: ScanLine },
      {
        href: `${base}/tickets`,
        labelKey: "nav.tickets",
        icon: Ticket,
        mobilePrimary: true,
      },
      { href: `${base}/settings`, labelKey: "nav.profile", icon: Settings },
    ]);
  }

  if (role === "EXPEDITEUR") {
    return withMessages(base, [
      { href: base, labelKey: "nav.home", icon: Home, mobilePrimary: true },
      {
        href: `${base}/parcels`,
        labelKey: "nav.parcels",
        icon: Package,
        mobilePrimary: true,
      },
      {
        href: `${base}/nouveau`,
        labelKey: "nav.nouveau",
        icon: Box,
        mobilePrimary: true,
        action: "create-parcel",
      },
      {
        href: `${base}/scanner`,
        labelKey: "nav.scanner",
        icon: ScanLine,
        mobilePrimary: true,
      },
      {
        href: `${base}/finances`,
        labelKey: "nav.stock",
        icon: Boxes,
        mobilePrimary: true,
      },
      { href: `${base}/analytics`, labelKey: "nav.analytics", icon: BarChart3 },
      { href: `${base}/payments`, labelKey: "nav.payments", icon: CreditCard },
      {
        href: `${base}/tickets`,
        labelKey: "nav.tickets",
        icon: Ticket,
      },
      {
        href: `${base}/manifestes`,
        labelKey: "nav.manifestes",
        icon: ClipboardList,
      },
      { href: `${base}/settings`, labelKey: "nav.settings", icon: Settings },
    ]);
  }

  if (role === "SUPPORT") {
    return withMessages(base, [
      { href: base, labelKey: "nav.home", icon: Home, mobilePrimary: true },
      {
        href: `${base}/retours`,
        labelKey: "nav.retours",
        icon: RefreshCw,
        mobilePrimary: true,
      },
      {
        href: `${base}/tickets`,
        labelKey: "nav.tickets",
        icon: Ticket,
        mobilePrimary: true,
      },
      {
        href: `${base}/scanner`,
        labelKey: "nav.scanner",
        icon: ScanLine,
        mobilePrimary: true,
      },
      { href: `${base}/settings`, labelKey: "nav.settings", icon: Settings },
    ]);
  }

  if (role === "PICKUP") {
    return withMessages(base, [
      { href: base, labelKey: "nav.home", icon: Home, mobilePrimary: true },
      {
        href: `${base}/parcels`,
        labelKey: "nav.parcels",
        icon: Package,
        mobilePrimary: true,
      },
      {
        href: `${base}/manifestes`,
        labelKey: "nav.manifestes",
        icon: ClipboardList,
        mobilePrimary: true,
      },
      {
        href: `${base}/scanner`,
        labelKey: "nav.scanner",
        icon: ScanLine,
        mobilePrimary: true,
      },
      { href: `${base}/settings`, labelKey: "nav.settings", icon: Settings },
    ]);
  }

  if (role === "MAGASINIER") {
    return withMessages(base, [
      { href: base, labelKey: "nav.home", icon: Home, mobilePrimary: true },
      {
        href: `${base}/parcels`,
        labelKey: "nav.parcels",
        icon: Package,
        mobilePrimary: true,
      },
      {
        href: `${base}/cloture`,
        labelKey: "nav.cloture",
        icon: Scale,
        mobilePrimary: true,
      },
      { href: `${base}/retours`, labelKey: "nav.retours", icon: RefreshCw },
      {
        href: `${base}/scanner`,
        labelKey: "nav.scanner",
        icon: ScanLine,
        mobilePrimary: true,
      },
      { href: `${base}/settings`, labelKey: "nav.settings", icon: Settings },
    ]);
  }

  if (role === "CHEF_AGENCE") {
    return withMessages(base, [
      { href: base, labelKey: "nav.home", icon: Home, mobilePrimary: true },
      {
        href: `${base}/parcels`,
        labelKey: "nav.parcels",
        icon: Package,
        mobilePrimary: true,
      },
      {
        href: `${base}/caisses`,
        labelKey: "nav.caisses",
        icon: Banknote,
        mobilePrimary: true,
      },
      {
        href: `${base}/payments`,
        labelKey: "nav.payments",
        icon: CreditCard,
        mobilePrimary: true,
      },
      { href: `${base}/scanner`, labelKey: "nav.scanner", icon: ScanLine },
      { href: `${base}/dispatch`, labelKey: "nav.dispatch", icon: Truck },
      { href: `${base}/analytics`, labelKey: "nav.analytics", icon: BarChart3 },
      { href: `${base}/settings`, labelKey: "nav.settings", icon: Settings },
    ]);
  }

  if (role === "EXPERT_COMPTABLE") {
    return [
      { href: base, labelKey: "nav.home", icon: Home, mobilePrimary: true },
      {
        href: `${base}/caisses`,
        labelKey: "nav.caisses",
        icon: Banknote,
        mobilePrimary: true,
      },
      {
        href: `${base}/caissier`,
        labelKey: "nav.caissier",
        icon: CreditCard,
        mobilePrimary: true,
      },
      { href: `${base}/payments`, labelKey: "nav.payments", icon: CreditCard },
      {
        href: `${base}/modeles-pdf`,
        labelKey: "nav.mockDocs",
        icon: ClipboardList,
      },
      { href: `${base}/settings`, labelKey: "nav.settings", icon: Settings },
    ];
  }

  if (role === "FINANCE") {
    return [
      { href: base, labelKey: "nav.home", icon: Home, mobilePrimary: true },
      {
        href: `${base}/caisses`,
        labelKey: "nav.caisses",
        icon: Banknote,
        mobilePrimary: true,
      },
      {
        href: `${base}/caissier`,
        labelKey: "nav.caissier",
        icon: CreditCard,
        mobilePrimary: true,
      },
      {
        href: `${base}/payments`,
        labelKey: "nav.payments",
        icon: CreditCard,
        mobilePrimary: true,
      },
      { href: `${base}/settings`, labelKey: "nav.settings", icon: Settings },
    ];
  }

  const items: PortalNavDef[] = [
    { href: base, labelKey: "nav.home", icon: Home, mobilePrimary: true },
    {
      href: `${base}/parcels`,
      labelKey: "nav.parcels",
      icon: Package,
      mobilePrimary: true,
    },
    {
      href: `${base}/scanner`,
      labelKey: "nav.scanner",
      icon: ScanLine,
      mobilePrimary: true,
    },
    {
      href: `${base}/dispatch`,
      labelKey: "nav.dispatch",
      icon: Truck,
      mobilePrimary: true,
    },
    { href: `${base}/payments`, labelKey: "nav.payments", icon: CreditCard },
    { href: `${base}/users`, labelKey: "nav.users", icon: Users },
    { href: `${base}/analytics`, labelKey: "nav.analytics", icon: BarChart3 },
    { href: `${base}/zones`, labelKey: "nav.warehouse", icon: Warehouse },
  ];

  if (role === "SUPER_ADMIN") {
    items.push({
      href: `${base}/agencies`,
      labelKey: "nav.agencies",
      icon: Building2,
    });
    items.push({
      href: `${base}/routes`,
      labelKey: "nav.routes",
      icon: Route,
    });
    items.push({
      href: `${base}/categories`,
      labelKey: "nav.categories",
      icon: Palette,
    });
    items.push({
      href: `${base}/modeles-pdf`,
      labelKey: "nav.mockDocs",
      icon: ClipboardList,
    });
  }

  if (role === "ADMIN") {
    items.push({
      href: `${base}/modeles-pdf`,
      labelKey: "nav.mockDocs",
      icon: ClipboardList,
    });
  }

  items.push({
    href: `${base}/settings`,
    labelKey: "nav.settings",
    icon: Settings,
  });
  return withMessages(base, items);
}

export function portalSidebarLinks(role: AppRole): PortalNavDef[] {
  return portalNavFor(role);
}

export function portalMobilePrimary(role: AppRole): PortalNavDef[] {
  return portalNavFor(role).filter((item) => item.mobilePrimary);
}

export function portalMobileMore(role: AppRole): PortalNavDef[] {
  return portalNavFor(role).filter((item) => !item.mobilePrimary);
}
