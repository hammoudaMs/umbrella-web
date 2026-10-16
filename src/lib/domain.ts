import type { AppRole } from "@/lib/roles";

export type DeliveryMode = "EXTERNAL" | "INTERNAL";

export type DeliveryRoute = {
  id: number;
  governorate: string;
  mode: DeliveryMode;
  createdAt?: string;
  updatedAt?: string;
};

export type TimelineEntry = {
  at: string;
  label: string;
  comment?: string | null;
  status?: string | null;
  actor?: string | null;
};

export type PersonRef = { id: number; name: string };

export type Parcel = {
  id: number;
  code: string | null;
  recipientName: string;
  phone: string;
  phone2?: string | null;
  governorate: string;
  city: string;
  locality?: string | null;
  address: string;
  price: number | string;
  notes: string | null;
  designation?: string | null;
  status: string;
  mode: DeliveryMode;
  bordereauUrl: string | null;
  createdAt: string;
  updatedAt?: string;
  senderId: number;
  sender?: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  driverId?: number | null;
  driver?: (PersonRef & { phone?: string | null }) | null;
  /** CLIENT account matched by parcel phone (for livreur ↔ client chat). */
  recipientUserId?: number | null;
  recipientUser?: (PersonRef & { phone?: string | null }) | null;
  zoneId?: number | null;
  zone?: PersonRef | null;
  agencyId?: number | null;
  agency?: { id: number; name: string; governorate: string } | null;
  timeline?: TimelineEntry[];
  allowOpen?: boolean;
  tryProduct?: boolean;
  liabilityAcceptedAt?: string | null;
  isExchange?: boolean;
  exchangeNotes?: string | null;
  paymentMode?: string | null;
  articleCount?: number;
  parcelCount?: number;
  lat?: number | null;
  lng?: number | null;
  deliveryWindow?: string | null;
  landmarkPhotoName?: string | null;
  addressQuality?: number | null;
  codSettledAt?: string | null;
};

export type TicketStatus = "EN_COURS" | "RESOLU" | "FERME";
export type TicketKind = "GENERAL" | "CHANGEMENT_PRIX" | "RELANCE";

export type Ticket = {
  id: number;
  title: string;
  description: string | null;
  kind: TicketKind;
  requestedPrice?: number | string | null;
  status: TicketStatus;
  createdAt: string;
  updatedAt?: string;
  parcel?: {
    id: number;
    code: string | null;
    price?: number | string;
    status?: string;
  } | null;
  createdBy?: { id: number; name: string; email: string };
};

export const TICKET_KIND_LABEL: Record<TicketKind, string> = {
  GENERAL: "Général",
  CHANGEMENT_PRIX: "Changement de prix",
  RELANCE: "Relance",
};

/** Parcel left sender; tickets métier allowed until viré. */
export const TICKET_PRE_SORTIE = ["EN_ATTENTE", "NON_SERIEUX"] as const;
export const TICKET_POST_VIRE = [
  "LIVRES_PAYES",
  "REMBOURSES",
  "SUPPRIME",
] as const;

export function canOpenParcelTicket(parcel: {
  status: string;
  codSettledAt?: string | null;
}): boolean {
  if ((TICKET_PRE_SORTIE as readonly string[]).includes(parcel.status)) {
    return false;
  }
  if ((TICKET_POST_VIRE as readonly string[]).includes(parcel.status)) {
    return false;
  }
  if (parcel.codSettledAt) return false;
  return true;
}

export type ReturnLotStatus = "OPEN" | "CLOSED";

export type ReturnLot = {
  kind: "return_lot";
  id: number;
  code: string;
  status: ReturnLotStatus;
  senderId: number;
  sender?: { id: number; name: string; email: string } | null;
  destinationLabel?: string | null;
  destinationAgencyId?: number | null;
  destinationAgency?: { id: number; name: string; governorate?: string } | null;
  colisCount?: number;
  itemCount: number;
  closedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  parcels: Parcel[];
};

export function isReturnLot(value: unknown): value is ReturnLot {
  return (
    !!value &&
    typeof value === "object" &&
    (value as ReturnLot).kind === "return_lot" &&
    Array.isArray((value as ReturnLot).parcels)
  );
}

export type PickupManifestKind = "EN_ATTENTE" | "PRE_ENLEVEMENT";
export type PickupManifestStatus = "OPEN" | "CLOSED";

export type PickupManifest = {
  kind: "pickup_manifest";
  id: number;
  code: string;
  manifestKind: PickupManifestKind;
  status: PickupManifestStatus;
  senderId: number | null;
  sender?: { id: number; name: string; email: string } | null;
  createdById: number;
  createdBy?: { id: number; name: string; email: string } | null;
  dechargeUrl?: string | null;
  cinUrl?: string | null;
  itemCount: number;
  closedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  parcels: Parcel[];
};

export function isPickupManifest(value: unknown): value is PickupManifest {
  return (
    !!value &&
    typeof value === "object" &&
    (value as PickupManifest).kind === "pickup_manifest" &&
    Array.isArray((value as PickupManifest).parcels)
  );
}

export function isParcelBundle(
  value: unknown,
): value is ReturnLot | PickupManifest {
  return isReturnLot(value) || isPickupManifest(value);
}

export const PICKUP_MANIFEST_KIND_LABEL: Record<PickupManifestKind, string> = {
  EN_ATTENTE: "En attente",
  PRE_ENLEVEMENT: "Pré-enlèvement",
};

export type PaymentStatus =
  | "EN_DEMANDE"
  | "VALIDE_FINANCE"
  | "VALIDE_CHEF"
  | "VALIDE_EXPERT"
  | "APPROUVE"
  | "PAYE"
  | "REJETE";

export type PaymentHistoryEntry = {
  at: string;
  status: PaymentStatus;
  label: string;
  actorName?: string | null;
};

export type Payment = {
  id: number;
  amount: number | string;
  status: PaymentStatus;
  note: string | null;
  createdAt: string;
  updatedAt?: string;
  sender?: { id?: number; name: string; email: string; agencyId?: number | null };
  items: Array<{ parcel: { id: number; code: string | null }; amount: number | string }>;
  history?: PaymentHistoryEntry[];
  isSmall?: boolean;
  requiresExpert?: boolean;
  budgetStress?: boolean;
};

export type Zone = {
  id: number;
  name: string;
  governorate: string | null;
  centerLat: number | null;
  centerLng: number | null;
  radiusKm: number | null;
  isActive: boolean;
  parcelCount?: number;
  livreurCount?: number;
};

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Gouvernorat agency — separate from livreur fleet Zone. */
export type Agency = {
  id: number;
  name: string;
  governorate: string;
  isActive: boolean;
  userCount?: number;
  parcelCount?: number;
};

export type UserRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: AppRole;
  agencyId?: number | null;
  agency?: { id: number; name: string; governorate: string } | null;
  zoneId?: number | null;
  homeZone?: { id: number; name: string; governorate: string | null } | null;
  approvalStatus?: ApprovalStatus;
  approvedAt?: string | null;
  governorate?: string | null;
  city?: string | null;
  address?: string | null;
  shopName?: string | null;
  productTypes?: string[];
  productNotes?: string | null;
  isActive: boolean;
  createdAt: string;
};

export type Driver = { id: number; name: string; email: string; phone?: string | null };

export type NotificationKind = "parcel" | "ticket" | "payment";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  targetId: number | null;
};

export type CodItem = {
  id: number;
  code: string | null;
  recipientName: string;
  city: string;
  price: number;
  status: string;
  codSettledAt: string | null;
  codSettledBy: PersonRef | null;
  driver: PersonRef | null;
};

export type CodPayload = {
  items: CodItem[];
  summary: {
    openAmount: number;
    openCount: number;
    settledAmount: number;
    settledCount: number;
  };
};

export function toAmount(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function formatTnd(value: number | string | null | undefined): string {
  return `${toAmount(value).toLocaleString("fr-TN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })} TND`;
}
