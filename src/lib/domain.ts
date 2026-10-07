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

export type Ticket = {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  createdAt: string;
  updatedAt?: string;
  parcel?: { id: number; code: string | null } | null;
  createdBy?: { id: number; name: string; email: string };
};

export type PaymentStatus = "EN_DEMANDE" | "APPROUVE" | "PAYE" | "REJETE";

export type Payment = {
  id: number;
  amount: number | string;
  status: PaymentStatus;
  note: string | null;
  createdAt: string;
  updatedAt?: string;
  sender?: { id?: number; name: string; email: string };
  items: Array<{ parcel: { id: number; code: string | null }; amount: number | string }>;
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
