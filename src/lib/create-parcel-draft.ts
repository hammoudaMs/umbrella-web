import type { AddressLocationValue } from "@/components/AddressLocationFields";
import { apiFetch } from "@/lib/api";
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
  /** Depuis le stock vs nouveau produit saisi à la volée. */
  productSource: "stock" | "new";
  /** Selected SenderStockItem id (string for form draft). */
  stockItemId: string;
  unitCost: string;
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

function isCreateParcelDraft(value: unknown): value is CreateParcelDraft {
  if (typeof value !== "object" || value == null) return false;
  const stepIndex = (value as { stepIndex?: unknown }).stepIndex;
  return typeof stepIndex === "number" && Number.isFinite(stepIndex);
}

export function loadCreateParcelDraft(
  userId: number | undefined | null,
): CreateParcelDraft | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const key = storageKey(userId);
    let raw = window.localStorage.getItem(key);
    if (!raw) {
      raw = window.sessionStorage.getItem(key);
      if (raw) {
        window.localStorage.setItem(key, raw);
        window.sessionStorage.removeItem(key);
      }
    }
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCreateParcelDraft(parsed) ? parsed : null;
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
    window.localStorage.setItem(storageKey(userId), JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
}

export function clearCreateParcelDraftLocal(
  userId: number | undefined | null,
): void {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}

export async function fetchCreateParcelDraft(
  token: string | undefined | null,
): Promise<CreateParcelDraft | null> {
  if (!token) return null;
  try {
    const res = await apiFetch<{ draft: unknown }>(
      "/users/me/create-parcel-draft",
      { token, silent: true },
    );
    return isCreateParcelDraft(res?.draft) ? res.draft : null;
  } catch {
    return null;
  }
}

export async function persistCreateParcelDraft(
  token: string | undefined | null,
  draft: CreateParcelDraft,
): Promise<void> {
  if (!token) return;
  try {
    await apiFetch("/users/me/create-parcel-draft", {
      method: "PUT",
      token,
      silent: true,
      body: JSON.stringify({ draft }),
    });
  } catch {
    // best-effort — local cache remains
  }
}

export async function clearCreateParcelDraftRemote(
  token: string | undefined | null,
): Promise<void> {
  if (!token) return;
  try {
    await apiFetch("/users/me/create-parcel-draft", {
      method: "DELETE",
      token,
      silent: true,
    });
  } catch {
    // ignore
  }
}

export function clearCreateParcelDraftAll(
  userId: number | undefined | null,
  token: string | undefined | null,
): void {
  clearCreateParcelDraftLocal(userId);
  void clearCreateParcelDraftRemote(token);
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
