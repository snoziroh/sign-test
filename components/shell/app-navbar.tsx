"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/i18n/locale-provider";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ScreenNav } from "@/components/shell/screen-nav";
import { ArrowLeftIcon, ShieldCheckIcon } from "@/components/ui/icons";

/**
 * Thanh trên cùng của cả hệ thống (Design System §Top bar): dính trên đầu, nền
 * `surface`, một đường viền dưới ngăn với nội dung.
 *
 * Ngôn ngữ và sáng/tối nằm ở đây chứ không nằm trong từng màn: chúng là trạng
 * thái của cả ứng dụng, không của riêng màn nào — để mỗi màn tự dựng lại cụm
 * công tắc thì ba bản sao sẽ trôi khỏi nhau, và thanh này chỉ mất đi rồi hiện lại
 * mỗi lần chuyển trang.
 *
 * Nửa trái đổi theo vị trí đang đứng: ở `/` không có gì để chuyển tới ngoài ba
 * thẻ ngay bên dưới, nên chỗ đó dành cho danh tính của bàn thử; ở màn con thì
 * ngược lại — thứ cần là đường ra và đường sang màn khác.
 */
export function AppNavbar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-300 flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3 sm:px-8">
        {isHome ? (
          <div className="flex items-center gap-3">
            <span className="flex text-accent">
              <ShieldCheckIcon size={26} />
            </span>
            <div className="leading-tight">
              <h1 className="text-[15px] font-semibold text-fg">{t.routes.home.title}</h1>
              <p className="text-[11.5px] text-fg-muted">{t.routes.home.description}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-[12.5px] font-medium text-fg transition-colors hover:border-accent hover:text-accent"
            >
              <ArrowLeftIcon size={15} />
              {t.nav.backToHome}
            </Link>
            <ScreenNav />
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
