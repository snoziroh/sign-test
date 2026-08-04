// lib/i18n/index.ts
import { en } from "./dictionaries/en";
import { vi } from "./dictionaries/vi";
import type { Locale } from "./config";

export type { Dictionary } from "./dictionaries/en";
export * from "./config";

const dictionaries = { en, vi };

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
