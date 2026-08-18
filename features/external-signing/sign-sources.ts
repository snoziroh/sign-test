import type { DocumentFormat, SignatureSource } from "@/lib/types/signing";
import { USB_TOKEN_SOURCE } from "@/features/signing/usb-token-source";

/**
 * Bốn nguồn chữ ký mở cho người ký NGOÀI hệ thống, dựng dưới đúng hình dạng
 * `SignatureSource` của `GET /capabilities` (nội bộ) — để dùng thẳng các hàm
 * thuần của `features/signing/sign-configuration.ts` (`resolveFormState`,
 * `validateSignForm`, `findSource`, `isPkcs12`/`isMpki`/`isSignCloud`,
 * `sourceLabel`, `buildSignSteps`, `buildStartRequest`, …) mà không phải viết
 * lại logic đó cho luồng công khai.
 *
 * **Đây vẫn là một hằng số ở client, và đó là một món nợ có ý thức** — y hệt lý
 * do `EXTERNAL_METHODS` từng tồn tại. Luồng công khai KHÔNG có endpoint
 * `GET /capabilities` tương đương: `/api/public/signing-session/sign` chưa có
 * một `GET .../capabilities` đi cùng, và tài liệu tích hợp còn để ngỏ câu
 * "phương thức nào được phép cho người ngoài hệ thống". Khi backend mở endpoint
 * đó: xoá file này, dựng `SignatureSource[]` từ phản hồi thật.
 *
 * Khác `GET /capabilities` thật ở bốn điểm, cả bốn đều PHẢN ÁNH ĐÚNG những gì
 * `PublicSignRequest` (xem `lib/types/external-signing.ts`) không nhận:
 *
 * - `algorithms: [EXTERNAL_ALGORITHM]`, không có `algorithmsByFormat` — chỉ một
 *   giá trị giả để `algorithmsFor()`/`validateSignForm()` luôn thấy thuật toán
 *   "đã chọn" hợp lệ. Người ký ngoài hệ thống không được hỏi thuật toán (đã xác
 *   nhận trong lúc lên kế hoạch tính năng này) — `PublicSignRequest` không có
 *   trường đó, và giá trị giả không bao giờ được gửi đi (`toPublicSignRequest`
 *   loại nó khỏi payload).
 * - `baselineLevels: ["T"]` — chỉ một mức, cố định, không hỏi.
 * - `signatureModes: []` — không có CO_SIGN/COUNTER_SIGN.
 * - `visibleSignature: false` — vị trí chữ ký cố định theo signature plan của
 *   workflow (overlay chỉ-xem ở `ExternalSigningDocumentView`), không kéo-thả
 *   được như màn `/sign`.
 *
 * Bốn điểm trên áp cho ba nguồn đi qua `/sign`. `USB_TOKEN` là ngoại lệ ở đúng
 * một điểm — thuật toán — và lý do nằm ngay trên khai báo của nó ở dưới.
 */

/** Giá trị thuật toán giả — không bao giờ rời khỏi trình duyệt, xem ghi chú trên. */
const EXTERNAL_ALGORITHM = "EXTERNAL_DEFAULT";

const EXTERNAL_DOCUMENT_FORMATS: DocumentFormat[] = [
  "PDF",
  "XML",
  "WORD",
  "EXCEL",
  "POWERPOINT",
];

export const EXTERNAL_SIGN_SOURCES: SignatureSource[] = [
  {
    id: "PKCS12",
    materialMode: "PKCS12",
    vendor: null,
    documentFormats: EXTERNAL_DOCUMENT_FORMATS,
    algorithms: [EXTERNAL_ALGORITHM],
    defaultAlgorithm: EXTERNAL_ALGORITHM,
    baselineLevels: ["T"],
    signatureModes: [],
    visibleSignature: false,
    requiresUploadedKeyFile: true,
    interactionModel: "NONE",
  },
  {
    id: "REMOTE_CA:FPT_MPKI_APP",
    materialMode: "REMOTE_CA",
    vendor: "FPT_MPKI_APP",
    documentFormats: EXTERNAL_DOCUMENT_FORMATS,
    algorithms: [EXTERNAL_ALGORITHM],
    defaultAlgorithm: EXTERNAL_ALGORITHM,
    baselineLevels: ["T"],
    signatureModes: [],
    visibleSignature: false,
    /*
     * Bỏ trống `credentialId` CHỈ hợp lệ khi người ký có đúng một chứng thư — y
     * hệt màn `/sign`, và điều đó chỉ biết được sau khi đã tải danh sách. Trang
     * gọi `GET /remote-ca/mpki/credentials` (endpoint NỘI BỘ, cùng món nợ với
     * cặp endpoint USB Token dưới đây) từ chính tên đăng nhập người ký vừa gõ.
     */
    requiresCredentialSelection: true,
    interactionModel: "APP_CONFIRMATION",
    expectedWaitSeconds: 300,
  },
  {
    id: "REMOTE_CA:FPT_SIGN_CLOUD",
    materialMode: "REMOTE_CA",
    vendor: "FPT_SIGN_CLOUD",
    documentFormats: EXTERNAL_DOCUMENT_FORMATS,
    algorithms: [EXTERNAL_ALGORITHM],
    defaultAlgorithm: EXTERNAL_ALGORITHM,
    baselineLevels: ["T"],
    signatureModes: [],
    visibleSignature: false,
    requiresEnrollment: true,
    interactionModel: "REDIRECT_OTP",
  },
  /**
   * FPT USB Token — nguồn duy nhất ở đây KHÔNG đi qua `/sign`.
   *
   * Nó dùng lại nguyên khai báo của màn `/sign` (`USB_TOKEN_SOURCE`) vì luồng
   * cũng là nguyên luồng đó: backend dựng digest ở `/usb-token/signing-jobs`,
   * trình duyệt gọi thẳng FPT-CA Signing Agent trên máy người ký, rồi nộp chữ ký
   * ở `.../complete`. Người ký ngoài hệ thống chạy được vì tài liệu cần ký đã
   * nằm sẵn trong trình duyệt (`useExternalSigningDocument`).
   *
   * Ba trường bị ghi đè cho khớp với luồng công khai — cùng lý do với ba nguồn
   * trên: người ký ngoài hệ thống không được hỏi baseline, loại ký, hay vị trí
   * chữ ký. `algorithms` thì GIỮ NGUYÊN, khác hẳn ba nguồn kia: job USB Token
   * thật sự chở `algorithm` lên endpoint tạo job, nên đặt một giá trị giả ở đây
   * là dựng một job chắc chắn hỏng.
   *
   * **Món nợ cùng loại với chính file này:** cặp endpoint job là endpoint NỘI BỘ,
   * và `UsbTokenSignDialog` gọi thẳng chúng qua `features/signing/sign-api.ts`.
   * Ngày có bản công khai tương đương, chỉ hai lời gọi đó phải đổi — hình dạng
   * nguồn ở đây không phải sửa gì.
   */
  {
    ...USB_TOKEN_SOURCE,
    baselineLevels: ["T"],
    signatureModes: [],
    visibleSignature: false,
  },
];
