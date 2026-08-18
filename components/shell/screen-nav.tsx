"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLocale } from "@/components/i18n/locale-provider";
import { SCREEN_ROUTES } from "@/components/shell/routes";

export function ScreenNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const items = SCREEN_ROUTES.map((route) => ({
    href: route.href,
    label: t.routes[route.key].label,
  }));

  return (
    <nav
      aria-label={t.nav.primaryLabel}
      className="flex h-9 items-center"
    >
      <ul className="inline-flex h-9 items-center gap-0.5 rounded-lg bg-inset p-0.75">
        {items.map((item) => {
          /*
           * So khớp cả các đường dẫn CON: `/sign-request` đã tách thành
           * `/sign-request/workflows` và `/sign-request/create`, và một thanh
           * điều hướng không sáng ở đâu cả khi người dùng đang đứng trong màn
           * đó thì tệ hơn là không có.
           */
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li
              key={item.href}
              className="h-full"
            >
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex h-full items-center rounded-md px-3.5",
                  "text-[12.5px] leading-none transition-colors",
                  active
                    ? "bg-surface font-semibold text-fg shadow-sm"
                    : "font-medium text-fg-muted hover:text-fg",
                ].join(" ")}
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