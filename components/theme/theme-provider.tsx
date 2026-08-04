"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "sigil-theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

/* ---- preference store (localStorage + local emitter) ---- */

const prefListeners = new Set<() => void>();

function subscribePreference(callback: () => void) {
  prefListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    prefListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getPreferenceSnapshot(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function getServerPreference(): ThemePreference {
  return "system";
}

/* ---- system color-scheme store ---- */

function subscribeSystemTheme(callback: () => void) {
  const media = window.matchMedia(MEDIA_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getSystemSnapshot(): ResolvedTheme {
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function getServerSystemTheme(): ResolvedTheme {
  return "light";
}

/**
 * Light/dark/system theming. React owns the DOM update so client-side error
 * recovery never needs to render an inline script from the root layout.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore(
    subscribePreference,
    getPreferenceSnapshot,
    getServerPreference,
  );
  const system = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemSnapshot,
    getServerSystemTheme,
  );
  const resolved: ResolvedTheme = preference === "system" ? system : preference;

  // Sync the external system (DOM attribute) with React state.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode) — preference lasts this session only.
    }
    prefListeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
