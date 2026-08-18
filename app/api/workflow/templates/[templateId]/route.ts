import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `GET /api/templates/{id}` — bản đang phục vụ của một mẫu: các ô phải điền kèm
 * toạ độ, các vai ký kèm vị trí chữ ký, và mô tả PDF preview.
 *
 * Một lời gọi này đủ dựng cả bước "điền thông tin" lẫn sơ đồ luồng ký.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await params;
  return proxySignJson(request, `/api/templates/${encodeURIComponent(templateId)}`);
}

/**
 * `PATCH /api/templates/{id}` — đổi tên và mô tả của mẫu.
 *
 * Backend chỉ nhận đúng hai trường đó, và CHỈ khi mẫu còn `DRAFT`: mẫu đã
 * `ACTIVE` trả 409 `TEMPLATE_NOT_EDITABLE`. Không có endpoint nào đổi `code`
 * hay `status` — `status` chỉ đổi qua publish và archive.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await params;
  const body = await request.text();
  const headers = actorHeaders(request);
  headers.set("Content-Type", "application/json");

  return proxySignJson(request, `/api/templates/${encodeURIComponent(templateId)}`, {
    method: "PATCH",
    headers,
    body,
  });
}

/**
 * `DELETE /api/templates/{id}` — đưa mẫu về `ARCHIVED`.
 *
 * Là lưu trữ chứ không phải xoá: backend giữ nguyên bản ghi, chỉ đổi trạng thái,
 * nên các yêu cầu ký đã phát từ mẫu này vẫn tra ngược được.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await params;
  return proxySignJson(request, `/api/templates/${encodeURIComponent(templateId)}`, {
    method: "DELETE",
    headers: actorHeaders(request),
  });
}
