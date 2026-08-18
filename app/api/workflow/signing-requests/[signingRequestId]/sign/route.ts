import { NextRequest } from "next/server";
import {
  actorHeaders,
  proxySignJson,
  SIGN_WAIT_TIMEOUT_MS,
} from "@/lib/server/sign-proxy";

/**
 * `POST /api/signing-requests/{id}/sign` — người ký NỘI BỘ ký phần việc của
 * mình. Cả hai bước (`step=START` và `step=CONTINUE`) đi qua đây.
 *
 * Multipart: part `request` (JSON) bắt buộc, `p12File` tuỳ phương thức. KHÔNG có
 * part `file`: tài liệu do backend đọc từ kho của yêu cầu ký, và một tệp client
 * nộp ở đây là một tệp client tự chọn để ký.
 *
 * Chuyển tiếp nguyên `FormData` và KHÔNG tự đặt `Content-Type` — đặt tay là mất
 * multipart boundary và backend đọc ra body rỗng.
 *
 * Danh tính là `X-Username`, chuyển tiếp nguyên văn: backend lọc `signers` theo
 * nó để biết đang ký hộ ai, và nó cũng là thứ đi vào audit log.
 *
 * Hạn chờ dài như `/api/signing/sign`: FPT MPKI App GIỮ request tới khi người ký
 * bấm xác nhận trên điện thoại (~300 giây). Hạn 15 giây mặc định sẽ cắt sớm và
 * biến một giao dịch đang chờ thành 502 oan — trong khi lượt ký đã bị trừ.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ signingRequestId: string }> },
) {
  const { signingRequestId } = await params;
  const formData = await request.formData();

  return proxySignJson(
    request,
    `/api/signing-requests/${encodeURIComponent(signingRequestId)}/sign`,
    {
      method: "POST",
      headers: actorHeaders(request),
      body: formData,
      signal: AbortSignal.timeout(SIGN_WAIT_TIMEOUT_MS),
    },
  );
}
