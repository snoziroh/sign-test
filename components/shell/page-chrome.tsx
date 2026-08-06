import type { ReactNode } from "react";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ScreenNav } from "@/components/shell/screen-nav";
import { ApiBaseUrlControl } from "@/features/signing/components/api-base-url-control";

/**
 * Khung chung của mọi màn. Thay cho toàn bộ App Shell bên signing-tool (sidebar,
 * command palette, notification, breadcrumb…) — bàn thử này chỉ có hai màn nên
 * chỉ giữ đúng thứ cần: chuyển màn, địa chỉ API, ngôn ngữ, sáng/tối.
 *
 * Địa chỉ API đứng cạnh hai công tắc kia vì nó cũng là trạng thái của cả màn hình
 * — và là trạng thái duy nhất trong ba cái đổi được kết quả ký/verify. Nó nằm ở
 * đây chứ không riêng màn ký vì cả hai màn đều gọi cùng một backend qua cùng một
 * header.
 */
export function PageChrome({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  /** Nút riêng của từng màn, đặt dưới cụm công tắc chung. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-300 px-5 py-6 sm:px-8 sm:py-8">
      <ScreenNav />

      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          <p className="max-w-[70ch] text-[13px] text-fg-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <ApiBaseUrlControl />
          <LanguageSwitcher />
          <ThemeSwitcher />
          {actions}
        </div>
      </header>

      {children}
    </div>
  );
}
