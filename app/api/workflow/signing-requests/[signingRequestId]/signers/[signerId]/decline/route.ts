import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `POST /api/signing-requests/{id}/signers/{signerId}/decline` — từ chối một
 * lượt ký nội bộ.
 *
 * Không có thân request: không có lý do nào được gửi kèm, chỉ có hành động.
 * Chỉ chính người ký từ chối được, chỉ khi lượt còn `PENDING` và đang đúng tới
 * lượt, và chỉ áp dụng cho lượt `INTERNAL` — backend tự áp cả bốn luật đó,
 * phía client chỉ ẩn/khoá nút khi không đúng điều kiện, còn 403/404/409 vẫn
 * phải xử lý ở đây như mọi lỗi khác.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ signingRequestId: string; signerId: string }> },
) {
  const { signingRequestId, signerId } = await params;
  return proxySignJson(
    request,
    `/api/signing-requests/${encodeURIComponent(
      signingRequestId,
    )}/signers/${encodeURIComponent(signerId)}/decline`,
    { method: "POST", headers: actorHeaders(request) },
  );
}
