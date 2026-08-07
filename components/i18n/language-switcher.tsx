"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import type { Locale } from "@/lib/i18n";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "vi", label: "VI" },
];

/**
 * Segmented EN/VI control (Design System §Tabs — segmented toggle), styled
 * identically to ThemeSwitcher so the two sit together in the header cluster.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="radiogroup"
      aria-label={t.shell.language.ariaLabel}
      className="inline-flex gap-0.5 rounded-lg bg-inset p-0.75"
    >
      {OPTIONS.map((option) => {
        const active = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLocale(option.value)}
            className={
              active
                ? "rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-fg shadow-sm"
                : "rounded-md px-2.5 py-1 text-xs font-medium text-fg-muted hover:text-fg"
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
