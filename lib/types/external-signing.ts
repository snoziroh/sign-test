/**
 * Contract của luồng KÝ NGOÀI HỆ THỐNG — `docs/EXTERNAL_SIGNING_FRONTEND_INTEGRATION.md`
 * của signing-service.
 *
 * Bốn điều định hình toàn bộ file này, và cả màn `/external-sign`:
 *
 * 1. Link token CHỈ dùng một lần, để đổi lấy một phiên ngắn hạn. Sau
 *    `POST /signing-links/exchange` frontend không bao giờ gửi lại token nữa —
 *    phiên nằm trong cookie `HttpOnly` do backend đặt.
 * 2. Client KHÔNG gửi `signingRequestId`, `signerId`, tài liệu, hay toạ độ chữ ký
 *    khi ký. Backend đọc lại tất cả từ phiên. Vì thế `PublicSignRequest` dưới đây
 *    hẹp hơn `SignRequestPayload` của màn `/sign` — thiếu đúng những trường mà
 *    người ngoài hệ thống không được phép quyết định.
 * 3. Mọi phản hồi của `/sign` có cùng hình dạng, kể cả khi còn dở dang. Client rẽ
 *    nhánh theo `status`, không theo mã HTTP.
 * 4. Thân lỗi KHÁC problem+json của `/api/v1/*`: nó là
 *    `{ timestamp, status, code, message, path }`. `code` là thứ duy nhất được rẽ
 *    nhánh — xem `EXTERNAL_SIGNING_ERROR_CODES`.
 *
 * BACKEND CHƯA CÓ. Tài liệu tự nói đây là "contract mục tiêu": các endpoint
 * `/api/public/**` chưa tồn tại trong signing-service tại thời điểm viết. Kiểu ở
 * đây theo đúng tài liệu để lúc backend lên chỉ còn việc xoá chế độ mô phỏng
 * (`features/external-signing/demo-session.ts`), không phải viết lại màn hình.
 */

import type { BaselineLevel, SignedDocument } from "./signing";

/* ------------------------------------------------------------------ *
 * Quản trị link — phía NGƯỜI TẠO yêu cầu ký (§4)
 * ------------------------------------------------------------------ */

/**
 * Trạng thái của một link ký.
 *
 * Bốn giá trị này không phải một vòng đời tuyến tính: `ACTIVE` đi tới `CONSUMED`
 * (người ký đã ký), `REVOKED` (bị thu hồi, kể cả tự động khi tạo link mới) hoặc
 * `EXPIRED` (quá `expiresAt`). Không có đường quay lại `ACTIVE` — link mới là một
 * bản ghi mới với token mới.
 */
export type PublicSigningLinkStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "CONSUMED";

/**
 * Một link ký của đúng một signer.
 *
 * `url` là trường quan trọng nhất và cũng là trường dễ dùng sai nhất: nó **chỉ có
 * giá trị ở phản hồi của lần TẠO**. API danh sách luôn trả `null` — backend không
 * lưu token thô, chỉ lưu hash. Vì thế:
 *
 * - Hiện nút sao chép ngay khi tạo xong, không đợi tải lại danh sách.
 * - Giữ giá trị đó trong state của component, KHÔNG ghi vào `localStorage`, log,
 *   analytics hay error tracker.
 * - Đừng viết giao diện nào giả định sẽ đọc lại được `url` sau này.
 *
 * `tokenHint` là thứ duy nhất còn nhận dạng được một link sau đó — dùng để người
 * tạo đối chiếu "link tôi vừa gửi" với dòng trong danh sách. Dịch vụ hiện trả về
 * ĐUÔI của token (8 ký tự cuối), không phải đầu; đừng dựng giao diện nào cắt chuỗi
 * token để so khớp, chỉ so nguyên giá trị này.
 */
export interface PublicSigningLink {
  id: string;
  signingRequestId: string;
  signerId: string;
  tokenHint: string;
  status: PublicSigningLinkStatus;
  expiresAt: string;
  revokedAt: string | null;
  consumedAt: string | null;
  /**
   * `null` được: dịch vụ hiện KHÔNG điền trường này trong phản hồi của lần tạo (đo
   * được trên bản đang chạy), dù tài liệu mô tả nó là một mốc thời gian. Vì thế
   * không được dùng nó làm khoá sắp xếp duy nhất — xem `compareLinksNewestFirst`.
   */
  createdAt: string | null;
  /** Chỉ khác `null` ở phản hồi của `POST …/public-links`. */
  url: string | null;
}

/**
 * Mới nhất trước.
 *
 * Ưu tiên `createdAt`, rơi về `expiresAt` khi thiếu — hai link liên tiếp của cùng
 * một signer có TTL bằng nhau nên thứ tự hạn dùng phản ánh đúng thứ tự phát. Bản
 * ghi không có mốc nào bị đẩy xuống cuối thay vì làm cả phép so sánh trả `NaN`,
 * thứ khiến `Array.sort` cho ra một thứ tự tuỳ ý.
 */
export function compareLinksNewestFirst(
  a: PublicSigningLink,
  b: PublicSigningLink,
): number {
  return momentOf(b) - momentOf(a);
}

function momentOf(link: PublicSigningLink): number {
  const created = link.createdAt ? new Date(link.createdAt).getTime() : Number.NaN;
  if (!Number.isNaN(created)) return created;

  const expires = new Date(link.expiresAt).getTime();
  return Number.isNaN(expires) ? Number.NEGATIVE_INFINITY : expires;
}

/** Bỏ trống `expiresAt` thì backend dùng TTL mặc định của nó. */
export interface CreatePublicSigningLinkBody {
  expiresAt?: string;
}

/**
 * Link còn dùng được không. `ACTIVE` mà đã quá hạn vẫn tính là hết hạn: backend
 * cập nhật `status` khi có ai chạm tới bản ghi, nên một dòng vừa đọc về có thể còn
 * `ACTIVE` trong khi `expiresAt` đã ở quá khứ. Tin vào mốc thời gian, không chỉ
 * tin vào nhãn.
 */
export function isLinkUsable(link: PublicSigningLink): boolean {
  return link.status === "ACTIVE" && new Date(link.expiresAt).getTime() > Date.now();
}

/* ------------------------------------------------------------------ *
 * Phiên ký công khai
 * ------------------------------------------------------------------ */

export type PublicSignerStatus = "PENDING" | "SIGNED" | "DECLINED";

/**
 * Những gì người ký ngoài hệ thống được biết về yêu cầu ký.
 *
 * Cố ý KHÔNG có danh sách người ký khác, không có lịch sử, không có người tạo:
 * link chỉ thuộc về đúng một signer, và mở rộng dữ liệu ở đây là mở rộng thứ mà
 * một link bị chuyển tiếp cho người khác làm lộ ra.
 *
 * `documentUrl` / `signaturePlanUrl` là đường dẫn của BACKEND. Trang public
 * không gọi thẳng chúng — mọi lời gọi đi qua proxy `/api/public/*` của ứng dụng
 * này để cookie phiên nằm cùng origin với trang.
 */
export interface PublicSigningContext {
  signingRequestId: string;
  signerId: string;
  title: string;
  signerLabel: string | null;
  signingOrder: number;
  signerStatus: PublicSignerStatus;
  documentName: string;
  documentContentType: string;
  documentSha256: string;
  documentUrl: string;
  signaturePlanUrl: string;
}

/**
 * Kết quả đổi link token.
 *
 * `csrfToken` phải được giữ ở phía client (state, hoặc `sessionStorage` để chịu
 * được F5) và gắn vào header `X-Public-Signing-CSRF` của MỌI lệnh ký. Cookie
 * phiên là `HttpOnly` nên JS không đọc được — cặp cookie + CSRF là thứ duy nhất
 * chứng minh lệnh ký đến từ chính trang này.
 */
export interface PublicSigningExchangeResponse {
  csrfToken: string;
  sessionExpiresAt: string;
  context: PublicSigningContext;
}

/* ------------------------------------------------------------------ *
 * Signature plan
 * ------------------------------------------------------------------ */

/**
 * Một khung chữ ký. Toạ độ đo bằng PDF points, gốc góc DƯỚI-TRÁI — cùng quy ước
 * với `SignAppearanceRequest` của `/api/v1/sign`, KHÁC quy ước 0..1 gốc trên-trái
 * của `SignatureSlotRequest` bên phân hệ mẫu. Nhầm hai quy ước này là vẽ overlay
 * lộn ngược trang.
 */
export interface PublicSignatureSlot {
  slotCode: string;
  title: string | null;
  /** Đánh số từ 1. */
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * `SigningRequestSignaturePlanResponse` của backend, đọc qua phiên công khai.
 *
 * Frontend dùng nó CHỈ để chỉ chỗ: đánh dấu trang có chữ ký, cuộn tới ô, vẽ
 * overlay. Toạ độ KHÔNG được gửi lại trong lệnh ký — backend đọc lại plan và ghi
 * đè mọi thứ client gửi, nên gửi đi chỉ tạo ảo giác là client kiểm soát vị trí.
 *
 * `documentContentUrl` dùng chung với API nội bộ (đòi `X-Username`) nên trang
 * public KHÔNG gọi nó; tài liệu vẫn tải qua `/signing-session/document`.
 */
export interface PublicSignaturePlan {
  signingRequestId: string;
  signerId: string;
  userId: string;
  fileName: string;
  format: string;
  documentSha256: string;
  documentContentUrl: string;
  signatures: PublicSignatureSlot[];
}

/* ------------------------------------------------------------------ *
 * POST /api/public/signing-session/sign
 * ------------------------------------------------------------------ */

export type PublicSignStep = "START" | "CONTINUE";

/**
 * Chỉ hai nguồn chữ ký mở cho người ngoài hệ thống. `USB_TOKEN` không có mặt: nó
 * cần FPT-CA Signing Agent chạy trên máy người ký và đi qua cặp endpoint nội bộ
 * riêng, không qua `/sign`.
 */
export type PublicMaterialMode = "PKCS12" | "REMOTE_CA";

export type PublicRemoteCaVendor = "FPT_MPKI_APP" | "FPT_SIGN_CLOUD";

export interface PublicPkcs12Material {
  password: string;
  /** Bỏ trống thì provider tự lấy alias đầu tiên có private key. */
  alias?: string | null;
}

export interface PublicRemoteCaMaterial {
  vendor: PublicRemoteCaVendor;
  /** MPKI App. */
  username?: string;
  /** MPKI App — bỏ trống chỉ khi người ký có đúng một credential. */
  credentialId?: string;
  /** eSign Cloud — có giá trị thì `enrollment` bị bỏ qua. */
  agreementUuid?: string;
  /** eSign Cloud — theo contract `FptEnrollmentRequest` của `/api/v1/sign`. */
  enrollment?: {
    mobileNo: string;
    email: string;
    agreementDetails: Record<string, string>;
  };
}

/**
 * Part `request` của multipart.
 *
 * KHÔNG có `sessionId`: backend đã gắn session của signing-engine vào phiên công
 * khai, và một id do client gửi lên là một id client không có quyền chọn. Cũng
 * không có `page/x/y/width/height`, không có `signatureMode`,
 * `targetSignatureId` — thứ tự ký và vị trí đều do plan quyết định.
 */
export interface PublicSignRequest {
  materialMode: PublicMaterialMode;
  step: PublicSignStep;
  /** Chỉ gửi ở `START`. */
  baselineLevel?: BaselineLevel;
  pkcs12?: PublicPkcs12Material;
  remoteCa?: PublicRemoteCaMaterial;
}

export type PublicSignStatus = "COMPLETED" | "PENDING_IDENTITY" | "PENDING_OTP";

export interface PublicSignResponse {
  status: PublicSignStatus;
  /** Luôn `null` — giữ trong kiểu vì backend còn trả khoá này. */
  sessionId?: string | null;
  /** Trang của CA mà người ký phải mở: xác nhận danh tính, rồi nhập OTP. */
  nextUrl?: string | null;
  message?: string | null;
  expiresAt?: string | null;
  /**
   * Chỉ có khi `COMPLETED`. Backend đã lưu tệp vào workflow rồi, nên trang public
   * KHÔNG bắt buộc giữ lại — chỉ dùng để người ký tải một bản cho mình.
   */
  document?: SignedDocument | null;
}

/* ------------------------------------------------------------------ *
 * Lỗi
 * ------------------------------------------------------------------ */

/** `{ timestamp, status, code, message, path }` — không phải RFC 7807. */
export interface ExternalSigningErrorBody {
  timestamp?: string;
  status?: number;
  code?: string;
  message?: string;
  path?: string;
}

/**
 * Mã lỗi tài liệu đã chốt. Chỉ những mã ở đây được rẽ nhánh; mã lạ rơi về câu
 * mặc định chứ không làm trắng màn hình.
 */
export const EXTERNAL_SIGNING_ERROR_CODES = [
  "EXTERNAL_SIGNING_TOKEN_INVALID",
  "EXTERNAL_SIGNING_FORBIDDEN",
  "EXTERNAL_SIGNING_LINK_EXPIRED",
  "EXTERNAL_SIGNING_UNKNOWN_ERROR",
  "SIGNER_NOT_CURRENT",
  "SIGNING_DOCUMENT_CHANGED",
  "SIGNING_ALREADY_STARTED",
  "SIGNING_NOT_STARTED",
  "SIGNING_LEASE_LOCKED",
  "SIGNING_LEASE_LOST",
  "SIGNER_ALREADY_PROCESSED",
  "SIGN_REQUEST_INVALID",
  "SIGNED_DOCUMENT_MISSING",
] as const;

export type ExternalSigningErrorCode =
  (typeof EXTERNAL_SIGNING_ERROR_CODES)[number];

/**
 * Lỗi làm PHIÊN chết hẳn: link sai, không đủ quyền, hoặc hết hạn. Gặp một trong
 * ba nhóm này thì phải xoá CSRF và chuyển sang màn "link không dùng được" — thử
 * lại bằng cùng cookie chỉ ra đúng lỗi đó lần nữa.
 */
export function isSessionFatal(status: number): boolean {
  return status === 401 || status === 403 || status === 410;
}
