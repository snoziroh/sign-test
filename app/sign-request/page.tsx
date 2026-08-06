import type { Metadata } from "next";
import { PageChrome } from "@/components/shell/page-chrome";
import { SignRequestWorkspace } from "@/features/sign-request/components/sign-request-workspace";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const meta = getDictionary(await getLocale()).routes.signRequest;
  return { title: "Signing Request Mockup", description: meta.description };
}

/**
 * Màn tạo yêu cầu ký nhiều bước.
 *
 * Khác hai màn kia ở một điểm nền tảng: nó KHÔNG gọi dịch vụ ký. Màn `/` ký ngay
 * tại chỗ, màn `/verify` thẩm định ngay tại chỗ; màn này soạn ra một quy trình
 * cho người khác chạy về sau. Cả luồng hiện sống trong state của trang — bản
 * dựng giao diện, chưa có endpoint nào phía sau.
 *
 * Vì thế header không hiện ô địa chỉ dịch vụ ký: hiện một địa chỉ mà màn này
 * không gọi tới là nói dối về nơi dữ liệu sẽ đi.
 */
export default async function SignRequestPage() {
  const meta = getDictionary(await getLocale()).routes.signRequest;

  return (
    <PageChrome title={meta.title} description={meta.description} scope="none">
      <SignRequestWorkspace />
    </PageChrome>
  );
}
