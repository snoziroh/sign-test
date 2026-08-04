import type { SigningApiErrorBody } from "@/lib/types/signing";

/**
 * Phần dùng chung của client ký: kiểu lỗi và bảng dịch mã lỗi sang tiếng Việt.
 * Lời gọi nghiệp vụ nằm trong `sign-api.ts`.
 */

export class SigningApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    public detail?: string,
    /** Từ header/response — hiện cho người dùng để báo vận hành tra log. */
    public correlationId?: string,
  ) {
    super(code);
    this.name = "SigningApiClientError";
  }
}

/**
 * Đọc thân lỗi RFC 7807 của service: `{ type, title, status, detail, instance,
 * code, correlationId }`. `code` là thứ duy nhất được rẽ nhánh; `detail` là câu
 * tiếng Việt do backend viết, thường đã đủ rõ nên được hiển thị nguyên văn khi
 * client không có câu riêng.
 *
 * Lỗi validation của framework (thiếu tham số bắt buộc) KHÔNG có `code` — khi đó
 * `title` là thứ duy nhất còn lại để phân biệt.
 */
export async function readProblem(response: Response): Promise<SigningApiClientError> {
  const body = (await response.json().catch(() => ({}))) as SigningApiErrorBody & {
    title?: string;
    correlationId?: string | null;
  };
  return new SigningApiClientError(
    response.status,
    body.code ?? body.title ?? "UNKNOWN_ERROR",
    body.detail,
    body.correlationId ?? response.headers.get("x-correlation-id") ?? undefined,
  );
}

export const SIGNING_ERROR_MESSAGES: Record<string, string> = {
  /* Lớp proxy của bàn thử này — không phải mã của backend. */
  SIGNING_API_UNREACHABLE:
    "Không kết nối được tới dịch vụ ký. Kiểm tra lại địa chỉ API và xem service đã chạy chưa.",
  SIGNING_API_NOT_CONFIGURED:
    "Chưa có địa chỉ dịch vụ ký. Đặt địa chỉ API ở nút cấu hình phía trên, hoặc đặt SIGNING_API_URL trong .env.local.",
  SIGNING_API_BASE_URL_INVALID:
    "Địa chỉ API không hợp lệ. Phải là URL http:// hoặc https:// đầy đủ, ví dụ http://localhost:8080.",

  /* Vật liệu khoá */
  FILE_REQUIRED: "Bước START bắt buộc gửi kèm tài liệu cần ký.",
  PKCS12_FILE_REQUIRED: "Thiếu file .p12/.pfx. Chọn file khoá rồi ký lại.",
  PKCS12_MATERIAL_REQUIRED:
    "Thiếu file .p12/.pfx hoặc mật khẩu. Cả hai đều bắt buộc với luồng PKCS#12.",
  PKCS12_PASSWORD_INVALID: "Mật khẩu file .p12/.pfx không đúng.",
  PKCS12_ALIAS_NOT_FOUND: "Không tìm thấy alias này trong file khoá. Để trống để tự chọn alias đầu tiên.",

  /* Cấu hình ký */
  ALGORITHM_NOT_SUPPORTED:
    "Nguồn chữ ký này không ký được bằng thuật toán đã chọn. Chọn lại theo danh sách nguồn hỗ trợ.",
  FORMAT_NOT_SUPPORTED: "Nguồn chữ ký này không ký được định dạng tài liệu vừa chọn.",
  BASELINE_LEVEL_NOT_SUPPORTED: "Nguồn chữ ký này không hỗ trợ mức baseline đã chọn.",
  SIGNATURE_MODE_NOT_SUPPORTED: "Nguồn chữ ký này không hỗ trợ loại ký đã chọn.",
  TARGET_SIGNATURE_ID_REQUIRED:
    "Counter-sign cần chữ ký đích. Chọn một chữ ký có sẵn trong tài liệu đã nộp.",
  DOCUMENT_REQUIRED: "Chưa nộp tài liệu cần ký.",
  DOCUMENT_TOO_LARGE: "Tài liệu vượt quá giới hạn dung lượng của dịch vụ ký.",

  /**
   * Mã gộp của engine: TSA lỗi, targetSignatureId không có trong file, tài liệu
   * hỏng — đều ra chung mã này. Câu dịch phải nêu được cả ba khả năng, nếu không
   * người dùng sẽ đi tìm sai chỗ.
   */
  SIGNING_FAILED:
    "Engine ký thất bại. Ba nguyên nhân hay gặp: TSA không gọi được (baseline T luôn cần TSA), chữ ký đích không có trong file vừa nộp, hoặc tài liệu không đọc được.",

  /* Phiên ba pha của eSign Cloud */
  SIGN_SESSION_NOT_FOUND:
    "Phiên ký không còn tồn tại: đã hết 15 phút, hoặc đã hoàn tất và bị xoá. Hãy ký lại từ đầu.",
  SIGN_SESSION_EXPIRED: "Phiên ký đã hết hạn (15 phút). Hãy ký lại từ đầu.",
  SESSION_ID_REQUIRED: "Bước CONTINUE cần sessionId của phiên đang mở.",

  /* FPT eSign Cloud */
  FPT_ENROLLMENT_REQUIRED:
    "Chưa có agreementUuid nên phải điền đầy đủ thông tin đăng ký chứng thư.",
  FPT_SIGNER_DISPLAY_NAME_REQUIRED:
    "eSign Cloud bắt buộc có tên người ký: chứng thư chỉ được cấp sau khi nhập OTP nên chưa có CN để lấy tên.",
  REMOTE_IDENTITY_NOT_CONFIRMED:
    "Người ký chưa xác nhận xong thông tin trên trang của CA. Mở lại đường dẫn, hoàn tất rồi bấm Tiếp tục.",
  FPT_PREPARE_HASH_SIGNING_REJECTED: "CA từ chối mở giao dịch ký.",
  FPT_CALL_FAILED: "Không gọi được tới CA. Vui lòng thử lại sau.",
  FPT_CERTIFICATE_NOT_ISSUED: "Đã nhập OTP nhưng CA chưa trả chứng thư. Thử lấy kết quả lại sau ít giây.",

  /* FPT MPKI App */
  MPKI_USERNAME_REQUIRED:
    "Thiếu username của người ký. FPT không suy ra được đang hỏi chứng thư của ai.",
  FPT_CREDENTIAL_ID_REQUIRED:
    "Người ký có nhiều hơn một credential — phải chọn đúng một cái trước khi ký.",
  FPT_MPKI_LOGIN_FAILED: "Không đăng nhập được vào FPT MPKI. Vui lòng báo quản trị viên.",
  FPT_MPKI_TOKEN_EXPIRED: "Phiên với FPT MPKI đã hết hạn. Hệ thống sẽ tự thử lại.",
  FPT_MPKI_CERTIFICATE_EXPIRED: "Chứng thư của người ký đã hết hạn. Cần gia hạn bên FPT.",
  FPT_MPKI_CERTIFICATE_MISSING: "Không lấy được chứng thư từ FPT.",
  FPT_MPKI_AUTHORIZATION_REJECTED: "Người ký đã từ chối yêu cầu trên FPT MPKI App.",
  FPT_MPKI_AUTHORIZATION_TIMEOUT:
    "Hết thời gian chờ xác nhận trên FPT MPKI App. Ký lại rồi xác nhận sớm hơn.",
  FPT_MPKI_CALL_REJECTED: "FPT từ chối yêu cầu. Vui lòng thử lại sau.",
  FPT_MPKI_CALL_FAILED: "Không gọi được tới FPT MPKI. Vui lòng thử lại sau.",

  /* TSA */
  TSA_NOT_AVAILABLE:
    "Không lấy được dấu thời gian. Kiểm tra SIGNING_TSA_URL / SIGNING_TSA_ALLOWED_HOSTS, hoặc ký thử với baseline B.",
};

/**
 * Mã lỗi mà backend KHÔNG biết nhà cung cấp đã duyệt/ký hay chưa. Tuyệt đối
 * không tự động gửi lại — retry mù có thể tạo hai giao dịch và trừ hai lượt ký.
 */
export function isResultUnknownError(code?: string): boolean {
  return Boolean(code && code.endsWith("_RESULT_UNKNOWN"));
}

export function describeSigningError(code: string, detail?: string): string {
  const known = SIGNING_ERROR_MESSAGES[code];
  if (known) return known;
  return detail ? `${code} — ${detail}` : `Đã xảy ra lỗi không xác định (${code}).`;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof SigningApiClientError) return describeSigningError(error.code, error.detail);
  if (error instanceof Error && error.name === "TimeoutError") return fallback;
  return fallback;
}
