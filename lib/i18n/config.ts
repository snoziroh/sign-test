// lib/i18n/config.ts
/** Supported locales and the cookie that persists the user's choice. */
export const LOCALES = ["en", "vi"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "sigil-locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "vi";
}
