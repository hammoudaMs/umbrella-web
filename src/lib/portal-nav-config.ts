import {
  Banknote,
  BarChart3,
  Box,
  Building2,
  CreditCard,
  Home,
  MapPin,
  MessageSquare,
  Package,
  Palette,
  RefreshCw,
  Route,
  ScanLine,
  Settings,
  Ticket,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { PORTAL_BY_ROLE, type AppRole } from "@/lib/roles";

export type PortalNavDef = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown as a primary bottom-tab item on mobile. */
  mobilePrimary?: boolean;
};

function withMessages(base: string, items: PortalNavDef[]): PortalNavDef[] {
  const settingsIdx = items.findIndex(
    (i) =>
      i.href.endsWith("/settings") ||
      i.label === "Profil" ||
      i.label === "Paramètres",
  );
  const msg: PortalNavDef = {
    href: `${base}/messages`,
    label: "Messages",
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
      { href: base, label: "Accueil", icon: Home, mobilePrimary: true },
      {
        href: `${base}/parcels`,
        label: "Colis",
        icon: Package,
        mobilePrimary: true,
      },
      {
        href: `${base}/zones`,
        label: "Zones",
        icon: MapPin,
        mobilePrimary: true,
      },
      {
        href: `${base}/scanner`,
        label: "Scanner",
        icon: ScanLine,
      },
      {
        href: `${base}/settings`,
        label: "Profil",
        icon: Settings,
      },
    ]);
  }

  if (role === "CLIENT") {
    return withMessages(base, [
      { href: base, label: "Accueil", icon: Home, mobilePrimary: true },
      {
        href: `${base}/parcels`,
        label: "Colis",
        icon: Package,
        mobilePrimary: true,
      },
      {
        href: `${base}/scanner`,
        label: "Scanner",
        icon: ScanLine,
        mobilePrimary: true,
      },
      {
        href: `${base}/tickets`,
        label: "Tickets",
        icon: Ticket,
        mobilePrimary: true,
      },
      {
        href: `${base}/settings`,
        label: "Profil",
        icon: Settings,
      },
    ]);
  }

  if (role === "EXPEDITEUR") {
    return withMessages(base, [
      { href: base, label: "Accueil", icon: Home, mobilePrimary: true },
      {
        href: `${base}/parcels`,
        label: "Colis",
        icon: Package,
        mobilePrimary: true,
      },
      {
        href: `${base}/nouveau`,
        label: "Nouveau",
        icon: Box,
        mobilePrimary: true,
      },
      {
        href: `${base}/scanner`,
        label: "Scanner",
        icon: ScanLine,
        mobilePrimary: true,
      },
      { href: `${base}/payments`, label: "Paiements", icon: CreditCard },
      { href: `${base}/retours`, label: "Retours", icon: RefreshCw },
      { href: `${base}/adresses`, label: "Adresses", icon: MapPin },
      { href: `${base}/analytics`, label: "Rapports", icon: BarChart3 },
      { href: `${base}/settings`, label: "Paramètres", icon: Settings },
    ]);
  }

  if (role === "SUPPORT") {
    return withMessages(base, [
      { href: base, label: "Accueil", icon: Home, mobilePrimary: true },
      {
        href: `${base}/retours`,
        label: "Retours",
        icon: RefreshCw,
        mobilePrimary: true,
      },
      {
        href: `${base}/scanner`,
        label: "Scanner",
        icon: ScanLine,
        mobilePrimary: true,
      },
      { href: `${base}/settings`, label: "Paramètres", icon: Settings },
    ]);
  }

  if (role === "PICKUP") {
    return withMessages(base, [
      { href: base, label: "Accueil", icon: Home, mobilePrimary: true },
      {
        href: `${base}/parcels`,
        label: "Colis",
        icon: Package,
        mobilePrimary: true,
      },
      {
        href: `${base}/scanner`,
        label: "Scanner",
        icon: ScanLine,
        mobilePrimary: true,
      },
      { href: `${base}/settings`, label: "Paramètres", icon: Settings },
    ]);
  }

  if (role === "MAGASINIER") {
    return withMessages(base, [
      { href: base, label: "Accueil", icon: Home, mobilePrimary: true },
      {
        href: `${base}/parcels`,
        label: "Colis",
        icon: Package,
        mobilePrimary: true,
      },
      {
        href: `${base}/retours`,
        label: "Retours",
        icon: RefreshCw,
        mobilePrimary: true,
      },
      {
        href: `${base}/scanner`,
        label: "Scanner",
        icon: ScanLine,
        mobilePrimary: true,
      },
      { href: `${base}/settings`, label: "Paramètres", icon: Settings },
    ]);
  }

  if (role === "CHEF_AGENCE") {
    return withMessages(base, [
      { href: base, label: "Accueil", icon: Home, mobilePrimary: true },
      {
        href: `${base}/parcels`,
        label: "Colis",
        icon: Package,
        mobilePrimary: true,
      },
      {
        href: `${base}/scanner`,
        label: "Scanner",
        icon: ScanLine,
        mobilePrimary: true,
      },
      {
        href: `${base}/dispatch`,
        label: "Livraisons",
        icon: Truck,
        mobilePrimary: true,
      },
      { href: `${base}/analytics`, label: "Rapports", icon: BarChart3 },
      { href: `${base}/settings`, label: "Paramètres", icon: Settings },
    ]);
  }

  if (role === "FINANCE") {
    return [
      { href: base, label: "Accueil", icon: Home, mobilePrimary: true },
      {
        href: `${base}/payments`,
        label: "Paiements",
        icon: CreditCard,
        mobilePrimary: true,
      },
      {
        href: `${base}/caissier`,
        label: "Caisse COD",
        icon: Banknote,
        mobilePrimary: true,
      },
      { href: `${base}/settings`, label: "Paramètres", icon: Settings },
    ];
  }

  const items: PortalNavDef[] = [
    { href: base, label: "Accueil", icon: Home, mobilePrimary: true },
    {
      href: `${base}/parcels`,
      label: "Colis",
      icon: Package,
      mobilePrimary: true,
    },
    {
      href: `${base}/scanner`,
      label: "Scanner",
      icon: ScanLine,
      mobilePrimary: true,
    },
    {
      href: `${base}/dispatch`,
      label: "Livraisons",
      icon: Truck,
      mobilePrimary: true,
    },
    { href: `${base}/payments`, label: "Paiements", icon: CreditCard },
    { href: `${base}/users`, label: "Utilisateurs", icon: Users },
    { href: `${base}/analytics`, label: "Rapports", icon: BarChart3 },
    { href: `${base}/zones`, label: "Entrepôt", icon: Warehouse },
  ];

  if (role === "SUPER_ADMIN") {
    items.push({
      href: `${base}/agencies`,
      label: "Agences",
      icon: Building2,
    });
    items.push({
      href: `${base}/routes`,
      label: "Auto lieux",
      icon: Route,
    });
    items.push({
      href: `${base}/categories`,
      label: "Catégories",
      icon: Palette,
    });
  }

  items.push({ href: `${base}/settings`, label: "Paramètres", icon: Settings });
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
