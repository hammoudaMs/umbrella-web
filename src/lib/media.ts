const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3011";

/** Resolve API-relative upload paths (`/uploads/...`) for browser display. */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  // Demo templates live in Next `/public/mock-docs`
  if (path.startsWith("/mock-docs/")) {
    return path;
  }
  if (path.startsWith("/uploads/")) {
    return `${API_URL.replace(/\/$/, "")}${path}`;
  }
  return path;
}

export type UploadKind =
  | "facture"
  | "decharge"
  | "cin"
  | "receipt"
  | "other";
