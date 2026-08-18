"use client";

import { useEffect, type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { ClockIcon, InfoIcon, LockIcon, ShieldCheckIcon } from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import { formatCountdown, useCountdown } from "@/features/signing/components/sign-dialog-parts";

/**
 * Khung của trang ký công khai.
 *
 * KHÔNG dùng `PageChrome`/`AppNavbar` của ứng dụng, và đó là yêu cầu bảo mật chứ
 * không phải lựa chọn thẩm mỹ: thanh điều hướng nội bộ chở tên ba màn nghiệp vụ,
 * đường về trang chủ, và ô địa chỉ dịch vụ ký. Người ngoài hệ thống không được
 * thấy bất cứ thứ nào trong đó — bản đồ hệ thống là thông tin, và một liên kết ký
 * bị chuyển tiếp sẽ mang bản đồ đó theo.
 *
 * Hai công tắc được giữ lại vì chúng thuộc về người đọc chứ không phải hệ thống:
 * ngôn ngữ và sáng/tối.
 */
export function ExternalSigningChrome({
  t,
  demo,
  sessionExpiresAt,
  onSessionExpired,
  children,
}: {
  t: Dictionary;
  demo: boolean;
  sessionExpiresAt?: string;
  onSessionExpired?: () => void;
  children: ReactNode;
}) {
  const c = t.externalSign.chrome;

  return (
    <div className="flex min-h-full flex-col bg-surface-2">
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-300 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:px-8">
          <span className="flex shrink-0 text-accent">
            <ShieldCheckIcon size={24} />
          </span>

          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14.5px] font-semibold text-fg">{c.brand}</p>
            <p className="truncate text-[11px] text-fg-muted">{c.subtitle}</p>
          </div>

          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border-muted bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-fg-muted">
            <LockIcon size={11} className="shrink-0" />
            <span className="hidden sm:inline">{c.publicBadge}</span>
          </span>

          {sessionExpiresAt ? (
            <SessionCountdown
              t={t}
              expiresAt={sessionExpiresAt}
              onExpired={onSessionExpired}
            />
          ) : null}

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-300 flex-1 px-4 py-5 md:px-8">
        {demo ? <DemoBanner t={t} /> : null}
        {children}
      </main>

      <footer className="border-t border-border-muted px-4 py-3 text-center text-[11px] text-fg-muted md:px-8">
        {c.secureNote}
      </footer>
    </div>
  );
}

/**
 * Đồng hồ của phiên ký.
 *
 * Nó tồn tại để người ký không mất công điền xong một form dài rồi mới biết phiên
 * đã chết. Đổi màu ở mốc 5 phút, và khi hết thì báo ra ngoài đúng MỘT lần để màn
 * hình khoá nút ký — im lặng ở đây là để người ký bấm ký và nhận một lỗi 401 thay
 * cho một câu giải thích.
 */
function SessionCountdown({
  t,
  expiresAt,
  onExpired,
}: {
  t: Dictionary;
  expiresAt: string;
  onExpired?: () => void;
}) {
  const c = t.externalSign.chrome;
  const remaining = useCountdown(expiresAt);

  const expired = remaining !== undefined && remaining <= 0;
  const endingSoon = !expired && remaining !== undefined && remaining <= 5 * 60_000;

  // Báo ra ngoài trong effect, không trong thân render: gọi `setState` của cha
  // giữa lúc render con là đúng thứ React cấm, và ở đây nó còn chạy lại mỗi giây.
  useEffect(() => {
    if (expired) onExpired?.();
  }, [expired, onExpired]);

  if (remaining === undefined) return null;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold ${
        expired
          ? "border-danger bg-danger-subtle text-danger"
          : endingSoon
            ? "border-warning bg-warning-subtle text-warning"
            : "border-border-muted bg-surface-2 text-fg-muted"
      }`}
      title={endingSoon ? c.sessionEndingSoon : undefined}
    >
      <ClockIcon size={11} className="shrink-0" />
      {expired ? c.sessionExpired : c.sessionExpiresIn(formatCountdown(remaining))}
    </span>
  );
}

/**
 * Nhãn bản mô phỏng — viền đứt, cùng quy ước với khối "Điều khiển bản dựng" của
 * màn tạo yêu cầu ký. Nó phải to và không tắt được: một trang ký trông thật mà
 * không ký gì cả là thứ dễ gây ngộ nhận nhất trong cả ứng dụng này.
 */
function DemoBanner({ t }: { t: Dictionary }) {
  const d = t.externalSign.demo;
  return (
    <div className="mb-4 flex gap-3 rounded-lg border border-dashed border-warning bg-warning-subtle px-4 py-3">
      <InfoIcon size={16} className="mt-0.5 shrink-0 text-warning" />
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-warning">
          <span className="mr-2 rounded-sm bg-warning px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-canvas">
            {d.badge}
          </span>
          {d.title}
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">{d.body}</p>
        <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-fg-subtle">
          {d.scenarios}
        </p>
      </div>
    </div>
  );
}
