"use client";

import type {
  InternalSignRequest,
  InternalSignResponse,
} from "@/lib/types/workflow";
import type {
  BaselineLevel,
  DocumentFormat,
  MaterialMode,
  RemoteCaVendor,
  SignCapabilities,
  SignatureSource,
  SignRequestPayload,
  SignResponse,
} from "@/lib/types/signing";
import { SigningApiClientError } from "@/features/signing/api";
import { resolveFormState, type SignFormState } from "@/features/signing/sign-configuration";
import { mergeUsbTokenSource, USB_TOKEN_SOURCE } from "@/features/signing/usb-token-source";
import type { SignMethodId, SlotConfig } from "./model";

/**
 * Lớp nối giữa MÁY TRẠNG THÁI KÝ DÙNG CHUNG (`features/signing/sign-configuration.ts`
 * — `SignFormState`, `resolveFormState`, `validateSignForm`, `buildStartRequest`)
 * và hợp đồng hẹp hơn của lệnh ký nội bộ trong quy trình
 * (`InternalSignRequest`/`InternalSignResponse`, xem `lib/types/workflow.ts`).
 *
 * Cùng vai trò với `features/external-signing/method-model.ts` ở luồng công
 * khai, và cố ý KHÔNG gộp với nó: hai luồng khác nhau ở xác thực (`X-Username`
 * so với cookie phiên) và ở việc người ký nội bộ vẫn được chọn thuật toán —
 * `PublicSignRequest` không có trường đó, `InternalSignRequest` thì có.
 *
 * Mọi quy tắc dựng payload (rớt chuỗi rỗng, chỉ gửi `enrollment` khi chưa có
 * `agreementUuid`, luôn đủ ba khoá ảnh…) vẫn chỉ có MỘT chỗ định nghĩa là
 * `buildStartRequest`. File này chỉ cắt bớt phần mà backend tự quyết định.
 */

/* ------------------------------------------------------------------ *
 * Nguồn chữ ký dùng được cho quy trình
 * ------------------------------------------------------------------ */

/**
 * Nguồn của `GET /capabilities`, sửa lại cho đúng những gì lệnh ký của quy
 * trình cho phép quyết định:
 *
 * - `signatureModes: []` — backend ép `CO_SIGN` và xoá `targetSignatureId`. Hỏi
 *   người ký một câu mà câu trả lời chắc chắn bị ghi đè là hỏi vô ích.
 * - `visibleSignature: false` — vị trí chữ ký do signature plan của quy trình
 *   quyết định, không phải một khung kéo-thả trên trang.
 *
 * `algorithms`, `baselineLevels` và mọi cờ `requires*` GIỮ NGUYÊN: chúng thật
 * sự đi lên trong `InternalSignRequest`, và chúng là ràng buộc của nguồn chứ
 * không phải của quy trình.
 *
 * USB Token đi qua `mergeUsbTokenSource` y như màn `/sign`: nguồn đó không có
 * trong `GET /capabilities` (nó không phải nguồn của `POST /sign` — nó có cặp
 * endpoint riêng `…/sign/usb-token/prepare` → `…/complete`), nên hoặc khai ở
 * client, hoặc màn hình không có cách nào hiện lựa chọn này. Dùng lại đúng hàm
 * đó thay vì tự nối cũng là cách duy nhất để phần CẮT THUẬT TOÁN theo khả năng
 * của FPT-CA Signing Agent chạy ở đây — chọn PSS trong quy trình hỏng đúng như
 * chọn PSS ở màn `/sign`.
 */
export function adaptWorkflowSources(capabilities: SignCapabilities): SignatureSource[] {
  return mergeUsbTokenSource(capabilities).sources.map((source) => ({
    ...source,
    signatureModes: [],
    visibleSignature: false,
  }));
}

/**
 * Phương thức người soạn yêu cầu đã chọn cho ô này (`appearanceConfig.method`)
 * → id nguồn của `GET /capabilities`.
 *
 * Chỉ dùng để CHỌN SẴN, không để khoá: người soạn yêu cầu đoán phương thức của
 * người khác, và người ký mới là người biết mình cầm chứng thư loại nào.
 */
export function sourceIdForMethod(method: SignMethodId): string | undefined {
  switch (method) {
    case "PKCS12":
      return "PKCS12";
    case "MPKI_APP":
      return "REMOTE_CA:FPT_MPKI_APP";
    case "ESIGN_OTP":
      return "REMOTE_CA:FPT_SIGN_CLOUD";
    case "USB_TOKEN":
      return USB_TOKEN_SOURCE.id;
    default:
      return undefined;
  }
}

/**
 * Trạng thái form đầu tiên: nguồn đã chọn, cộng thuật toán/baseline mà người
 * soạn đã ghi vào `appearanceConfig` của ô.
 *
 * Hai giá trị đó chỉ là GỢI Ý và đi qua đúng bộ lọc của `resolveFormState`: giá
 * trị nào nguồn (hoặc định dạng tài liệu) không nhận thì rơi về mặc định của
 * chính cặp đó, chứ không được giữ lại để rồi ăn 422 lúc ký.
 */
export function initialWorkflowSignForm(
  source: SignatureSource,
  config: Pick<SlotConfig, "algorithm" | "baselineLevel"> | undefined,
  format: DocumentFormat | undefined,
): SignFormState {
  const base = resolveFormState(source, undefined, format);
  if (!config) return base;

  return resolveFormState(
    source,
    {
      ...base,
      algorithm: config.algorithm || base.algorithm,
      baselineLevel: (config.baselineLevel || base.baselineLevel) as BaselineLevel,
    },
    format,
  );
}

/* ------------------------------------------------------------------ *
 * Payload
 * ------------------------------------------------------------------ */

/**
 * Bước START — cắt `SignRequestPayload` xuống đúng hình dạng
 * `InternalSignRequest` nhận.
 *
 * Bỏ đi: `sessionId` (registry phía máy chủ giữ), `signatureMode` và
 * `targetSignatureId` (backend ép `CO_SIGN`), toạ độ (đọc từ signature plan).
 * Gửi thêm chúng không gây lỗi — backend ghi đè — nhưng nó tạo ảo giác trang
 * này kiểm soát những thứ nó không kiểm soát.
 */
export function toWorkflowSignRequest(payload: SignRequestPayload): InternalSignRequest {
  return {
    materialMode: payload.materialMode,
    step: "START",
    ...(payload.baselineLevel ? { baselineLevel: payload.baselineLevel } : {}),
    ...(payload.algorithm ? { algorithm: payload.algorithm } : {}),
    ...(payload.pkcs12 ? { pkcs12: payload.pkcs12 } : {}),
    ...(payload.remoteCa ? { remoteCa: payload.remoteCa } : {}),
  };
}

/**
 * Bước CONTINUE — KHÔNG có `sessionId`.
 *
 * Session của engine sống trong registry của máy chủ, khoá theo (yêu cầu, người
 * ký). Client không bao giờ thấy id đó, nên nó cũng không có gì để gửi lại;
 * `baselineLevel`/`algorithm` cũng vậy — chúng đã được chốt trong phiên từ bước
 * START.
 */
export function toWorkflowContinueRequest(
  materialMode: MaterialMode,
  vendor?: RemoteCaVendor | null,
): InternalSignRequest {
  return {
    materialMode,
    step: "CONTINUE",
    ...(vendor ? { remoteCa: { vendor } } : {}),
  };
}

/**
 * `SignSessionDialog` (dùng chung với màn `/sign`) chờ `SignResponse`, và năm
 * trường của nó không nhận `null`. Quy hết về `undefined` ở đúng MỘT chỗ này
 * thay vì rải `?? undefined` khắp nơi gọi.
 */
export function toSignResponse(response: InternalSignResponse): SignResponse {
  return {
    status: response.status,
    // `sessionId` cố ý KHÔNG chuyển tiếp: nó luôn `null`, và một giá trị lạ lọt
    // vào đây sẽ khiến bước CONTINUE gửi lên một id mà backend không nhận.
    nextUrl: response.nextUrl ?? undefined,
    message: response.message ?? undefined,
    expiresAt: response.expiresAt ?? undefined,
    document: response.document ?? undefined,
  };
}

/* ------------------------------------------------------------------ *
 * Ba xung đột 409
 * ------------------------------------------------------------------ */

function codeOf(error: unknown): string | undefined {
  return error instanceof SigningApiClientError ? error.code : undefined;
}

/**
 * Người cùng cấp vừa ký xong nên tài liệu đã đổi dưới chân người này.
 *
 * Diễn biến BÌNH THƯỜNG của một cấp ký song song, không phải hỏng hóc: chữ ký
 * được áp vào tài liệu tuần tự, nên người nộp sau nhận 409. Cách xử lý là tải
 * lại tài liệu + plan rồi ký lại — gộp nó vào "ký thất bại" là hiện một hộp đỏ
 * cho một người vẫn ký được ngay sau đó.
 */
export function isDocumentChanged(error: unknown): boolean {
  return codeOf(error) === "SIGNING_DOCUMENT_CHANGED";
}

/**
 * Đã có một phiên engine đang mở cho chính ô này.
 *
 * Hay gặp nhất khi người ký tải lại trang giữa lúc chờ OTP: phiên nằm ở máy chủ
 * nên nó SỐNG SÓT qua lần tải lại đó, và đường ra duy nhất là CONTINUE. START
 * thêm lần nữa chỉ nhận lại đúng mã này.
 */
export function isAlreadyStarted(error: unknown): boolean {
  return codeOf(error) === "SIGNING_ALREADY_STARTED";
}

/** CONTINUE mà phiên đã hết/đã bị giải phóng — chỉ còn đường ký lại từ đầu. */
export function isNotStarted(error: unknown): boolean {
  return codeOf(error) === "SIGNING_NOT_STARTED";
}
