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
 * Đọc thân lỗi của service: `{ type, title, status, detail, instance, code,
 * correlationId }`. `code` là thứ duy nhất được rẽ nhánh; `detail` là câu tiếng
 * Việt do backend viết, thường đã đủ rõ nên được hiển thị nguyên văn khi client
 * không có câu riêng.
 *
 * Lỗi validation của framework (thiếu tham số bắt buộc) KHÔNG có `code` — khi đó
 * `title` là thứ duy nhất còn lại để phân biệt.
 *
 * Phân hệ QUY TRÌNH KÝ đặt câu mô tả ở `message` chứ không ở `detail`
 * (`ApiErrorResponse` của nó không phải RFC 7807). Đọc cả hai, nếu không thì mọi
 * lỗi nghiệp vụ của phân hệ đó — "Template code already exists",
 * "Signature slot must lie completely inside the page" — đều rơi xuống câu mặc
 * định và người dùng chỉ còn nhìn thấy một mã viết hoa.
 */
export async function readProblem(response: Response): Promise<SigningApiClientError> {
  const body = (await response.json().catch(() => ({}))) as SigningApiErrorBody & {
    title?: string;
    message?: string;
    correlationId?: string | null;
  };
  return new SigningApiClientError(
    response.status,
    body.code ?? body.title ?? "UNKNOWN_ERROR",
    body.detail ?? body.message,
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
  /**
   * Gặp mã này nghĩa là dropdown đang dựng từ `source.algorithms` (hợp của mọi
   * định dạng) thay vì `algorithmsByFormat[format]` — xem `signature-algorithm.ts`.
   */
  ALGORITHM_NOT_SUPPORTED:
    "Nguồn chữ ký này không ký được bằng thuật toán đã chọn cho định dạng vừa nộp. Chọn lại theo danh sách của định dạng đó.",
  /** Hàng rào lớp engine cho OOXML — cùng nguyên nhân với mã trên. */
  ALGORITHM_NOT_SUPPORTED_FOR_FORMAT:
    "Định dạng này không chở được thuật toán đã chọn. DOCX/XLSX/PPTX chỉ ký được bằng RSA PKCS#1 v1.5 — ECMA-376 không định nghĩa PSS hay ECDSA cho chữ ký gói.",
  /**
   * Không lọc trước được: chỉ mở được file .p12 (hay credential MPKI, hay token)
   * mới biết khoá là RSA hay EC, mà lúc đó người dùng đã bấm Ký rồi.
   */
  ALGORITHM_KEY_TYPE_MISMATCH:
    "Thuật toán đã chọn không hợp với loại khoá của chứng thư: ECDSA cần khoá EC, RSA-PSS và PKCS#1 cần khoá RSA. Chọn lại nhóm thuật toán khác rồi ký lại.",
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
  /**
   * Màn hình KHÔNG còn ô nhập tên người ký — tên trên chữ ký phải là tên trong
   * chứng thư do CA cấp, không phải chuỗi người dùng tự gõ. Gặp mã này nghĩa là
   * dịch vụ ký vẫn đang bắt client gửi tên; phải sửa ở đó, người dùng không có
   * gì để điền thêm.
   */
  FPT_SIGNER_DISPLAY_NAME_REQUIRED:
    "Dịch vụ ký đang đòi tên người ký do client gửi lên. Màn hình này không gửi tên tự nhập nữa — tên phải lấy từ hồ sơ đăng ký / chứng thư của CA. Cần cập nhật dịch vụ ký.",
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

  /* FPT USB Token */
  USB_TOKEN_CERTIFICATE_KEY_MISMATCH:
    "Chứng thư trong USB Token không khớp thuật toán của phiên ký: chọn ECDSA thì token phải có chứng thư khoá EC, chọn RSA thì phải là khoá RSA. Làm lại từ đầu với thuật toán khác.",
  USB_TOKEN_CERTIFICATE_KEY_UNSUPPORTED:
    "Chứng thư trong USB Token không dùng khoá RSA lẫn EC nên dịch vụ ký không xử lý được.",
  /**
   * Backend khai một scheme trong CMS còn agent ký bằng scheme khác — hầu như
   * luôn là job PSS/ECDSA đưa cho agent 1.3.1 vốn chỉ ký PKCS#1. Chữ ký sai
   * KHÔNG bị nhét vào PDF, nên đây là hỏng an toàn; hộp thoại USB Token chặn ca
   * này từ trước khi người ký phải nhập PIN.
   */
  USB_TOKEN_SIGNATURE_INVALID:
    "Chữ ký từ USB Token không khớp thuật toán của phiên ký. Thường là do chọn RSA-PSS hoặc ECDSA trong khi FPT Signing Agent chỉ ký được RSA PKCS#1 v1.5.",

  /*
   * Phân hệ quy trình ký — soạn mẫu.
   *
   * Chỉ dịch những mã mà người soạn TỰ SỬA ĐƯỢC. Các mã còn lại
   * (`TEMPLATE_FIELD_INVALID`, `SIGNATURE_SLOT_INVALID`…) cố tình để trống: câu
   * `message` của backend chỉ đúng ô nào, vai nào, sai chỗ nào, và một câu dịch
   * chung chung sẽ che mất chính thông tin đó.
   */
  TEMPLATE_CODE_ALREADY_EXISTS:
    "Mã mẫu này đã có trên hệ thống. Đổi sang một mã khác rồi nộp lại.",
  TEMPLATE_ALREADY_PUBLISHED:
    "Bản này đã được publish rồi. Tải lại danh sách mẫu để thấy trạng thái mới nhất.",
  TEMPLATE_NOT_READY_TO_PUBLISH:
    "Bản nháp chưa đủ điều kiện publish: phải cấu hình hết biến, có ít nhất một vai ký, và mỗi vai bắt buộc phải có khung chữ ký.",
  TEMPLATE_VERSION_IMMUTABLE:
    "Bản đã publish là bất biến, không sửa được biến hay vai ký nữa. Dịch vụ chưa có API tạo bản mới.",
  TEMPLATE_NOT_EDITABLE:
    "Chỉ mẫu còn ở trạng thái nháp mới sửa được tên và mô tả.",
  SIGNATURE_SLOT_OUT_OF_BOUNDS:
    "Khung chữ ký nằm ngoài trang. Kéo nó vào trong mép giấy rồi lưu lại.",
  /*
   * Nhiều người/vai cùng một `signingOrder` là HỢP LỆ (ký song song) và dịch vụ
   * tự nén dải số về 1..N, nên mã này không còn nói về chuyện trùng số hay hụt
   * số nữa. Còn lại đúng hai ca: `signingOrder < 1`, và gửi thứ tự ký cho một
   * phần người ký trong khi những người khác bỏ trống.
   */
  SIGNING_ORDER_INVALID:
    "Thứ tự ký không hợp lệ: phải đếm từ 1, và hoặc mọi người ký đều có thứ tự, hoặc không ai có.",
  FILE_TYPE_NOT_ALLOWED: "Mẫu chỉ nhận tệp DOCX và XLSX.",
  FILE_TOO_LARGE: "Tệp vượt quá dung lượng tối đa của dịch vụ.",
  PDF_CONVERSION_FAILED:
    "Không chuyển được tài liệu sang PDF. Kiểm tra dịch vụ chuyển đổi (Gotenberg) đã chạy chưa.",

  /*
   * Phân hệ quy trình ký — ký một ô (`POST /api/signing-requests/{id}/sign`).
   *
   * Năm mã 409 đầu tiên KHÔNG phải hỏng hóc: mỗi mã có một đường ra riêng, và
   * giao diện ký của quy trình (`workflow-sign-workspace.tsx`) bắt riêng hai mã đầu
   * để dựng nút "tiếp tục lượt ký" và khối "tài liệu vừa đổi". Câu ở đây là
   * phương án cuối cùng — khi mã đó rơi vào một chỗ không có nhánh riêng.
   */
  SIGNING_ALREADY_STARTED:
    "Lượt ký trước của bạn vẫn đang mở ở dịch vụ ký. Hãy tiếp tục lượt đó thay vì bắt đầu lại.",
  SIGNING_NOT_STARTED:
    "Không còn lượt ký nào đang mở để tiếp tục — phiên đã hết hoặc đã được giải phóng. Hãy ký lại từ đầu.",
  SIGNING_DOCUMENT_CHANGED:
    "Tài liệu đã đổi kể từ lúc bạn bắt đầu ký: một người cùng bước đã ký xong trước. Tải lại rồi ký lại trên bản mới.",
  SIGNING_LEASE_LOCKED:
    "Một người ký khác đã giành được lượt ký này trước. Chờ họ hoàn tất — màn hình tự mở lại khi tới lượt bạn.",
  SIGNING_LEASE_LOST:
    "Lượt ký của bạn đã hết hạn hoặc được chuyển cho người khác. Mọi bước đang dở đã bị bỏ; hãy bắt đầu lại từ đầu.",
  SIGNING_LEASE_REQUIRED:
    "Không tìm thấy quyền ký cục bộ cho lượt này. Quay lại màn quy trình và bấm Ký ngay để giành lại quyền ký.",
  SIGNER_NOT_CURRENT:
    "Chưa tới lượt ký của người này. Các bước trước phải hoàn tất đã.",
  SIGNER_ALREADY_PROCESSED:
    "Ô này đã ký hoặc đã từ chối rồi — không ký thêm lần nữa được.",
  SIGNED_DOCUMENT_MISSING:
    "Dịch vụ ký báo hoàn tất nhưng không trả về tệp đã ký, nên không có gì để lưu vào quy trình. Đừng thử lại ngay: kiểm tra log của dịch vụ ký trước.",

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
