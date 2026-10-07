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
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
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

export function portalHomeFor(role: AppRole): PortalHomeConfig {
  const b = base(role);

  if (role === "SUPER_ADMIN") {
    return {
      subtitle: "Pilotage global Umbrella — réseau, flotte, finance et comptes.",
      totalLabel: "Total réseau",
      showNouveauCta: true,
      showChart: true,
      showPerformance: true,
      showRevenue: true,
      showSolde: true,
      showReturns: true,
      showDeliveredRecent: false,
      showAnalyticsLink: true,
      primaryHref: `${b}/parcels`,
      primaryLabel: "Nouveau colis",
      primaryHint: "Créer une livraison",
      primaryIcon: "package",
      primaryAction: "create-parcel",
      retoursHref: `${b}/parcels?status=RETOUR_DEFINITIF`,
      shortcuts: [
        {
          href: `${b}/parcels`,
          label: "Nouveau colis",
          hint: "Créer une livraison",
          tone: "bg-ops-accent",
          icon: Box,
          primary: true,
          action: "create-parcel",
        },
        {
          href: `${b}/parcels`,
          label: "Tous les colis",
          hint: "Liste et filtres",
          tone: "bg-sky-600",
          icon: Package,
        },
        {
          href: `${b}/dispatch`,
          label: "Livraisons",
          hint: "Dispatch et tournées",
          tone: "bg-[#0065FF]",
          icon: Truck,
        },
        {
          href: `${b}/users`,
          label: "Utilisateurs",
          hint: "Comptes et vérifications",
          tone: "bg-[#6554C0]",
          icon: Users,
        },
        {
          href: `${b}/agencies`,
          label: "Agences",
          hint: "Réseau gouvernorats",
          tone: "bg-amber-600",
          icon: Building2,
        },
        {
          href: `${b}/zones`,
          label: "Zones / Entrepôt",
          hint: "Zones livreurs",
          tone: "bg-teal-600",
          icon: Warehouse,
        },
        {
          href: `${b}/payments`,
          label: "Paiements",
          hint: "COD et virements",
          tone: "bg-emerald-600",
          icon: CreditCard,
        },
        {
          href: `${b}/categories`,
          label: "Catégories",
          hint: "Statuts du tableau",
          tone: "bg-rose-600",
          icon: Palette,
        },
        {
          href: `${b}/scanner`,
          label: "Scanner",
          hint: "Code-barres ou QR",
          tone: "bg-violet-600",
          icon: ScanLine,
        },
      ],
    };
  }

  if (role === "ADMIN") {
    return {
      subtitle: "Opérations nationales — colis, dispatch, paiements et vérifications.",
      totalLabel: "Total",
      showNouveauCta: true,
      showChart: true,
      showPerformance: false,
      showRevenue: false,
      showSolde: true,
      showReturns: true,
      showDeliveredRecent: false,
      showAnalyticsLink: true,
      primaryHref: `${b}/parcels`,
      primaryLabel: "Nouveau colis",
      primaryHint: "Créer une livraison",
      primaryIcon: "package",
      primaryAction: "create-parcel",
      retoursHref: `${b}/parcels?status=RETOUR_DEFINITIF`,
      shortcuts: [
        {
          href: `${b}/parcels`,
          label: "Nouveau colis",
          hint: "Créer une livraison",
          tone: "bg-ops-accent",
          icon: Box,
          primary: true,
          action: "create-parcel",
        },
        {
          href: `${b}/parcels`,
          label: "Tous les colis",
          hint: "Liste et filtres",
          tone: "bg-sky-600",
          icon: Package,
        },
        {
          href: `${b}/dispatch`,
          label: "Livraisons",
          hint: "Dispatch et tournées",
          tone: "bg-[#0065FF]",
          icon: Truck,
        },
        {
          href: `${b}/users`,
          label: "Utilisateurs",
          hint: "Approuver les inscriptions",
          tone: "bg-[#6554C0]",
          icon: Users,
        },
        {
          href: `${b}/payments`,
          label: "Paiements",
          hint: "Encaissements",
          tone: "bg-emerald-600",
          icon: CreditCard,
        },
        {
          href: `${b}/zones`,
          label: "Entrepôt",
          hint: "Zones et flotte",
          tone: "bg-teal-600",
          icon: Warehouse,
        },
        {
          href: `${b}/scanner`,
          label: "Scanner",
          hint: "Code-barres ou QR",
          tone: "bg-violet-600",
          icon: ScanLine,
        },
      ],
    };
  }

  if (role === "CHEF_AGENCE") {
    return {
      subtitle: "Votre agence — colis du gouvernorat, dispatch et performance.",
      totalLabel: "Agence",
      showNouveauCta: false,
      showChart: true,
      showPerformance: true,
      showRevenue: true,
      showSolde: false,
      showReturns: true,
      showDeliveredRecent: false,
      showAnalyticsLink: true,
      primaryHref: `${b}/dispatch`,
      primaryLabel: "Livraisons",
      primaryHint: "Dispatch de l’agence",
      primaryIcon: "truck",
      retoursHref: `${b}/parcels?status=RETOUR_DEFINITIF`,
      shortcuts: [
        {
          href: `${b}/dispatch`,
          label: "Livraisons",
          hint: "Assigner les livreurs",
          tone: "bg-[#0065FF]",
          icon: Truck,
          primary: true,
        },
        {
          href: `${b}/parcels`,
          label: "Colis agence",
          hint: "Périmètre gouvernorat",
          tone: "bg-sky-600",
          icon: Package,
        },
        {
          href: `${b}/scanner`,
          label: "Scanner",
          hint: "Code-barres ou QR",
          tone: "bg-violet-600",
          icon: ScanLine,
        },
        {
          href: `${b}/analytics`,
          label: "Rapports",
          hint: "Performance agence",
          tone: "bg-amber-600",
          icon: BarChart3,
        },
        {
          href: `${b}/settings`,
          label: "Paramètres",
          hint: "Profil",
          tone: "bg-zinc-600",
          icon: Settings,
        },
      ],
    };
  }

  if (role === "SUPPORT") {
    return {
      subtitle: "File retours — traitez les colis à récupérer et à clôturer.",
      totalLabel: "Retours",
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
      primaryLabel: "Retours",
      primaryHint: "File à traiter",
      primaryIcon: "return",
      retoursHref: `${b}/retours`,
      shortcuts: [
        {
          href: `${b}/retours`,
          label: "Retours",
          hint: "File du jour",
          tone: "bg-amber-500",
          icon: RefreshCw,
          primary: true,
        },
        {
          href: `${b}/scanner`,
          label: "Scanner",
          hint: "Identifier un colis",
          tone: "bg-violet-600",
          icon: ScanLine,
        },
        {
          href: `${b}/settings`,
          label: "Paramètres",
          hint: "Profil",
          tone: "bg-zinc-600",
          icon: Settings,
        },
      ],
    };
  }

  if (role === "PICKUP") {
    return {
      subtitle: "Enlèvements — colis à récupérer chez les expéditeurs.",
      totalLabel: "À traiter",
      showNouveauCta: false,
      showChart: false,
      showPerformance: false,
      showRevenue: false,
      showSolde: false,
      showReturns: false,
      showDeliveredRecent: false,
      showAnalyticsLink: false,
      kpiStatusKeys: ["EN_ATTENTE", "A_ENLEVER", "ENLEVES", "AU_DEPOT"],
      primaryHref: `${b}/parcels?status=A_ENLEVER`,
      primaryLabel: "À enlever",
      primaryHint: "Tournées d’enlèvement",
      primaryIcon: "truck",
      retoursHref: `${b}/parcels`,
      shortcuts: [
        {
          href: `${b}/parcels?status=A_ENLEVER`,
          label: "À enlever",
          hint: "Priorité du jour",
          tone: "bg-[#0065FF]",
          icon: Truck,
          primary: true,
        },
        {
          href: `${b}/parcels`,
          label: "Tous les colis",
          hint: "Périmètre agence",
          tone: "bg-sky-600",
          icon: Package,
        },
        {
          href: `${b}/scanner`,
          label: "Scanner",
          hint: "Confirmer un enlèvement",
          tone: "bg-violet-600",
          icon: ScanLine,
        },
        {
          href: `${b}/settings`,
          label: "Paramètres",
          hint: "Profil",
          tone: "bg-zinc-600",
          icon: Settings,
        },
      ],
    };
  }

  if (role === "MAGASINIER") {
    return {
      subtitle: "Dépôt — réception, stock et préparation des retours.",
      totalLabel: "Dépôt",
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
      primaryLabel: "Arrivé au dépôt",
      primaryHint: "Colis en stock",
      primaryIcon: "package",
      retoursHref: `${b}/retours`,
      shortcuts: [
        {
          href: `${b}/parcels?status=AU_DEPOT`,
          label: "Arrivé au dépôt",
          hint: "Stock du jour",
          tone: "bg-sky-600",
          icon: Package,
          primary: true,
        },
        {
          href: `${b}/retours`,
          label: "Retours",
          hint: "Réception retours",
          tone: "bg-amber-500",
          icon: RefreshCw,
        },
        {
          href: `${b}/scanner`,
          label: "Scanner",
          hint: "Entrée / sortie dépôt",
          tone: "bg-violet-600",
          icon: ScanLine,
        },
        {
          href: `${b}/settings`,
          label: "Paramètres",
          hint: "Profil",
          tone: "bg-zinc-600",
          icon: Settings,
        },
      ],
    };
  }

  if (role === "FINANCE") {
    return {
      subtitle: "Flux d’argent — demandes de versement et caisse COD.",
      totalLabel: "Colis livrés (réseau)",
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
      primaryHref: `${b}/payments`,
      primaryLabel: "Paiements",
      primaryHint: "Demandes et versements",
      primaryIcon: "package",
      retoursHref: `${b}/payments`,
      shortcuts: [
        {
          href: `${b}/payments`,
          label: "Paiements",
          hint: "Approuver et verser",
          tone: "bg-emerald-600",
          icon: CreditCard,
          primary: true,
        },
        {
          href: `${b}/caissier`,
          label: "Caisse COD",
          hint: "Encaisser les livreurs",
          tone: "bg-[#986A36]",
          icon: Banknote,
        },
        {
          href: `${b}/settings`,
          label: "Paramètres",
          hint: "Profil",
          tone: "bg-zinc-600",
          icon: Settings,
        },
      ],
    };
  }

  if (role === "EXPEDITEUR") {
    return {
      subtitle: "Votre activité d'aujourd'hui en un coup d'œil.",
      totalLabel: "Mes colis",
      showNouveauCta: true,
      showChart: true,
      showPerformance: false,
      showRevenue: false,
      showSolde: true,
      showReturns: true,
      showDeliveredRecent: false,
      showAnalyticsLink: true,
      primaryHref: `${b}/parcels`,
      primaryLabel: "Nouveau colis",
      primaryHint: "Créer une livraison",
      primaryIcon: "package",
      primaryAction: "create-parcel",
      retoursHref: `${b}/retours`,
      shortcuts: [
        {
          href: `${b}/parcels`,
          label: "Nouveau colis",
          hint: "Créer une livraison",
          tone: "bg-ops-accent",
          icon: Box,
          primary: true,
          action: "create-parcel",
        },
        {
          href: `${b}/parcels`,
          label: "Mes colis",
          hint: "Suivre et gérer",
          tone: "bg-sky-600",
          icon: Package,
        },
        {
          href: `${b}/scanner`,
          label: "Scanner",
          hint: "Rechercher un colis",
          tone: "bg-violet-600",
          icon: ScanLine,
        },
        {
          href: `${b}/payments`,
          label: "Paiements",
          hint: "Soldes et virements",
          tone: "bg-emerald-600",
          icon: CreditCard,
        },
        {
          href: `${b}/retours`,
          label: "Retours",
          hint: "Colis à récupérer",
          tone: "bg-amber-500",
          icon: RefreshCw,
        },
        {
          href: `${b}/adresses`,
          label: "Clients",
          hint: "Carnet d’adresses",
          tone: "bg-[#6554C0]",
          icon: Users,
        },
      ],
    };
  }

  if (role === "LIVREUR") {
    return {
      subtitle: "Votre tournée du jour — colis assignés et zones.",
      totalLabel: "Ma tournée",
      showNouveauCta: false,
      showChart: false,
      showPerformance: false,
      showRevenue: false,
      showSolde: true,
      showReturns: false,
      showDeliveredRecent: false,
      showAnalyticsLink: false,
      kpiStatusKeys: ["EN_COURS", "A_VERIFIER", "LIVRES", "RETOUR_DEPOT"],
      primaryHref: `${b}/parcels`,
      primaryLabel: "Ma tournée",
      primaryHint: "Colis à livrer aujourd’hui",
      primaryIcon: "truck",
      retoursHref: `${b}/parcels`,
      shortcuts: [
        {
          href: `${b}/parcels`,
          label: "Ma tournée",
          hint: "Colis à livrer",
          tone: "bg-ops-accent",
          icon: Truck,
          primary: true,
        },
        {
          href: `${b}/zones`,
          label: "Zones",
          hint: "Secteurs de livraison",
          tone: "bg-teal-600",
          icon: MapPin,
        },
        {
          href: `${b}/messages`,
          label: "Messages",
          hint: "Chat & appel clients",
          tone: "bg-emerald-600",
          icon: MessageSquare,
        },
        {
          href: `${b}/scanner`,
          label: "Scanner",
          hint: "Code-barres ou QR",
          tone: "bg-violet-600",
          icon: ScanLine,
        },
        {
          href: `${b}/settings`,
          label: "Mon profil",
          hint: "Compte et préférences",
          tone: "bg-zinc-600",
          icon: Settings,
        },
      ],
    };
  }

  // CLIENT — kept for completeness; page uses its own UI
  return {
    subtitle: "Suivez vos colis et contactez votre livreur.",
    totalLabel: "Mes colis",
    showNouveauCta: false,
    showChart: false,
    showPerformance: false,
    showRevenue: false,
    showSolde: false,
    showReturns: false,
    showDeliveredRecent: false,
    showAnalyticsLink: false,
    primaryHref: `${b}/parcels`,
    primaryLabel: "Mes colis",
    primaryHint: "Livraisons en cours",
    primaryIcon: "package",
    retoursHref: `${b}/parcels`,
    shortcuts: [
      {
        href: `${b}/parcels`,
        label: "Mes colis",
        hint: "Suivi des livraisons",
        tone: "bg-sky-600",
        icon: Package,
        primary: true,
      },
      {
        href: `${b}/messages`,
        label: "Messages",
        hint: "Chat & appel livreur",
        tone: "bg-emerald-600",
        icon: MessageSquare,
      },
      {
        href: `${b}/tickets`,
        label: "Support",
        hint: "Ouvrir un ticket",
        tone: "bg-amber-500",
        icon: RefreshCw,
      },
      {
        href: `${b}/settings`,
        label: "Profil",
        hint: "Compte",
        tone: "bg-zinc-600",
        icon: Settings,
      },
    ],
  };
}
