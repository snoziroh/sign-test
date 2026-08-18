import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `POST /api/documents` — đưa một tệp tự tải lên vào hệ thống và nhận
 * `documentArtifactId`.
 *
 * Đây là nửa còn lại của `POST /api/templates/{id}/previews`: hai đường đưa tài
 * liệu vào, nhưng từ `POST /api/signing-requests` trở đi thì chung một luồng.
 *
 * Chuyển tiếp nguyên `FormData` và KHÔNG tự đặt `Content-Type` — đặt tay là mất
 * boundary và backend đọc ra body rỗng.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  return proxySignJson(request, "/api/documents", {
    method: "POST",
    headers: actorHeaders(request),
    body: formData,
  });
}
