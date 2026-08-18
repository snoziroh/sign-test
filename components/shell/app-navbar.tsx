/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useLocale } from "@/components/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

import { MobileNavigationDialog } from "@/components/shell/mobile-navigation-dialog";
import { MobileSettingsDialog } from "@/components/shell/mobile-settings-dialog";
import { ScreenNav } from "@/components/shell/screen-nav";

import {
  ArrowLeftIcon,
  HomeIcon,
  MenuIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";

const mobileIconButtonClassName = `
  inline-flex
  size-[34px]
  shrink-0
  items-center
  justify-center
  rounded-md
  border
  border-border
  bg-surface
  text-fg-muted
  transition-colors
  hover:bg-surface-2
  hover:text-fg
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-accent
  focus-visible:ring-offset-2
  focus-visible:ring-offset-surface
`;

/**
 * Đường dẫn công khai — không được thấy khung nội bộ.
 *
 * `/external-sign` mở cho người NGOÀI hệ thống bằng một liên kết ký. Thanh này chở
 * tên ba màn nghiệp vụ, đường về trang chủ và (qua `PageChrome`) ô địa chỉ dịch vụ
 * ký: một bản đồ hệ thống mà một liên kết bị chuyển tiếp sẽ mang theo. Trang đó tự
 * dựng khung riêng ở `ExternalSigningChrome`.
 */
const PUBLIC_PATH_PREFIXES = ["/external-sign"] as const;

export function AppNavbar() {
  const pathname = usePathname();
  const { t } = useLocale();

  const isPublicRoute = PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const isHome = pathname === "/";

  const [navigationOpen, setNavigationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  /*
   * Nếu route thay đổi bằng bất kỳ cách nào
   * ngoài việc click Link trong modal, đóng modal.
   */
  useEffect(() => {
    setNavigationOpen(false);
    setSettingsOpen(false);
  }, [pathname]);

  // Sau mọi hook, không trước: một `return` sớm đặt trên chúng là đổi số hook giữa
  // hai lần render khi người dùng chuyển sang route công khai.
  if (isPublicRoute) return null;

  return (
    <>
      <header
        className="
          sticky top-0 z-20
          h-16
          border-b border-border
          bg-surface
        "
      >
        <div
          className="
            mx-auto
            flex h-full w-full
            max-w-300
            items-center
            px-4
            md:px-8
          "
        >
          {/* =========================================
              MOBILE
              ========================================= */}

          <div className="flex w-full items-center md:hidden">
            <Link
              href="/"
              aria-label={t.nav.home}
              aria-current={isHome ? "page" : undefined}
              className={[
                mobileIconButtonClassName,
                isHome
                  ? "border-accent bg-accent-subtle text-accent"
                  : "",
              ].join(" ")}
            >
              <HomeIcon size={17} />
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                aria-label={t.nav.openNavigation}
                aria-haspopup="dialog"
                aria-expanded={navigationOpen}
                onClick={() => {
                  setSettingsOpen(false);
                  setNavigationOpen(true);
                }}
                className={mobileIconButtonClassName}
              >
                <MenuIcon size={17} />
              </button>

              <button
                type="button"
                aria-label={t.nav.openSettings}
                aria-haspopup="dialog"
                aria-expanded={settingsOpen}
                onClick={() => {
                  setNavigationOpen(false);
                  setSettingsOpen(true);
                }}
                className={mobileIconButtonClassName}
              >
                <SettingsIcon size={17} />
              </button>
            </div>
          </div>

          {/* =========================================
              DESKTOP
              ========================================= */}

          <div className="hidden w-full items-center md:flex">
            <div className="min-w-0 flex-1">
              {isHome ? (
                <div className="flex h-9 items-center gap-3">
                  <span className="flex shrink-0 text-accent">
                    <ShieldCheckIcon size={26} />
                  </span>

                  <div className="min-w-0 leading-tight">
                    <h1 className="truncate text-[15px] font-semibold text-fg">
                      {t.routes.home.title}
                    </h1>

                    <p className="truncate text-[11.5px] text-fg-muted">
                      {t.routes.home.description}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-9 min-w-0 items-center gap-3">
                  <Link
                    href="/"
                    className="
                      inline-flex
                      h-8
                      shrink-0
                      items-center
                      gap-1.5
                      rounded-md
                      border
                      border-border
                      bg-surface-2
                      px-3
                      text-[12.5px]
                      font-medium
                      text-fg
                      transition-colors
                      hover:border-accent
                      hover:text-accent
                    "
                  >
                    <ArrowLeftIcon size={15} />
                    {t.nav.backToHome}
                  </Link>

                  <ScreenNav />
                </div>
              )}
            </div>

            <div className="ml-4 flex shrink-0 items-center gap-2.5">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile dialogs nằm ngoài header.
          Native dialog vẫn được render vào top-layer. */}

      <MobileNavigationDialog
        open={navigationOpen}
        onClose={() => setNavigationOpen(false)}
      />

      <MobileSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}