import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `PUT /api/templates/{id}/versions/{versionId}/fields` — cấu hình các ô phải
 * điền của một bản nháp.
 *
 * THAY THẾ TOÀN BỘ, không vá từng ô: backend đòi thân request chứa đúng một lần
 * mỗi `fieldId` mà nó đã dò được, thiếu hay thừa đều là 400 `FIELD_SET_MISMATCH`.
 * `fieldId` do backend sinh lúc tạo mẫu, client không được tự đặt.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string; versionId: string }> },
) {
  const { templateId, versionId } = await params;
  const body = await request.text();
  const headers = actorHeaders(request);
  headers.set("Content-Type", "application/json");

  return proxySignJson(
    request,
    `/api/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(
      versionId,
    )}/fields`,
    { method: "PUT", headers, body },
  );
}
