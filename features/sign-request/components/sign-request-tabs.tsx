"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/i18n/locale-provider";
import { LayersIcon, PlusIcon } from "@/components/ui/icons";

/**
 * Hai nửa của màn yêu cầu ký: DANH SÁCH quy trình và TẠO một quy trình mới.
 *
 * Tách thành hai đường dẫn thật chứ không phải hai tab trong một trang, vì
 * chúng khác nhau ở thứ cơ bản nhất: một cái mở ra để xem việc đang chạy (và
 * mở lại được bằng link, gửi được cho người khác), cái kia mở ra để soạn một
 * bản nháp sống trong bộ nhớ trang. Nhét cả hai vào một URL nghĩa là bản nháp
 * đang soạn dở sẽ bị xoá mỗi lần người dùng liếc qua danh sách.
 *
 * Thẻ danh sách vẫn sáng khi đang ở màn chi tiết của một quy trình: chi tiết là
 * con của danh sách, không phải một nơi thứ ba.
 */
export function SignRequestTabs() {
  const { t } = useLocale();
  const pathname = usePathname();
  const w = t.signRequest.workflows.tabs;

  const items = [
    { href: "/sign-request/workflows", label: w.list, icon: LayersIcon },
    { href: "/sign-request/create", label: w.create, icon: PlusIcon },
  ];

  return (
    <nav aria-label={w.label} className="mb-4">
      <ul className="inline-flex items-center gap-0.5 rounded-lg bg-inset p-0.75">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3.5 text-[12.5px] transition-colors ${
                  active
                    ? "bg-surface font-semibold text-fg shadow-sm"
                    : "font-medium text-fg-muted hover:text-fg"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
