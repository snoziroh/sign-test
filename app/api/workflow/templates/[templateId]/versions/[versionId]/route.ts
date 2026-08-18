import { NextRequest } from "next/server";
import { proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `GET /api/templates/{id}/versions/{versionId}` — một BẢN cụ thể của mẫu, kể cả
 * bản còn `DRAFT`.
 *
 * Khác `GET /api/templates/{id}` ở chỗ đó: endpoint kia chỉ trả bản đang phục vụ
 * nên không nhìn thấy bản nháp. Đây là đường DUY NHẤT để trình soạn mẫu dựng lại
 * trạng thái từ máy chủ sau khi tải lại trang — `allFieldsConfigured` và
 * `fields[].configured` cho biết còn thiếu gì trước khi publish được.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string; versionId: string }> },
) {
  const { templateId, versionId } = await params;
  return proxySignJson(
    request,
    `/api/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(versionId)}`,
  );
}
