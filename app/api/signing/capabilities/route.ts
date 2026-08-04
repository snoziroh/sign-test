import { NextRequest } from "next/server";
import { proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `GET /api/v1/capabilities` — ma trận nguồn chữ ký. Gọi không tham số để dựng
 * màn hình chọn nguồn; `materialMode`/`vendor` chỉ để soi một nguồn cụ thể.
 *
 * Đây cũng là lời gọi rẻ nhất để kiểm tra một baseUrl có sống hay không, nên nút
 * "Kiểm tra kết nối" trên giao diện dùng chính endpoint này.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of ["materialMode", "vendor"] as const) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return proxySignJson(request, `/api/v1/capabilities${suffix}`);
}
