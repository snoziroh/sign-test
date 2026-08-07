"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { AppDialog } from "@/components/ui/app-dialog";

type MobileSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileSettingsDialog({
  open,
  onClose,
}: MobileSettingsDialogProps) {
  const { t } = useLocale();

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={t.nav.settingsTitle}
      description={t.nav.settingsDescription}
    >
      <div className="overflow-hidden rounded-lg border border-border">
        <div
          className="
            grid min-h-14
            grid-cols-[minmax(0,1fr)_auto]
            items-center
            gap-4
            px-4
            py-3
          "
        >
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-fg">
              {t.nav.language}
            </div>

            <div className="mt-0.5 text-[11.5px] text-fg-muted">
              {t.nav.languageDescription}
            </div>
          </div>

          <div className="shrink-0">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="h-px bg-border-muted" />

        <div
          className="
            grid min-h-14
            grid-cols-[minmax(0,1fr)_auto]
            items-center
            gap-4
            px-4
            py-3
          "
        >
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-fg">
              {t.nav.theme}
            </div>

            <div className="mt-0.5 text-[11.5px] text-fg-muted">
              {t.nav.themeDescription}
            </div>
          </div>

          <div className="shrink-0">
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </AppDialog>
  );
}