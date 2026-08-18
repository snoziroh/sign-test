import type { Metadata } from "next";
import { PageChrome } from "@/components/shell/page-chrome";
import { ActorControl } from "@/features/sign-request/components/actor-control";
import { SignRequestTabs } from "@/features/sign-request/components/sign-request-tabs";
import { WorkflowListWorkspace } from "@/features/sign-request/components/workflow-list-workspace";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const meta = getDictionary(await getLocale()).signRequest.workflows.list;
  return { title: meta.title, description: meta.description };
}

/**
 * Danh sách quy trình ký của người đang thao tác.
 *
 * Cùng dịch vụ với màn tạo (`scope="sign"`) và cùng nút danh tính — ở đây danh
 * tính còn quan trọng hơn: `GET /api/signing-requests` KHÔNG có tham số nào nói
 * "của ai", nó đọc `X-Username` và chỉ trả về những yêu cầu mà người đó tạo
 * hoặc phải ký. Đổi tên trên nút đó là đổi hẳn danh sách bên dưới, nên nút phải
 * nằm ngay cạnh danh sách chứ không giấu trong một trang cấu hình.
 */
export default async function WorkflowListPage() {
  const meta = getDictionary(await getLocale()).signRequest.workflows.list;

  return (
    <PageChrome
      title={meta.title}
      description={meta.description}
      scope="sign"
      actions={<ActorControl />}
    >
      <SignRequestTabs />
      <WorkflowListWorkspace />
    </PageChrome>
  );
}
