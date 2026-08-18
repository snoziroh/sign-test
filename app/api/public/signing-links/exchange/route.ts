import { NextRequest } from "next/server";
import { proxyPublicJson } from "@/lib/server/public-signing-proxy";

/**
 * `POST /api/public/signing-links/exchange` — đổi link token lấy phiên ký.
 *
 * Đây là lời gọi DUY NHẤT trong cả luồng có mang token, và nó chỉ đi từ trình
 * duyệt tới đây rồi tới backend. Thân request KHÔNG được đọc ra để log: token
 * trong đó dùng được để ký thay người khác cho tới khi hết hạn.
 *
 * Phản hồi mang `Set-Cookie` của phiên — `proxyPublicJson` chuyển tiếp nguyên
 * văn, đó là lý do lời gọi này không dùng proxy chung của màn `/sign`.
 */
export async function POST(request: NextRequest) {
  return proxyPublicJson(request, "/signing-links/exchange", {
    method: "POST",
    body: await request.text(),
    contentType: "application/json",
  });
}
