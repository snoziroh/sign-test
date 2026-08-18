import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * Link ký ngoài hệ thống của MỘT signer.
 *
 * `GET` — danh sách link đã phát cho signer này. `url` trong phản hồi luôn `null`:
 * backend chỉ lưu hash của token, nên không có gì để trả lại.
 *
 * `POST` — phát một link mới. Đây là lời gọi DUY NHẤT trong cả hệ thống trả về
 * token thô, và chỉ đúng một lần. Backend tự thu hồi link `ACTIVE` cũ trước khi
 * tạo, nên giao diện phải hỏi lại trước khi gọi (xem §4.5 của tài liệu tích hợp).
 *
 * Cả hai đòi `X-Username`: chỉ người tạo yêu cầu ký được phát link cho người khác.
 * Header chuyển tiếp nguyên văn — proxy không tự điền danh tính, vì chính header
 * này đi vào audit log.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ signingRequestId: string; signerId: string }> },
) {
  const { signingRequestId, signerId } = await params;
  return proxySignJson(request, publicLinksPath(signingRequestId, signerId), {
    headers: actorHeaders(request),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ signingRequestId: string; signerId: string }> },
) {
  const { signingRequestId, signerId } = await params;

  /*
   * Thân là tuỳ chọn (`{ expiresAt }`) và có thể rỗng. Đọc bằng `text()` rồi chỉ
   * chuyển tiếp khi có nội dung: gửi `Content-Type: application/json` kèm thân
   * rỗng làm bộ đọc JSON của backend ném lỗi phân tích cú pháp, cho một lời gọi
   * lẽ ra hoàn toàn hợp lệ.
   */
  const body = await request.text();
  const headers = actorHeaders(request);
  if (body) headers.set("Content-Type", "application/json");

  return proxySignJson(request, publicLinksPath(signingRequestId, signerId), {
    method: "POST",
    headers,
    body: body || undefined,
  });
}

function publicLinksPath(signingRequestId: string, signerId: string): string {
  return `/api/signing-requests/${encodeURIComponent(
    signingRequestId,
  )}/signers/${encodeURIComponent(signerId)}/public-links`;
}
