import { NextRequest } from "next/server";
import { proxyPublicJson } from "@/lib/server/public-signing-proxy";

/**
 * `GET /api/public/signing-session` — khôi phục ngữ cảnh từ cookie phiên.
 *
 * Đây là đường sống sót sau khi người ký bấm F5: fragment đã bị xoá khỏi URL nên
 * không còn token nào để exchange lại, và cookie là thứ duy nhất còn lại.
 *
 * Không có tham số nào: backend đọc phiên từ cookie. Một lời gọi không kèm cookie
 * hợp lệ trả 401 và màn hình chuyển sang trạng thái "link không dùng được".
 */
export async function GET(request: NextRequest) {
  return proxyPublicJson(request, "/signing-session");
}
