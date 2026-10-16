import type { StatusKey } from "@/lib/status-meta";

export type CancelParty = "CLIENT" | "EXPEDITEUR";

export type LivreurAction = {
  id: string;
  label: string;
  emoji: string;
  status: StatusKey;
  tone: "primary" | "success" | "warn" | "danger" | "neutral";
  needsComment?: boolean;
  commentLabel?: string;
  /** Prefixed into the saved comment (e.g. Client — motif). */
  commentPrefix?: string;
  /** Livraison annulée: force pick Client vs Expéditeur in the confirm modal. */
  cancelPartyChoices?: Array<{ id: CancelParty; label: string }>;
  /** Reporté: date (+ time) picker instead of free text. */
  needsDatetime?: boolean;
};

export const CANCEL_PARTY_CHOICES: Array<{ id: CancelParty; label: string }> = [
  { id: "CLIENT", label: "Client" },
  { id: "EXPEDITEUR", label: "Expéditeur" },
];

export function cancelPartyLabel(party: CancelParty): string {
  return party === "CLIENT" ? "Client" : "Expéditeur";
}

export function buildActionComment(
  action: LivreurAction,
  motif: string,
  party?: CancelParty | null,
): string {
  const detail = motif.trim();
  const who =
    party != null
      ? cancelPartyLabel(party)
      : action.commentPrefix?.trim() || null;
  if (who && detail) return `${who} — ${detail}`;
  if (who) return who;
  return detail;
}

/** Normalize Tunisian / international phone for tel:, sms:, wa.me */
export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("216")) return digits;
  if (digits.startsWith("0") && digits.length >= 8) return `216${digits.slice(1)}`;
  if (digits.length === 8) return `216${digits}`;
  return digits;
}

export function telHref(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  return digits ? `tel:+${digits}` : `tel:${phone}`;
}

export function smsHref(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  return digits ? `sms:+${digits}` : `sms:${phone}`;
}

export function whatsappHref(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  return digits ? `https://wa.me/${digits}` : `https://wa.me/`;
}

export function formatDisplayPhone(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (digits.startsWith("216") && digits.length === 11) {
    const local = digits.slice(3);
    return `+216 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return phone;
}

/** Contextual driver actions (Navex-style pickup/delivery). */
export function livreurActionsFor(status: string): LivreurAction[] {
  switch (status) {
    case "A_ENLEVER":
    case "EN_ATTENTE":
      return [
        {
          id: "pickup",
          label: "Enlevé",
          emoji: "📦",
          status: "ENLEVES",
          tone: "primary",
        },
        {
          id: "cancel-sender",
          label: "Annulé expéditeur",
          emoji: "🚫",
          status: "RETOUR_EXPEDITEURS",
          tone: "danger",
          needsComment: true,
          commentLabel: "Motif",
        },
      ];
    case "ENLEVES":
      return [
        {
          id: "depot",
          label: "Arrivé au dépôt",
          emoji: "🏭",
          status: "AU_DEPOT",
          tone: "primary",
        },
      ];
    case "AU_DEPOT":
    case "ARRIVE_DESTINATION":
      return [
        {
          id: "assign",
          label: "Affecté à un livreur",
          emoji: "👤",
          status: "AFFECTE_LIVREUR",
          tone: "primary",
        },
      ];
    case "AFFECTE_LIVREUR":
      return [
        {
          id: "out",
          label: "En cours de livraison",
          emoji: "🛵",
          status: "EN_COURS",
          tone: "primary",
        },
      ];
    case "EN_COURS":
    case "A_VERIFIER":
      return [
        {
          id: "delivered",
          label: "Livré",
          emoji: "✅",
          status: "LIVRES",
          tone: "success",
        },
        {
          id: "cancel-delivery",
          label: "Livraison annulée",
          emoji: "⛔",
          status: "LIVRAISON_ANNULEE",
          tone: "danger",
          needsComment: true,
          commentLabel: "Motif (optionnel)",
          cancelPartyChoices: CANCEL_PARTY_CHOICES,
        },
        {
          id: "unavailable",
          label: "Client indisponible",
          emoji: "📵",
          status: "A_VERIFIER",
          tone: "warn",
          needsComment: true,
          commentLabel: "Détail (horaire, etc.)",
        },
        {
          id: "reschedule",
          label: "Reporté",
          emoji: "📅",
          status: "A_VERIFIER",
          tone: "warn",
          needsDatetime: true,
        },
        {
          id: "bad-phone",
          label: "Téléphone incorrect",
          emoji: "📵",
          status: "A_VERIFIER",
          tone: "danger",
          needsComment: true,
          commentLabel: "Détail téléphone",
        },
        {
          id: "bad-address",
          label: "Adresse incorrecte",
          emoji: "📍",
          status: "A_VERIFIER",
          tone: "danger",
          needsComment: true,
          commentLabel: "Détail adresse",
        },
        {
          id: "blocked",
          label: "Livreur bloqué",
          emoji: "🛑",
          status: "NON_SERIEUX",
          tone: "danger",
          needsComment: true,
          commentLabel: "Motif du blocage",
        },
        {
          id: "exchange",
          label: "Échange",
          emoji: "🔄",
          status: "ECHANGES",
          tone: "neutral",
          needsComment: true,
          commentLabel: "Détail échange",
        },
        {
          id: "return",
          label: "Retour dépôt",
          emoji: "↩️",
          status: "RETOUR_DEPOT",
          tone: "danger",
          needsComment: true,
          commentLabel: "Motif retour",
        },
      ];
    case "LIVRES":
      return [
        {
          id: "paid",
          label: "Livré payé",
          emoji: "💵",
          status: "LIVRES_PAYES",
          tone: "success",
        },
        {
          id: "return-after-deliver",
          label: "Retour dépôt",
          emoji: "↩️",
          status: "RETOUR_DEPOT",
          tone: "danger",
          needsComment: true,
          commentLabel: "Motif retour",
        },
      ];
    case "RETOUR_DEPOT":
      return [
        {
          id: "redepot",
          label: "Au dépôt",
          emoji: "🏭",
          status: "AU_DEPOT",
          tone: "neutral",
        },
        {
          id: "retry",
          label: "Reprendre livraison",
          emoji: "🛵",
          status: "EN_COURS",
          tone: "primary",
        },
        {
          id: "return-sender",
          label: "Retour expéditeur",
          emoji: "🚫",
          status: "RETOUR_EXPEDITEURS",
          tone: "danger",
          needsComment: true,
          commentLabel: "Motif",
        },
      ];
    default:
      return [
        {
          id: "out",
          label: "En livraison",
          emoji: "🛵",
          status: "EN_COURS",
          tone: "primary",
        },
        {
          id: "delivered",
          label: "Livré",
          emoji: "✅",
          status: "LIVRES",
          tone: "success",
        },
        {
          id: "return",
          label: "Retour dépôt",
          emoji: "↩️",
          status: "RETOUR_DEPOT",
          tone: "danger",
          needsComment: true,
          commentLabel: "Motif",
        },
      ];
  }
}

export const ACTION_TONE_CLASS: Record<LivreurAction["tone"], string> = {
  primary: "bg-ops-accent text-white hover:bg-ops-accent/90",
  success: "bg-emerald-700 text-white hover:bg-emerald-800",
  warn: "bg-amber-500 text-ops-ink hover:bg-amber-400",
  danger:
    "border border-ops-accent/40 bg-ops-accent/10 text-ops-accent hover:bg-ops-accent/15",
  neutral:
    "border border-ops-card bg-ops-surface text-ops-ink hover:border-ops-accent/50",
};
