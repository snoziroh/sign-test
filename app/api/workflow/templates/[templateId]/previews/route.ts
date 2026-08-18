import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `POST /api/templates/{id}/previews` — dựng tài liệu thật từ mẫu và các giá trị
 * vừa nhập.
 *
 * Đây là bước biến một mẫu thành một tài liệu ký được: server thay biến rồi trả
 * `previewId`, và chính `previewId` đó (không phải `templateId`) là thứ
 * `POST /api/signing-requests` nhận. Mỗi lần gọi tạo một bản mới nên xem đi xem
 * lại bao nhiêu lần cũng được mà không đụng tới mẫu.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await params;
  const body = await request.text();
  const headers = actorHeaders(request);
  headers.set("Content-Type", "application/json");

  return proxySignJson(
    request,
    `/api/templates/${encodeURIComponent(templateId)}/previews`,
    { method: "POST", headers, body },
  );
}
