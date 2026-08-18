import { NextRequest } from "next/server";
import { proxyPublicSign } from "@/lib/server/public-signing-proxy";

/**
 * `POST /api/public/signing-session/sign` — cả ba bước ký của người ngoài hệ
 * thống đi qua đây (`step=START` và `step=CONTINUE`).
 *
 * Multipart: part `request` (JSON) bắt buộc, `p12File` tuỳ phương thức. KHÔNG có
 * part `file` — tài liệu do backend lấy từ phiên, và một tệp do client nộp ở đây
 * là một tệp client tự chọn để ký.
 *
 * Thân chuyển tiếp dạng nhị phân, không parse: nó chứa mật khẩu P12 và có thể
 * chứa ảnh giấy tờ. Hạn chờ dài vì MPKI App giữ request tới khi người ký xác nhận
 * trên điện thoại — xem `proxyPublicSign`.
 */
export async function POST(request: NextRequest) {
  return proxyPublicSign(request, "/signing-session/sign");
}
