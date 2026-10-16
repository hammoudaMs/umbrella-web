import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BarChart3,
  Box,
  Building2,
  CreditCard,
  MapPin,
  MessageSquare,
  Package,
  Palette,
  RefreshCw,
  ScanLine,
  Settings,
  Ticket,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import type { TranslateFn } from "@/i18n/types";
import { PORTAL_BY_ROLE, type AppRole } from "@/lib/roles";

export type HomeShortcut = {
  href: string;
  label: string;
  hint: string;
  tone: string;
  icon: LucideIcon;
  primary?: boolean;
  /** Open create-parcel modal on Accueil instead of navigating. */
  action?: "create-parcel";
};

export type PortalHomeConfig = {
  subtitle: string;
  /** Label for the Total KPI card */
  totalLabel: string;
  showNouveauCta: boolean;
  showChart: boolean;
  showPerformance: boolean;
  showRevenue: boolean;
  showSolde: boolean;
  showReturns: boolean;
  showDeliveredRecent: boolean;
  /** Expediteur Accueil: À traiter / Argent / Tickets instead of parcel list duplicates. */
  asideMode?: "default" | "expediteur";
  showAnalyticsLink: boolean;
  /** When set, only these status keys (+ Total) appear as KPI cards */
  kpiStatusKeys?: string[];
  /** Base path for KPI card links (defaults to `${basePath}/parcels`). */
  kpiHrefBase?: string;
  primaryHref: string;
  primaryLabel: string;
  primaryHint: string;
  primaryIcon: "package" | "truck" | "scan" | "return";
  /** Open create modal on Accueil (no route change). */
  primaryAction?: "create-parcel";
  retoursHref: string;
  shortcuts: HomeShortcut[];
};

function base(role: AppRole) {
  return PORTAL_BY_ROLE[role];
}

export function portalHomeFor(
  role: AppRole,
  t: TranslateFn,
): PortalHomeConfig {
  const b = base(role);

  if (role === "SUPER_ADMIN") {
    return {
      subtitle: t("home.subtitleSuperAdmin"),
      totalLabel: t("home.totalNetwork"),
      showNouveauCta: true,
      showChart: true,
      showPerformance: true,
      showRevenue: true,
      showSolde: true,
      showReturns: true,
      showDeliveredRecent: false,
      showAnalyticsLink: true,
      primaryHref: `${b}/parcels`,
      primaryLabel: t("home.newParcel"),
      primaryHint: t("home.createDelivery"),
      primaryIcon: "package",
      primaryAction: "create-parcel",
      retoursHref: `${b}/parcels?status=RETOUR_DEFINITIF`,
      shortcuts: [
        {
          href: `${b}/parcels`,
          label: t("home.newParcel"),
          hint: t("home.createDelivery"),
          tone: "bg-ops-accent",
          icon: Box,
          primary: true,
          action: "create-parcel",
        },
        {
          href: `${b}/parcels`,
          label: t("home.allParcels"),
          hint: t("home.listFilters"),
          tone: "bg-sky-600",
          icon: Package,
        },
        {
          href: `${b}/dispatch`,
          label: t("home.deliveries"),
          hint: t("home.dispatchTours"),
          tone: "bg-[#0065FF]",
          icon: Truck,
        },
        {
          href: `${b}/users`,
          label: t("home.users"),
          hint: t("home.accountsVerify"),
          tone: "bg-[#6554C0]",
          icon: Users,
        },
        {
          href: `${b}/agencies`,
          label: t("home.agencies"),
          hint: t("home.networkGov"),
          tone: "bg-amber-600",
          icon: Building2,
        },
        {
          href: `${b}/zones`,
          label: t("home.zonesWarehouse"),
          hint: t("home.driverZones"),
          tone: "bg-teal-600",
          icon: Warehouse,
        },
        {
          href: `${b}/payments`,
          label: t("home.payments"),
          hint: t("home.codTransfers"),
          tone: "bg-emerald-600",
          icon: CreditCard,
        },
        {
          href: `${b}/categories`,
          label: t("home.categories"),
          hint: t("home.boardStatuses"),
          tone: "bg-rose-600",
          icon: Palette,
        },
        {
          href: `${b}/scanner`,
          label: t("home.scanner"),
          hint: t("home.barcodeQr"),
          tone: "bg-violet-600",
          icon: ScanLine,
        },
      ],
    };
  }

  if (role === "ADMIN") {
    return {
      subtitle: t("home.subtitleAdmin"),
      totalLabel: t("home.total"),
      showNouveauCta: true,
      showChart: true,
      showPerformance: false,
      showRevenue: false,
      showSolde: true,
      showReturns: true,
      showDeliveredRecent: false,
      showAnalyticsLink: true,
      primaryHref: `${b}/parcels`,
      primaryLabel: t("home.newParcel"),
      primaryHint: t("home.createDelivery"),
      primaryIcon: "package",
      primaryAction: "create-parcel",
      retoursHref: `${b}/parcels?status=RETOUR_DEFINITIF`,
      shortcuts: [
        {
          href: `${b}/parcels`,
          label: t("home.newParcel"),
          hint: t("home.createDelivery"),
          tone: "bg-ops-accent",
          icon: Box,
          primary: true,
          action: "create-parcel",
        },
        {
          href: `${b}/parcels`,
          label: t("home.allParcels"),
          hint: t("home.listFilters"),
          tone: "bg-sky-600",
          icon: Package,
        },
        {
          href: `${b}/dispatch`,
          label: t("home.deliveries"),
          hint: t("home.dispatchTours"),
          tone: "bg-[#0065FF]",
          icon: Truck,
        },
        {
          href: `${b}/users`,
          label: t("home.users"),
          hint: t("home.approveRegistrations"),
          tone: "bg-[#6554C0]",
          icon: Users,
        },
        {
          href: `${b}/payments`,
          label: t("home.payments"),
          hint: t("home.collections"),
          tone: "bg-emerald-600",
          icon: CreditCard,
        },
        {
          href: `${b}/zones`,
          label: t("nav.warehouse"),
          hint: t("home.zonesFleet"),
          tone: "bg-teal-600",
          icon: Warehouse,
        },
        {
          href: `${b}/scanner`,
          label: t("home.scanner"),
          hint: t("home.barcodeQr"),
          tone: "bg-violet-600",
          icon: ScanLine,
        },
      ],
    };
  }

  if (role === "CHEF_AGENCE") {
    return {
      subtitle: t("home.subtitleChefAgence"),
      totalLabel: t("home.agency"),
      showNouveauCta: false,
      showChart: true,
      showPerformance: true,
      showRevenue: true,
      showSolde: false,
      showReturns: true,
      showDeliveredRecent: false,
      showAnalyticsLink: true,
      primaryHref: `${b}/dispatch`,
      primaryLabel: t("home.deliveries"),
      primaryHint: t("home.dispatchAgency"),
      primaryIcon: "truck",
      retoursHref: `${b}/parcels?status=RETOUR_DEFINITIF`,
      shortcuts: [
        {
          href: `${b}/dispatch`,
          label: t("home.deliveries"),
          hint: t("home.assignDrivers"),
          tone: "bg-[#0065FF]",
          icon: Truck,
          primary: true,
        },
        {
          href: `${b}/parcels`,
          label: t("home.agencyParcels"),
          hint: t("home.govScope"),
          tone: "bg-sky-600",
          icon: Package,
        },
        {
          href: `${b}/scanner`,
          label: t("home.scanner"),
          hint: t("home.barcodeQr"),
          tone: "bg-violet-600",
          icon: ScanLine,
        },
        {
          href: `${b}/analytics`,
          label: t("nav.analytics"),
          hint: t("home.agencyPerformance"),
          tone: "bg-amber-600",
          icon: BarChart3,
        },
        {
          href: `${b}/settings`,
          label: t("home.settings"),
          hint: t("home.profile"),
          tone: "bg-zinc-600",
          icon: Settings,
        },
      ],
    };
  }

  if (role === "SUPPORT") {
    return {
      subtitle: t("home.subtitleSupport"),
      totalLabel: t("home.returns"),
      showNouveauCta: false,
      showChart: false,
      showPerformance: false,
      showRevenue: false,
      showSolde: false,
      showReturns: true,
      showDeliveredRecent: false,
      showAnalyticsLink: false,
      kpiStatusKeys: [
        "RETOUR_DEPOT",
        "RETOUR_DEFINITIF",
        "RETOUR_INTER_AGENCE",
        "RETOUR_EXPEDITEURS",
        "RETOUR_RECU",
      ],
      primaryHref: `${b}/retours`,
      primaryLabel: t("nav.retours"),
      primaryHint: t("home.queueToProcess"),
      primaryIcon: "return",
      retoursHref: `${b}/retours`,
      shortcuts: [
        {
          href: `${b}/retours`,
          label: t("nav.retours"),
          hint: t("home.returnsQueueDay"),
          tone: "bg-amber-500",
          icon: RefreshCw,
          primary: true,
        },
        {
          href: `${b}/scanner`,
          label: t("home.scanner"),
          hint: t("home.identifyParcel"),
          tone: "bg-violet-600",
          icon: ScanLine,
        },
        {
          href: `${b}/settings`,
          label: t("home.settings"),
          hint: t("home.profile"),
          tone: "bg-zinc-600",
          icon: Settings,
        },
      ],
    };
  }

  if (role === "PICKUP") {
    return {
      subtitle: t("home.subtitlePickup"),
      totalLabel: t("home.toProcess"),
      showNouveauCta: false,
      showChart: false,
      showPerformance: false,
      showRevenue: false,
      showSolde: false,
      showReturns: false,
      showDeliveredRecent: false,
      showAnalyticsLink: false,
      kpiStatusKeys: ["EN_ATTENTE", "A_ENLEVER", "ENLEVES", "AU_DEPOT"],
      primaryHref: `${b}/manifestes`,
      primaryLabel: t("nav.manifestes"),
      primaryHint: t("home.awaitingPrePickup"),
      primaryIcon: "truck",
      retoursHref: `${b}/parcels`,
      shortcuts: [
        {
          href: `${b}/manifestes`,
          label: t("nav.manifestes"),
          hint: t("home.awaitingPrePickup"),
          tone: "bg-[#0065FF]",
          icon: Truck,
          primary: true,
        },
        {
          href: `${b}/parcels?status=A_ENLEVER`,
          label: t("home.toPickup"),
          hint: t("home.dayPriority"),
          tone: "bg-sky-600",
          icon: Package,
        },
        {
          href: `${b}/scanner`,
          label: t("home.scanner"),
          hint: t("home.confirmPickup"),
          tone: "bg-violet-600",
          icon: ScanLine,
        },
        {
          href: `${b}/settings`,
          label: t("home.settings"),
          hint: t("home.profile"),
          tone: "bg-zinc-600",
          icon: Settings,
        },
      ],
    };
  }

  if (role === "MAGASINIER") {
    return {
      subtitle: t("home.subtitleMagasinier"),
      totalLabel: t("home.depot"),
      showNouveauCta: false,
      showChart: false,
      showPerformance: false,
      showRevenue: false,
      showSolde: false,
      showReturns: true,
      showDeliveredRecent: false,
      showAnalyticsLink: false,
      kpiStatusKeys: [
        "AU_DEPOT",
        "EXPEDIE_DESTINATION",
        "ARRIVE_DESTINATION",
        "AFFECTE_LIVREUR",
        "EN_COURS",
        "LIVRAISON_ANNULEE",
        "RETOUR_DEPOT",
        "RETOUR_RECU",
      ],
      primaryHref: `${b}/parcels?status=AU_DEPOT`,
      primaryLabel: t("status.AU_DEPOT"),
      primaryHint: t("home.parcelsInStock"),
      primaryIcon: "package",
      retoursHref: `${b}/retours`,
      shortcuts: [
        {
          href: `${b}/parcels?status=AU_DEPOT`,
          label: t("status.AU_DEPOT"),
          hint: t("home.dayStock"),
          tone: "bg-sky-600",
          icon: Package,
          primary: true,
        },
        {
          href: `${b}/retours`,
          label: t("nav.retours"),
          hint: t("home.returnsReception"),
          tone: "bg-amber-500",
          icon: RefreshCw,
        },
        {
          href: `${b}/scanner`,
          label: t("home.scanner"),
          hint: t("home.depotInOut"),
          tone: "bg-violet-600",
          icon: ScanLine,
        },
        {
          href: `${b}/settings`,
          label: t("home.settings"),
          hint: t("home.profile"),
          tone: "bg-zinc-600",
          icon: Settings,
        },
      ],
    };
  }

  if (role === "EXPERT_COMPTABLE") {
    return {
      subtitle: t("home.subtitleExpertComptable"),
      totalLabel: t("home.deliveredNetwork"),
      showNouveauCta: false,
      showChart: false,
      showPerformance: false,
      showRevenue: true,
      showSolde: true,
      showReturns: false,
      showDeliveredRecent: false,
      showAnalyticsLink: false,
      kpiStatusKeys: ["LIVRES", "LIVRES_PAYES", "REMBOURSES"],
      kpiHrefBase: `${b}/caisses`,
      primaryHref: `${b}/caisses`,
      primaryLabel: t("nav.caisses"),
      primaryHint: t("home.expenseCodGlobal"),
      primaryIcon: "package",
      retoursHref: `${b}/payments`,
      shortcuts: [
        {
          href: `${b}/caisses`,
          label: t("nav.caisses"),
          hint: t("home.expenseCod"),
          tone: "bg-[#986A36]",
          icon: Banknote,
          primary: true,
        },
        {
          href: `${b}/caissier`,
          label: t("nav.caissier"),
          hint: t("home.collectTours"),
          tone: "bg-emerald-600",
          icon: CreditCard,
        },
        {
          href: `${b}/payments`,
          label: t("home.payments"),
          hint: t("home.senderPayouts"),
          tone: "bg-teal-600",
          icon: CreditCard,
        },
        {
          href: `${b}/settings`,
          label: t("home.settings"),
          hint: t("home.profile"),
          tone: "bg-zinc-600",
          icon: Settings,
        },
      ],
    };
  }

  if (role === "FINANCE") {
    return {
      subtitle: t("home.subtitleFinance"),
      totalLabel: t("home.deliveredNetwork"),
      showNouveauCta: false,
      showChart: false,
      showPerformance: false,
      showRevenue: true,
      showSolde: true,
      showReturns: false,
      showDeliveredRecent: false,
      showAnalyticsLink: false,
      kpiStatusKeys: ["LIVRES", "LIVRES_PAYES", "REMBOURSES"],
      kpiHrefBase: `${b}/payments`,
      primaryHref: `${b}/caisses`,
      primaryLabel: t("nav.caisses"),
      primaryHint: t("home.expenseCodAgency"),
      primaryIcon: "package",
      retoursHref: `${b}/payments`,
      shortcuts: [
        {
          href: `${b}/caisses`,
          label: t("nav.caisses"),
          hint: t("home.expenseCod"),
          tone: "bg-[#986A36]",
          icon: Banknote,
          primary: true,
        },
        {
          href: `${b}/payments`,
          label: t("home.payments"),
          hint: t("home.approveAndPay"),
          tone: "bg-emerald-600",
          icon: CreditCard,
        },
        {
          href: `${b}/caissier`,
          label: t("nav.caissier"),
          hint: t("home.collectDrivers"),
          tone: "bg-amber-700",
          icon: Banknote,
        },
        {
          href: `${b}/settings`,
          label: t("home.settings"),
          hint: t("home.profile"),
          tone: "bg-zinc-600",
          icon: Settings,
        },
      ],
    };
  }

  if (role === "EXPEDITEUR") {
    return {
      subtitle: t("home.subtitleExpediteur"),
      totalLabel: t("home.myParcels"),
      showNouveauCta: true,
      showChart: true,
      showPerformance: false,
      showRevenue: false,
      showSolde: true,
      showReturns: false,
      showDeliveredRecent: false,
      asideMode: "expediteur",
      showAnalyticsLink: false,
      kpiStatusKeys: [
        "EN_ATTENTE",
        "ENLEVES",
        "AU_DEPOT",
        "EN_COURS",
        "LIVRES",
        "LIVRAISON_ANNULEE",
        "RETOUR_DEPOT",
        "RETOUR_EXPEDITEURS",
        "RETOUR_RECU",
      ],
      primaryHref: `${b}/parcels`,
      primaryLabel: t("home.newParcel"),
      primaryHint: t("home.createDelivery"),
      primaryIcon: "package",
      primaryAction: "create-parcel",
      retoursHref: `${b}/retours`,
      shortcuts: [
        {
          href: `${b}/parcels`,
          label: t("home.newParcel"),
          hint: t("home.createDelivery"),
          tone: "bg-ops-accent",
          icon: Box,
          primary: true,
          action: "create-parcel",
        },
        {
          href: `${b}/parcels`,
          label: t("home.myParcels"),
          hint: t("home.trackManage"),
          tone: "bg-sky-600",
          icon: Package,
        },
        {
          href: `${b}/payments`,
          label: t("home.payments"),
          hint: t("home.balancesTransfers"),
          tone: "bg-emerald-600",
          icon: CreditCard,
        },
        {
          href: `${b}/tickets`,
          label: t("nav.tickets"),
          hint: t("home.openTicket"),
          tone: "bg-sky-600",
          icon: Ticket,
        },
        {
          href: `${b}/messages`,
          label: t("nav.messages"),
          hint: t("home.chatCallDriver"),
          tone: "bg-violet-600",
          icon: MessageSquare,
        },
        {
          href: `${b}/manifestes`,
          label: t("nav.manifestes"),
          hint: t("home.awaitingParcels"),
          tone: "bg-[#986A36]",
          icon: Package,
        },
      ],
    };
  }

  if (role === "LIVREUR") {
    return {
      subtitle: t("home.subtitleLivreur"),
      totalLabel: t("nav.today"),
      showNouveauCta: false,
      showChart: false,
      showPerformance: false,
      showRevenue: false,
      showSolde: true,
      showReturns: false,
      showDeliveredRecent: false,
      showAnalyticsLink: false,
      kpiStatusKeys: ["EN_COURS", "A_VERIFIER", "LIVRES", "RETOUR_DEPOT"],
      primaryHref: b,
      primaryLabel: t("nav.today"),
      primaryHint: t("home.todayCodHint"),
      primaryIcon: "truck",
      retoursHref: `${b}/parcels`,
      shortcuts: [
        {
          href: b,
          label: t("nav.today"),
          hint: t("home.todayCodShort"),
          tone: "bg-ops-accent",
          icon: Truck,
          primary: true,
        },
        {
          href: `${b}/zones`,
          label: t("nav.zones"),
          hint: t("home.deliverySectors"),
          tone: "bg-teal-600",
          icon: MapPin,
        },
        {
          href: `${b}/messages`,
          label: t("nav.messages"),
          hint: t("home.chatCallClients"),
          tone: "bg-emerald-600",
          icon: MessageSquare,
        },
        {
          href: `${b}/scanner`,
          label: t("home.scanner"),
          hint: t("home.barcodeQr"),
          tone: "bg-violet-600",
          icon: ScanLine,
        },
        {
          href: `${b}/settings`,
          label: t("home.myProfile"),
          hint: t("home.accountPrefs"),
          tone: "bg-zinc-600",
          icon: Settings,
        },
      ],
    };
  }

  return {
    subtitle: t("home.subtitleClient"),
    totalLabel: t("home.myParcels"),
    showNouveauCta: false,
    showChart: false,
    showPerformance: false,
    showRevenue: false,
    showSolde: false,
    showReturns: false,
    showDeliveredRecent: false,
    showAnalyticsLink: false,
    primaryHref: `${b}/parcels`,
    primaryLabel: t("home.myParcels"),
    primaryHint: t("home.deliveriesInProgress"),
    primaryIcon: "package",
    retoursHref: `${b}/parcels`,
    shortcuts: [
      {
        href: `${b}/parcels`,
        label: t("home.myParcels"),
        hint: t("home.deliveryTracking"),
        tone: "bg-sky-600",
        icon: Package,
        primary: true,
      },
      {
        href: `${b}/messages`,
        label: t("nav.messages"),
        hint: t("home.chatCallDriver"),
        tone: "bg-emerald-600",
        icon: MessageSquare,
      },
      {
        href: `${b}/tickets`,
        label: t("home.support"),
        hint: t("home.openTicket"),
        tone: "bg-amber-500",
        icon: RefreshCw,
      },
      {
        href: `${b}/settings`,
        label: t("home.profile"),
        hint: t("home.account"),
        tone: "bg-zinc-600",
        icon: Settings,
      },
    ],
  };
}
