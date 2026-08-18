"use client";

import type {
  PublicMaterialMode,
  PublicRemoteCaVendor,
  PublicSignRequest,
  PublicSignResponse,
} from "@/lib/types/external-signing";
import type { MaterialMode, RemoteCaVendor, SignRequestPayload, SignResponse } from "@/lib/types/signing";

/**
 * Cầu nối giữa `SignRequestPayload` (dựng bằng `buildStartRequest` của
 * `features/signing/sign-configuration.ts`, dùng CHUNG với màn `/sign`) và hợp
 * đồng hẹp hơn của `PublicSignRequest`/`PublicSignResponse`
 * (`lib/types/external-signing.ts`).
 *
 * Luồng công khai dùng lại NGUYÊN VẸN `SignFormState`/`resolveFormState`/
 * `validateSignForm`/`buildStartRequest`/`findSource`/`isPkcs12`/`isMpki`/
 * `isSignCloud`/`sourceLabel` — mọi quy tắc dựng và kiểm payload (rớt chuỗi
 * rỗng, chỉ gửi `enrollment` khi chưa có `agreementUuid`, luôn đủ ba khoá
 * ảnh…) chỉ có một chỗ định nghĩa. File này CHỈ cắt bớt phần `SignRequestPayload`
 * mà `PublicSignRequest` không nhận — `sessionId`, `algorithm`, `signatureMode`,
 * `targetSignatureId`, toạ độ, `documentName` — vì backend đọc lại tất cả từ
 * phiên công khai và mọi giá trị gửi thêm chỉ tạo ảo giác trang này kiểm soát
 * chúng.
 */

/** Bước START — cắt `SignRequestPayload` xuống đúng hình dạng `PublicSignRequest` chấp nhận. */
export function toPublicSignRequest(payload: SignRequestPayload): PublicSignRequest {
  const request: PublicSignRequest = {
    materialMode: payload.materialMode as PublicMaterialMode,
    step: "START",
    baselineLevel: payload.baselineLevel,
  };

  if (payload.pkcs12) {
    request.pkcs12 = {
      password: payload.pkcs12.password,
      alias: payload.pkcs12.alias,
    };
    return request;
  }

  if (payload.remoteCa) {
    const { vendor, username, credentialId, agreementUuid, enrollment } = payload.remoteCa;
    request.remoteCa = {
      vendor: vendor as PublicRemoteCaVendor,
      ...(username ? { username } : {}),
      ...(credentialId ? { credentialId } : {}),
      ...(agreementUuid ? { agreementUuid } : {}),
      ...(enrollment
        ? {
            enrollment: {
              mobileNo: enrollment.mobileNo,
              email: enrollment.email,
              // `FptAgreementDetails` có hai trường tuỳ chọn (`location`,
              // `stateOrProvince`) mà `Record<string, string>` của hợp đồng công
              // khai không khai báo optional — hình dạng runtime vẫn khớp
              // (buildStartRequest luôn bỏ hẳn khoá khi rỗng), chỉ khác ở kiểu.
              agreementDetails: enrollment.agreementDetails as unknown as Record<string, string>,
            },
          }
        : {}),
    };
  }

  return request;
}

/** Bước CONTINUE — không có `sessionId`: phiên sống trong cookie, không phải một giá trị client giữ. */
export function toPublicContinueRequest(
  materialMode: MaterialMode,
  vendor?: RemoteCaVendor,
): PublicSignRequest {
  return {
    materialMode: materialMode as PublicMaterialMode,
    step: "CONTINUE",
    ...(vendor ? { remoteCa: { vendor: vendor as PublicRemoteCaVendor } } : {}),
  };
}

/**
 * `SignSessionDialog` (dùng chung với màn `/sign`) chờ `SignResponse` — năm
 * trường còn lại của nó không nhận `null`. `PublicSignResponse` cho `null` ở
 * cả năm vì đó là kiểu backend công khai trả về; quy hết về `undefined` ở
 * đúng MỘT chỗ này thay vì rải `?? undefined` khắp nơi gọi.
 */
export function toSignResponse(response: PublicSignResponse): SignResponse {
  return {
    status: response.status,
    sessionId: response.sessionId ?? undefined,
    nextUrl: response.nextUrl ?? undefined,
    message: response.message ?? undefined,
    expiresAt: response.expiresAt ?? undefined,
    document: response.document ?? undefined,
  };
}
