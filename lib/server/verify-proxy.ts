import { NextResponse } from "next/server";
import {
  normalizeBaseUrl,
  signApiFetch,
  SigningApiBaseUrlInvalidError,
  SigningApiNotConfiguredError,
} from "@/lib/server/sign-proxy";

/**
 * Proxy của verification-service. Tách khỏi `sign-proxy` vì đây là **một dịch vụ
 * khác**, không phải một endpoint khác của dịch vụ ký: ký chạy ở `:8080`, verify
 * chạy ở `:8082`. Dùng chung một địa chỉ thì bật màn này là tắt màn kia — mà
 * luồng dùng thật của bàn thử là ký ở tab A rồi verify ngay ở tab B.
 *
 * Địa chỉ lấy theo thứ tự: header `X-Verify-Base-Url` (người dùng đặt trên giao
 * diện) → `VERIFY_API_URL` trong môi trường. KHÔNG rơi về địa chỉ của dịch vụ ký:
 * gọi verify vào một service chỉ biết ký sẽ trả 404 khó hiểu, còn tệ hơn là báo
 * thẳng "chưa cấu hình".
 */

const DEFAULT_VERIFY_API_URL = process.env.VERIFY_API_URL;

/** Header client dùng để chỉ định dịch vụ verify cho đúng lời gọi này. */
export const VERIFY_BASE_URL_HEADER = "x-verify-base-url";

/** Verify phải đi lấy OCSP/CRL/TSA nên chậm hơn một lời gọi thường. */
export const VERIFY_TIMEOUT_MS = 120_000;

export function resolveVerifyBaseUrl(request: { headers: Headers }): string {
  const header = request.headers.get(VERIFY_BASE_URL_HEADER);
  if (header && header.trim()) {
    const normalized = normalizeBaseUrl(header);
    if (!normalized) throw new SigningApiBaseUrlInvalidError();
    return normalized;
  }

  const fallback = normalizeBaseUrl(DEFAULT_VERIFY_API_URL);
  if (!fallback) throw new SigningApiNotConfiguredError();
  return fallback;
}

/** Cùng cơ chế với `signApiFetch` — chỉ khác địa chỉ đích và hạn chờ mặc định. */
export function verifyApiFetch(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return signApiFetch(baseUrl, path, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(VERIFY_TIMEOUT_MS),
  });
}

/**
 * Mã lỗi của riêng lớp proxy verify. Tách khỏi `SIGNING_API_*` để thông báo chỉ
 * đúng ô địa chỉ cần sửa — hai dịch vụ, hai ô nhập, hai lỗi khác nhau.
 */
export function verifyErrorResponse(error: unknown): NextResponse {
  if (error instanceof SigningApiNotConfiguredError) {
    return NextResponse.json({ code: "VERIFY_API_NOT_CONFIGURED" }, { status: 500 });
  }
  if (error instanceof SigningApiBaseUrlInvalidError) {
    return NextResponse.json({ code: "VERIFY_API_BASE_URL_INVALID" }, { status: 400 });
  }
  return NextResponse.json({ code: "VERIFY_API_UNREACHABLE" }, { status: 502 });
}

interface BackendErrorBody {
  code?: string;
  detail?: string;
  message?: string;
  error?: { code?: string; detail?: string; message?: string };
  /** RFC 7807 (mục 2 api-verify.md): mã tra cứu nằm thẳng ở root của body lỗi. */
  correlationId?: string | null;
  /** Body thành công của `/api/v1/verify` (schema 6): mã tra cứu nằm ở `run.correlationId`. */
  run?: { correlationId?: string | null };
}

/**
 * Mã tra cứu: ưu tiên header (server luôn echo lại), rồi tới body — vị trí trong
 * body khác nhau tuỳ hình dạng: lỗi RFC 7807 để nó ở root (`body.correlationId`),
 * báo cáo thành công để nó ở `body.run.correlationId`.
 */
export function correlationHeaders(response: Response, body: BackendErrorBody): Headers {
  const headers = new Headers();
  const id =
    response.headers.get("x-correlation-id") ?? body?.correlationId ?? body?.run?.correlationId;
  if (id) headers.set("x-correlation-id", id);
  return headers;
}

/** Gom `code`/`detail` về một shape duy nhất cho client, dù backend gói kiểu nào. */
export function normalizeErrorBody(body: BackendErrorBody): {
  code: string;
  detail?: string;
} {
  const code = body?.code ?? body?.error?.code;
  const detail = body?.detail ?? body?.message ?? body?.error?.detail ?? body?.error?.message;
  return { code: code ?? "UNKNOWN_ERROR", detail: detail ?? undefined };
}
