const CLIENT_KEY = "umbrella.client.scan.day.v1";
const OPS_SESSION_KEY = "umbrella.ops.scan.session.v1";

/** Calendar day in Tunisia (YYYY-MM-DD). */
export function tunisiaDayKey(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

type ClientDayStore = { day: string; codes: string[] };

function readClientDay(): ClientDayStore {
  if (typeof window === "undefined") {
    return { day: tunisiaDayKey(), codes: [] };
  }
  try {
    const raw = localStorage.getItem(CLIENT_KEY);
    if (!raw) return { day: tunisiaDayKey(), codes: [] };
    const parsed = JSON.parse(raw) as ClientDayStore;
    const day = tunisiaDayKey();
    if (!parsed || parsed.day !== day || !Array.isArray(parsed.codes)) {
      return { day, codes: [] };
    }
    return { day, codes: parsed.codes.map(normalizeCode) };
  } catch {
    return { day: tunisiaDayKey(), codes: [] };
  }
}

function writeClientDay(store: ClientDayStore) {
  try {
    localStorage.setItem(CLIENT_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

/** CLIENT: true if this bordereau was already scanned today. */
export function wasClientScannedToday(code: string): boolean {
  const store = readClientDay();
  return store.codes.includes(normalizeCode(code));
}

export function rememberClientScanToday(code: string): void {
  const store = readClientDay();
  const key = normalizeCode(code);
  if (!store.codes.includes(key)) {
    store.codes.push(key);
    writeClientDay(store);
  }
}

type OpsSessionStore = { codes: string[] };

function readOpsSession(): OpsSessionStore {
  if (typeof window === "undefined") return { codes: [] };
  try {
    const raw = sessionStorage.getItem(OPS_SESSION_KEY);
    if (!raw) return { codes: [] };
    const parsed = JSON.parse(raw) as OpsSessionStore;
    if (!parsed || !Array.isArray(parsed.codes)) return { codes: [] };
    return { codes: parsed.codes.map(normalizeCode) };
  } catch {
    return { codes: [] };
  }
}

function writeOpsSession(store: OpsSessionStore) {
  try {
    sessionStorage.setItem(OPS_SESSION_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

/** Ops quick-scan: same bordereau already opened this browser session. */
export function wasOpsScannedThisSession(code: string): boolean {
  return readOpsSession().codes.includes(normalizeCode(code));
}

export function rememberOpsScanSession(code: string): void {
  const store = readOpsSession();
  const key = normalizeCode(code);
  if (!store.codes.includes(key)) {
    store.codes.push(key);
    writeOpsSession(store);
  }
}
