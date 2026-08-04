import { NextRequest } from "next/server";
import { proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `POST /api/v1/remote-ca/fpt/enrollments` — đăng ký chứng thư eSign Cloud
 * riêng lẻ, tách khỏi pha ký.
 *
 * Bỏ qua được: `POST /sign` bước START tự đăng ký khi `remoteCa.enrollment` có
 * mặt và chưa có `agreementUuid`. Endpoint này dành cho trường hợp muốn đăng ký
 * trước cho một loạt người dùng.
 *
 * ⚠ `agreementDetails` là dữ liệu cá nhân — chỉ chuyển tiếp, không log lại ở đây.
 */
export async function POST(request: NextRequest) {
  const payload = await request.text();
  return proxySignJson(request, "/api/v1/remote-ca/fpt/enrollments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
}
