import { NextResponse } from "next/server";

/**
 * Proxy dùng chung cho Signing Service. Bản này dành cho môi trường test: dịch vụ
 * ký chạy độc lập, KHÔNG có xác thực — nên ở đây không có cookie, không Bearer
 * token, không refresh. Chỉ còn đúng việc chuyển tiếp.
 *
 * Ba điều mọi route handler đều phải làm giống nhau, gom về một chỗ:
 *
 * 1. Giữ NGUYÊN status của backend, kể cả 4xx/5xx — client rẽ nhánh theo `code`
 *    trong body chứ không theo suy đoán.
 * 2. Chuyển tiếp `Retry-After` và `X-Correlation-Id` (mã tra cứu khi báo lỗi).
 * 3. Trả body nguyên vẹn, kể cả problem+json.
 *
 * Vẫn giữ lớp proxy thay vì gọi thẳng backend từ trình duyệt: nó tránh CORS và
 * giữ mọi đường dẫn API nằm sau cùng một origin — quan trọng khi baseUrl là một
 * IP public không bật CORS cho origin của trang này.
 */

/**
 * Địa chỉ backend mặc định khi client không gửi kèm địa chỉ nào. Chỉ còn là
 * FALLBACK: nguồn ưu tiên là header `X-Signing-Base-Url` do người dùng đặt trên
 * giao diện, để đổi môi trường không phải sửa .env rồi khởi động lại dev server.
 */
const DEFAULT_SIGNING_API_URL = process.env.SIGNING_API_URL;

/** Header client dùng để chỉ định môi trường backend cho đúng lời gọi này. */
export const BASE_URL_HEADER = "x-signing-base-url";

/** Hạn chờ mặc định cho các lời gọi trả về ngay (capabilities, credentials…). */
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * `POST /sign` với FPT MPKI App giữ request tới khi người ký bấm xác nhận trên
 * điện thoại — khoảng 300 giây theo `authenticationTimeoutSeconds`. Hạn 15 giây
 * sẽ cắt sớm và biến giao dịch đó thành 502 oan. Luồng p12 và eSign Cloud trả về
 * sớm nên không bị ảnh hưởng bởi hạn dài hơn.
 */
export const SIGN_WAIT_TIMEOUT_MS = 345_000;

/**
 * `POST /api/templates` chuyển DOCX/XLSX sang PDF ngay trong request, qua
 * Gotenberg với `read-timeout: 60s`. Cộng thêm phần đọc gói OOXML, dựng bản
 * highlight và ghi lên object storage thì một mẫu nặng vượt xa hạn 15 giây mặc
 * định — và cắt sớm ở đây tạo ra thứ tệ nhất: proxy trả 502 trong khi backend
 * vẫn chạy nốt và vẫn tạo ra một template DRAFT thật.
 */
export const TEMPLATE_CONVERT_TIMEOUT_MS = 120_000;

const FORWARDED_RESPONSE_HEADERS = [
  "retry-after",
  "x-correlation-id",
  "idempotent-replay",
] as const;

/** Hàm khởi tạo `Response` cấm thân với các mã này. */
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

/** Dịch vụ ký không tiếp cận được: backend tắt, DNS/TCP lỗi, hoặc timeout. */
export class SigningApiUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("SIGNING_API_UNAVAILABLE");
    this.name = "SigningApiUnavailableError";
    this.cause = cause;
  }
}

export class SigningApiNotConfiguredError extends Error {
  constructor() {
    super("SIGNING_API_NOT_CONFIGURED");
    this.name = "SigningApiNotConfiguredError";
  }
}

export class SigningApiBaseUrlInvalidError extends Error {
  constructor() {
    super("SIGNING_API_BASE_URL_INVALID");
    this.name = "SigningApiBaseUrlInvalidError";
  }
}

/**
 * Chuẩn hoá một địa chỉ backend do người dùng nhập: bỏ khoảng trắng và dấu `/`
 * cuối, và chỉ nhận http/https. Chặn `file:`/`data:` và các scheme khác vì
 * chúng biến proxy này thành công cụ đọc tài nguyên nội bộ của máy chủ.
 *
 * KHÔNG chặn localhost hay dải IP nội bộ: cả ba môi trường mà công cụ này phục
 * vụ (localhost, domain, IP public) đều hợp lệ, và đây là bàn thử chạy trên máy
 * người dùng chứ không phải dịch vụ mở cho người lạ.
 */
export function normalizeBaseUrl(value: string | null | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;

  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
}

/**
 * Địa chỉ backend cho đúng lời gọi này. Header do người dùng đặt thắng biến môi
 * trường; header có mặt nhưng sai định dạng thì BÁO LỖI thay vì lặng lẽ rơi về
 * mặc định — người dùng nghĩ mình đang gọi môi trường A mà thật ra gọi B là kiểu
 * nhầm lẫn tệ nhất ở một công cụ ký.
 */
export function resolveBaseUrl(request: { headers: Headers }): string {
  const header = request.headers.get(BASE_URL_HEADER);
  if (header && header.trim()) {
    const normalized = normalizeBaseUrl(header);
    if (!normalized) throw new SigningApiBaseUrlInvalidError();
    return normalized;
  }

  const fallback = normalizeBaseUrl(DEFAULT_SIGNING_API_URL);
  if (!fallback) throw new SigningApiNotConfiguredError();
  return fallback;
}

/**
 * Gọi dịch vụ ký. `X-Correlation-Id` tự sinh nếu caller chưa đặt — đây là mã duy
 * nhất nối được log frontend với log backend khi một giao dịch ký lỗi.
 *
 * `fetch()` của undici ném `TypeError("fetch failed")` với `cause` là
 * ECONNREFUSED/ENOTFOUND/… Bọc lại thành lỗi có kiểu để phân biệt "backend chết"
 * với "backend trả lỗi HTTP" — chỉ trường hợp sau mới là lỗi nghiệp vụ thật.
 */
export async function signApiFetch(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("X-Correlation-Id")) {
    headers.set("X-Correlation-Id", crypto.randomUUID());
  }

  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new SigningApiUnavailableError(error);
  }
}

function copyHeaders(response: Response): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

/**
 * Chuyển tiếp một lời gọi JSON. `request` chỉ dùng để đọc header baseUrl — thân
 * request do caller dựng, vì multipart và JSON đi hai đường khác nhau.
 */
export async function proxySignJson(
  request: { headers: Headers },
  path: string,
  init: RequestInit = {},
): Promise<NextResponse> {
  try {
    const baseUrl = resolveBaseUrl(request);
    const response = await signApiFetch(baseUrl, path, init);

    /*
     * Các lệnh ghi của phân hệ mẫu (`PUT …/fields`, `PUT …/signers`, `DELETE`)
     * trả `204 No Content`. Dựng `NextResponse.json()` cho chúng là ném
     * TypeError ngay tại đây — hàm khởi tạo Response cấm thân với 204/205/304 —
     * và một lời gọi vừa THÀNH CÔNG sẽ hiện ra ở client thành lỗi 502 của proxy.
     */
    if (NULL_BODY_STATUSES.has(response.status)) {
      return new NextResponse(null, {
        status: response.status,
        headers: copyHeaders(response),
      });
    }

    const body = await response.json().catch(() => ({}));
    return NextResponse.json(body, {
      status: response.status,
      headers: copyHeaders(response),
    });
  } catch (error) {
    return signErrorResponse(error);
  }
}

/**
 * Header danh tính + quyền ký của phân hệ quy trình ký. Dịch vụ không có xác
 * thực nên `X-Username` là thứ nói cho backend biết ai đang thao tác — nó đi
 * vào audit log và vào quyền đọc tài liệu của yêu cầu ký. `X-Signing-Lease-Token`
 * đi kèm ở bước START/USB-prepare/DELETE lease, đại diện cho đúng lượt giành
 * quyền ký vừa `POST /sign/lease`.
 *
 * Chuyển tiếp nguyên văn thay vì để proxy tự đặt: người dùng chọn danh tính trên
 * giao diện, và một proxy tự ý điền tên khác là làm sai lệch chính cái log mà
 * header này sinh ra. Header lease token cũng vậy — proxy không được tự sinh
 * hay tự bỏ nó.
 */
const FORWARDED_ACTOR_HEADERS = [
  "x-username",
  "idempotency-key",
  "x-signing-lease-token",
] as const;

export function actorHeaders(request: { headers: Headers }): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_ACTOR_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

/**
 * Chuyển tiếp một lời gọi trả về TỆP (`…/document`, `…/preview`,
 * `…/content`).
 *
 * Không đi qua `proxySignJson` được vì thân là nhị phân, và không đọc thành text
 * được vì PDF vỡ ngay. `ETag` cùng `304` được giữ nguyên: các endpoint này đều
 * gắn ETag theo sha256 của nội dung, và nuốt mất nó biến mỗi lần mở lại màn hình
 * thành một lần tải lại cả tệp.
 */
export async function proxySignBinary(
  request: { headers: Headers },
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  try {
    const baseUrl = resolveBaseUrl(request);
    const headers = new Headers(init.headers);
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch) headers.set("If-None-Match", ifNoneMatch);

    const response = await signApiFetch(baseUrl, path, { ...init, headers });

    /*
     * Lỗi của backend là problem+json chứ không phải tệp, nên trả lại như JSON
     * để client đọc được `code` bằng đúng một đường như mọi lời gọi khác.
     */
    if (!response.ok && response.status !== 304) {
      const body = await response.json().catch(() => ({}));
      return NextResponse.json(body, {
        status: response.status,
        headers: copyHeaders(response),
      });
    }

    const out = copyHeaders(response);
    for (const name of ["content-type", "etag", "content-disposition"] as const) {
      const value = response.headers.get(name);
      if (value) out.set(name, value);
    }
    // Nội dung của yêu cầu ký là dữ liệu riêng của người dùng: không để proxy
    // hay CDN nào giữ lại một bản.
    out.set("Cache-Control", "no-store, private");

    if (response.status === 304) return new Response(null, { status: 304, headers: out });
    return new Response(await response.arrayBuffer(), { status: response.status, headers: out });
  } catch (error) {
    return signErrorResponse(error);
  }
}

/**
 * Mã lỗi của riêng lớp proxy — không phải của backend. Client phân biệt được vì
 * chúng không bao giờ trùng với mã nghiệp vụ.
 */
export function signErrorResponse(error: unknown): NextResponse {
  if (error instanceof SigningApiNotConfiguredError) {
    return NextResponse.json({ code: "SIGNING_API_NOT_CONFIGURED" }, { status: 500 });
  }
  if (error instanceof SigningApiBaseUrlInvalidError) {
    return NextResponse.json({ code: "SIGNING_API_BASE_URL_INVALID" }, { status: 400 });
  }
  return NextResponse.json({ code: "SIGNING_API_UNREACHABLE" }, { status: 502 });
}
