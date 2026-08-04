"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getDictionary, LOCALE_COOKIE, type Dictionary, type Locale } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Locale state mirrors the theme provider's shape: the root layout reads the
 * persisted cookie on the server and passes it down as `initialLocale` so
 * SSR markup and the first client render agree. Switching locale updates
 * this context immediately (no flash) and refreshes Server Components so
 * cookie-driven server-rendered text (page metadata, server pages) follows.
 */
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      try {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
      } catch {
        // Storage unavailable (private mode) — preference lasts this session only.
      }
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, t: getDictionary(locale), setLocale }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
