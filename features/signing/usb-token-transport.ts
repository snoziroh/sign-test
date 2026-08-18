"use client";

import type {
  SignResponse,
  UsbTokenCompleteRequest,
  UsbTokenJob,
  UsbTokenJobRequest,
} from "@/lib/types/signing";
import { completeUsbTokenJob, createUsbTokenJob } from "./sign-api";
import type { FptCertificate } from "./usb-token-agent";

/**
 * Hai lời gọi mạng của một lần ký bằng USB Token, tách khỏi `UsbTokenSignDialog`.
 *
 * Vì sao cần lớp này: cùng một luồng năm chặng (kết nối agent → chọn chứng thư →
 * dựng digest → nhập PIN → nộp chữ ký) hiện chạy trên BA màn hình, và chỉ khác
 * nhau đúng ở hai endpoint được gọi:
 *
 * - `/sign` và `/external-sign` — `POST /api/v1/usb-token/signing-jobs` với tệp
 *   đang nằm trong trình duyệt (`documentUsbTokenTransport` ngay dưới).
 * - Ký một ô của quy trình — `POST …/sign/usb-token/prepare`, không có tệp nào
 *   đi lên, xem `features/sign-request/workflow-usb-token.ts`.
 *
 * Mọi thứ còn lại (thứ tự chặng, giữ job theo thumbprint, đồng hồ hết hạn, chặn
 * scheme agent không ký được) là NHƯ NHAU, nên hộp thoại vẫn là một.
 *
 * `prepare` nhận cả chứng thư chứ không chỉ vài trường của nó: luồng `/sign` cần
 * CN để in lên ô chữ ký, luồng quy trình cần base64 DER để backend tự đọc CN —
 * cắt sẵn ở đây là ép mỗi bên phải sửa lớp này khi hợp đồng bên kia đổi.
 */
export interface UsbTokenTransport {
  /**
   * Dựng job và trả về digest cần ký. `digestAlgorithm` phải có mặt trong kết
   * quả: nó đi thẳng vào `algDigest` của agent.
   */
  prepare(certificate: FptCertificate, signal?: AbortSignal): Promise<UsbTokenJob>;
  complete(
    jobId: string,
    payload: UsbTokenCompleteRequest,
    signal?: AbortSignal,
  ): Promise<SignResponse>;
}

/**
 * Luồng ký một tệp ĐANG CÓ trong trình duyệt — màn `/sign` và trang ký công
 * khai.
 *
 * `signerDisplayName` điền tại đây, và chỉ tại đây: nó là CN của chứng thư người
 * ký vừa chọn (rơi về subject DN khi CN rỗng), nên không thể biết trước lúc
 * dựng `request`. Xem `buildUsbTokenJobRequest`.
 */
export function documentUsbTokenTransport(
  file: File,
  request: Omit<UsbTokenJobRequest, "signerDisplayName">,
): UsbTokenTransport {
  return {
    prepare: (certificate, signal) =>
      createUsbTokenJob(
        file,
        {
          ...request,
          signerDisplayName: certificate.commonName?.trim() || certificate.subjectDN,
        },
        signal,
      ),
    complete: (jobId, payload, signal) => completeUsbTokenJob(jobId, payload, signal),
  };
}
