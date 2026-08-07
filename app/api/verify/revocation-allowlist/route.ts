import { NextRequest, NextResponse } from "next/server";
import {
  correlationHeaders,
  normalizeErrorBody,
  resolveVerifyBaseUrl,
  verifyApiFetch,
  verifyErrorResponse,
} from "@/lib/server/verify-proxy";

/**
 * `POST /api/v1/revocation-allowlist` — cho phép gọi tới một host OCSP/CRL.
 *
 * Đi tới **dịch vụ verify**, không phải dịch vụ ký: allowlist là cấu hình mạng
 * của bên kiểm tra thu hồi, và nó chỉ có nghĩa với chính service vừa trả về
 * `OCSP_URL_NOT_ALLOWED` / `CRL_URL_NOT_ALLOWED`.
 *
 * Chỉ phục vụ nút "Thêm vào allowlist và verify lại". `409` nghĩa là host đã có
 * sẵn — client coi đó là thành công, nên ở đây cứ trả nguyên status.
 */
export async function POST(request: NextRequest) {
  try {
    const baseUrl = resolveVerifyBaseUrl(request);
    const payload = await request.text();

    const response = await verifyApiFetch(baseUrl, "/api/v1/revocation-allowlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: AbortSignal.timeout(15_000),
    });

    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      correlationId?: string | null;
    };
    const headers = correlationHeaders(response, body);

    // Cùng lý do như route verify: 404 không kèm `code` là endpoint không tồn tại.
    if (response.status === 404 && !body.code) {
      return NextResponse.json({ code: "ALLOWLIST_NOT_SUPPORTED" }, { status: 404, headers });
    }

    if (!response.ok) {
      return NextResponse.json(normalizeErrorBody(body), { status: response.status, headers });
    }

    return NextResponse.json(body, { status: response.status, headers });
  } catch (error) {
    return verifyErrorResponse(error);
  }
}
