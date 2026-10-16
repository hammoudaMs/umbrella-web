const KEY_PREFIX = "umbrella.batch-printed.v1";

function storageKey(userId: number) {
  return `${KEY_PREFIX}.${userId}`;
}

function readIds(userId: number): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((id): id is number => typeof id === "number" && id > 0),
    );
  } catch {
    return new Set();
  }
}

function writeIds(userId: number, ids: Set<number>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(userId),
      JSON.stringify(Array.from(ids)),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function loadBatchPrintedIds(userId: number | undefined | null): Set<number> {
  if (!userId) return new Set();
  return readIds(userId);
}

export function markBatchPrinted(
  userId: number | undefined | null,
  parcelIds: number[],
): Set<number> {
  if (!userId || parcelIds.length === 0) {
    return userId ? readIds(userId) : new Set();
  }
  const next = readIds(userId);
  for (const id of parcelIds) next.add(id);
  writeIds(userId, next);
  return next;
}

export function isBatchPrinted(
  userId: number | undefined | null,
  parcelId: number,
): boolean {
  if (!userId) return false;
  return readIds(userId).has(parcelId);
}
