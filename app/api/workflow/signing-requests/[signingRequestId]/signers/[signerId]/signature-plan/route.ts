import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `GET /api/signing-requests/{id}/signers/{signerId}/signature-plan` — những
 * khung chữ ký mà NGƯỜI NÀY sẽ ký, cùng mã băm của bản tài liệu chúng ứng với.
 *
 * Chỉ để chỉ chỗ trên bản xem trước: toạ độ ở đây không bao giờ được gửi lại
 * trong lệnh ký, backend đọc lại plan này và ghi đè.
 *
 * Đòi `X-Username` như mọi endpoint khác của phân hệ — kế hoạch ký của một người
 * chỉ người trong quy trình đó mới đọc được.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ signingRequestId: string; signerId: string }> },
) {
  const { signingRequestId, signerId } = await params;
  return proxySignJson(
    request,
    `/api/signing-requests/${encodeURIComponent(
      signingRequestId,
    )}/signers/${encodeURIComponent(signerId)}/signature-plan`,
    { headers: actorHeaders(request) },
  );
}
