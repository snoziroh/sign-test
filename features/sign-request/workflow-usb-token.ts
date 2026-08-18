"use client";

import type { UsbTokenJob } from "@/lib/types/signing";
import type { InternalUsbTokenJob } from "@/lib/types/workflow";
import { describeAlgorithm, type AlgorithmCatalog } from "@/features/signing/signature-algorithm";
import type { UsbTokenTransport } from "@/features/signing/usb-token-transport";
import { completeWorkflowUsbTokenJob, prepareWorkflowUsbTokenJob } from "./workflow-api";
import { toSignResponse } from "./workflow-signing";

/**
 * Luồng USB Token của MỘT Ô TRONG QUY TRÌNH, dưới đúng hình dạng
 * `UsbTokenTransport` mà `UsbTokenSignDialog` đang dùng ở màn `/sign`.
 *
 * Nhờ vậy hộp thoại ký là một, và ba thứ khó của luồng này — chọn chứng thư
 * trước khi dựng digest, giữ job theo thumbprint, không bao giờ tự chạy lại một
 * chặng nào — không bị chép lại lần thứ hai.
 *
 * Khác luồng `/sign` đúng ba điểm, và cả ba đều do BACKEND quyết định:
 *
 * 1. Không có tệp nào đi lên: tài liệu là bản trong kho của yêu cầu ký.
 * 2. Không gửi `signerDisplayName`, `baselineLevel`, `signatureMode` hay toạ độ.
 *    Tên lấy từ CN của chính chứng thư gửi lên, vị trí lấy từ signature plan,
 *    loại ký bị ép `CO_SIGN`. Gửi thêm chỉ tạo ảo giác trang này kiểm soát
 *    những thứ nó không kiểm soát.
 * 3. Người ký phải đúng lượt (`requireTurn`) ở CẢ hai bước, và tài liệu phải y
 *    nguyên như lúc prepare. Ba mã 409 vì thế xuất hiện được ở đây y như ở
 *    `POST …/sign`, và dùng chung nhánh xử lý trong `workflow-signing.ts`.
 */
export function workflowUsbTokenTransport(input: {
  signingRequestId: string;
  /** Thuật toán đã chốt lúc bấm ký — xem `InternalUsbTokenPrepareRequest.algorithm`. */
  algorithm: string;
  catalog?: AlgorithmCatalog;
  /**
   * Token đã giành ở "Ký ngay" (`acquireInternalSigningLease`). USB Token dùng
   * LẠI đúng token này ở bước prepare — không có bước START riêng để giành lần
   * hai, và giành lần hai chỉ nhận về một lượt ký khác của chính người này.
   */
  leaseToken?: string;
}): UsbTokenTransport {
  const { signingRequestId, algorithm, catalog, leaseToken } = input;

  return {
    prepare: async (certificate, signal) => {
      const job = await prepareWorkflowUsbTokenJob(
        signingRequestId,
        { certificateBase64: certificate.base64Encode, algorithm },
        leaseToken,
        signal,
      );
      return toUsbTokenJob(job, algorithm, catalog);
    },
    complete: (jobId, payload, signal) =>
      completeWorkflowUsbTokenJob(signingRequestId, jobId, payload, signal).then(toSignResponse),
  };
}

/**
 * `InternalUsbTokenJob` → `UsbTokenJob` của hộp thoại. Chỉ điền vào hai chỗ hợp
 * đồng bàn giao không nói tới:
 *
 * - `digestAlgorithm` — agent BẮT BUỘC có (`algDigest`). Ưu tiên giá trị backend
 *   trả về; thiếu thì suy từ `jcaSignatureAlgorithm` (`SHA256withRSA` → `SHA256`),
 *   cuối cùng mới từ chính `algorithm` đã gửi lên. KHÔNG mặc định SHA-256: đoán
 *   sai ở đây là agent ký một khối byte khác cái backend chờ, và bước complete
 *   trả `422` sau khi người ký đã nhập PIN.
 * - `signatureAlgorithm` — chính thuật toán vừa gửi, vì backend đã dựng job theo
 *   nó. Có nó thì chốt chặn "agent 1.3.1 chỉ ký PKCS#1" trong hộp thoại chạy
 *   được ở luồng này y như ở màn `/sign`.
 */
function toUsbTokenJob(
  job: InternalUsbTokenJob,
  algorithm: string,
  catalog?: AlgorithmCatalog,
): UsbTokenJob {
  return {
    jobId: job.jobId,
    digestBase64: job.digestBase64,
    digestAlgorithm:
      job.digestAlgorithm?.trim() ||
      digestFromJca(job.jcaSignatureAlgorithm) ||
      // `SHA-256` của catalog → `SHA256` của agent.
      describeAlgorithm(algorithm, catalog).digestAlgorithm.replace("-", ""),
    signatureAlgorithm: algorithm,
    jcaSignatureAlgorithm: job.jcaSignatureAlgorithm,
    expiresAt: job.expiresAt,
  };
}

/** `SHA256withRSAandMGF1` → `SHA256`. Tên lạ thì trả `undefined` để rơi xuống mức sau. */
function digestFromJca(jca?: string): string | undefined {
  return /^SHA-?(1|224|256|384|512)/i.exec(jca ?? "")?.[0].replace("-", "").toUpperCase();
}
