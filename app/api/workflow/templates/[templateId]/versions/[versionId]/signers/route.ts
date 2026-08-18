import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `PUT /api/templates/{id}/versions/{versionId}/signers` — cấu hình vai ký VÀ vị
 * trí chữ ký của một bản nháp.
 *
 * Một lời gọi cho cả hai: khung chữ ký nằm trong `roles[].signatureSlots`, không
 * có endpoint riêng cho slot. Cũng là THAY THẾ TOÀN BỘ — backend xoá sạch vai và
 * slot cũ của bản này rồi ghi lại theo thân request.
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
    )}/signers`,
    { method: "PUT", headers, body },
  );
}
