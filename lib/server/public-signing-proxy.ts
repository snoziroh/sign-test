import { NextResponse } from "next/server";
import { normalizeBaseUrl, SIGN_WAIT_TIMEOUT_MS } from "./sign-proxy";

/**
 * Proxy cho nhóm endpoint CÔNG KHAI của luồng ký ngoài hệ thống
 * (`/api/public/**`). Tách hẳn khỏi `sign-proxy.ts` vì ba điểm khác biệt, và cả
 * ba đều là lý do bảo mật chứ không phải tiện nghi:
 *
 * 1. **Địa chỉ backend chỉ đến từ biến môi trường.** `sign-proxy` cho client đặt
 *    `X-Signing-Base-Url` — hợp lý ở một bàn thử nội bộ, nhưng ở một trang MỞ CHO
 *    NGƯỜI LẠ thì đó là một endpoint để bất kỳ ai bắt máy chủ này gọi tới địa chỉ
 *    họ chọn. Trang public không gửi header đó, và ở đây header cũng không được
 *    đọc.
 * 2. **Cookie đi cả hai chiều.** Phiên ký công khai là một cookie `HttpOnly` do
 *    backend đặt. Không chuyển tiếp `Set-Cookie` xuống trình duyệt và `Cookie`
 *    lên backend thì cả luồng không có gì để giữ phiên.
 * 3. **Không có `X-Username`.** Người ký ngoài hệ thống không có danh tính nội
 *    bộ; danh tính của họ CHÍNH LÀ cookie phiên. Chuyển tiếp một header danh tính
 *    ở đây là mở đường giả lập người ký.
 *
 * Đường dẫn của proxy CỐ Ý trùng đường dẫn của backend (`/api/public/...`): nhờ
 * vậy thuộc tính `Path` của cookie phiên do backend đặt vẫn đúng sau khi đi qua
 * lớp này, không phải viết lại.
 */

/**
 * Địa chỉ signing-service. KHÔNG có đường ghi đè từ client — xem lý do (1) ở
 * trên. Đổi môi trường cho luồng public là sửa `.env.local` rồi khởi động lại.
 */
const SIGNING_API_URL = process.env.SIGNING_API_URL;

/** Tiền tố của nhóm endpoint công khai trên backend. */
const PUBLIC_PREFIX = "/api/public";

/** Hạn cho các lời gọi trả về ngay (exchange, session, plan). */
const DEFAULT_TIMEOUT_MS = 15_000;

/** Hàm khởi tạo `Response` cấm thân với các mã này. */
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

/**
 * Header CSRF của phiên công khai. Chuyển tiếp nguyên văn: nó là nửa còn lại của
 * cặp cookie + CSRF, và proxy không có cách nào tự sinh ra giá trị đúng.
 */
const CSRF_HEADER = "x-public-signing-csrf";

/**
 * Lỗi của riêng lớp proxy, mang cùng hình dạng thân lỗi với backend
 * (`{ timestamp, status, code, message, path }`) để client chỉ cần một đường đọc
 * lỗi duy nhất. Hai mã này không bao giờ trùng mã nghiệp vụ.
 */
function errorBody(code: string, message: string, path: string, status: number) {
  return {
    timestamp: new Date().toISOString(),
    status,
    code,
    message,
    path,
  };
}

function notConfigured(path: string): NextResponse {
  return NextResponse.json(
    errorBody(
      "EXTERNAL_SIGNING_API_NOT_CONFIGURED",
      "Chưa cấu hình địa chỉ dịch vụ ký cho luồng ký ngoài hệ thống.",
      path,
      500,
    ),
    { status: 500 },
  );
}

function unreachable(path: string): NextResponse {
  return NextResponse.json(
    errorBody(
      "EXTERNAL_SIGNING_API_UNREACHABLE",
      "Không kết nối được tới dịch vụ ký.",
      path,
      502,
    ),
    { status: 502 },
  );
}

/**
 * Header gửi LÊN backend. Danh sách trắng, không phải danh sách đen: một trang
 * công khai nhận request từ người lạ, và chuyển tiếp mọi header họ gửi là để họ
 * nói chuyện trực tiếp với backend qua máy chủ này.
 */
function upstreamHeaders(request: Request, contentType?: string | null): Headers {
  const headers = new Headers();

  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);

  const csrf = request.headers.get(CSRF_HEADER);
  if (csrf) headers.set("X-Public-Signing-CSRF", csrf);

  if (contentType) headers.set("Content-Type", contentType);

  // Mã tra cứu nối log frontend với log backend khi một giao dịch ký lỗi. Sinh
  // mới ở đây thay vì nhận từ client: giá trị do người lạ đặt không đáng tin.
  headers.set("X-Correlation-Id", crypto.randomUUID());

  return headers;
}

/**
 * Header trả XUỐNG trình duyệt.
 *
 * `Set-Cookie` chuyển tiếp NGUYÊN VĂN, kể cả `Secure` / `SameSite`. Không tự sửa
 * thuộc tính cookie: hạ `Secure` để chạy được trên `http://localhost` là âm thầm
 * làm yếu phiên ký thật của production. Hệ quả cần biết khi thử cục bộ — nếu
 * backend đặt `Secure`, trình duyệt bỏ cookie trên http và phiên không giữ được;
 * lúc đó phải thử trên https.
 */
function downstreamHeaders(response: Response): Headers {
  const headers = new Headers();

  for (const cookie of response.headers.getSetCookie()) {
    headers.append("Set-Cookie", cookie);
  }
  for (const name of ["retry-after", "x-correlation-id"] as const) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Ngữ cảnh phiên và tài liệu là dữ liệu riêng của người ký: không để proxy hay
  // CDN nào giữ lại một bản.
  headers.set("Cache-Control", "no-store, private");
  return headers;
}

async function callBackend(
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  if (!SIGNING_API_URL) throw new PublicProxyNotConfiguredError();

  const baseUrl = normalizeBaseUrl(SIGNING_API_URL);
  if (!baseUrl) throw new PublicProxyNotConfiguredError();

  try {
    return await fetch(`${baseUrl}${PUBLIC_PREFIX}${path}`, {
      ...init,
      cache: "no-store",
      // `redirect: manual` — một 302 từ backend không được proxy đi theo: đích
      // đến do backend chọn, và theo nó là biến proxy này thành công cụ gọi hộ.
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new PublicProxyUnreachableError(error);
  }
}

class PublicProxyNotConfiguredError extends Error {}
class PublicProxyUnreachableError extends Error {
  constructor(cause: unknown) {
    super("EXTERNAL_SIGNING_API_UNREACHABLE");
    this.cause = cause;
  }
}

function toErrorResponse(error: unknown, path: string): NextResponse {
  if (error instanceof PublicProxyNotConfiguredError) return notConfigured(path);
  return unreachable(path);
}

/**
 * Chuyển tiếp một lời gọi JSON của phiên công khai.
 *
 * Giữ NGUYÊN status của backend, kể cả 4xx/5xx: client rẽ nhánh theo `code` trong
 * thân, và một 410 bị proxy đổi thành 500 là mất hẳn thông tin "link đã hết hạn".
 */
export async function proxyPublicJson(
  request: Request,
  path: string,
  init: { method?: string; body?: string; contentType?: string } = {},
): Promise<NextResponse> {
  try {
    const response = await callBackend(
      path,
      {
        method: init.method ?? "GET",
        headers: upstreamHeaders(request, init.contentType),
        body: init.body,
      },
      DEFAULT_TIMEOUT_MS,
    );

    /*
     * Hàm khởi tạo `Response` CẤM thân với 204/205/304. Dựng `NextResponse.json()`
     * cho chúng là ném TypeError ngay tại đây, và một lời gọi vừa THÀNH CÔNG
     * (`DELETE …/lease` được phép trả 204) sẽ hiện ra ở client thành 502 của proxy.
     */
    if (NULL_BODY_STATUSES.has(response.status)) {
      return new NextResponse(null, {
        status: response.status,
        headers: downstreamHeaders(response),
      });
    }

    const body = await response.json().catch(() => ({}));
    return NextResponse.json(body, {
      status: response.status,
      headers: downstreamHeaders(response),
    });
  } catch (error) {
    return toErrorResponse(error, path);
  }
}

/**
 * Chuyển tiếp lệnh ký (multipart).
 *
 * Hạn chờ dài như `/api/signing/sign`: FPT MPKI App GIỮ request tới khi người ký
 * bấm xác nhận trên điện thoại (~300 giây). Hạn 15 giây cắt sớm và biến một giao
 * dịch đang chờ thành 502 oan — trong khi lượt ký đã bị trừ.
 *
 * Thân request chuyển tiếp dạng nhị phân, KHÔNG đọc ra để log: nó chứa mật khẩu
 * P12 và có thể chứa ảnh giấy tờ của hồ sơ đăng ký.
 */
export async function proxyPublicSign(request: Request, path: string): Promise<NextResponse> {
  try {
    const response = await callBackend(
      path,
      {
        method: "POST",
        // Giữ nguyên `Content-Type` của client vì multipart boundary nằm trong
        // đó — dựng lại header này là backend đọc ra body rỗng.
        headers: upstreamHeaders(request, request.headers.get("content-type")),
        body: await request.arrayBuffer(),
      },
      SIGN_WAIT_TIMEOUT_MS,
    );

    const body = await response.json().catch(() => ({}));
    return NextResponse.json(body, {
      status: response.status,
      headers: downstreamHeaders(response),
    });
  } catch (error) {
    return toErrorResponse(error, path);
  }
}

/**
 * Chuyển tiếp tài liệu (nhị phân).
 *
 * Lỗi của backend là JSON chứ không phải tệp, nên nhánh lỗi trả JSON để client
 * đọc `code` bằng đúng một đường như mọi lời gọi khác. `ETag`/`304` KHÔNG được
 * giữ ở đây: tài liệu chỉ tải một lần cho mỗi phiên, và một bản cache trung gian
 * của tài liệu cần ký là thứ tài liệu tích hợp yêu cầu không được có.
 */
export async function proxyPublicDocument(request: Request, path: string): Promise<Response> {
  try {
    const response = await callBackend(
      path,
      { method: "GET", headers: upstreamHeaders(request) },
      DEFAULT_TIMEOUT_MS,
    );

    const headers = downstreamHeaders(response);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return NextResponse.json(body, { status: response.status, headers });
    }

    for (const name of ["content-type", "content-disposition"] as const) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }

    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers,
    });
  } catch (error) {
    return toErrorResponse(error, path);
  }
}
