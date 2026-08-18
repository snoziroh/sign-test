import type { Metadata } from "next";
import { PageChrome } from "@/components/shell/page-chrome";
import { ActorControl } from "@/features/sign-request/components/actor-control";
import { SignRequestTabs } from "@/features/sign-request/components/sign-request-tabs";
import { WorkflowDetailWorkspace } from "@/features/sign-request/components/workflow-detail-workspace";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const meta = getDictionary(await getLocale()).signRequest.workflows.list;
  return { title: meta.title, description: meta.description };
}

/**
 * Tiến trình của MỘT quy trình ký.
 *
 * Tiêu đề của trang không lấy được ở server: `GET /api/signing-requests/{id}`
 * đòi `X-Username`, mà danh tính là thứ sống ở `localStorage` của trình duyệt.
 * Nên trang này chỉ dựng khung, còn nội dung do component client tải về — cùng
 * lý do khiến mọi lời gọi của phân hệ quy trình đều chạy ở client.
 */
export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ signingRequestId: string }>;
}) {
  const { signingRequestId } = await params;
  const meta = getDictionary(await getLocale()).routes.signRequest;

  return (
    <PageChrome
      title={meta.title}
      description={meta.description}
      scope="sign"
      actions={<ActorControl />}
    >
      <SignRequestTabs />
      <WorkflowDetailWorkspace signingRequestId={decodeURIComponent(signingRequestId)} />
    </PageChrome>
  );
}
