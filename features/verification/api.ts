"use client";

import type { VerificationReport } from "@/lib/types/verification";
import { baseUrlHeaders } from "@/features/signing/api-base-url";

/**
 * Client của luồng verify. Cùng quy ước với `features/signing/sign-api.ts`: mọi
 * lời gọi đi qua route `/api/signing/*` của chính ứng dụng này, kèm header
 * `X-Signing-Base-Url` để proxy biết gọi môi trường nào.
 */

const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32 MB — giới hạn mặc định của backend

export class VerifyApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    public detail?: string,
    public correlationId?: string | null,
  ) {
    super(code);
    this.name = "VerifyApiClientError";
  }
}

export class FileTooLargeError extends Error {
  constructor(public maxBytes: number) {
    super("FILE_TOO_LARGE_CLIENT");
    this.name = "FileTooLargeError";
  }
}

interface ErrorBody {
  code?: string;
  detail?: string;
  correlationId?: string | null;
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}) as { data?: T } & ErrorBody);

  if (!response.ok) {
    const errorBody = body as ErrorBody;
    throw new VerifyApiClientError(
      response.status,
      errorBody.code ?? "UNKNOWN_ERROR",
      errorBody.detail,
      errorBody.correlationId,
    );
  }

  return (body as { data: T }).data;
}

/**
 * Verify file gửi trực tiếp. Không sinh artifact và không lưu gì lại — file chỉ
 * tồn tại trong vòng đời của request này.
 */
export async function verifyFile(file: File): Promise<VerificationReport> {
  if (file.size > MAX_FILE_SIZE) {
    throw new FileTooLargeError(MAX_FILE_SIZE);
  }

  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/api/signing/signatures/validate", {
    method: "POST",
    headers: baseUrlHeaders(),
    body: form,
  });

  return parse<VerificationReport>(response);
}

/**
 * Thêm host OCSP/CRL vào allowlist thu hồi. `409 ALLOWLIST_ENTRY_EXISTS` nghĩa là
 * host đã sẵn sàng — kết quả mong muốn đã đạt, không phải lỗi chặn luồng.
 */
export async function addToAllowlist(host: string): Promise<void> {
  const response = await fetch("/api/signing/revocation-allowlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...baseUrlHeaders() },
    body: JSON.stringify({ host, note: "Thêm từ cảnh báo verify" }),
  });

  if (response.ok || response.status === 409) return;

  const body = await response.json().catch(() => ({}) as ErrorBody);
  throw new VerifyApiClientError(
    response.status,
    body.code ?? "UNKNOWN_ERROR",
    body.detail,
    body.correlationId,
  );
}

/** Thêm host vào allowlist rồi verify lại cùng file — luồng "Thêm vào allowlist và verify lại". */
export async function addToAllowlistAndReverify(
  host: string,
  file: File,
): Promise<VerificationReport> {
  await addToAllowlist(host);
  return verifyFile(file);
}

const VERIFY_ERROR_MESSAGES: Record<string, string> = {
  /* Lớp proxy của bàn thử này — không phải mã của backend. */
  VERIFY_NOT_SUPPORTED:
    "Dịch vụ ở địa chỉ này không có endpoint verify (POST /api/v2/signatures/validate). Đây là service chỉ ký — trỏ địa chỉ API sang service có verify.",
  ALLOWLIST_NOT_SUPPORTED:
    "Dịch vụ ở địa chỉ này không có endpoint allowlist thu hồi (POST /api/v1/revocation-allowlist).",
  SIGNING_API_UNREACHABLE:
    "Không kết nối được tới dịch vụ verify. Kiểm tra lại địa chỉ API và xem service đã chạy chưa.",
  SIGNING_API_NOT_CONFIGURED:
    "Chưa có địa chỉ dịch vụ. Đặt địa chỉ API ở nút cấu hình phía trên, hoặc đặt SIGNING_API_URL trong .env.local.",
  SIGNING_API_BASE_URL_INVALID:
    "Địa chỉ API không hợp lệ. Phải là URL http:// hoặc https:// đầy đủ, ví dụ http://localhost:8080.",
  VERIFY_SCHEMA_UNSUPPORTED:
    "Backend trả báo cáo verify theo schema mà bàn thử này chưa đọc được. Cần cập nhật lại bộ chuyển đổi.",

  /* Mã của backend */
  FILE_EMPTY: "File rỗng.",
  FILE_READ_FAILED: "Không đọc được file đã tải lên. Vui lòng thử lại.",
  ACCESS_DENIED: "Bạn không có quyền verify tệp này.",
  FILE_TOO_LARGE: "File vượt quá giới hạn 32 MB.",
  ARTIFACT_TYPE_NOT_SUPPORTED:
    "Định dạng file không được hỗ trợ (chỉ nhận PDF, XML, DOCX, XLSX, PPTX).",
  ARTIFACT_MAGIC_BYTES_INVALID: "Nội dung file không đúng với phần mở rộng.",
  CONTENT_TYPE_UNSUPPORTED: "Định dạng này chưa hỗ trợ verify.",
  ARTIFACT_UNREADABLE: "Không đọc được nội dung file để verify.",
  ALLOWLIST_HOST_EMPTY: "Không xác định được host để thêm vào allowlist.",
};

export function describeVerifyError(code: string, detail?: string): string {
  const known = VERIFY_ERROR_MESSAGES[code];
  if (known) return known;
  return detail ? `${code} — ${detail}` : `Đã xảy ra lỗi không xác định khi verify (${code}).`;
}
