import { NextRequest } from "next/server";
import { actorHeaders, proxySignBinary } from "@/lib/server/sign-proxy";

/**
 * `GET /api/signing-requests/{id}/document` — chính tệp mà mọi người trong quy
 * trình sẽ ký.
 *
 * Trả nhị phân nên đi qua `proxySignBinary`. Backend đòi `X-Username` ở đây chứ
 * không chỉ ở các lệnh ghi: tài liệu mang nội dung của người dùng, chỉ người tạo
 * yêu cầu và những người được chỉ định ký mới đọc được.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ signingRequestId: string }> },
) {
  const { signingRequestId } = await params;
  return proxySignBinary(
    request,
    `/api/signing-requests/${encodeURIComponent(signingRequestId)}/document`,
    { headers: actorHeaders(request) },
  );
}
