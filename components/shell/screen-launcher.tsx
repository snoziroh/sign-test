import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/icons";
import { SCREEN_ROUTES } from "@/components/shell/routes";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

/**
 * Bảng điều hướng ở `/`: mỗi màn con một nút to.
 *
 * Cả thẻ là vùng bấm (Design System §Cards — interactive card), không phải một
 * đường link nhỏ nằm trong thẻ: đây là việc duy nhất màn này có, nên đích bấm
 * nên to bằng đúng thứ nó đại diện.
 */
export async function ScreenLauncher() {
  const t = getDictionary(await getLocale());

  return (
    <nav aria-label={t.nav.primaryLabel}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCREEN_ROUTES.map(({ href, key, icon: Icon }) => {
          const meta = t.routes[key];

          return (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm transition-colors hover:border-accent hover:bg-accent-subtle"
              >
                <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-accent transition-colors group-hover:border-accent">
                  <Icon size={20} />
                </span>

                <span className="text-base font-semibold text-fg">{meta.title}</span>

                <span className="text-[12.5px] leading-relaxed text-fg-muted">
                  {meta.description}
                </span>

                <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[12.5px] font-semibold text-accent">
                  {t.nav.open}
                  <ArrowRightIcon size={14} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
