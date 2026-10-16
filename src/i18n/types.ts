export type Locale = "fr" | "tn";

export const LOCALES: readonly Locale[] = ["fr", "tn"] as const;

export const LOCALE_STORAGE_KEY = "umbrella-locale";

export const LOCALE_META: Record<
  Locale,
  { htmlLang: string; dir: "ltr" | "rtl"; short: string; native: string }
> = {
  fr: { htmlLang: "fr", dir: "ltr", short: "FR", native: "Français" },
  tn: { htmlLang: "ar-TN", dir: "rtl", short: "TN", native: "دارجة" },
};

export type MessageTree = { [key: string]: string | MessageTree };

export type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>,
) => string;
