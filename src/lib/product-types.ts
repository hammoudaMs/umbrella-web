export const PRODUCT_TYPES = [
  "Vêtements",
  "Chaussures",
  "Électronique",
  "Cosmétiques",
  "Accessoires",
  "Alimentaire",
  "Documents",
  "Autre",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

const BUILTIN = new Set<string>(PRODUCT_TYPES);

/** Builtin types without “Autre”, then saved custom labels, then Autre. */
export function productTypeOptions(saved: string[] | null | undefined): string[] {
  const builtins = PRODUCT_TYPES.filter((t) => t !== "Autre");
  const custom = (saved ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !BUILTIN.has(t))
    .filter(
      (t, i, all) =>
        all.findIndex(
          (x) => x.localeCompare(t, "fr", { sensitivity: "base" }) === 0,
        ) === i,
    )
    .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
  return [...builtins, ...custom, "Autre"];
}

export function isBuiltinProductType(value: string): boolean {
  return BUILTIN.has(value);
}

export function mergeSavedProductType(
  existing: string[] | null | undefined,
  customLabel: string,
): string[] | null {
  const trimmed = customLabel.trim();
  if (trimmed.length < 2 || BUILTIN.has(trimmed)) return null;
  const current = (existing ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t !== "Autre");
  if (
    current.some(
      (t) => t.localeCompare(trimmed, "fr", { sensitivity: "base" }) === 0,
    )
  ) {
    return null;
  }
  return [...current, trimmed];
}
