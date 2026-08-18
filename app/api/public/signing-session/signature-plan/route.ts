import { NextRequest } from "next/server";
import { proxyPublicJson } from "@/lib/server/public-signing-proxy";

/**
 * `GET /api/public/signing-session/signature-plan` — vị trí chữ ký của đúng
 * người ký này.
 *
 * Chỉ để CHỈ CHỖ trên bản xem trước: đánh dấu trang, cuộn tới ô, vẽ overlay.
 * Toạ độ không bao giờ được gửi lại trong lệnh ký — backend đọc lại plan và ghi
 * đè mọi giá trị client gửi.
 */
export async function GET(request: NextRequest) {
  return proxyPublicJson(request, "/signing-session/signature-plan");
}
