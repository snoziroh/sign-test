import { NextRequest } from "next/server";
import { actorHeaders, proxySignBinary } from "@/lib/server/sign-proxy";

/**
 * `GET /api/template-previews/{id}/content` — PDF của bản xem thử đã điền biến.
 *
 * Khác endpoint preview của mẫu ở một điểm: nội dung mang dữ liệu người dùng vừa
 * nhập, nên backend bắt buộc có `X-Username` mới cho tải.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ previewId: string }> },
) {
  const { previewId } = await params;
  return proxySignBinary(
    request,
    `/api/template-previews/${encodeURIComponent(previewId)}/content`,
    { headers: actorHeaders(request) },
  );
}
