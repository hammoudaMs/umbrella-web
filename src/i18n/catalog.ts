import { fr } from "@/i18n/messages/fr";
import { tn } from "@/i18n/messages/tn";
import type { Locale, MessageTree, TranslateFn } from "@/i18n/types";

const CATALOG: Record<Locale, MessageTree> = { fr, tn };

function lookup(tree: MessageTree, key: string): string | undefined {
  const parts = key.split(".");
  let node: string | MessageTree | undefined = tree;
  for (const part of parts) {
    if (node == null || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    return v == null ? `{${name}}` : String(v);
  });
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const primary = lookup(CATALOG[locale], key);
  if (primary != null) return interpolate(primary, vars);
  if (locale !== "fr") {
    const fallback = lookup(CATALOG.fr, key);
    if (fallback != null) return interpolate(fallback, vars);
  }
  return key;
}

export function createTranslator(locale: Locale): TranslateFn {
  return (key, vars) => translate(locale, key, vars);
}

export function getCatalog(locale: Locale): MessageTree {
  return CATALOG[locale];
}
