import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `POST /api/signing-requests/{id}/cancel` — huỷ một yêu cầu ký.
 *
 * Không có thân request: trạng thái đích luôn là `CANCELLED`, không có gì để
 * tham số hoá. Chỉ người tạo huỷ được và chỉ khi còn `DRAFT`/`IN_PROGRESS` —
 * cả hai luật đó backend tự áp, phía client chỉ ẩn nút khi không đúng điều
 * kiện, còn 403/409 vẫn phải xử lý ở đây như mọi lỗi khác.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ signingRequestId: string }> },
) {
  const { signingRequestId } = await params;
  return proxySignJson(
    request,
    `/api/signing-requests/${encodeURIComponent(signingRequestId)}/cancel`,
    { method: "POST", headers: actorHeaders(request) },
  );
}
