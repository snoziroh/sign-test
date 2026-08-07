"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLocale } from "@/components/i18n/locale-provider";
import { SCREEN_ROUTES } from "@/components/shell/routes";
import { AppDialog } from "@/components/ui/app-dialog";

type MobileNavigationDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavigationDialog({
  open,
  onClose,
}: MobileNavigationDialogProps) {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={t.nav.mobileNavigationTitle}
      description={t.nav.mobileNavigationDescription}
    >
      <nav aria-label={t.nav.primaryLabel}>
        <ul className="flex flex-col gap-1">
          {SCREEN_ROUTES.map((route) => {
            const active = pathname === route.href;

            return (
              <li key={route.href}>
                <Link
                  href={route.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex min-h-11 w-full items-center rounded-md px-3",
                    "text-[13px] transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-accent",
                    active
                      ? "bg-accent-subtle font-semibold text-accent"
                      : "font-medium text-fg hover:bg-surface-2",
                  ].join(" ")}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {t.routes[route.key].label}
                  </span>

                  {active ? (
                    <span
                      aria-hidden="true"
                      className="ml-3 size-1.5 shrink-0 rounded-full bg-accent"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </AppDialog>
  );
}