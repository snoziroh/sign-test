import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `POST /api/signing-requests/{id}/sign/usb-token/prepare` — bước 1 của luồng
 * USB Token trong quy trình: nộp chứng thư người ký vừa chọn, nhận về digest.
 *
 * JSON chứ không multipart, khác `…/sign`: KHÔNG có tệp nào đi lên. Tài liệu là
 * bản đang nằm trong kho của yêu cầu ký, backend tự đọc.
 *
 * `X-Username` chuyển tiếp nguyên văn — backend dùng nó cho `requireTurn` (đúng
 * lượt của người này chưa) và cho audit log.
 *
 * ⚠ Chỉ đúng hai endpoint của luồng này đi qua proxy. Ba lời gọi tới FPT-CA
 * Signing Agent (`/GetToken`, `/GetListCertificate`, `/SignHash`) PHẢI xuất phát
 * từ trình duyệt: `localhost` ở đây là máy chạy Next, không phải máy cắm token.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ signingRequestId: string }> },
) {
  const { signingRequestId } = await params;
  const payload = await request.text();

  const headers = actorHeaders(request);
  headers.set("Content-Type", "application/json");

  return proxySignJson(
    request,
    `/api/signing-requests/${encodeURIComponent(signingRequestId)}/sign/usb-token/prepare`,
    { method: "POST", headers, body: payload },
  );
}
