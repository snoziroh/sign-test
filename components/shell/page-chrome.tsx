import type { ReactNode } from "react";
import { PageContainer } from "@/components/shell/page-container";
import { ApiBaseUrlControl } from "@/features/signing/components/api-base-url-control";
import { VerifyBaseUrlControl } from "@/features/verification/components/verify-base-url-control";

/**
 * Khung của một màn con: tiêu đề, mô tả, và địa chỉ dịch vụ mà màn đó gọi.
 *
 * Chuyển màn, ngôn ngữ và sáng/tối đã lên `AppNavbar` — chúng thuộc về cả ứng
 * dụng. Địa chỉ API thì ở lại đây, vì nó đúng nghĩa là trạng thái của riêng màn
 * này: ký và verify là hai service riêng, chạy trên hai cổng khác nhau, và một ô
 * dùng chung trên navbar sẽ nói dối ở một trong hai màn.
 */
export function PageChrome({
  title,
  description,
  scope = "sign",
  actions,
  children,
}: {
  title: string;
  description: string;
  /**
   * Dịch vụ mà màn này gọi — quyết định ô địa chỉ nào hiện trên header. `none`
   * dành cho màn không gọi dịch vụ nào: hiện một địa chỉ không được dùng tới là
   * nói dối về nơi dữ liệu sẽ đi.
   */
  scope?: "sign" | "verify" | "none";
  /** Nút riêng của từng màn, đặt cạnh ô địa chỉ dịch vụ. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageContainer>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          <p className="max-w-[70ch] text-[13px] text-fg-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {scope === "verify" ? <VerifyBaseUrlControl /> : null}
          {scope === "sign" ? <ApiBaseUrlControl /> : null}
          {actions}
        </div>
      </header>

      {children}
    </PageContainer>
  );
}
