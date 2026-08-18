import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * Thu hồi một link ký.
 *
 * Trả `204 No Content` — `proxySignJson` biết không dựng thân cho status đó (hàm
 * khởi tạo `Response` cấm điều đó, và làm sai sẽ biến một lời gọi THÀNH CÔNG thành
 * lỗi 502 của proxy).
 *
 * Thu hồi là thao tác một chiều: không có đường đưa một link `REVOKED` về
 * `ACTIVE`. Giao diện gọi nó khi người tạo bấm thu hồi, và backend cũng tự gọi khi
 * người tạo phát link mới.
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ signingRequestId: string; signerId: string; linkId: string }> },
) {
  const { signingRequestId, signerId, linkId } = await params;

  return proxySignJson(
    request,
    `/api/signing-requests/${encodeURIComponent(
      signingRequestId,
    )}/signers/${encodeURIComponent(signerId)}/public-links/${encodeURIComponent(
      linkId,
    )}/revoke`,
    { method: "POST", headers: actorHeaders(request) },
  );
}
