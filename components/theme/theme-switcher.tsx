"use client";

import { useTheme, type ThemePreference } from "@/components/theme/theme-provider";
import { useLocale } from "@/components/i18n/locale-provider";

/**
 * Segmented light/dark/system control (Design System §Tabs — segmented toggle).
 * Radio-group semantics so each option is keyboard reachable and announced.
 */
export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  const { t } = useLocale();

  const OPTIONS: { value: ThemePreference; label: string }[] = [
    { value: "light", label: t.shell.theme.light },
    { value: "dark", label: t.shell.theme.dark },
    { value: "system", label: t.shell.theme.system },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t.shell.theme.ariaLabel}
      className="inline-flex gap-0.5 rounded-lg bg-inset p-0.75"
    >
      {OPTIONS.map((option) => {
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(option.value)}
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
