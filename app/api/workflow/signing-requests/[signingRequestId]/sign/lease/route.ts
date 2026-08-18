import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `GET|DELETE /api/signing-requests/{id}/sign/lease` — trạng thái quyền ký độc
 * quyền của lượt ký này, và lệnh trả nó lại.
 *
 * Danh tính là `X-Username`, chuyển tiếp nguyên văn qua `actorHeaders`: backend
 * đọc nó để biết lease đang nằm trong tay CHÍNH người này (`HELD_BY_YOU`) hay
 * người khác (`LOCKED`). Không có header đó thì câu trả lời không có nghĩa gì.
 *
 * Không có hạn chờ riêng: cả hai lệnh trả về ngay, khác hẳn `POST …/sign` (nơi
 * MPKI App giữ request tới lúc người ký bấm xác nhận trên điện thoại).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ signingRequestId: string }> },
) {
  const { signingRequestId } = await params;

  return proxySignJson(
    request,
    `/api/signing-requests/${encodeURIComponent(signingRequestId)}/sign/lease`,
    { method: "GET", headers: actorHeaders(request) },
  );
}

/**
 * Giành quyền ký độc quyền cho CHÍNH người này. Chỉ gọi đúng lúc người dùng bấm
 * "Ký ngay" — KHÔNG gọi chỉ vì mở Workflow Detail.
 *
 * Không có thân request: backend tự xác định lượt ký từ `X-Username` +
 * `signingRequestId`. Phản hồi mang thêm `leaseToken` so với `GET` — đại diện
 * cho đúng lượt giành này, client giữ tạm rồi đính vào bước START/USB-prepare.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ signingRequestId: string }> },
) {
  const { signingRequestId } = await params;

  return proxySignJson(
    request,
    `/api/signing-requests/${encodeURIComponent(signingRequestId)}/sign/lease`,
    { method: "POST", headers: actorHeaders(request) },
  );
}

/**
 * Huỷ lượt ký đang mở của CHÍNH người này.
 *
 * Backend là nơi quyết định lệnh này có giải phóng được lease hay không — người
 * khác đang giữ thì nó không đụng tới. Vì vậy phản hồi vẫn là một
 * `SigningLeaseResponse` đầy đủ chứ không phải một lời xác nhận: client đọc
 * `state` mới thay vì tự suy ra "đã huỷ xong".
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ signingRequestId: string }> },
) {
  const { signingRequestId } = await params;

  return proxySignJson(
    request,
    `/api/signing-requests/${encodeURIComponent(signingRequestId)}/sign/lease`,
    { method: "DELETE", headers: actorHeaders(request) },
  );
}
