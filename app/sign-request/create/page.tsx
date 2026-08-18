import type { Metadata } from "next";
import { PageChrome } from "@/components/shell/page-chrome";
import { ActorControl } from "@/features/sign-request/components/actor-control";
import { SignRequestTabs } from "@/features/sign-request/components/sign-request-tabs";
import { SignRequestWorkspace } from "@/features/sign-request/components/sign-request-workspace";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const meta = getDictionary(await getLocale()).routes.signRequest;
  return { title: meta.title, description: meta.description };
}

/**
 * Màn tạo yêu cầu ký nhiều bước.
 *
 * Khác hai màn kia ở chỗ nó không ký gì cả: `/sign` ký ngay tại chỗ, `/verify`
 * thẩm định ngay tại chỗ, còn màn này SOẠN một quy trình cho người khác chạy về
 * sau. Nhưng nó gọi cùng một dịch vụ — phân hệ quy trình
 * (`/api/templates`, `/api/documents`, `/api/signing-requests`) nằm chung
 * service với `/api/v1/sign`, nên header hiện đúng ô địa chỉ đó.
 *
 * Cạnh địa chỉ là danh tính người thao tác: dịch vụ không có xác thực nhưng mọi
 * endpoint quy trình đều đòi `X-Username`, và nó quyết định cả quyền đọc tài
 * liệu của yêu cầu. Hai công tắc đó phải nhìn thấy được cùng lúc, vì cùng nhau
 * chúng trả lời "lời gọi tiếp theo đi đâu, dưới tên ai".
 *
 * Bản nháp sống trong state của trang này và KHÔNG được lưu ở đâu cả. Vì thế
 * việc soạn có một đường dẫn riêng: rời sang danh sách rồi quay lại là mất bản
 * nháp, và một URL riêng làm ranh giới đó nhìn thấy được.
 */
export default async function SignRequestCreatePage() {
  const meta = getDictionary(await getLocale()).routes.signRequest;

  return (
    <PageChrome
      title={meta.title}
      description={meta.description}
      scope="sign"
      actions={<ActorControl />}
    >
      <SignRequestTabs />
      <SignRequestWorkspace />
    </PageChrome>
  );
}
