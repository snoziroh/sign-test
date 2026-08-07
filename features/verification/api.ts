"use client";

import type { VerificationReport } from "@/lib/types/verification";
import { verifyBaseUrlHeaders } from "@/features/verification/verify-base-url";
import type { Dictionary } from "@/lib/i18n";

/**
 * Client của luồng verify. Cùng quy ước với `features/signing/sign-api.ts`: mọi
 * lời gọi đi qua route `/api/verify/*` của chính ứng dụng này, kèm header
 * `X-Verify-Base-Url` để proxy biết gọi môi trường nào.
 *
 * Địa chỉ ở đây là của **verification-service** (`POST /api/v1/verify`), không
 * phải của dịch vụ ký — hai service, hai ô cấu hình.
 */

const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32 MiB — VERIFICATION_MAX_FILE_SIZE mặc định

/**
 * Mã tra cứu gửi kèm mọi lời gọi verify. Backend echo lại nguyên văn, nên đây là
 * sợi dây duy nhất nối log hai bên khi cần báo lỗi. Định dạng phải khớp
 * `[A-Za-z0-9._-]{8,128}` — `crypto.randomUUID()` nằm gọn trong đó.
 */
function newCorrelationId(): string {
  return `sigil-${crypto.randomUUID()}`;
}

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
      errorBody.correlationId ?? response.headers.get("x-correlation-id"),
    );
  }

  return (body as { data: T }).data;
}

/**
 * Verify file gửi trực tiếp. Không sinh artifact và không lưu gì lại — file chỉ
 * tồn tại trong vòng đời của request này.
 *
 * Kết quả trả về LUÔN là một báo cáo, kể cả khi chữ ký hỏng hoàn toàn: chữ ký sai
 * không phải lỗi HTTP. Verdict nằm ở `report.status` / `report.mainIndication` —
 * đừng dùng việc hàm này không ném lỗi để kết luận "hợp lệ".
 */
export async function verifyFile(file: File): Promise<VerificationReport> {
  if (file.size > MAX_FILE_SIZE) {
    throw new FileTooLargeError(MAX_FILE_SIZE);
  }

  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/api/verify", {
    method: "POST",
    headers: { "X-Correlation-Id": newCorrelationId(), ...verifyBaseUrlHeaders() },
    body: form,
  });

  return parse<VerificationReport>(response);
}

/**
 * Thăm dò một địa chỉ verify — dùng cho nút *Kiểm tra kết nối* trước khi lưu.
 * Không gửi file nào lên, nên không tốn một lượt thẩm định.
 */
export async function probeVerifyService(
  baseUrlOverride?: string,
): Promise<{ baseUrl: string; status: number }> {
  const response = await fetch("/api/verify", {
    method: "GET",
    headers: verifyBaseUrlHeaders(baseUrlOverride),
  });

  return parse<{ baseUrl: string; status: number }>(response);
}

/**
 * Thêm host OCSP/CRL vào allowlist thu hồi. `409 ALLOWLIST_ENTRY_EXISTS` nghĩa là
 * host đã sẵn sàng — kết quả mong muốn đã đạt, không phải lỗi chặn luồng.
 */
export async function addToAllowlist(host: string): Promise<void> {
  const response = await fetch("/api/verify/revocation-allowlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...verifyBaseUrlHeaders() },
    body: JSON.stringify({ host, note: "Thêm từ cảnh báo verify" }),
  });

  if (response.ok || response.status === 409) return;

  const body = await response.json().catch(() => ({}) as ErrorBody);
  throw new VerifyApiClientError(
    response.status,
    body.code ?? "UNKNOWN_ERROR",
    body.detail,
    body.correlationId ?? response.headers.get("x-correlation-id"),
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

export function describeVerifyError(t: Dictionary, code: string, detail?: string): string {
  const known = (t.verify.apiErrors as Record<string, unknown>)[code];
  const knownMessage = typeof known === "string" ? known : undefined;
  if (knownMessage) return detail ? `${knownMessage} (${detail})` : knownMessage;
  return detail ? `${code} — ${detail}` : t.verify.apiErrors.unknownError(code);
}
