import type { Metadata } from "next";
import { PageChrome } from "@/components/shell/page-chrome";
import { ActorControl } from "@/features/sign-request/components/actor-control";
import { WorkflowSignWorkspace } from "@/features/sign-request/components/workflow-sign-workspace";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const meta = getDictionary(await getLocale()).signRequest.workflows.sign;
  return { title: meta.title };
}

/**
 * Ký phần việc của mình trong một quy trình.
 *
 * Trang này chỉ dựng khung rồi nhường hẳn cho component client, cùng lý do với
 * màn chi tiết bên cạnh: mọi endpoint của phân hệ quy trình đòi `X-Username`, mà
 * danh tính đó sống ở `localStorage` của trình duyệt. Không có gì đọc được ở
 * server — kể cả tên tài liệu để đặt tiêu đề trang.
 *
 * `signerId` đi qua QUERY STRING chứ không phải một đoạn đường dẫn nữa: một
 * người có thể đứng ở hai bước khác nhau của cùng một quy trình
 * (`myAssignments` trả về mảng), nên trang phải biết ký ô NÀO. Thiếu hoặc sai
 * thì workspace hiện một màn chặn nói rõ lý do — xem nhánh `SIGNER_MISSING` /
 * `SIGNER_NOT_FOUND`.
 *
 * `searchParams` là một Promise ở App Router bản này, cùng kiểu với `params`.
 */
export default async function WorkflowSignPage({
  params,
  searchParams,
}: {
  params: Promise<{ signingRequestId: string }>;
  searchParams: Promise<{ signerId?: string | string[] }>;
}) {
  const { signingRequestId } = await params;
  const { signerId } = await searchParams;
  const meta = getDictionary(await getLocale()).routes.signRequest;

  // `?signerId=a&signerId=b` về dưới dạng mảng. Hai lượt ký khác nhau thì không
  // có cách nào đoán đúng, nên coi như thiếu và để màn chặn hỏi lại.
  const signer = typeof signerId === "string" ? signerId : undefined;

  return (
    <PageChrome
      title={meta.title}
      description={meta.description}
      scope="sign"
      actions={<ActorControl />}
    >
      <WorkflowSignWorkspace
        signingRequestId={decodeURIComponent(signingRequestId)}
        signerId={signer}
      />
    </PageChrome>
  );
}
