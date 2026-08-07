import type { Metadata } from "next";
import { PageContainer } from "@/components/shell/page-container";
import { ScreenLauncher } from "@/components/shell/screen-launcher";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const meta = getDictionary(await getLocale()).routes.home;
  return { title: meta.title, description: meta.description };
}

/**
 * Màn mặc định của app: chỉ là bảng điều hướng xuống ba màn con.
 *
 * Trước đây `/` chính là màn ký, khiến ký nằm cao hơn một bậc so với
 * `/sign-request` và `/verify` dù ba thứ ngang hàng nhau. Giờ `/` không làm gì
 * ngoài việc chỉ đường.
 *
 * Không dùng `PageChrome`: tiêu đề và mô tả của màn này đã nằm trên `AppNavbar`,
 * dựng lại một lần nữa trong thân trang chỉ là nói hai lần cùng một câu.
 */
export default function HomePage() {
  return (
    <PageContainer>
      <ScreenLauncher />
    </PageContainer>
  );
}
