export type StatusKey =
  | "NON_SERIEUX"
  | "EN_ATTENTE"
  | "A_ENLEVER"
  | "ENLEVES"
  | "AU_DEPOT"
  | "EXPEDIE_DESTINATION"
  | "ARRIVE_DESTINATION"
  | "AFFECTE_LIVREUR"
  | "RETOUR_DEPOT"
  | "EN_COURS"
  | "A_VERIFIER"
  | "LIVRES"
  | "LIVRES_PAYES"
  | "ECHANGES"
  | "REMBOURSES"
  | "LIVRAISON_ANNULEE"
  | "RETOUR_DEFINITIF"
  | "RETOUR_INTER_AGENCE"
  | "RETOUR_EXPEDITEURS"
  | "RETOUR_RECU"
  | "SAISIE_DOUANE";

/**
 * `label` = statut affiché (badge / liste).
 * `trackingLabel` = étape détaillée (suivi public / parcours).
 */
export const STATUS_META: Record<
  StatusKey,
  {
    label: string;
    trackingLabel: string;
    color: string;
    ink?: string;
    emoji: string;
  }
> = {
  NON_SERIEUX: {
    label: "Non sérieux",
    trackingLabel: "Non sérieux",
    color: "#FF6B6B",
    emoji: "🚫",
  },
  EN_ATTENTE: {
    label: "En attente de collecte",
    trackingLabel: "En attente de collecte",
    color: "#FFDBA4",
    ink: "#5C4816",
    emoji: "⏳",
  },
  A_ENLEVER: {
    label: "En attente de collecte",
    trackingLabel: "En attente de collecte",
    color: "#ECC5FB",
    ink: "#4A2A5C",
    emoji: "📦",
  },
  ENLEVES: {
    label: "Colis récupéré",
    trackingLabel: "Colis récupéré",
    color: "#ECC5FB",
    ink: "#4A2A5C",
    emoji: "📤",
  },
  AU_DEPOT: {
    label: "Au dépôt",
    trackingLabel: "Arrivé au dépôt",
    color: "#95BDFF",
    ink: "#1A3A6B",
    emoji: "🏭",
  },
  EXPEDIE_DESTINATION: {
    label: "Au dépôt",
    trackingLabel: "Sortie du dépôt",
    color: "#7DD3FC",
    ink: "#0C4A6E",
    emoji: "🚛",
  },
  ARRIVE_DESTINATION: {
    label: "Au dépôt",
    trackingLabel: "Arrivé au dépôt de destination",
    color: "#38BDF8",
    ink: "#0C4A6E",
    emoji: "🏬",
  },
  AFFECTE_LIVREUR: {
    label: "En cours de livraison",
    trackingLabel: "Affecté à un livreur",
    color: "#90C8AC",
    ink: "#1A4A35",
    emoji: "🚚",
  },
  RETOUR_DEPOT: {
    label: "Retour en agence",
    trackingLabel: "Retour en agence",
    color: "#FDBA74",
    ink: "#7C2D12",
    emoji: "↩️",
  },
  EN_COURS: {
    label: "En cours de livraison",
    trackingLabel: "En cours de livraison",
    color: "#90C8AC",
    ink: "#1A4A35",
    emoji: "🚚",
  },
  A_VERIFIER: {
    label: "À vérifier",
    trackingLabel: "À vérifier",
    color: "#FF8AAE",
    ink: "#6B1A35",
    emoji: "🔍",
  },
  LIVRES: {
    label: "Livré",
    trackingLabel: "Livré",
    color: "#3FA796",
    emoji: "✅",
  },
  LIVRES_PAYES: {
    label: "Livré payé",
    trackingLabel: "Livré payé",
    color: "#3FA796",
    emoji: "💰",
  },
  ECHANGES: {
    label: "Échanges",
    trackingLabel: "Échanges",
    color: "#8FA60B",
    emoji: "🔄",
  },
  REMBOURSES: {
    label: "Remboursés",
    trackingLabel: "Remboursés",
    color: "#8FA60B",
    emoji: "💸",
  },
  LIVRAISON_ANNULEE: {
    label: "Livraison annulée",
    trackingLabel: "Livraison annulée",
    color: "#FB7185",
    ink: "#881337",
    emoji: "⛔",
  },
  RETOUR_DEFINITIF: {
    label: "Retour définitif",
    trackingLabel: "Retour définitif",
    color: "#FF4A4A",
    emoji: "❌",
  },
  RETOUR_INTER_AGENCE: {
    label: "Retour inter-agence",
    trackingLabel: "Retour inter-agence",
    color: "#FF4A4A",
    emoji: "🔁",
  },
  RETOUR_EXPEDITEURS: {
    label: "En transit vers l’expéditeur",
    trackingLabel: "En transit vers l’expéditeur",
    color: "#F87171",
    emoji: "📬",
  },
  RETOUR_RECU: {
    label: "Retour livré à l’expéditeur",
    trackingLabel: "Retour livré à l’expéditeur",
    color: "#EF4444",
    emoji: "📥",
  },
  SAISIE_DOUANE: {
    label: "Saisie par la Douane",
    trackingLabel: "Saisie par la Douane",
    color: "#4C4C4C",
    emoji: "🛃",
  },
};

/** Happy-path tracking order (lifecycle 1). */
export const TRACKING_LIFECYCLE_DELIVERY: StatusKey[] = [
  "EN_ATTENTE",
  "ENLEVES",
  "AU_DEPOT",
  "EXPEDIE_DESTINATION",
  "ARRIVE_DESTINATION",
  "AFFECTE_LIVREUR",
  "EN_COURS",
  "LIVRES",
];

/** Return-path tracking order (lifecycle 2, after cancel). */
export const TRACKING_LIFECYCLE_RETURN: StatusKey[] = [
  "LIVRAISON_ANNULEE",
  "RETOUR_DEPOT",
  "RETOUR_EXPEDITEURS",
  "RETOUR_RECU",
];

export const RETURN_STATUSES: StatusKey[] = [
  "LIVRAISON_ANNULEE",
  "RETOUR_DEFINITIF",
  "RETOUR_INTER_AGENCE",
  "RETOUR_EXPEDITEURS",
  "RETOUR_RECU",
  "RETOUR_DEPOT",
];

export const TUNISIA_GOVERNORATES = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "La Mannouba",
  "Le Kef",
  "Mahdia",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
] as const;
