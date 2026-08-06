import { NextRequest, NextResponse } from "next/server";
import { resolveBaseUrl, signApiFetch, signErrorResponse } from "@/lib/server/sign-proxy";
import { adaptV2ReportToV1, type VerificationReportV2 } from "@/lib/types/verification";

/**
 * `POST /api/v2/signatures/validate` — verify một tệp đã ký.
 *
 * Khác mọi route ký ở hai điểm:
 *
 * 1. **Có biến đổi body.** Backend trả báo cáo schema v2; toàn bộ giao diện verify
 *    đọc shape v1. Việc chuyển đổi làm ở đây chứ không ở client để chỗ duy nhất
 *    biết tới schema v2 là một file — khi backend lên v3 chỉ phải sửa adapter.
 * 2. **HTTP 200 KHÔNG có nghĩa chữ ký hợp lệ.** 200 chỉ nghĩa là verify chạy xong;
 *    kết luận nằm ở `data.status`. Chữ ký hỏng vẫn trả 200 — đừng "sửa" chỗ này
 *    thành ném lỗi khi status là INVALID.
 */

/** File tới 32 MB, và verify phải đi lấy OCSP/CRL/TSA nên chậm hơn một lời gọi thường. */
const VERIFY_TIMEOUT_MS = 120_000;

export async function POST(request: NextRequest) {
  try {
    const baseUrl = resolveBaseUrl(request);
    const formData = await request.formData();

    const response = await signApiFetch(baseUrl, "/api/v2/signatures/validate", {
      method: "POST",
      body: formData, // không set Content-Type — fetch tự thêm multipart boundary
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });

    const body = (await response.json().catch(() => ({}))) as {
      data?: VerificationReportV2;
      code?: string;
    };

    const headers = new Headers();
    const correlationId = response.headers.get("x-correlation-id");
    if (correlationId) headers.set("x-correlation-id", correlationId);

    /**
     * 404 KHÔNG kèm `code` là 404 của framework ("No static resource …"), tức là
     * service ở địa chỉ này không có endpoint verify — không phải lỗi nghiệp vụ.
     * Phân biệt được vì mọi lỗi nghiệp vụ của backend đều có `code`. Đổi thành mã
     * riêng để người test biết cần trỏ sang service khác thay vì đi tìm lỗi ở tệp.
     */
    if (response.status === 404 && !body.code) {
      return NextResponse.json({ code: "VERIFY_NOT_SUPPORTED" }, { status: 404, headers });
    }

    if (!response.ok) {
      return NextResponse.json(body, { status: response.status, headers });
    }

    try {
      return NextResponse.json(
        { data: adaptV2ReportToV1(body.data as VerificationReportV2) },
        { status: 200, headers },
      );
    } catch {
      // Adapter từ chối schema lạ. Trả 502: backend trả về thứ bàn thử không đọc được.
      return NextResponse.json({ code: "VERIFY_SCHEMA_UNSUPPORTED" }, { status: 502, headers });
    }
  } catch (error) {
    return signErrorResponse(error);
  }
}
