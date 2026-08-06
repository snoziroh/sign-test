/**
 * Contract của Signing Service — collection "Toàn bộ luồng ký
 * (p12 / MPKI App / eSign Cloud OTP)".
 *
 * Hai điều định hình toàn bộ file này:
 *
 * 1. `POST /api/v1/sign` là CỬA VÀO DUY NHẤT. Nguồn chữ ký (`materialMode` +
 *    `remoteCa.vendor`) và bước giao dịch (`step`) nằm trong body, KHÔNG nằm ở
 *    URL. Không có resource `signing-jobs`, không có `artifactId`, không có id
 *    thao tác để poll — tài liệu đi kèm ngay trong multipart của mỗi lần START.
 *
 * 2. Mọi phản hồi của `/sign` có CÙNG một hình dạng JSON, kể cả khi còn dở dang.
 *    Client rẽ nhánh theo `status`, không theo mã HTTP (`PENDING_OTP` vẫn là
 *    200, không phải 202).
 */

/**
 * `PKCS12` và `REMOTE_CA` là hai giá trị của `POST /sign`.
 *
 * `USB_TOKEN` KHÔNG phải giá trị của backend và KHÔNG BAO GIỜ được gửi trong
 * body `/sign`: luồng USB Token đi qua cặp endpoint riêng
 * (`/usb-token/signing-jobs` → `.../complete`) và không có bước START/CONTINUE.
 * Nó nằm trong kiểu này chỉ vì màn hình chọn nguồn dùng chung một `SignatureSource`.
 */
export type MaterialMode = "PKCS12" | "REMOTE_CA" | "USB_TOKEN";

/** Nhà cung cấp CA từ xa. Quyết định luồng xác thực người ký, không quyết định URL. */
export type RemoteCaVendor = "FPT_MPKI_APP" | "FPT_SIGN_CLOUD";

/**
 * `START` nộp tài liệu và mở phiên; `CONTINUE` chỉ mang `sessionId`. Bước tiếp
 * theo do STAGE CỦA PHIÊN quyết định — hai lần CONTINUE của eSign Cloud có
 * payload y hệt nhau nhưng làm hai việc khác nhau.
 */
export type SignStep = "START" | "CONTINUE";

/** Tên định dạng theo backend — KHÁC với `ContentType` của lớp trình bày. */
export type DocumentFormat = "PDF" | "XML" | "WORD" | "EXCEL" | "POWERPOINT";

/**
 * `LT`/`LTA` có trong enum của backend nhưng chưa được cài đặt: chọn LT hôm nay
 * ra kết quả y hệt T. Chỉ render đúng mảng `baselineLevels` mà capability trả về.
 */
export type BaselineLevel = "B" | "T" | "LT" | "LTA";

export type SignatureMode = "CO_SIGN" | "COUNTER_SIGN";

/**
 * Chín thuật toán backend hỗ trợ. Kiểu ở mọi nơi khác vẫn nhận `string`: nguồn
 * sự thật là `algorithmsByFormat` + `algorithmCatalog` của capability, và thêm
 * thuật toán ở backend không được làm hỏng màn hình.
 *
 * Danh sách này chỉ dùng để SUY nhãn khi backend cũ chưa trả `algorithmCatalog`
 * — xem `signature-algorithm.ts`.
 */
export type KnownSignatureAlgorithm =
  | "RSA_PSS_SHA256"
  | "RSA_PSS_SHA384"
  | "RSA_PSS_SHA512"
  | "RSA_PKCS1_SHA256"
  | "RSA_PKCS1_SHA384"
  | "RSA_PKCS1_SHA512"
  | "ECDSA_SHA256"
  | "ECDSA_SHA384"
  | "ECDSA_SHA512";

/**
 * Sơ đồ ký (không phải hàm băm). Ba giá trị này là thứ chia nhóm dropdown và là
 * thứ quyết định chứng thư cần khoá gì: `ECDSA` cần khoá EC, hai cái còn lại cần
 * khoá RSA.
 */
export type SignatureScheme = "RSASSA_PSS" | "RSA_PKCS1_V1_5" | "ECDSA";

export type SignatureKeyAlgorithm = "RSA" | "EC";

/**
 * Mô tả một thuật toán, do backend trả trong `capabilities.algorithmCatalog`.
 *
 * `label` là NHÃN HIỂN THỊ CHÍNH THỨC. Đừng dựng bảng nhãn riêng ở client: bảng
 * đó lệch pha ngay lần backend thêm thuật toán tiếp theo, và lệch theo kiểu tệ
 * nhất — người dùng thấy một tên, file ký ra mang một thuật toán khác.
 */
export interface AlgorithmDescriptor {
  /** `RSA_PSS_SHA256` — khớp với phần tử trong `algorithmsByFormat`. */
  id: string;
  /** `RSA-PSS/SHA-256`. */
  label: string;
  scheme: SignatureScheme;
  keyAlgorithm: SignatureKeyAlgorithm;
  /** `P-256` với ECDSA, `null` với RSA. */
  namedCurve: string | null;
  /** `SHA-256`. */
  digestAlgorithm: string;
}

/**
 * Cách một lệnh ký đi tới trạng thái cuối — trường `interactionModel` của nguồn.
 * Đây là thứ DUY NHẤT màn hình được phép dựa vào để chọn màn chờ:
 * - `NONE` — PKCS#12, ký xong ngay trong START.
 * - `APP_CONFIRMATION` — FPT MPKI App: request bị GIỮ tới khi người ký bấm xác
 *   nhận trên điện thoại (~300 giây), không có 202, không có CONTINUE.
 * - `REDIRECT_OTP` — FPT eSign Cloud: ba pha START → CONTINUE → CONTINUE.
 * - `LOCAL_AGENT` — FPT USB Token: backend dựng digest, trình duyệt gọi thẳng
 *   FPT-CA Signing Agent ở `localhost:14211` để lấy chữ ký, rồi trả về backend
 *   hoàn thiện PDF. Cửa sổ nhập PIN là của FPT-CA, không phải của trang này.
 */
export type InteractionModel =
  | "NONE"
  | "APP_CONFIRMATION"
  | "REDIRECT_OTP"
  | "LOCAL_AGENT";

/**
 * `PENDING_IDENTITY` — chờ người ký xác nhận danh tính trên trang SIC.
 * `PENDING_OTP` — đã mở giao dịch, chờ người ký nhập OTP.
 * `COMPLETED` — có `document`, phiên bị xoá ngay sau đó.
 */
export type SignStatus = "COMPLETED" | "PENDING_IDENTITY" | "PENDING_OTP";

/* ------------------------------------------------------------------ *
 * GET /api/v1/capabilities
 * ------------------------------------------------------------------ */

/**
 * Một nguồn chữ ký. Đây là nguồn sự thật DUY NHẤT cho form ký: định dạng nhận
 * được, thuật toán, baseline, loại ký, và những trường bắt buộc riêng của nguồn.
 * Không hard-code bất cứ ràng buộc nào trong số đó ở phía client.
 */
export interface SignatureSource {
  /** `PKCS12` hoặc `REMOTE_CA:<vendor>`. Dùng làm khoá chọn, không hiển thị. */
  id: string;
  materialMode: MaterialMode;
  /** `null` với PKCS12. */
  vendor?: RemoteCaVendor | null;
  /** Tên tiếng Việt do backend đặt — hiển thị nguyên văn, không tự dịch lại. */
  label?: string | null;
  documentFormats: DocumentFormat[];
  /**
   * HỢP của mọi định dạng — chỉ để hiển thị tổng quan. ĐỪNG dựng dropdown từ
   * trường này: với PKCS12 nó là cả 9, nhưng chọn `RSA_PSS_SHA256` cho một file
   * `.docx` thì server trả `422 ALGORITHM_NOT_SUPPORTED`. Dùng
   * `algorithmsByFormat` — xem `algorithmsFor()` trong `signature-algorithm.ts`.
   */
  algorithms: string[];
  /** Gợi ý khi CHƯA biết định dạng tệp; vẫn phải nằm trong `algorithms`. */
  defaultAlgorithm?: string | null;
  /**
   * Danh sách THẬT SỰ dùng được cho từng định dạng, đã sắp theo thứ tự ưu tiên
   * của backend (PSS → PKCS#1 → ECDSA). Phần tử đầu là mặc định của cặp
   * (nguồn, định dạng) — ĐỪNG sắp xếp lại.
   *
   * OOXML chỉ chở được 3 × PKCS#1: ECMA-376 Part 2 chỉ định nghĩa RSA cho chữ
   * ký gói, Word/Excel không đọc được PSS hay ECDSA. Đó là giới hạn của định
   * dạng, không phải việc backend chưa làm.
   *
   * Vắng mặt khi gọi backend đời cũ — khi đó rơi về `algorithms`.
   */
  algorithmsByFormat?: Record<string, string[]>;
  /** Giá trị chọn sẵn theo định dạng. Vắng mặt với backend đời cũ. */
  defaultAlgorithmByFormat?: Record<string, string>;
  baselineLevels: BaselineLevel[];
  signatureModes: SignatureMode[];
  /** Nguồn có dựng được chữ ký hình ảnh không (còn tuỳ định dạng có hỗ trợ). */
  visibleSignature?: boolean;
  /** PKCS#12: phải nộp kèm part `p12File`. */
  requiresUploadedKeyFile?: boolean;
  /** MPKI: phải chọn credential khi người ký có nhiều hơn một. */
  requiresCredentialSelection?: boolean;
  /** eSign Cloud: chứng thư chưa tồn tại nên không có CN để lấy tên. */
  requiresSignerDisplayName?: boolean;
  /** eSign Cloud: cần `agreementUuid` có sẵn hoặc khối `enrollment` đầy đủ. */
  requiresEnrollment?: boolean;
  interactionModel: InteractionModel;
  /** Thời gian chờ dự kiến (giây) — dùng để đặt đồng hồ đếm ngược. */
  expectedWaitSeconds?: number | null;
}

export interface SignCapabilities {
  sources: SignatureSource[];
  /**
   * Nhãn và thuộc tính của mọi thuật toán backend biết. Vắng mặt với backend
   * đời cũ — `signature-algorithm.ts` suy nhãn từ id khi đó.
   */
  algorithmCatalog?: AlgorithmDescriptor[];
  maxUploadBytes?: number | null;
}

/* ------------------------------------------------------------------ *
 * POST /api/v1/sign — phần `request` của multipart
 * ------------------------------------------------------------------ */

/**
 * `password` BẮT BUỘC (thiếu là 400 PKCS12_MATERIAL_REQUIRED). `alias` để rỗng
 * thì provider tự lấy alias đầu tiên có private key. `p12Base64` là đường thay
 * thế khi không nộp được part `p12File` — có part thì field này bị bỏ qua.
 */
export interface Pkcs12MaterialRequest {
  password: string;
  alias?: string;
  p12Base64?: string;
}

/**
 * Dữ liệu cá nhân — không log, không lưu ra ngoài phiên làm việc.
 *
 * Ba trường ảnh là base64 THUẦN (không có tiền tố `data:`) và BẮT BUỘC CÓ MẶT
 * trong body: FPT từ chối request thiếu khoá, nhưng chấp nhận chuỗi rỗng. Vì vậy
 * kiểu ở đây là `string` chứ không phải `string?` — bỏ quên một trường là lỗi
 * biên dịch chứ không phải lỗi 4xx lúc chạy.
 */
export interface FptAgreementDetails {
  citizenID: string;
  personalName: string;
  location?: string;
  stateOrProvince?: string;
  country: string;
  /** Mặt trước CCCD. Rỗng được, thiếu thì không. */
  photoFrontSideIDCard: string;
  /** Mặt sau CCCD. Rỗng được, thiếu thì không. */
  photoBackSideIDCard: string;
  /** Ảnh chân dung. Rỗng được, thiếu thì không. */
  faceImage: string;
}

export interface FptEnrollmentRequest {
  mobileNo: string;
  email: string;
  agreementDetails: FptAgreementDetails;
}

/**
 * `agreementUuid` CỐ Ý không do client sinh: FPT tạo mới mọi giá trị, để client
 * tự đặt là mở đường ghi đè agreement của người khác. Giá trị ở đây luôn là thứ
 * đọc lại từ một lần đăng ký trước.
 */
export interface RemoteCaSignRequest {
  vendor: RemoteCaVendor;
  /** MPKI — service tự thêm prefix `MPKI_USER_ID_PREFIX`. */
  username?: string;
  /** MPKI — bỏ trống chỉ khi người ký có ĐÚNG một credential. */
  credentialId?: string;
  documentName?: string;
  /** eSign Cloud — có giá trị thì `enrollment` bị bỏ qua (không đăng ký lại). */
  agreementUuid?: string;
  /** eSign Cloud — bắt buộc; MPKI gửi cũng bị bỏ qua (tên lấy từ CN chứng thư). */
  signerDisplayName?: string;
  enrollment?: FptEnrollmentRequest;
}

/**
 * Toạ độ đo bằng PDF points, gốc góc DƯỚI-TRÁI. XML/OOXML không có chữ ký hình
 * ảnh nên `page/x/y/width/height` bị bỏ qua.
 */
export interface SignAppearanceRequest {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SignRequestPayload {
  materialMode: MaterialMode;
  step: SignStep;
  /** Chỉ ở `CONTINUE`. Sống 15 phút kể từ START. */
  sessionId?: string;
  signatureMode?: SignatureMode;
  /** Bắt buộc với COUNTER_SIGN; gửi kèm CO_SIGN cho PDF là 422. */
  targetSignatureId?: string;
  baselineLevel?: BaselineLevel;
  algorithm?: string;
  page?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  pkcs12?: Pkcs12MaterialRequest;
  remoteCa?: RemoteCaSignRequest;
}

/* ------------------------------------------------------------------ *
 * POST /api/v1/sign — response
 * ------------------------------------------------------------------ */

/**
 * Tệp đã ký về dưới dạng base64 trong JSON, KHÔNG phải binary stream — kể cả khi
 * ký xong. Không có endpoint tải riêng: mất response này là mất tệp.
 */
export interface SignedDocument {
  fileName: string;
  contentType: string;
  contentBase64: string;
}

export interface SignResponse {
  status: SignStatus;
  /** Chỉ luồng ba pha (eSign Cloud). Luồng một pha không trả trường này. */
  sessionId?: string;
  /** URL người ký phải mở: xác nhận danh tính, rồi nhập OTP. Mang token phiên. */
  nextUrl?: string;
  message?: string;
  expiresAt?: string;
  /** Chỉ có khi `status === "COMPLETED"`. */
  document?: SignedDocument;
}

/* ------------------------------------------------------------------ *
 * GET /api/v1/remote-ca/mpki/credentials
 * ------------------------------------------------------------------ */

/**
 * `subjectDn`/`issuerDn`/`validFrom`/`validTo`/`keyAlgorithm` đọc từ chính chứng
 * thư X.509 chứ không từ JSON của FPT — nên chúng vắng mặt khi service không
 * đọc được chứng thư của riêng entry đó, không phải khi cả danh sách hỏng.
 *
 * ĐỪNG lọc credential theo `signAlgorithms`: FPT không liệt kê OID RSASSA-PSS
 * trong đó dù chữ ký trả về đúng là PSS.
 */
export interface MpkiCredential {
  credentialId: string;
  status?: string;
  /** `EXPLICIT/*` → App hiện thông báo chờ xác nhận; `IMPLICIT/TSE` → SAD về ngay. */
  authMode?: string;
  subjectDn?: string;
  issuerDn?: string;
  validFrom?: string;
  validTo?: string;
  keyAlgorithm?: string;
  keyLength?: number;
  signAlgorithms?: string[];
}

export interface MpkiCredentialDetail extends MpkiCredential {
  /** Chuỗi chứng thư base64. FPT chỉ trả chứng thư người ký, không kèm CA trung gian. */
  certificates?: string[];
}

/* ------------------------------------------------------------------ *
 * POST /api/v1/remote-ca/fpt/enrollments
 * ------------------------------------------------------------------ */

export interface FptEnrollmentResponse {
  /** Định danh người ký trên CA — dùng lại cho mọi lần ký sau, ĐỪNG đăng ký lại. */
  agreementUuid: string;
  /** Trang xác nhận thông tin cấp chứng thư. */
  sicUrl?: string | null;
}

export interface FptEnrollmentStatusResponse {
  status: "WAIT_CONFIRM" | "READY" | string;
  fptResponseCode?: string;
  fptResponseMessage?: string;
}

/* ------------------------------------------------------------------ *
 * POST /api/v1/usb-token/signing-jobs
 * ------------------------------------------------------------------ */

/**
 * Phần `request` (JSON) của multipart tạo job. Cùng quy ước toạ độ với `/sign`,
 * nhưng `signerDisplayName` là BẮT BUỘC: PDF được dựng trước khi người dùng chọn
 * chứng thư, nên chưa có CN nào để lấy tên.
 */
export interface UsbTokenJobRequest {
  /**
   * BẮT BUỘC gửi tường minh. Bỏ trống giờ ra `RSA_PSS_SHA256`, mà FPT Signing
   * Agent 1.3.1 chỉ ký PKCS#1 — backend sẽ khai `RSASSA-PSS` trong CMS, agent
   * ký PKCS#1, và bước complete trả `422 USB_TOKEN_SIGNATURE_INVALID`.
   */
  algorithm: string;
  baselineLevel: BaselineLevel;
  signatureMode?: SignatureMode;
  /** Bắt buộc với COUNTER_SIGN. */
  targetSignatureId?: string;
  signerDisplayName: string;
  page?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/**
 * `digestBase64` truyền NGUYÊN VĂN vào trường `data` của `/SignHash` — decode ra
 * hex/text hay hash lại đều hỏng. Độ dài KHÔNG cố định 32 byte nữa: SHA-256 →
 * 32, SHA-384 → 48, SHA-512 → 64. Đừng cắt chuỗi hay kiểm độ dài theo hằng số.
 *
 * Job sống 15 phút và dùng ĐƯỢC MỘT LẦN: hoàn tất hai lần, hoặc hai tab cùng
 * hoàn tất, thì chỉ request giành được job trước mới chạy.
 */
export interface UsbTokenJob {
  jobId: string;
  digestBase64: string;
  /** `SHA256` | `SHA384` | `SHA512` — đưa thẳng vào `algDigest` của agent. */
  digestAlgorithm: string;
  /**
   * Id enum của thuật toán backend đã CHỐT cho job này. Dùng để đối chiếu trước
   * khi đưa digest cho agent: agent 1.3.1 chỉ ký PKCS#1, nên job PSS/ECDSA phải
   * bị chặn ở đây thay vì hỏng ở bước complete. Vắng mặt với backend đời cũ.
   */
  signatureAlgorithm?: string;
  /**
   * Tên chuẩn JCA (`SHA256withRSAandMGF1`, `SHA256withRSA`, `SHA256withECDSA`)
   * — thứ phải đưa cho agent nào có tham số chọn scheme. Agent 1.3.1 KHÔNG có
   * tham số đó (chỉ `algDigest`); giữ trường này để hiển thị và để sẵn đường
   * nối khi lên bản agent mới. Vắng mặt với backend đời cũ.
   */
  jcaSignatureAlgorithm?: string;
  expiresAt: string;
}

export interface UsbTokenCompleteRequest {
  signatureBase64: string;
  /** `base64Encode` của chứng thư agent trả về — DER X.509, không phải PEM. */
  certificateBase64: string;
  /** Bỏ trống là tốt nhất: intermediate/trust anchor nên cấu hình ở backend. */
  certificateChainBase64?: string[];
}

/* ------------------------------------------------------------------ *
 * Lỗi
 * ------------------------------------------------------------------ */

/** Thân lỗi của service: `code` là thứ duy nhất được rẽ nhánh, `detail` để hiển thị. */
export interface SigningApiErrorBody {
  status?: number;
  code?: string;
  detail?: string;
}

/** Phiên eSign Cloud còn dở — mọi status khác COMPLETED. */
export function isPendingStatus(status: SignStatus): boolean {
  return status !== "COMPLETED";
}

/**
 * CONTINUE ở stage này có TỐN PHÍ hay không. `PENDING_IDENTITY` → CONTINUE mở
 * giao dịch OTP: thêm một billCode, trừ một lượt ký. `PENDING_OTP` → CONTINUE
 * chỉ đọc chữ ký, lặp bao nhiêu lần cũng không tốn thêm.
 */
export function continueIsBillable(status: SignStatus): boolean {
  return status === "PENDING_IDENTITY";
}
