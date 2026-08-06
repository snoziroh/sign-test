import type {
  BaselineLevel,
  DocumentFormat,
  MaterialMode,
  SignatureMode,
  SignatureSource,
  SignRequestPayload,
  UsbTokenJobRequest,
} from "@/lib/types/signing";
import type { EnrollmentImage } from "./enrollment-image";
import { algorithmsFor, defaultAlgorithmFor } from "./signature-algorithm";
import { isUsbTokenSource } from "./usb-token-source";

/**
 * Dựng và kiểm cấu hình ký từ `GET /capabilities`.
 *
 * Luật xuyên suốt file này: KHÔNG hard-code định dạng/baseline/thuật toán/loại
 * ký theo nguồn. Mọi giá trị khởi tạo lấy từ chính `SignatureSource`, và mọi
 * kiểm tra đối chiếu lại với nó — thêm một nguồn mới ở backend thì màn hình chạy
 * được ngay, không phải sửa client.
 */

/**
 * Thông tin đăng ký chứng thư eSign Cloud. Dữ liệu cá nhân — không persist.
 *
 * Ba ô ảnh giữ `null` khi người dùng chưa chọn tệp; lúc dựng payload chúng thành
 * chuỗi rỗng chứ không bị bỏ khoá (xem `FptAgreementDetails`).
 */
export interface EnrollmentFormState {
  mobileNo: string;
  email: string;
  citizenID: string;
  personalName: string;
  location: string;
  stateOrProvince: string;
  country: string;
  photoFrontSideIDCard: EnrollmentImage | null;
  photoBackSideIDCard: EnrollmentImage | null;
  faceImage: EnrollmentImage | null;
}

/**
 * Bốn trường chữ bắt buộc để mở một đăng ký. Địa chỉ KHÔNG nằm ở đây — gửi rỗng
 * vẫn được nhận.
 *
 * Danh sách này là nguồn duy nhất cho cả ba chỗ: dấu bắt buộc trên nhãn, điều
 * kiện bật nút đăng ký, và điều kiện bật nút ký.
 */
export const REQUIRED_ENROLLMENT_KEYS = [
  "personalName",
  "citizenID",
  "mobileNo",
  "email",
] as const;

export type RequiredEnrollmentKey = (typeof REQUIRED_ENROLLMENT_KEYS)[number];

/**
 * Hai mặt CCCD cũng bắt buộc: FPT nhận đăng ký thiếu ảnh, nhưng hồ sơ đó không
 * qua được bước xác nhận danh tính — tức là tốn một giao dịch để lấy về một
 * agreement không bao giờ READY. Chặn ngay tại form rẻ hơn nhiều.
 *
 * Ảnh chân dung CỐ Ý không nằm ở đây: nó không nằm trên giấy tờ nên người thử
 * hiếm khi có sẵn, và thiếu nó vẫn xác nhận được.
 */
export const REQUIRED_ENROLLMENT_IMAGE_KEYS = [
  "photoFrontSideIDCard",
  "photoBackSideIDCard",
] as const;

export type RequiredEnrollmentImageKey = (typeof REQUIRED_ENROLLMENT_IMAGE_KEYS)[number];

export function enrollmentComplete(enrollment: EnrollmentFormState): boolean {
  return (
    REQUIRED_ENROLLMENT_KEYS.every((key) => enrollment[key].trim().length > 0) &&
    REQUIRED_ENROLLMENT_IMAGE_KEYS.every((key) => enrollment[key] !== null)
  );
}

/**
 * Agreement đang dùng đã qua bước xác nhận danh tính trên trang SIC chưa — chỉ
 * biết được TRONG phiên làm việc này.
 *
 * - `UNKNOWN` — uuid gõ tay hoặc khôi phục từ lần trước. KHÔNG chặn ký: cách duy
 *   nhất để biết chắc là gọi API status, mà mỗi lần gọi trừ một lượt ký.
 * - `AWAITING_CONFIRMATION` — vừa đăng ký ở phiên này, người ký chưa xác nhận
 *   xong trên trang SIC. Ký lúc này chắc chắn hỏng nên chặn luôn.
 * - `READY` — status trả `READY`, chứng thư sẵn sàng.
 */
export type AgreementStage = "UNKNOWN" | "AWAITING_CONFIRMATION" | "READY";

/** Khoá của ba ô ảnh — dùng để duyệt form mà không gõ lại tên từng trường. */
export const ENROLLMENT_IMAGE_KEYS = [
  "photoFrontSideIDCard",
  "photoBackSideIDCard",
  "faceImage",
] as const;

export type EnrollmentImageKey = (typeof ENROLLMENT_IMAGE_KEYS)[number];

/**
 * Ba trường ảnh của `agreementDetails`, luôn đủ khoá. Dùng chung cho bước START
 * và cho `POST /enrollments` — hai đường gửi cùng một khối, nên chỉ có một chỗ
 * quyết định hình dạng của nó.
 */
export function enrollmentImagePayload(
  enrollment: EnrollmentFormState,
): Record<EnrollmentImageKey, string> {
  return {
    photoFrontSideIDCard: enrollment.photoFrontSideIDCard?.base64 ?? "",
    photoBackSideIDCard: enrollment.photoBackSideIDCard?.base64 ?? "",
    faceImage: enrollment.faceImage?.base64 ?? "",
  };
}

export interface SignFormState {
  sourceId: string;
  baselineLevel: BaselineLevel;
  algorithm: string;
  /** `undefined` khi nguồn không khai báo `signatureModes` (không gửi lên). */
  signatureMode?: SignatureMode;
  targetSignatureId: string;
  /** Chữ ký hiển thị — chỉ có nghĩa với PDF. */
  visibleSignature: boolean;

  /* PKCS#12 */
  p12Password: string;
  /** Rỗng thì provider tự chọn alias đầu tiên có private key. */
  p12Alias: string;

  /* FPT MPKI App */
  mpkiUsername: string;
  mpkiCredentialId: string;

  /* FPT eSign Cloud */
  agreementUuid: string;
  signerDisplayName: string;
  documentName: string;
  enrollment: EnrollmentFormState;
}

/** Khung ký đã quy đổi sang PDF points, gốc dưới-trái. */
export interface SignAppearanceGeometry {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const EMPTY_ENROLLMENT: EnrollmentFormState = {
  mobileNo: "",
  email: "",
  citizenID: "",
  personalName: "",
  location: "",
  stateOrProvince: "",
  country: "VN",
  photoFrontSideIDCard: null,
  photoBackSideIDCard: null,
  faceImage: null,
};

export function sourceKey(source: SignatureSource): string {
  return source.id;
}

export function findSource(
  sources: SignatureSource[],
  sourceId?: string,
): SignatureSource | undefined {
  return sources.find((source) => source.id === sourceId);
}

/** Nhãn hiển thị: ưu tiên tên backend đặt, rồi tới vendor, cuối cùng là id thô. */
export function sourceLabel(source: SignatureSource): string {
  return source.label?.trim() || source.vendor || source.materialMode || source.id;
}

export function isPkcs12(source?: SignatureSource): boolean {
  return source?.materialMode === "PKCS12";
}

export function isMpki(source?: SignatureSource): boolean {
  return source?.vendor === "FPT_MPKI_APP";
}

export function isSignCloud(source?: SignatureSource): boolean {
  return source?.vendor === "FPT_SIGN_CLOUD";
}

/** Nguồn do client khai — xem `usb-token-source.ts`. */
export const isUsbToken = isUsbTokenSource;

/**
 * Nguồn có ký được định dạng này không. Đây là bộ lọc DUY NHẤT được phép chạy ở
 * client — nó chỉ đọc lại `documentFormats`, không tự suy luận thêm.
 */
export function supportsFormat(source: SignatureSource, format?: DocumentFormat): boolean {
  if (!format) return false;
  return source.documentFormats.includes(format);
}

/**
 * Chữ ký hình ảnh cần CẢ HAI điều kiện: nguồn khai `visibleSignature`, và tài
 * liệu là PDF. Backend bật cờ này cho cả nguồn ký được XML/OOXML — cờ nói về
 * nguồn, không nói về định dạng, nên chỉ đọc cờ là sẽ hiện khung ký cho file XML.
 */
export function supportsVisibleSignature(
  source?: SignatureSource,
  format?: DocumentFormat,
): boolean {
  return Boolean(source?.visibleSignature) && format === "PDF";
}

function firstAllowed<T>(preferred: T | null | undefined, allowed: readonly T[]): T | undefined {
  if (preferred && allowed.includes(preferred)) return preferred;
  return allowed[0];
}

/**
 * Giá trị khởi tạo của form khi chọn xong nguồn. `previous` là cấu hình người
 * dùng đang dùng dở: giữ lại lựa chọn còn hợp lệ khi đổi nguồn, bỏ những lựa
 * chọn nguồn mới không hỗ trợ.
 *
 * `format` là định dạng của tệp ĐANG chọn. Nó quyết định cả danh sách thuật toán
 * hợp lệ lẫn giá trị mặc định: cùng một nguồn PKCS12 cho PDF là 9 lựa chọn với
 * mặc định PSS/SHA-256, nhưng cho DOCX chỉ còn 3 × PKCS#1 với mặc định
 * PKCS#1/SHA-256. Chưa chọn tệp thì bỏ trống — khi đó `defaultAlgorithm` chung
 * của nguồn là thứ đúng nhất còn biết được.
 *
 * Thông tin định danh (username, agreementUuid, hồ sơ đăng ký) LUÔN được giữ:
 * chúng thuộc về người ký chứ không thuộc về nguồn, và gõ lại chúng là phần tốn
 * thời gian nhất của bàn thử này.
 */
export function resolveFormState(
  source: SignatureSource,
  previous?: SignFormState,
  format?: DocumentFormat,
): SignFormState {
  const signatureMode = source.signatureModes.length
    ? firstAllowed(previous?.signatureMode ?? "CO_SIGN", source.signatureModes)
    : undefined;

  const algorithms = algorithmsFor(source, format);

  return {
    sourceId: source.id,
    baselineLevel:
      firstAllowed(previous?.baselineLevel, source.baselineLevels) ??
      source.baselineLevels[0] ??
      "T",
    // Giữ lựa chọn cũ khi nó còn dùng được với (nguồn, định dạng) hiện tại; nếu
    // không thì lấy mặc định của chính cặp đó, KHÔNG phải phần tử đầu của
    // `source.algorithms` — danh sách hợp đó có thể chứa thuật toán định dạng
    // này không chở được.
    algorithm:
      firstAllowed(previous?.algorithm, algorithms) ??
      defaultAlgorithmFor(source, format) ??
      "",
    signatureMode,
    // Chữ ký đích thuộc về đúng một file và đổi sau mỗi lần ký — luôn chọn lại.
    targetSignatureId: "",
    visibleSignature: previous?.visibleSignature ?? true,

    p12Password: previous?.p12Password ?? "",
    p12Alias: previous?.p12Alias ?? "",

    mpkiUsername: previous?.mpkiUsername ?? "",
    mpkiCredentialId: previous?.mpkiCredentialId ?? "",

    agreementUuid: previous?.agreementUuid ?? "",
    signerDisplayName: previous?.signerDisplayName ?? "",
    documentName: previous?.documentName ?? "",
    enrollment: previous?.enrollment ?? { ...EMPTY_ENROLLMENT },
  };
}

/* ------------------------------------------------------------------ *
 * Dựng payload
 * ------------------------------------------------------------------ */

/**
 * Bước START. Bốn điểm dễ sai đã xử lý ở đây:
 * - `targetSignatureId` CHỈ gửi cùng COUNTER_SIGN (gửi kèm CO_SIGN cho PDF là 422).
 * - Toạ độ chỉ gửi khi tài liệu là PDF và người dùng bật chữ ký hiển thị.
 * - `enrollment` chỉ gửi khi chưa có `agreementUuid` — có rồi mà vẫn gửi thì
 *   backend bỏ qua, nhưng gửi dữ liệu cá nhân thừa lên mạng là không cần thiết.
 * - Trường rỗng bị bỏ hẳn thay vì gửi chuỗi rỗng — TRỪ ba trường ảnh của
 *   `agreementDetails`, luôn phải có khoá dù giá trị rỗng.
 */
export function buildStartRequest(input: {
  source: SignatureSource;
  form: SignFormState;
  geometry?: SignAppearanceGeometry;
  fileName?: string;
}): SignRequestPayload {
  const { source, form, geometry } = input;

  const payload: SignRequestPayload = {
    materialMode: source.materialMode,
    step: "START",
    baselineLevel: form.baselineLevel,
  };

  // LUÔN gửi tường minh. Bỏ trống `algorithm` giờ ra RSA-PSS/SHA-256, không còn
  // là PKCS#1/SHA-256 như trước — im lặng đổi thuật toán dưới chân người dùng.
  if (form.algorithm) payload.algorithm = form.algorithm;
  if (form.signatureMode) payload.signatureMode = form.signatureMode;
  if (form.signatureMode === "COUNTER_SIGN" && form.targetSignatureId.trim()) {
    payload.targetSignatureId = form.targetSignatureId.trim();
  }

  if (geometry) {
    payload.page = geometry.page;
    payload.x = geometry.x;
    payload.y = geometry.y;
    payload.width = geometry.width;
    payload.height = geometry.height;
  }

  if (source.materialMode === "PKCS12") {
    payload.pkcs12 = {
      password: form.p12Password,
      ...(form.p12Alias.trim() ? { alias: form.p12Alias.trim() } : {}),
    };
    return payload;
  }

  const vendor = source.vendor;
  if (!vendor) return payload;

  const documentName = form.documentName.trim() || input.fileName;
  payload.remoteCa = {
    vendor,
    ...(documentName ? { documentName } : {}),
  };

  if (vendor === "FPT_MPKI_APP") {
    if (form.mpkiUsername.trim()) payload.remoteCa.username = form.mpkiUsername.trim();
    if (form.mpkiCredentialId.trim()) {
      payload.remoteCa.credentialId = form.mpkiCredentialId.trim();
    }
    return payload;
  }

  // FPT_SIGN_CLOUD
  if (form.signerDisplayName.trim()) {
    payload.remoteCa.signerDisplayName = form.signerDisplayName.trim();
  }
  if (form.agreementUuid.trim()) {
    payload.remoteCa.agreementUuid = form.agreementUuid.trim();
    return payload;
  }

  payload.remoteCa.enrollment = {
    mobileNo: form.enrollment.mobileNo.trim(),
    email: form.enrollment.email.trim(),
    agreementDetails: {
      citizenID: form.enrollment.citizenID.trim(),
      personalName: form.enrollment.personalName.trim(),
      country: form.enrollment.country.trim() || "VN",
      ...(form.enrollment.location.trim() ? { location: form.enrollment.location.trim() } : {}),
      ...(form.enrollment.stateOrProvince.trim()
        ? { stateOrProvince: form.enrollment.stateOrProvince.trim() }
        : {}),
      ...enrollmentImagePayload(form.enrollment),
    },
  };
  return payload;
}

/**
 * Phần `request` của multipart tạo job USB Token.
 *
 * Cùng ba quy tắc với `buildStartRequest` — `targetSignatureId` chỉ đi cùng
 * COUNTER_SIGN, toạ độ chỉ gửi khi có khung ký, trường rỗng thì bỏ hẳn — nhưng
 * KHÔNG dùng lại `buildStartRequest`: hai endpoint có hợp đồng khác nhau, và
 * ghép chung sẽ đẩy `materialMode`/`remoteCa` vào một body không nhận chúng.
 */
export function buildUsbTokenJobRequest(input: {
  form: SignFormState;
  geometry?: SignAppearanceGeometry;
}): UsbTokenJobRequest {
  const { form, geometry } = input;

  const request: UsbTokenJobRequest = {
    algorithm: form.algorithm,
    baselineLevel: form.baselineLevel,
    signerDisplayName: form.signerDisplayName.trim(),
  };

  if (form.signatureMode) request.signatureMode = form.signatureMode;
  if (form.signatureMode === "COUNTER_SIGN" && form.targetSignatureId.trim()) {
    request.targetSignatureId = form.targetSignatureId.trim();
  }

  if (geometry) {
    request.page = geometry.page;
    request.x = geometry.x;
    request.y = geometry.y;
    request.width = geometry.width;
    request.height = geometry.height;
  }

  return request;
}

/**
 * Bước CONTINUE. Cố ý chỉ có `materialMode`, `step`, `sessionId`: chữ ký hình
 * ảnh, loại ký và baseline đã được chốt và cất trong phiên từ bước START — gửi
 * lại cũng bị bỏ qua, và gửi kèm `file` là dựng lại tài liệu thành hash khác.
 */
export function buildContinueRequest(
  materialMode: MaterialMode,
  sessionId: string,
): SignRequestPayload {
  return { materialMode, step: "CONTINUE", sessionId };
}

/* ------------------------------------------------------------------ *
 * Trình tự cấu hình
 * ------------------------------------------------------------------ */

/**
 * Năm bước của màn ký, theo đúng thứ tự phụ thuộc: định dạng tài liệu quyết định
 * nguồn nào dùng được, nguồn quyết định phần khai riêng và danh sách thuật toán.
 *
 * Đây cũng là nhãn dán trên từng lỗi của `validateSignForm` — thanh tiến trình
 * không tự đoán bước nào chưa xong, nó đọc lại đúng kết quả kiểm tra đang chặn
 * nút ký.
 */
export const SIGN_STEP_ORDER = [
  "document",
  "source",
  "credential",
  "signature",
  "review",
] as const;

export type SignStepId = (typeof SIGN_STEP_ORDER)[number];

/**
 * Nguồn có phần khai riêng hay không. Nguồn lạ (backend thêm mới, client chưa có
 * khối nào cho nó) thì bỏ hẳn bước này thay vì hiện một thẻ rỗng.
 */
export function hasCredentialStep(source?: SignatureSource): boolean {
  if (!source) return false;
  return isPkcs12(source) || isMpki(source) || isSignCloud(source) || isUsbToken(source);
}

/** Danh sách bước THỰC SỰ hiện ra với nguồn đang chọn. */
export function buildSignSteps(source?: SignatureSource): SignStepId[] {
  return SIGN_STEP_ORDER.filter((step) => step !== "credential" || hasCredentialStep(source));
}

/* ------------------------------------------------------------------ *
 * Kiểm tra trước khi bật nút ký
 * ------------------------------------------------------------------ */

export interface SignFormValidation {
  valid: boolean;
  messages: string[];
  /** Cùng các thông báo trên, tách theo bước đang chặn — dùng cho thanh tiến trình. */
  byStep: Record<SignStepId, string[]>;
}

export interface SignFormValidationMessages {
  chooseDocument: string;
  unsupportedFormat: string;
  chooseSource: string;
  formatNotSupported: (source: string) => string;
  tooLarge: (limit: string) => string;
  algorithmUnsupported: string;
  /** Thuật toán có trong nguồn nhưng định dạng này không chở được (OOXML). */
  algorithmUnsupportedForFormat: (format: string) => string;
  baselineUnsupported: (level: string) => string;
  chooseMode: string;
  targetRequired: string;
  p12FileRequired: string;
  p12PasswordRequired: string;
  mpkiUsernameRequired: string;
  mpkiCredentialRequired: string;
  signerDisplayNameRequired: string;
  enrollmentRequired: string;
  agreementRequired: string;
  agreementNotReady: string;
}

/**
 * Cố ý KHÔNG đoán thay backend: chỉ đối chiếu lựa chọn hiện tại với capability
 * và với những trường bắt buộc mà capability tự khai (`requiresUploadedKeyFile`,
 * `requiresCredentialSelection`, `requiresSignerDisplayName`,
 * `requiresEnrollment`). Phần còn lại để `POST /sign` trả lỗi có mã.
 */
export function validateSignForm(input: {
  source?: SignatureSource;
  form?: SignFormState;
  file?: File;
  format?: DocumentFormat;
  p12File?: File;
  maxUploadBytes?: number | null;
  credentialCount?: number;
  /** Chỉ có nghĩa với eSign Cloud. Mặc định `UNKNOWN` — không chặn. */
  agreementStage?: AgreementStage;
  formatBytes: (bytes: number) => string;
  messages: SignFormValidationMessages;
}): SignFormValidation {
  const { source, form, file, format, messages } = input;
  const problems: StepProblem[] = [];
  const add = (step: SignStepId, message: string) => problems.push({ step, message });

  if (!file) add("document", messages.chooseDocument);
  else if (!format) add("document", messages.unsupportedFormat);

  if (!source || !form) {
    add("source", messages.chooseSource);
    return collectProblems(problems);
  }

  if (format && !supportsFormat(source, format)) {
    add("source", messages.formatNotSupported(sourceLabel(source)));
  }
  if (file && input.maxUploadBytes && file.size > input.maxUploadBytes) {
    add("document", messages.tooLarge(input.formatBytes(input.maxUploadBytes)));
  }

  // Đối chiếu với danh sách CỦA ĐỊNH DẠNG, không với hợp `source.algorithms`.
  // Phân biệt hai ca vì cách sửa khác nhau: thuật toán không thuộc nguồn thì
  // chọn lại; thuộc nguồn nhưng không hợp định dạng thì đổi tệp cũng là một
  // đường ra, và câu chữ phải nói được điều đó.
  if (!algorithmsFor(source, format).includes(form.algorithm)) {
    add(
      "signature",
      format && source.algorithms.includes(form.algorithm)
        ? messages.algorithmUnsupportedForFormat(format)
        : messages.algorithmUnsupported,
    );
  }
  if (!source.baselineLevels.includes(form.baselineLevel)) {
    add("signature", messages.baselineUnsupported(form.baselineLevel));
  }

  if (source.signatureModes.length > 0) {
    if (!form.signatureMode || !source.signatureModes.includes(form.signatureMode)) {
      add("signature", messages.chooseMode);
    } else if (form.signatureMode === "COUNTER_SIGN" && !form.targetSignatureId.trim()) {
      add("signature", messages.targetRequired);
    }
  }

  if (source.materialMode === "PKCS12") {
    if (source.requiresUploadedKeyFile !== false && !input.p12File) {
      add("credential", messages.p12FileRequired);
    }
    // Mật khẩu là bắt buộc tuyệt đối; thiếu là 400 PKCS12_MATERIAL_REQUIRED.
    if (!form.p12Password) add("credential", messages.p12PasswordRequired);
  }

  if (isMpki(source)) {
    if (!form.mpkiUsername.trim()) add("credential", messages.mpkiUsernameRequired);
    // Bỏ trống credentialId CHỈ hợp lệ khi người ký có đúng một credential —
    // mà điều đó chỉ biết được sau khi đã tải danh sách.
    else if (
      source.requiresCredentialSelection &&
      !form.mpkiCredentialId.trim() &&
      (input.credentialCount ?? 0) !== 1
    ) {
      add("credential", messages.mpkiCredentialRequired);
    }
  }

  // Tên người ký: eSign Cloud và USB Token đều dựng PDF trước khi có chứng thư,
  // nên không có CN nào để lấy tên. Phần còn lại của luồng USB Token (agent chạy
  // chưa, có chứng thư nào không) chỉ biết được lúc bấm ký — hộp thoại ký lo.
  if (isUsbToken(source)) {
    if (source.requiresSignerDisplayName !== false && !form.signerDisplayName.trim()) {
      add("credential", messages.signerDisplayNameRequired);
    }
  }

  if (isSignCloud(source)) {
    if (source.requiresSignerDisplayName !== false && !form.signerDisplayName.trim()) {
      add("credential", messages.signerDisplayNameRequired);
    }
    if (form.agreementUuid.trim()) {
      // Đăng ký vừa tạo ở phiên này mà chưa xác nhận danh tính xong: chứng thư
      // chưa tồn tại, ký bây giờ là ném đi một lượt START đã bị tính phí.
      if (input.agreementStage === "AWAITING_CONFIRMATION") {
        add("credential", messages.agreementNotReady);
      }
    } else if (source.requiresEnrollment !== false) {
      // Hồ sơ điền xong KHÔNG phải là ký được. Đường duy nhất tới chứng thư là
      // bấm đăng ký rồi xác nhận danh tính; ký thẳng lúc này để service tự đăng
      // ký thì uuid không bao giờ về tới đây và lần sau lại đăng ký lại.
      add(
        "credential",
        enrollmentComplete(form.enrollment)
          ? messages.agreementRequired
          : messages.enrollmentRequired,
      );
    }
  }

  return collectProblems(problems);
}

interface StepProblem {
  step: SignStepId;
  message: string;
}

/**
 * Giữ NGUYÊN thứ tự đã đẩy vào cho `messages` — danh sách phẳng vẫn là thứ hiện
 * dưới nút ký, và đọc nó theo thứ tự phát hiện dễ hiểu hơn là theo thứ tự bước.
 */
function collectProblems(problems: StepProblem[]): SignFormValidation {
  const byStep = Object.fromEntries(
    SIGN_STEP_ORDER.map((step) => [step, [] as string[]]),
  ) as Record<SignStepId, string[]>;

  for (const problem of problems) byStep[problem.step].push(problem.message);

  return {
    valid: problems.length === 0,
    messages: problems.map((problem) => problem.message),
    byStep,
  };
}
