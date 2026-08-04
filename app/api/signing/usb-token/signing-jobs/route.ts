import { NextRequest } from "next/server";
import { proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `POST /api/v1/usb-token/signing-jobs` — nộp PDF, nhận về digest để USB Token
 * ký.
 *
 * Body multipart: part `file` (PDF) và part `request` (JSON cấu hình ký).
 * Chuyển tiếp nguyên `FormData`, KHÔNG tự đặt `Content-Type` — đặt tay là mất
 * boundary và backend đọc ra body rỗng.
 *
 * ⚠ Chỉ ĐÚNG hai endpoint của luồng USB Token đi qua proxy này. Ba lời gọi tới
 * FPT-CA Signing Agent (`/GetToken`, `/GetListCertificate`, `/SignHash`) PHẢI
 * xuất phát từ trình duyệt: `localhost` ở đây là máy chạy Next, không phải máy
 * đang cắm token.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  return proxySignJson(request, "/api/v1/usb-token/signing-jobs", {
    method: "POST",
    body: formData,
  });
}
