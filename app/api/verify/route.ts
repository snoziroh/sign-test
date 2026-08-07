import { NextRequest, NextResponse } from "next/server";
import {
  correlationHeaders,
  normalizeErrorBody,
  resolveVerifyBaseUrl,
  verifyApiFetch,
  verifyErrorResponse,
} from "@/lib/server/verify-proxy";
import { adaptV6ReportToView, type VerificationReportV6 } from "@/lib/types/verification";

/**
 * `POST /api/v1/verify` của verification-service — thẩm định một tệp đã ký.
 *
 * Khác mọi route ký ở hai điểm:
 *
 * 1. **Có biến đổi body.** Backend trả báo cáo schema 6.x; giao diện đọc view
 *    model đã giải hết tham chiếu ID. Chuyển đổi làm ở đây chứ không ở client để
 *    chỗ duy nhất biết tới schema backend là `lib/types/verification.ts`.
 *    Từ 6.0.0, root KHÔNG còn bọc envelope `{ data, meta }` như schema 5 nữa —
 *    `body` nhận trực tiếp từ backend chính là báo cáo (`schemaVersion` / `run` /
 *    `data`), không phải `body.data`. Bóc nhầm một lớp ở đây là mất `schemaVersion`
 *    và version gate sẽ ném lỗi trên một response hoàn toàn hợp lệ.
 * 2. **HTTP 200 KHÔNG có nghĩa chữ ký hợp lệ.** 200 chỉ nghĩa là verify chạy xong;
 *    kết luận nằm ở `data.status` / `data.mainIndication`. Chữ ký hỏng vẫn trả
 *    200 — đừng "sửa" chỗ này thành ném lỗi khi status là INVALID.
 */

const VERIFY_PATH = "/api/v1/verify";

/** Khớp `[A-Za-z0-9._-]{8,128}` như backend yêu cầu; server luôn echo lại. */
const CORRELATION_ID_HEADER = "x-correlation-id";

function correlationIdFor(request: NextRequest): string {
  const incoming = request.headers.get(CORRELATION_ID_HEADER);
  if (incoming && /^[A-Za-z0-9._-]{8,128}$/.test(incoming)) return incoming;
  return `sigil-${crypto.randomUUID()}`;
}

export async function POST(request: NextRequest) {
  try {
    const baseUrl = resolveVerifyBaseUrl(request);
    const formData = await request.formData();
    const correlationId = correlationIdFor(request);

    const response = await verifyApiFetch(baseUrl, VERIFY_PATH, {
      method: "POST",
      // Không set Content-Type — fetch tự thêm multipart boundary.
      headers: { [CORRELATION_ID_HEADER]: correlationId },
      body: formData,
    });

    const body = (await response.json().catch(() => ({}))) as Partial<VerificationReportV6> & {
      code?: string;
      detail?: string;
      correlationId?: string | null;
    };

    const headers = correlationHeaders(response, body);
    if (!headers.has(CORRELATION_ID_HEADER)) headers.set(CORRELATION_ID_HEADER, correlationId);

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
      return NextResponse.json(normalizeErrorBody(body), { status: response.status, headers });
    }

    try {
      return NextResponse.json(
        { data: adaptV6ReportToView(body as VerificationReportV6) },
        { status: 200, headers },
      );
    } catch (error) {
      // Adapter từ chối schema lạ. Trả 502: backend trả về thứ bàn thử không đọc
      // được. `detail` mang theo schemaVersion thật để khỏi phải mở lại Postman.
      return NextResponse.json(
        {
          code: "VERIFY_SCHEMA_UNSUPPORTED",
          detail: error instanceof Error ? error.message : undefined,
        },
        { status: 502, headers },
      );
    }
  } catch (error) {
    return verifyErrorResponse(error);
  }
}

/**
 * Thăm dò địa chỉ verify trước khi lưu, dùng cho nút *Kiểm tra kết nối*.
 *
 * Không có endpoint health nào chắc chắn tồn tại, nên thăm dò bằng `GET` vào
 * chính đường verify: endpoint có thật thì framework trả **405 Method Not
 * Allowed** — bằng chứng đủ mạnh mà không gửi file nào lên và không tốn một lượt
 * thẩm định. 404 nghĩa là địa chỉ sống nhưng không phải verification-service.
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = resolveVerifyBaseUrl(request);
    const response = await verifyApiFetch(baseUrl, VERIFY_PATH, {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 404) {
      return NextResponse.json({ code: "VERIFY_NOT_SUPPORTED" }, { status: 404 });
    }

    return NextResponse.json({ data: { baseUrl, status: response.status } }, { status: 200 });
  } catch (error) {
    return verifyErrorResponse(error);
  }
}
