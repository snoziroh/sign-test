"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/i18n/locale-provider";

/**
 * Chuyển giữa hai màn của bàn thử. Dùng `Link` chứ không phải nút đổi tab trong
 * cùng một trang: mỗi màn giữ trạng thái nặng riêng (tệp đang chọn, preview đã
 * render, phiên ký đang chạy), và một URL riêng cho phép mở hai màn ở hai tab
 * cùng lúc — thứ hay dùng khi ký ở tab này rồi verify kết quả ở tab kia.
 */
export function ScreenNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const items = [
    { href: "/", label: t.routes.sign.label },
    { href: "/verify", label: t.routes.verify.label },
  ];

  return (
    <nav aria-label={t.nav.primaryLabel} className="mb-5">
      <ul className="inline-flex gap-0.5 rounded-lg bg-inset p-[3px]">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "block rounded-md bg-surface px-3.5 py-1.5 text-[12.5px] font-semibold text-fg shadow-sm"
                    : "block rounded-md px-3.5 py-1.5 text-[12.5px] font-medium text-fg-muted hover:text-fg"
                }
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
