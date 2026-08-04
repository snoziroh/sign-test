import type { ReactNode } from "react";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ApiBaseUrlControl } from "./api-base-url-control";

/**
 * Khung của màn ký. Thay cho toàn bộ App Shell bên signing-tool (sidebar, command
 * palette, notification, breadcrumb…) — project này chỉ có một màn nên điều hướng
 * là thừa. Chỉ giữ hai công tắc thật sự dùng khi test: ngôn ngữ và giao diện sáng/tối.
 */
export function SignPageChrome({
  title,
  description,
  // bannerTitle,
  // bannerDescription,
  children,
}: {
  title: string;
  description: string;
  bannerTitle: string;
  bannerDescription: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-300 px-5 py-6 sm:px-8 sm:py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          <p className="max-w-[70ch] text-[13px] text-fg-muted">{description}</p>
        </div>
        {/* Địa chỉ API đứng cạnh hai công tắc kia vì nó cũng là trạng thái của cả
            màn hình — và là trạng thái duy nhất trong ba cái đổi được kết quả ký. */}
        <div className="flex items-center gap-2.5">
          <ApiBaseUrlControl />
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </header>

      {/* <div className="mb-4 flex items-start gap-3 rounded-lg border border-accent bg-accent-subtle px-4 py-3">
        <div>
          <p className="text-[12.5px] font-semibold text-fg">{bannerTitle}</p>
          <p className="mt-0.5 text-[11.5px] text-fg-muted">{bannerDescription}</p>
        </div>
      </div> */}

      {children}
    </div>
  );
}
