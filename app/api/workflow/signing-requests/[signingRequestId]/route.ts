import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `GET /api/signing-requests/{id}` — trạng thái hiện tại của một yêu cầu ký.
 *
 * Đây là nguồn sự thật DUY NHẤT của màn tiến trình: ai đã ký, ai đang chờ, tài
 * liệu nào đang được ký. Không có endpoint liệt kê nhiều yêu cầu, nên id phải
 * được giữ ở client sau khi tạo.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ signingRequestId: string }> },
) {
  const { signingRequestId } = await params;
  return proxySignJson(
    request,
    `/api/signing-requests/${encodeURIComponent(signingRequestId)}`,
    { headers: actorHeaders(request) },
  );
}
