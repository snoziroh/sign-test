import { NextRequest, NextResponse } from "next/server";
import { resolveBaseUrl, signApiFetch, signErrorResponse } from "@/lib/server/sign-proxy";

/**
 * `POST /api/v1/revocation-allowlist` — cho phép gọi tới một host OCSP/CRL.
 *
 * Chỉ phục vụ nút "Thêm vào allowlist và verify lại" khi báo cáo verify báo
 * `OCSP_URL_NOT_ALLOWED` / `CRL_URL_NOT_ALLOWED`. `409` nghĩa là host đã có sẵn —
 * client coi đó là thành công, nên ở đây cứ trả nguyên status.
 */
export async function POST(request: NextRequest) {
  try {
    const baseUrl = resolveBaseUrl(request);
    const payload = await request.text();

    const response = await signApiFetch(baseUrl, "/api/v1/revocation-allowlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    const body = (await response.json().catch(() => ({}))) as { code?: string };

    // Cùng lý do như route verify: 404 không kèm `code` là endpoint không tồn tại.
    if (response.status === 404 && !body.code) {
      return NextResponse.json({ code: "ALLOWLIST_NOT_SUPPORTED" }, { status: 404 });
    }

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return signErrorResponse(error);
  }
}
