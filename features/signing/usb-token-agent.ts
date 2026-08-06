"use client";

/**
 * Client của FPT-CA Signing Agent 1.3.1 — HTTP server chạy trên MÁY NGƯỜI KÝ tại
 * `http://localhost:14211`.
 *
 * Bốn ràng buộc của agent định hình toàn bộ file này:
 *
 * 1. Trình duyệt phải gọi THẲNG. Không được đẩy qua route handler của Next: khi
 *    đó `localhost` là máy chạy Next chứ không phải máy đang cắm USB Token.
 * 2. `Content-Type` bắt buộc là `text/plain;charset=UTF-8`. Dùng
 *    `application/json` (hoặc thêm bất kỳ header tuỳ chỉnh nào) là trình duyệt
 *    phát CORS preflight `OPTIONS`, mà agent 1.3.1 trả HTTP 405 cho `OPTIONS`.
 * 3. Lỗi nghiệp vụ vẫn về HTTP 200. Cờ duy nhất đáng tin là trường `code`.
 * 4. KHÔNG có trường PIN trong bất kỳ request nào. PIN chỉ được nhập ở cửa sổ
 *    native của FPT-CA Token Manager — trang web không thu thập, không chuyển
 *    tiếp, không tự điền.
 *
 * Agent token, digest, chữ ký và chứng thư đều chỉ sống trong state của một lần
 * ký: không ghi ra localStorage, không log.
 */

const FPT_AGENT_BASE_URL = "http://localhost:14211";

/** Ngôn ngữ cho `codeDesc` của agent. */
const AGENT_LANG = "vi";

/**
 * Chứng thư agent đọc từ Windows certificate store của người ký.
 *
 * `notBefore`/`notAfter` của agent 1.3.1 có định dạng `dd/MM/yyyy HH:ss` —
 * THIẾU phút. Chỉ hiển thị nguyên văn, không parse thành `Date`; hiệu lực thật
 * do backend đọc từ `base64Encode`.
 */
export interface FptCertificate {
  commonName: string;
  /** Dùng NGUYÊN VĂN khi ký: không đảo byte, không chuẩn hoá hoa thường. */
  serialNumber: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  subjectDN: string;
  /** Base64 DER X.509 — chính là `certificateBase64` gửi lên backend. */
  base64Encode: string;
  thumbprint: string;
}

interface FptAgentResponse {
  code: number;
  codeDesc?: string;
  description?: string;
  token?: string;
  certList?: FptCertificate[];
  signature?: string;
}

/** Lỗi nghiệp vụ của agent. `code` là thứ duy nhất được rẽ nhánh. */
export class FptAgentError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = "FptAgentError";
  }
}

/** Không chạm được tới `localhost:14211`: agent chưa chạy, hoặc trình duyệt chặn. */
export class FptAgentUnreachableError extends Error {
  constructor(cause?: unknown) {
    super("FPT_AGENT_UNREACHABLE");
    this.name = "FptAgentUnreachableError";
    this.cause = cause;
  }
}

/** Mã lỗi cần thông báo riêng; còn lại dùng chính `codeDesc` của agent. */
export const FPT_AGENT_CODE = {
  tokenInvalid: 1002,
  tokenNotInitialized: 1003,
  certificateNotSelected: 1004,
  algorithmNotSupported: 1007,
  certificateTimeInvalid: 1014,
  certificateInvalid: 1015,
} as const;

async function callFptAgent(
  path: "/GetToken" | "/GetListCertificate" | "/SignHash",
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<FptAgentResponse> {
  let response: Response;
  try {
    response = await fetch(`${FPT_AGENT_BASE_URL}${path}`, {
      method: "POST",
      // Xem ràng buộc (2) ở đầu file — đừng đổi thành application/json.
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new FptAgentUnreachableError(cause);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new FptAgentError(response.status, `FPT Signing Agent HTTP ${response.status}`);
  }

  let result: FptAgentResponse;
  try {
    result = JSON.parse(text) as FptAgentResponse;
  } catch {
    throw new FptAgentError(-1, "FPT_AGENT_INVALID_JSON");
  }

  if (result.code !== 0) {
    throw new FptAgentError(
      result.code,
      result.description ?? result.codeDesc ?? `FPT Agent error ${result.code}`,
    );
  }
  return result;
}

/**
 * Token phiên của tiến trình agent. Không phải access token, không có hạn — nó
 * chỉ chết khi agent khởi động lại, và lúc đó agent trả `1002`.
 */
export async function getAgentToken(signal?: AbortSignal): Promise<string> {
  const result = await callFptAgent("/GetToken", { lang: AGENT_LANG }, signal);
  if (!result.token) throw new FptAgentError(-1, "FPT_AGENT_NO_TOKEN");
  return result.token;
}

/**
 * Chứng thư còn hiệu lực có private key phần cứng. Mảng rỗng nghĩa là không tìm
 * thấy chứng thư nào phù hợp — thường là token chưa cắm hoặc driver chưa nhận.
 *
 * `revocationCheck` gửi `false` vì bản 1.3.1 không dùng cờ này; kiểm tra thu hồi
 * là việc của backend.
 */
export async function listAgentCertificates(
  token: string,
  signal?: AbortSignal,
): Promise<FptCertificate[]> {
  const result = await callFptAgent(
    "/GetListCertificate",
    { token, lang: AGENT_LANG, revocationCheck: false },
    signal,
  );
  return result.certList ?? [];
}

/**
 * Ký digest do backend dựng. Đây là lúc FPT-CA Token Manager có thể bật cửa sổ
 * PIN, nên lời gọi này treo cho tới khi người ký xong việc ở cửa sổ đó.
 *
 * `data` phải là ĐÚNG chuỗi `digestBase64` backend trả về: agent không hash lại,
 * nó ký thẳng khối byte này. Độ dài KHÔNG còn cố định — `algDigest` quyết định
 * (SHA256 → 32 byte, SHA384 → 48, SHA512 → 64) — nên đừng kiểm hay cắt theo
 * hằng số nào.
 *
 * `jcaSignatureAlgorithm` (`SHA256withRSA`, `SHA256withRSAandMGF1`,
 * `SHA256withECDSA`) CỐ Ý không được gửi đi: bản 1.3.1 của agent không có tham
 * số nào khai scheme ký — `/SignHash` chỉ nhận `algDigest`, và scheme luôn là
 * PKCS#1 v1.5. Nhận nó ở đây để chỗ gọi khỏi phải biết điều đó, và để chỉ đúng
 * MỘT chỗ phải sửa khi lên bản agent có tham số ấy: thêm nó vào body ngay dưới
 * `algDigest`, rồi nới `USB_TOKEN_AGENT_SCHEMES` trong `usb-token-source.ts`.
 */
export async function signHash(
  input: {
    token: string;
    digestBase64: string;
    digestAlgorithm: string;
    serialNumber: string;
    /** Xem ghi chú ở trên — hiện chưa có đường gửi xuống agent 1.3.1. */
    jcaSignatureAlgorithm?: string;
  },
  signal?: AbortSignal,
): Promise<string> {
  const result = await callFptAgent(
    "/SignHash",
    {
      token: input.token,
      lang: AGENT_LANG,
      algDigest: input.digestAlgorithm,
      data: input.digestBase64,
      serialNumber: input.serialNumber,
      revocationCheck: false,
    },
    signal,
  );
  if (!result.signature) throw new FptAgentError(-1, "FPT_AGENT_NO_SIGNATURE");
  return result.signature;
}

/** Nhãn gọn cho một chứng thư trong danh sách chọn. */
export function certificateLabel(certificate: FptCertificate): string {
  return certificate.commonName?.trim() || certificate.subjectDN || certificate.serialNumber;
}
