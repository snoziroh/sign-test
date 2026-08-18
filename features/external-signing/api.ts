"use client";

import type {
  ExternalSigningErrorBody,
  PublicSignaturePlan,
  PublicSignRequest,
  PublicSignResponse,
  PublicSigningContext,
  PublicSigningExchangeResponse,
} from "@/lib/types/external-signing";
import type { SigningLeaseResponse } from "@/lib/types/signing-lease";
import { getExternalSigningCsrf } from "./session-store";

/**
 * Client của luồng ký ngoài hệ thống.
 *
 * Khác client của màn `/sign` ở ba điểm, và không được trộn lẫn:
 *
 * 1. `credentials: "include"` trên MỌI lời gọi — phiên là cookie, không phải
 *    header. Thiếu một chỗ là chỗ đó rơi về 401.
 * 2. KHÔNG gắn `X-Signing-Base-Url` cũng như `X-Username`. Trang công khai không
 *    được chọn môi trường backend, và người ký ngoài hệ thống không có danh tính
 *    nội bộ nào để khai.
 * 3. Thân lỗi là `{ timestamp, status, code, message, path }`, không phải
 *    problem+json — nên `readProblem` của client ký KHÔNG dùng được ở đây.
 *
 * Mọi lời gọi đi qua proxy `/api/public/*` của ứng dụng này để cookie phiên nằm
 * cùng origin với trang.
 */

export class ExternalSigningError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    /** Câu do backend viết. Chỉ hiển thị khi client không có câu riêng cho `code`. */
    public readonly serverMessage?: string,
    public readonly correlationId?: string,
  ) {
    super(code);
    this.name = "ExternalSigningError";
  }
}

/**
 * Không ném khi thân không phải JSON: một 502 từ lớp hạ tầng có thể là HTML, và
 * để `response.json()` ném ở đó biến một lỗi đọc được thành một lỗi trắng.
 */
export async function toExternalSigningError(
  response: Response,
): Promise<ExternalSigningError> {
  let body: ExternalSigningErrorBody = {};
  try {
    body = (await response.json()) as ExternalSigningErrorBody;
  } catch {
    // Thân không phải JSON hợp lệ — chỉ còn status để phân loại.
  }

  return new ExternalSigningError(
    response.status,
    body.code || "EXTERNAL_SIGNING_UNKNOWN_ERROR",
    body.message,
    response.headers.get("x-correlation-id") ?? undefined,
  );
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await toExternalSigningError(response);
  return (await response.json()) as T;
}

/**
 * Bề mặt mà màn hình phụ thuộc vào.
 *
 * Có interface ở đây vì backend CHƯA TỒN TẠI: chế độ mô phỏng
 * (`demo-session.ts`) cắm vào đúng chỗ này, nên toàn bộ màn hình — kể cả máy
 * trạng thái ký — chạy trên cùng một đường dù dữ liệu đến từ dịch vụ thật hay từ
 * bản mô phỏng. Xoá chế độ mô phỏng không phải sửa component nào.
 */
export interface ExternalSigningTransport {
  exchange(token: string): Promise<PublicSigningExchangeResponse>;
  getContext(): Promise<PublicSigningContext>;
  loadDocument(): Promise<Blob>;
  loadSignaturePlan(): Promise<PublicSignaturePlan>;
  sign(request: PublicSignRequest, p12File?: File): Promise<PublicSignResponse>;
  /** Quyền ký độc quyền của phiên — xem `lib/types/signing-lease.ts`. */
  getLease(signal?: AbortSignal): Promise<SigningLeaseResponse>;
  cancelLease(signal?: AbortSignal): Promise<SigningLeaseResponse | undefined>;
}

export const liveTransport: ExternalSigningTransport = {
  /**
   * Đổi link token lấy phiên. Lời gọi DUY NHẤT mang token, và sau nó fragment
   * phải bị xoá ngay (xem `clearExternalSigningToken`).
   */
  async exchange(token) {
    const response = await fetch("/api/public/signing-links/exchange", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    return readJson<PublicSigningExchangeResponse>(response);
  },

  /** Khôi phục sau F5: cookie còn sống thì phiên tiếp tục, không cần token. */
  async getContext() {
    const response = await fetch("/api/public/signing-session", {
      credentials: "include",
      cache: "no-store",
    });
    return readJson<PublicSigningContext>(response);
  },

  async loadDocument() {
    const response = await fetch("/api/public/signing-session/document", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) throw await toExternalSigningError(response);
    return response.blob();
  },

  async loadSignaturePlan() {
    const response = await fetch("/api/public/signing-session/signature-plan", {
      credentials: "include",
      cache: "no-store",
    });
    return readJson<PublicSignaturePlan>(response);
  },

  /**
   * Cả START và CONTINUE.
   *
   * KHÔNG tự đặt `Content-Type` khi thân là `FormData`: trình duyệt phải tự thêm
   * multipart boundary, đặt tay là backend đọc ra body rỗng.
   *
   * Thiếu CSRF thì chặn NGAY ở client thay vì gửi một lời gọi chắc chắn 403 —
   * ca này xảy ra thật: cookie còn sống nhưng `sessionStorage` bị xoá (mở lại
   * trang ở tab mới). Người ký phải mở lại link để đổi phiên mới.
   */
  async sign(request, p12File) {
    const csrfToken = getExternalSigningCsrf();
    if (!csrfToken) throw new ExternalSigningError(403, "EXTERNAL_SIGNING_CSRF_MISSING");

    const form = new FormData();
    form.append("request", JSON.stringify(request));
    if (p12File) form.append("p12File", p12File, p12File.name);

    const response = await fetch("/api/public/signing-session/sign", {
      method: "POST",
      credentials: "include",
      headers: { "X-Public-Signing-CSRF": csrfToken },
      body: form,
    });
    return readJson<PublicSignResponse>(response);
  },

  getLease: (signal) => getExternalSigningLease(signal),

  /**
   * CSRF đọc ở ĐÂY chứ không nhận từ component: đây là điểm duy nhất trong luồng
   * biết chắc lệnh sắp gửi là một lệnh ghi, và đọc lại từ `session-store` giữ
   * cho token không phải đi lòng vòng qua props của mấy tầng giao diện.
   */
  cancelLease(signal) {
    const csrfToken = getExternalSigningCsrf();
    if (!csrfToken) throw new ExternalSigningError(403, "EXTERNAL_SIGNING_CSRF_MISSING");
    return cancelExternalSigningLease(csrfToken, signal);
  },
};

/* ------------------------------------------------------------------ *
 * Quyền ký độc quyền (signing lease)
 * ------------------------------------------------------------------ */

/**
 * Trạng thái lease của phiên đang mở.
 *
 * KHÔNG mang CSRF: đây là lệnh ĐỌC, và phiên đã nằm trong cookie `HttpOnly` mà
 * trình duyệt tự gắn nhờ `credentials: "include"`. Không có một dòng JavaScript
 * nào ở đây đọc, sao chép hay dựng lại cookie đó — không thể, và cũng không cần.
 */
export async function getExternalSigningLease(
  signal?: AbortSignal,
): Promise<SigningLeaseResponse> {
  const response = await fetch("/api/public/signing-session/lease", {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  return readJson<SigningLeaseResponse>(response);
}

/**
 * Trả lại lượt ký đang mở của phiên này.
 *
 * Lệnh GHI nên BẮT BUỘC có `X-Public-Signing-CSRF` — đúng cặp cookie + CSRF mà
 * lệnh ký đang dùng, không phải một cơ chế mới.
 *
 * Phản hồi là trạng thái MỚI chứ không phải lời xác nhận: nó vẫn có thể là
 * `HELD_BY_YOU`, và nơi gọi phải đọc `state` thay vì suy ra "đã huỷ xong". Thân
 * rỗng (`204`) cũng hợp lệ — khi đó trả `undefined` và nơi gọi đọc lại bằng GET.
 */
export async function cancelExternalSigningLease(
  csrfToken: string,
  signal?: AbortSignal,
): Promise<SigningLeaseResponse | undefined> {
  const response = await fetch("/api/public/signing-session/lease", {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
    headers: { "X-Public-Signing-CSRF": csrfToken },
    signal,
  });
  if (!response.ok) throw await toExternalSigningError(response);
  return (await response.json().catch(() => undefined)) as SigningLeaseResponse | undefined;
}
