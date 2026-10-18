import type { AddressLocationValue } from "@/components/AddressLocationFields";
import type { DeliveryMode } from "@/lib/domain";
import type { DeliveryWindowId } from "@/lib/delivery-windows";

const KEY_PREFIX = "umbrella.create-parcel-draft.v1";
const REOPEN_KEY = "umbrella.create-parcel-reopen.v1";

export type CreateParcelDraft = {
  stepIndex: number;
  recipientName: string;
  phone: string;
  phone2: string;
  exchange: boolean;
  allowTry: boolean;
  isFragile: boolean;
  liabilityAccepted: boolean;
  contentDeclarationAccepted: boolean;
  color: string;
  size: string;
  articleName: string;
  productType: string;
  productTypeOther: string;
  includeArticle: boolean;
  customInputValues: Record<string, string>;
  location: AddressLocationValue;
  deliveryMode: DeliveryMode;
  deliveryWindow: DeliveryWindowId;
  landmarkName: string | null;
  forceWeakAddress: boolean;
  zoneName: string | null;
  price: string;
  unitSalePrice: string;
  deliveryFee: string;
  returnFee: string;
  articleCount: string;
  parcelCount: string;
  paymentMode: string;
  exchangeNotes: string;
  notes: string;
  parcelAdvancedOpen: boolean;
  /** Inline hint under phone — restored without re-toasting. */
  recipientLookupHint?: string | null;
  /** Phone already looked up — skip API + toast on restore. */
  lookedUpPhone?: string | null;
};

function storageKey(userId: number) {
  return `${KEY_PREFIX}.${userId}`;
}

export function loadCreateParcelDraft(
  userId: number | undefined | null,
): CreateParcelDraft | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CreateParcelDraft;
    if (typeof parsed !== "object" || parsed == null) return null;
    if (typeof parsed.stepIndex !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCreateParcelDraft(
  userId: number | undefined | null,
  draft: CreateParcelDraft,
): void {
  if (!userId || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(userId), JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
}

export function clearCreateParcelDraft(
  userId: number | undefined | null,
): void {
  if (!userId || typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}

export function markCreateParcelReopen(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(REOPEN_KEY, "1");
  } catch {
    // ignore
  }
}

export function consumeCreateParcelReopen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const hit = window.sessionStorage.getItem(REOPEN_KEY) === "1";
    if (hit) window.sessionStorage.removeItem(REOPEN_KEY);
    return hit;
  } catch {
    return false;
  }
}
