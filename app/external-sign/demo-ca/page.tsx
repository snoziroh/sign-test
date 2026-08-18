"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheckIcon, XIcon } from "@/components/ui/icons";

/**
 * Trang giả lập của NHÀ CUNG CẤP CHỨNG THƯ, chỉ dùng cho chế độ mô phỏng
 * (`#demo=1`) của `/external-sign`.
 *
 * Nó tồn tại vì phần khó nhất của luồng eSign Cloud không nằm trong trang ký: hai
 * bước chờ được điều khiển bằng một CỬA SỔ PHỤ, và tín hiệu duy nhất mà trang ký
 * đọc được từ bên kia là lúc cửa sổ ĐÓNG LẠI (cross-origin không cho gì hơn). Trỏ
 * `nextUrl` vào `about:blank` thì không kiểm được cơ chế đó; trỏ vào trang thật thì
 * cần một giao dịch thật.
 *
 * Đây là giàn giáo mô phỏng: xoá cùng lúc với `features/external-signing/demo-session.ts`
 * khi backend công khai lên. Vì thế câu chữ ở đây KHÔNG đi qua từ điển i18n — thêm
 * chúng vào từ điển là để lại rác sau khi file này biến mất.
 */
export default function DemoCertificateAuthorityPage() {
  const stage = useSearchParams().get("stage") === "otp" ? "otp" : "identity";
  const [code, setCode] = useState("");
  const [done, setDone] = useState(false);

  /**
   * Đóng cửa sổ chính là tín hiệu mà trang ký đang chờ.
   *
   * `window.close()` chỉ chạy được với cửa sổ do script mở ra — đúng trường hợp
   * này. Ai đó mở trực tiếp bằng URL thì lời gọi bị bỏ qua, nên vẫn phải có một câu
   * hướng dẫn đóng tay.
   */
  function finish() {
    setDone(true);
    window.setTimeout(() => window.close(), 400);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-8">
      <div className="w-full max-w-100 rounded-xl border border-border bg-surface p-6 shadow-md">
        <div className="flex items-center gap-2.5 border-b border-border-muted pb-3">
          <ShieldCheckIcon size={20} className="shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-fg">
              Nhà cung cấp chứng thư số
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-warning">
              Trang giả lập · bản mô phỏng
            </p>
          </div>
        </div>

        {done ? (
          <div className="py-8 text-center">
            <p className="text-[13px] font-semibold text-success">Đã hoàn tất</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-fg-muted">
              Cửa sổ này sẽ tự đóng. Nếu không, hãy đóng tay và quay lại trang ký.
            </p>
          </div>
        ) : stage === "identity" ? (
          <div className="pt-4">
            <h1 className="text-[15px] font-semibold text-fg">Xác nhận danh tính</h1>
            <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">
              Ở luồng thật, đây là nơi người ký đối chiếu thông tin trên giấy tờ và đồng ý cấp
              chứng thư. Bản mô phỏng bỏ qua toàn bộ phần đó.
            </p>
            <button
              type="button"
              onClick={finish}
              className="mt-5 flex h-10 w-full items-center justify-center rounded-md border border-accent bg-accent text-[13px] font-semibold text-accent-fg"
            >
              Tôi xác nhận thông tin
            </button>
          </div>
        ) : (
          <div className="pt-4">
            <h1 className="text-[15px] font-semibold text-fg">Nhập mã OTP</h1>
            <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">
              Bản mô phỏng nhận bất kỳ mã 6 chữ số nào.
            </p>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="mt-4 h-11 w-full rounded-md border border-border bg-canvas text-center font-mono text-[18px] tracking-[0.4em] text-fg"
            />
            <button
              type="button"
              disabled={code.length < 6}
              onClick={finish}
              className="mt-4 flex h-10 w-full items-center justify-center rounded-md border border-accent bg-accent text-[13px] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-50"
            >
              Xác nhận mã
            </button>
            <button
              type="button"
              onClick={() => window.close()}
              className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface text-[12px] font-semibold text-fg"
            >
              <XIcon size={13} />
              Đóng mà chưa nhập mã
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
