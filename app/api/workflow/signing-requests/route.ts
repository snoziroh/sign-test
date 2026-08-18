import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `POST /api/signing-requests` — chốt một quy trình ký.
 *
 * `Idempotency-Key` do client sinh và được chuyển tiếp nguyên vẹn: gửi lại cùng
 * một key với cùng nội dung trả về đúng yêu cầu cũ, còn cùng key với nội dung
 * khác là 409. Proxy KHÔNG tự sinh key thay client — một key mới cho mỗi lần thử
 * lại sẽ tạo ra nhiều yêu cầu ký trùng nhau, đúng thứ mà cơ chế này sinh ra để
 * chặn.
 */
/**
 * `GET /api/signing-requests` — những yêu cầu ký mà người thao tác có liên quan.
 *
 * Backend xác định người dùng HOÀN TOÀN qua `X-Username`; không có tham số
 * `userId` nào và gửi thêm cũng không đổi được kết quả. Vì thế chỉ chuyển tiếp
 * đúng bốn tham số của contract (`page`, `size`, `search`, `status`) thay vì
 * bê nguyên query string: một tham số lạ lọt xuống backend chỉ tạo ra một 400
 * khó truy.
 */
export async function GET(request: NextRequest) {
  const incoming = request.nextUrl.searchParams;
  const query = new URLSearchParams();
  for (const name of ["page", "size", "search", "status"] as const) {
    const value = incoming.get(name);
    if (value !== null && value !== "") query.set(name, value);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return proxySignJson(request, `/api/signing-requests${suffix}`, {
    headers: actorHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = actorHeaders(request);
  headers.set("Content-Type", "application/json");

  return proxySignJson(request, "/api/signing-requests", {
    method: "POST",
    headers,
    body,
  });
}
