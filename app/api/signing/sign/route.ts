import { NextRequest } from "next/server";
import { proxySignJson, SIGN_WAIT_TIMEOUT_MS } from "@/lib/server/sign-proxy";

/**
 * `POST /api/v1/sign` — cửa vào duy nhất của mọi luồng ký.
 *
 * Body là multipart: part `request` (JSON) bắt buộc, `file` và `p12File` tuỳ
 * luồng. Chuyển tiếp nguyên `FormData` và KHÔNG tự đặt `Content-Type`: đặt tay
 * là mất boundary và backend đọc ra body rỗng.
 *
 * Hạn chờ để dài cho cả ba luồng thay vì đọc `authenticationMode` trong part
 * `request` để chọn: parse lại JSON chỉ nhằm chọn timeout là tự rước rủi ro. Ba
 * luồng nhanh vẫn trả về sớm; chỉ MPKI App mới thật sự treo tới ~300 giây.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  return proxySignJson(request, "/api/v1/sign", {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(SIGN_WAIT_TIMEOUT_MS),
  });
}
