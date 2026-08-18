import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `POST /api/templates/{id}/versions/{versionId}/publish` — chốt bản nháp.
 *
 * KHÔNG CÓ THÂN REQUEST. Backend không nhận cấu hình nào ở bước này: nó đọc lại
 * những gì `fields` và `signers` đã ghi, kiểm tra đủ điều kiện rồi mới chuyển
 * Template `DRAFT` → `ACTIVE` và Version `DRAFT` → `PUBLISHED`. Vì thế mọi thay
 * đổi còn treo ở client phải được lưu TRƯỚC khi gọi đây.
 *
 * Toàn bộ nằm trong một transaction: publish hỏng thì bản nháp giữ nguyên, gọi
 * lại được sau khi sửa.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string; versionId: string }> },
) {
  const { templateId, versionId } = await params;
  return proxySignJson(
    request,
    `/api/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(
      versionId,
    )}/publish`,
    { method: "POST", headers: actorHeaders(request) },
  );
}
