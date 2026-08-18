/**
 * Contract của phân hệ QUY TRÌNH KÝ (`/api/templates`, `/api/documents`,
 * `/api/signing-requests`) — khác hẳn phân hệ ký một mình trong
 * `lib/types/signing.ts`.
 *
 * Ba điều định hình file này, và cả ba đều là ngữ nghĩa của backend chứ không
 * phải quy ước hiển thị:
 *
 * 1. **Mọi endpoint đòi `X-Username`.** Dịch vụ không có xác thực, nên người
 *    thao tác là một chuỗi do client khai. Nó đi vào audit log và vào quyền đọc
 *    tài liệu, nên không phải thứ bỏ trống được.
 * 2. **Yêu cầu ký nhận TÀI LIỆU ĐÃ CHỐT, không nhận tệp.** Hai đường đưa tài
 *    liệu vào: `POST /api/documents` (tệp tự tải lên) hoặc
 *    `POST /api/templates/{id}/previews` (mẫu đã điền biến, server tự dựng PDF).
 *    Từ `POST /api/signing-requests` trở đi hai đường nhập làm một.
 * 3. **Toạ độ chữ ký chuẩn hoá 0..1, gốc góc TRÊN-TRÁI.** Cùng hệ với PDF
 *    preview mà frontend đang hiển thị. Engine ký dùng điểm PDF gốc dưới-trái;
 *    việc quy đổi là của backend, client tuyệt đối không tự tính lại.
 *
 * NGOẠI LỆ của điểm (3): `SigningRequestSignaturePlan` ở cuối file — nó nói bằng
 * điểm PDF gốc DƯỚI-TRÁI, vì nó là bản kế hoạch dành cho engine ký chứ không
 * phải cấu hình dành cho người soạn. Xem chú thích tại chỗ.
 */

import type {
  BaselineLevel,
  MaterialMode,
  Pkcs12MaterialRequest,
  RemoteCaSignRequest,
  SignStatus,
  SignedDocument,
} from "./signing";

/* ------------------------------------------------------------------ *
 * Tài liệu tự tải lên
 * ------------------------------------------------------------------ */

/** Ba định dạng `POST /api/documents` nhận. Hẹp hơn `DocumentFormat` của phân hệ ký. */
export type DocumentFileType = "PDF" | "DOCX" | "XLSX";

/**
 * `pageCount` là `null` với DOCX/XLSX: backend chưa convert sang PDF nên chưa
 * biết số trang. Chỉ tài liệu PDF mới đặt được vị trí chữ ký.
 */
export interface DocumentArtifact {
  documentArtifactId: string;
  fileName: string;
  fileType: DocumentFileType;
  contentType: string;
  sha256: string;
  sizeBytes: number;
  pageCount: number | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ *
 * Mẫu
 * ------------------------------------------------------------------ */

export type TemplateStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type TemplateVersionStatus = "DRAFT" | "PUBLISHED";
export type TemplateSigningMode = "SEQUENTIAL";

/**
 * Kiểu dữ liệu của một ô phải điền. Rộng hơn bộ mà form hiện dựng được — xem
 * `server-template.ts` để biết cái nào rơi về ô chữ thường.
 */
export type TemplateDataType =
  | "TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "DECIMAL"
  | "DATE"
  | "DATETIME"
  | "BOOLEAN"
  | "SELECT";

/**
 * Ai điền giá trị cho ô này.
 *
 * Chỉ `MANUAL` mới thành ô nhập trên màn hình: `SYSTEM` do backend điền (ngày
 * tháng, số hiệu), `SIGNER` lấy từ hồ sơ người ký, `CONSTANT`/`EXPRESSION` là
 * giá trị dựng sẵn của mẫu. Hỏi người dùng bốn loại sau là hỏi một câu mà câu
 * trả lời sẽ bị bỏ đi.
 */
export type TemplateFieldSourceType =
  | "MANUAL"
  | "SYSTEM"
  | "SIGNER"
  | "CONSTANT"
  | "EXPRESSION";

export type TemplateSignerSelectionType = "ANY_USER";
export type SignatureCoordinateSystem = "NORMALIZED_TOP_LEFT";
export type SignatureSlotPlacementMode = "COORDINATE";

export interface TemplateListItem {
  templateId: string;
  code: string;
  name: string;
  description: string | null;
  status: TemplateStatus;
  currentVersionId: string | null;
  versionNo: number | null;
  fieldCount: number;
  signerRoleCount: number;
  /** `null` khi bản dựng PDF chưa có — thẻ mẫu phải chịu được chuyện đó. */
  previewContentUrl: string | null;
  updatedAt: string;
}

/** Phân trang của phân hệ này: `items`/`page`/`size`, KHÔNG phải `content`/`pageable` của Spring Data. */
export interface TemplateListPage {
  items: TemplateListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Một lần xuất hiện của biến trên PDF preview, toạ độ chuẩn hoá 0..1. */
export interface TemplateBox {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateField {
  fieldId: string;
  code: string;
  label: string;
  description: string | null;
  dataType: TemplateDataType;
  required: boolean;
  sourceType: TemplateFieldSourceType;
  sourceReference: string | null;
  defaultValue: string | null;
  allowManualInput: boolean;
  allowSourceLink: boolean;
  allowOverride: boolean;
  displayOrder: number;
  /** Cấu hình tự do của backend. `options` cho SELECT thường nằm ở đây. */
  validationConfig: Record<string, unknown>;
  formatConfig: Record<string, unknown>;
  boxes: TemplateBox[];
}

export interface TemplateSignatureSlot {
  slotId: string;
  code: string;
  title: string | null;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  coordinateSystem: SignatureCoordinateSystem;
  placementMode: SignatureSlotPlacementMode;
  required: boolean;
  displayOrder: number;
  appearanceConfig: Record<string, unknown>;
}

/**
 * Một VAI ký của mẫu đã publish.
 *
 * `signingOrder` là thứ tự bước — nhiều vai cùng `signingOrder` ký song song,
 * đúng nghĩa "một bước" của màn soạn. Người tạo yêu cầu chỉ chọn AI đứng vào
 * vai; số vai, thứ tự và vị trí chữ ký do bản đã publish quyết định.
 */
export interface TemplateSignerRole {
  roleId: string;
  code: string;
  label: string;
  description: string | null;
  signingOrder: number;
  required: boolean;
  selectionType: TemplateSignerSelectionType;
  selectionConfig: Record<string, unknown>;
  allowChangeSigner: boolean;
  displayOrder: number;
  signatureSlots: TemplateSignatureSlot[];
}

export interface TemplateSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: TemplateStatus;
  currentVersionId: string | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}

export interface TemplateVersion {
  id: string;
  versionNo: number;
  status: TemplateVersionStatus;
  signingMode: TemplateSigningMode;
  sourceFileName: string;
  sourceFileType: string;
  sourceMediaType: string;
  sourceFileSize: number;
  sourceFileHash: string;
  publishedAt: string | null;
}

/** Kích thước trang tính bằng điểm PDF, đã áp dụng rotation. */
export interface TemplatePreviewPage {
  page: number;
  width: number;
  height: number;
  rotation: number;
}

export interface TemplatePreview {
  hash: string;
  highlightHash: string | null;
  pageCount: number;
  pages: TemplatePreviewPage[];
}

export interface TemplateDetail {
  template: TemplateSummary;
  version: TemplateVersion;
  fields: TemplateField[];
  signerRoles: TemplateSignerRole[];
  /** `null` khi version chưa dựng được PDF preview. */
  preview: TemplatePreview | null;
}

/* ------------------------------------------------------------------ *
 * Soạn mẫu (authoring)
 * ------------------------------------------------------------------ */

/**
 * Vòng đời một mẫu, và lý do phần này không thể gộp thành "một lần lưu":
 *
 *   POST   /api/templates                              → Template DRAFT + Version DRAFT
 *   PUT    …/versions/{versionId}/fields               → cấu hình ô phải điền
 *   PUT    …/versions/{versionId}/signers              → vai ký + vị trí chữ ký
 *   POST   …/versions/{versionId}/publish              → DRAFT → ACTIVE/PUBLISHED
 *
 * `POST /api/templates` KHÔNG phải bước lưu cuối: nó chỉ mở bản nháp và trả về
 * `templateId`/`versionId`. Gọi nó lần hai tạo ra một mẫu khác, không cập nhật
 * mẫu cũ — và trùng `code` thì 409.
 *
 * Hai PUT đều THAY THẾ TOÀN BỘ tập tương ứng, không vá từng phần tử.
 */

/** PDF preview của một bản. `PLAIN` để đặt chữ ký, `HIGHLIGHT` để soi biến. */
export type TemplatePreviewVariant = "PLAIN" | "HIGHLIGHT";

/** Một lần xuất hiện của biến, toạ độ chuẩn hoá 0..1 gốc góc trên-trái. */
export interface CreatedTemplateFieldBox {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Một ô backend DÒ ĐƯỢC từ tệp nguồn.
 *
 * `fieldId` do backend sinh và là khoá của mọi lời gọi cấu hình sau đó — client
 * không được tự đặt. `code` là tên biến trong tệp (`employee.name`) và cũng do
 * backend quyết định: sửa nó ở frontend là sửa một thứ không tồn tại trong tệp.
 */
export interface CreatedTemplateField {
  fieldId: string;
  code: string;
  label: string;
  dataType: TemplateDataType;
  required: boolean;
  displayOrder: number;
  occurrenceCount: number;
  locations: string[];
  boxes: CreatedTemplateFieldBox[];
}

/**
 * Mô tả PDF preview của một bản.
 *
 * `contentUrl`/`highlightContentUrl` là đường dẫn của BACKEND
 * (`/api/templates/…`), không phải của ứng dụng này. Đừng fetch thẳng — dùng
 * `templateVersionPreviewUrl()` để lấy đường qua proxy.
 */
export interface TemplateCreatedPreview {
  contentUrl: string;
  highlightContentUrl: string;
  hash: string;
  highlightHash: string | null;
  pageCount: number;
  pages: TemplatePreviewPage[];
}

/** Thân trả về của `POST /api/templates` — 201 Created. */
export interface TemplateCreated {
  templateId: string;
  versionId: string;
  versionNo: number;
  templateStatus: TemplateStatus;
  versionStatus: TemplateVersionStatus;
  fileType: "DOCX" | "XLSX";
  sourceFileHash: string;
  fields: CreatedTemplateField[];
  preview: TemplateCreatedPreview;
  /** Biến dò được nhưng đáng ngờ. Hiện nguyên văn, đừng nuốt. */
  warnings: string[];
}

/**
 * Một ô trong `PUT …/fields`.
 *
 * Ràng buộc của backend, vi phạm là 400:
 *
 * - phải gửi ĐÚNG MỘT lần mỗi `fieldId` của bản, không thiếu không thừa;
 * - `displayOrder` duy nhất và liên tục từ 0 tới `số ô - 1`;
 * - `MANUAL` bắt buộc `allowManualInput` và cấm `sourceReference`;
 * - `allowOverride` đòi `allowManualInput`;
 * - `validationConfig`/`formatConfig` chỉ nhận đúng bộ khoá của `dataType`
 *   (`SELECT` → `options`; `TEXT`/`LONG_TEXT` → `minLength`/`maxLength`/`pattern`;
 *   `NUMBER`/`DECIMAL` → `minimum`/`maximum`, `grouping`, `scale`;
 *   `DATE`/`DATETIME` → `pattern`). Khoá lạ là 400, nên mặc định gửi `{}`.
 */
export interface ConfigureTemplateFieldRequest {
  fieldId: string;
  label: string;
  description: string | null;
  dataType: TemplateDataType;
  required: boolean;
  sourceType: TemplateFieldSourceType;
  sourceReference: string | null;
  defaultValue: string | null;
  allowManualInput: boolean;
  allowSourceLink: boolean;
  allowOverride: boolean;
  displayOrder: number;
  validationConfig: Record<string, unknown>;
  formatConfig: Record<string, unknown>;
}

export interface ConfigureTemplateFieldsBody {
  fields: ConfigureTemplateFieldRequest[];
}

/**
 * Một khung chữ ký trong `PUT …/signers`.
 *
 * Toạ độ chuẩn hoá 0..1, gốc góc TRÊN-TRÁI, cùng hệ với PDF preview đang hiển
 * thị. Client KHÔNG lật trục Y — engine ký dùng gốc dưới-trái nhưng việc quy đổi
 * là của backend.
 *
 * Không có `coordinateSystem` hay `placementMode` ở đây: backend chỉ nhận đúng
 * các trường dưới đây, hai khái niệm kia là hằng số phía nó.
 *
 * Backend từ chối: khung ra ngoài trang (`x+width > 1`, `y+height > 1`), khung
 * không dương, `page` ngoài `pageCount`, hai khung ĐÈ NHAU dù khác vai, `code`
 * trùng nhau (không phân biệt hoa thường) trong cùng một bản, và `displayOrder`
 * âm.
 *
 * `displayOrder` chỉ là thứ tự TƯƠNG ĐỐI trong phạm vi một vai: backend sắp lại
 * rồi tự đánh số `0..n-1`. Không cần liên tục, không cần duy nhất — hai khung
 * cùng số thì giữ thứ tự xuất hiện trong mảng. Đừng viết thêm bước đánh số lại ở
 * client, và đừng so giá trị gửi đi với giá trị đọc về.
 */
export interface ConfigureSignatureSlotRequest {
  code: string;
  title: string | null;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  displayOrder: number;
  /**
   * Map tự do backend lưu nguyên và trả lại nguyên — chỗ duy nhất chở được cấu
   * hình ký của mẫu (phương thức, thuật toán, baseline, lý do, nơi ký).
   */
  appearanceConfig: Record<string, unknown>;
}

/**
 * Một vai ký trong `PUT …/signers`.
 *
 * `signingOrder` là BƯỚC ký, không phải vị trí của một vai: nhiều vai cùng số là
 * hợp lệ và ký SONG SONG. Backend nén các giá trị về `1..K` theo thứ tự tăng
 * dần, nên số không cần liên tục — bỏ một bước ở giữa rồi gửi `1, 1, 3` cho ra
 * đúng `1, 1, 2`. Luật còn lại: `signingOrder >= 1`.
 *
 * `displayOrder` là thứ tự HIỂN THỊ, nén về `0..N-1`; hai vai cùng số thì giữ
 * thứ tự trong mảng. Luật còn lại: `displayOrder >= 0`.
 *
 * Lúc publish backend chỉ kiểm tập BƯỚC liên tục từ 1 — luôn đúng sau khi nén.
 * `GET` chi tiết mẫu trả về giá trị ĐÃ NÉN chứ không phải giá trị vừa gửi lên.
 *
 * `required` bắt buộc `true` và `selectionType` bắt buộc `ANY_USER` ở V1.
 */
export interface ConfigureSignerRoleRequest {
  code: string;
  label: string;
  description: string | null;
  signingOrder: number;
  required: boolean;
  selectionType: TemplateSignerSelectionType;
  selectionConfig: Record<string, unknown>;
  allowChangeSigner: boolean;
  displayOrder: number;
  signatureSlots: ConfigureSignatureSlotRequest[];
}

/** Chú ý khoá `roles`, KHÔNG phải `signerRoles`. */
export interface ConfigureSignerRolesBody {
  roles: ConfigureSignerRoleRequest[];
}

/** Thân trả về của `POST …/publish`. */
export interface TemplatePublished {
  templateId: string;
  versionId: string;
  versionNo: number;
  templateStatus: TemplateStatus;
  versionStatus: TemplateVersionStatus;
  publishedAt: string;
}

/** Một ô như máy chủ đang giữ, kèm `configured` — đọc từ `GET …/versions/{id}`. */
export interface TemplateVersionField {
  id: string;
  code: string;
  label: string | null;
  description: string | null;
  dataType: TemplateDataType | null;
  required: boolean;
  sourceType: TemplateFieldSourceType | null;
  sourceReference: string | null;
  defaultValue: string | null;
  allowManualInput: boolean;
  allowSourceLink: boolean;
  allowOverride: boolean;
  displayOrder: number;
  /** `false` khi ô mới chỉ được dò ra mà chưa ai cấu hình. Publish đòi tất cả `true`. */
  configured: boolean;
  validationConfig: Record<string, unknown>;
  formatConfig: Record<string, unknown>;
}

export interface TemplateVersionSummary {
  id: string;
  versionNo: number;
  status: TemplateVersionStatus;
  signingMode: TemplateSigningMode;
  sourceFileName: string;
  sourceFileType: string;
  sourceMediaType: string;
  sourceFileSize: number;
  sourceFileHash: string;
  createdBy: string;
  createdAt: string;
  publishedAt: string | null;
}

/**
 * `GET /api/templates/{id}/versions/{versionId}` — đường DUY NHẤT đọc được một
 * bản còn `DRAFT`.
 *
 * Không kèm vai ký và vị trí chữ ký: backend chỉ trả chúng ở
 * `GET /api/templates/{id}`, mà endpoint đó chỉ thấy bản đang phục vụ.
 */
export interface TemplateVersionDetail {
  template: TemplateSummary;
  version: TemplateVersionSummary;
  allFieldsConfigured: boolean;
  fields: TemplateVersionField[];
}

/** Thân của `PATCH /api/templates/{id}`. Chỉ hai trường này, và chỉ khi mẫu còn DRAFT. */
export interface UpdateTemplateMetadataBody {
  name: string;
  description: string;
}

/* ------------------------------------------------------------------ *
 * Bản xem thử đã điền biến
 * ------------------------------------------------------------------ */

export interface CreateTemplatePreviewRequest {
  /** Bỏ trống để dùng bản đang phục vụ. Chỉ người soạn mẫu mới truyền bản nháp. */
  versionId?: string;
  /** Chỉ các biến người dùng nhập; biến hệ thống và biến người ký do backend điền. */
  values: Record<string, string>;
  signers: { roleCode: string; userId: string }[];
}

/**
 * `previewId` là thứ `POST /api/signing-requests` nhận, KHÔNG phải `templateId`:
 * yêu cầu ký gắn với một bản tài liệu đã chốt nội dung, không gắn với cái mẫu
 * còn sửa được.
 */
export interface TemplateRuntimePreview {
  previewId: string;
  templateId: string;
  versionId: string;
  pdfContentUrl: string;
  pdfHash: string;
  pageCount: number;
  expiresAt: string;
  /** Biến thiếu, biến thừa… — hiện nguyên văn cho người dùng, đừng nuốt. */
  warnings: string[];
}

/* ------------------------------------------------------------------ *
 * Yêu cầu ký
 * ------------------------------------------------------------------ */

export type SigningRequestSourceType = "TEMPLATE_PREVIEW" | "UPLOADED_DOCUMENT";

export type SigningRequestStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type SigningRequestSignerStatus = "PENDING" | "SIGNED" | "DECLINED";
export type SignerAccessMode = "INTERNAL" | "EXTERNAL_LINK";

export interface SignatureSlotRequest {
  code: string;
  title?: string;
  /** Đánh số từ 1. */
  page: number;
  /** Bốn số dưới đây chuẩn hoá 0..1, gốc góc trên-trái. */
  x: number;
  y: number;
  width: number;
  height: number;
  required?: boolean;
  /**
   * Thứ tự TƯƠNG ĐỐI trong phạm vi MỘT NGƯỜI KÝ — backend sắp lại rồi tự đánh số
   * `0..n-1`. Đánh số theo cả trang hay cả yêu cầu đều được: ba người mỗi người
   * một khung với `0`, `1`, `7` đều lưu thành `0`. Luật duy nhất: `>= 0`.
   */
  displayOrder: number;
  /**
   * Map tự do backend lưu nguyên và trả lại nguyên. Đây là chỗ duy nhất chở
   * được cấu hình ký của client (phương thức, thuật toán, baseline) — API tạo
   * yêu cầu không có trường riêng cho chúng.
   */
  appearanceConfig?: Record<string, unknown>;
}

/**
 * Một người ký do client chỉ định. Hai nhánh loại trừ nhau:
 *
 * - Nguồn TEMPLATE_PREVIEW: chỉ `roleCode` + `userId`. Thứ tự và vị trí chữ ký
 *   chép từ bản mẫu đã publish, gửi thêm là bị từ chối.
 * - Nguồn UPLOADED_DOCUMENT: `signingOrder` + `signatureSlots`, KHÔNG có
 *   `roleCode` (tài liệu trần không có vai nào).
 *
 * THỨ TỰ CÁC PHẦN TỬ trong `signers[]` là thứ tự hiển thị chính thức, kể cả giữa
 * những người cùng một cấp: backend lưu nó thành `displayOrder` và trả về đúng
 * thứ tự đó. Mảng gửi lên phải khớp thứ tự người soạn đang nhìn thấy.
 */
export interface SignerAssignmentRequest {
  roleCode?: string;
  userId: string;

  /**
   * INTERNAL:
   * Người ký đăng nhập bằng tài khoản hệ thống.
   *
   * EXTERNAL_LINK:
   * Backend tạo public signing link ngay khi tạo workflow.
   */
  accessMode: SignerAccessMode;

  /**
   * BƯỚC ký, không phải vị trí của một người: nhiều người cùng số là hợp lệ và ký
   * SONG SONG — họ mở lượt cùng lúc. Backend nén về `1..N` theo thứ tự tăng dần,
   * nên `1, 1, 3` (sau khi xoá một bước ở giữa) cho ra đúng `1, 1, 2`; không phải
   * đánh số lại cả danh sách sau mỗi thao tác xoá.
   *
   * Phải có ở TẤT CẢ người ký hoặc không ai có — gửi nửa vời bị từ chối. Bỏ trống
   * toàn bộ nghĩa là mỗi người một cấp theo thứ tự mảng.
   *
   * Trùng chỉ còn bị từ chối trong đúng một trường hợp: cùng một `userId` hai lần
   * trong cùng một cấp.
   */
  signingOrder?: number;
  signatureSlots?: SignatureSlotRequest[];
}

export interface CreateSigningRequestBody {
  title: string;
  source: {
    type: SigningRequestSourceType;
    previewId?: string;
    documentArtifactId?: string;
  };
  signers: SignerAssignmentRequest[];
}

export interface CreatedExternalSigningLink {
  linkId: string;
  signerId: string;

  /**
   * Chỉ có giá trị trong response tạo lần đầu.
   * Khi backend trả Idempotent-Replay: true, trường này là null.
   */
  url: string | null;

  expiresAt: string;
}

export interface SigningRequestCreated {
  signingRequestId: string;
  status: SigningRequestStatus;
  sourceType: SigningRequestSourceType;
  documentId: string;
  documentContentUrl: string;
  createdAt: string;
  externalSigningLinks: CreatedExternalSigningLink[];
}

export interface SigningRequestDocument {
  documentId: string;
  fileName: string;
  contentType: string;
  sha256: string;
  sizeBytes: number;
  pageCount: number | null;
  contentUrl: string;
}

export interface SigningRequestSlot {
  slotId: string;
  code: string;
  title: string | null;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  displayOrder: number;
  appearanceConfig: Record<string, unknown>;
}

/**
 * Một người ký trong `GET /api/signing-requests/{id}`.
 *
 * Hai trường thứ tự, hai vai trò khác nhau — và cả hai đều là giá trị ĐÃ NÉN của
 * backend, không phải giá trị client vừa gửi lên:
 *
 * - `signingOrder` là CẤP ký. Các phần tử cùng giá trị là một cấp và ký song
 *   song. Dựng lại cây bước bằng cách GOM theo giá trị này, không bao giờ dùng
 *   chỉ số mảng làm số cấp.
 * - `displayOrder` là thứ tự hiển thị trong cấp đó.
 */
export interface SigningRequestSigner {
  signerId: string;
  roleCode: string | null;
  label: string | null;
  userId: string;
  accessMode: SignerAccessMode;
  signingOrder: number;
  displayOrder: number;
  required: boolean;
  status: SigningRequestSignerStatus;
  signedAt: string | null;
  signatureSlots: SigningRequestSlot[];
}

export interface SigningRequestDetail {
  signingRequestId: string;
  title: string;
  status: SigningRequestStatus;
  sourceType: SigningRequestSourceType;
  templateId: string | null;
  templateVersionId: string | null;
  templatePreviewId: string | null;
  documentArtifactId: string | null;
  document: SigningRequestDocument;
  signers: SigningRequestSigner[];
  externalSigningLinks?: CreatedExternalSigningLink[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Danh sách yêu cầu ký
 * ------------------------------------------------------------------ */

/**
 * Quan hệ của NGƯỜI ĐANG THAO TÁC với một yêu cầu ký.
 *
 * Backend suy ra từ `X-Username`, không phải từ tham số truy vấn — client không
 * gửi và KHÔNG ĐƯỢC gửi `userId`. Đây cũng là thứ duy nhất phân biệt "việc tôi
 * phải ký" với "việc tôi phát ra", nên nó là bộ lọc chính của màn danh sách.
 */
export type SigningRequestUserRelation = "CREATOR" | "SIGNER" | "CREATOR_AND_SIGNER";

/**
 * Một dòng trong `GET /api/signing-requests`.
 *
 * KHÔNG có người ký, không có tài liệu, không có tiến độ: danh sách chỉ đủ để
 * chọn một yêu cầu. Mọi thứ còn lại phải đọc bằng
 * `GET /api/signing-requests/{id}` ở màn chi tiết — đừng bịa tiến độ từ dòng
 * này.
 */
export interface SigningRequestListItem {
  signingRequestId: string;
  title: string;
  status: SigningRequestStatus;
  sourceType: SigningRequestSourceType;
  createdBy: string;
  userRelation: SigningRequestUserRelation;
  /** Đường dẫn chi tiết của BACKEND. Đừng fetch thẳng — đi qua proxy `/api/workflow/*`. */
  detailUrl: string;
  createdAt: string;
  updatedAt: string;
}

/** Cùng hình dạng phân trang với `TemplateListPage`: `items`/`page`/`size`. */
export interface SigningRequestListPage {
  items: SigningRequestListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/* ------------------------------------------------------------------ *
 * Ký NỘI BỘ một ô của quy trình (`InternalSigningController`)
 * ------------------------------------------------------------------ */

/**
 * Hợp đồng của luồng người ký NỘI BỘ ký phần việc của mình:
 *
 *   GET  /api/signing-requests/{id}                                  → mình là ai, tới lượt chưa
 *   GET  /api/signing-requests/{id}/document                         → tài liệu hiện tại
 *   GET  /api/signing-requests/{id}/signers/{signerId}/signature-plan → khung chữ ký
 *   POST /api/signing-requests/{id}/sign                             → ký (multipart)
 *
 * Cả bốn nhận danh tính bằng `X-Username` — không có token, không có cookie
 * phiên. Đó là khác biệt DUY NHẤT về xác thực so với luồng ký ngoài hệ thống
 * (`lib/types/external-signing.ts`); mọi thứ còn lại của lệnh ký — hai bước
 * START/CONTINUE, phản hồi ba trạng thái, ba mã lỗi 409 — giống hệt, vì cả hai
 * cùng đi qua một engine ký.
 *
 * Ba điều backend QUYẾT ĐỊNH THAY client ở bước START, và vì thế không có trong
 * `InternalSignRequest`:
 *
 * 1. **Toạ độ chữ ký** — đọc từ signature plan trong DB rồi ghi đè lên request.
 * 2. **`signatureMode`** — ép `CO_SIGN`, và `targetSignatureId` bị xoá. Một
 *    người ký sau trong quy trình luôn ký THÊM chữ ký của mình vào tài liệu đã
 *    có chữ ký người trước, không bao giờ ký đè lên chữ ký đó.
 * 3. **`sessionId`** — session của engine nằm trong registry phía máy chủ, gắn
 *    với cặp (yêu cầu, người ký). Client không thấy và không gửi nó; phản hồi
 *    vì thế LUÔN trả `sessionId: null`.
 */

/**
 * Một khung chữ ký trong kế hoạch ký.
 *
 * Toạ độ đo bằng PDF POINTS, gốc góc DƯỚI-TRÁI — cùng quy ước với
 * `SignAppearanceRequest` của `/api/v1/sign`, KHÁC quy ước 0..1 gốc trên-trái
 * của `SignatureSlotRequest`/`SigningRequestSlot` ở phần trên file này. Nhầm hai
 * quy ước là vẽ overlay lộn ngược trang.
 */
export interface SigningRequestSignatureSlotPlan {
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
 * `GET …/signers/{signerId}/signature-plan` — chỗ người này sẽ ký.
 *
 * Frontend dùng nó CHỈ để chỉ chỗ (đánh dấu trang, vẽ overlay, nói "bạn ký 2 ô
 * ở trang 3"). Toạ độ KHÔNG được gửi lại trong lệnh ký: backend đọc lại plan và
 * ghi đè, nên gửi đi chỉ tạo ảo giác client kiểm soát vị trí.
 *
 * `documentSha256` là bản tài liệu mà plan này ứng với. Cùng giá trị đó được
 * chốt lại lúc START và đối chiếu lại ở CONTINUE — lệch là `SIGNING_DOCUMENT_CHANGED`.
 */
export interface SigningRequestSignaturePlan {
  signingRequestId: string;
  signerId: string;
  userId: string;
  fileName: string;
  format: string;
  documentSha256: string;
  /** Đường dẫn của BACKEND. Đừng fetch thẳng — dùng `signingRequestDocumentUrl()`. */
  documentContentUrl: string;
  signatures: SigningRequestSignatureSlotPlan[];
}

export type InternalSignStep = "START" | "CONTINUE";

/**
 * Part `request` của `POST …/sign` (multipart, kèm `p12File` tuỳ phương thức).
 *
 * Hẹp hơn `SignRequestPayload` của `/api/v1/sign` đúng bằng những gì backend tự
 * quyết định — xem ba điểm ở đầu mục này. `algorithm` và `baselineLevel` thì
 * VẪN của client: chúng không nằm trong signature plan, và người ký nội bộ có
 * `GET /capabilities` để biết nguồn của mình nhận giá trị nào.
 */
export interface InternalSignRequest {
  materialMode: MaterialMode;
  step: InternalSignStep;
  /** Chỉ gửi ở `START` — bước CONTINUE đọc lại từ phiên của engine. */
  baselineLevel?: BaselineLevel;
  algorithm?: string;
  pkcs12?: Pkcs12MaterialRequest;
  remoteCa?: RemoteCaSignRequest;
}

/**
 * Phản hồi của `POST …/sign`. Cùng hình dạng với `SignResponse` của `/api/v1/sign`,
 * nhưng các trường vắng mặt về dưới dạng `null` chứ không phải thiếu khoá — quy
 * hết về `undefined` bằng `toSignResponse()` trong `features/sign-request/workflow-signing.ts`.
 */
export interface InternalSignResponse {
  status: SignStatus;
  /** LUÔN `null`: session của engine nằm ở registry phía máy chủ. */
  sessionId?: string | null;
  /** Trang của CA mà người ký phải mở: xác nhận danh tính, rồi nhập OTP. */
  nextUrl?: string | null;
  message?: string | null;
  expiresAt?: string | null;
  /**
   * Chỉ có khi `COMPLETED`. Backend đã ghi bản đã ký vào tài liệu của yêu cầu
   * rồi (MinIO + `replaceDocument`), nên đây chỉ là một bản cho người ký tải về.
   */
  document?: SignedDocument | null;
}

/**
 * Ba xung đột 409 của lệnh ký nội bộ. Chúng KHÔNG phải lỗi hệ thống — mỗi mã
 * ứng với một tình huống có đường ra riêng, và gộp cả ba vào "ký thất bại" là
 * bỏ mất chính thông tin quyết định người ký phải làm gì tiếp.
 *
 * - `SIGNING_ALREADY_STARTED` — đã có một phiên engine đang mở cho chính ô này
 *   (thường vì tải lại trang giữa lúc chờ OTP). Đường ra là TIẾP TỤC phiên đó,
 *   không phải bắt đầu lại.
 * - `SIGNING_NOT_STARTED` — CONTINUE mà không còn phiên nào. Ký lại từ đầu.
 * - `SIGNING_DOCUMENT_CHANGED` — người cùng cấp vừa ký xong nên tài liệu đã đổi.
 *   Diễn biến BÌNH THƯỜNG của một cấp ký song song: tải lại rồi ký lại.
 * - `SIGNING_LEASE_LOCKED` — người cùng cấp giành được quyền ký trước. Chờ và
 *   hỏi lại lease, KHÔNG gửi lại START.
 * - `SIGNING_LEASE_LOST` — lượt ký đang dở đã hết hạn/bị chuyển đi. Bỏ hết
 *   trạng thái của lượt đó rồi bắt đầu lại. Xem `lib/types/signing-lease.ts`.
 */
export const INTERNAL_SIGNING_CONFLICT_CODES = [
  "SIGNING_ALREADY_STARTED",
  "SIGNING_NOT_STARTED",
  "SIGNING_DOCUMENT_CHANGED",
  "SIGNING_LEASE_LOCKED",
  "SIGNING_LEASE_LOST",
] as const;

/* ------------------------------------------------------------------ *
 * Ký một ô của quy trình bằng USB Token
 * ------------------------------------------------------------------ */

/**
 * Cặp endpoint RIÊNG cho USB Token, không đi qua `POST …/sign`:
 *
 *   POST /api/signing-requests/{id}/sign/usb-token/prepare               → digest
 *   POST /api/signing-requests/{id}/sign/usb-token/jobs/{jobId}/complete → chữ ký
 *
 * Vì sao phải tách: khoá riêng nằm trong thiết bị cắm ở máy NGƯỜI KÝ, nên không
 * có bước nào backend tự ký được. Nó chỉ dựng được digest, rồi chờ trình duyệt
 * mang chữ ký từ FPT-CA Signing Agent về. Đúng hình dạng của cặp endpoint
 * `/api/v1/usb-token/signing-jobs` ở màn `/sign` — và cố ý như vậy, để
 * `UsbTokenSignDialog` chạy được cả hai luồng mà không cần biết mình đang ở đâu.
 *
 * Ba điều bước prepare tự quyết định, giống hệt `POST …/sign`, và vì thế KHÔNG
 * có trong `InternalUsbTokenPrepareRequest`:
 *
 * 1. **Toạ độ chữ ký** — đọc từ signature plan rồi ghi đè.
 * 2. **`signatureMode`** — ép `CO_SIGN`.
 * 3. **Tên hiện trên ô chữ ký** — backend đọc CN từ chính `certificateBase64`
 *    gửi lên. Đây là khác biệt so với `UsbTokenJobRequest` của màn `/sign`, nơi
 *    client phải tự gửi `signerDisplayName`.
 *
 * Hai chốt chặn của bước complete, cả hai đều là 409 và đã có nhánh xử lý riêng
 * ở `features/sign-request/workflow-signing.ts`: người khác không complete hộ
 * được (`requireTurn`), và tài liệu phải y nguyên như lúc prepare — có người ký
 * chen vào giữa thì job bị huỷ (`SIGNING_DOCUMENT_CHANGED`).
 */
export interface InternalUsbTokenPrepareRequest {
  /** Base64 DER X.509 của chứng thư người ký vừa chọn trong token. */
  certificateBase64: string;
  /**
   * BẮT BUỘC gửi tường minh, cùng lý do với `UsbTokenJobRequest.algorithm`: bỏ
   * trống là backend lấy mặc định của nó (PSS), mà FPT-CA Signing Agent 1.3.1
   * chỉ ký PKCS#1 — bước complete sẽ trả `422 USB_TOKEN_SIGNATURE_INVALID` sau
   * khi đã bắt người ký nhập PIN.
   */
  algorithm: string;
}

/**
 * Phản hồi của bước prepare. Cùng nghĩa từng trường với `UsbTokenJob` của màn
 * `/sign` — xem chú thích ở `lib/types/signing.ts`, đặc biệt là việc
 * `digestBase64` phải đi NGUYÊN VĂN vào `/SignHash`.
 *
 * `digestAlgorithm` để `?` vì hợp đồng bàn giao chỉ liệt kê bốn trường dưới đây;
 * agent thì bắt buộc phải có nó (`algDigest`). Khi nó vắng mặt, hàm dựng job ở
 * `features/sign-request/workflow-usb-token.ts` suy ra từ `jcaSignatureAlgorithm`
 * rồi tới `algorithm` đã gửi — chứ KHÔNG giả định SHA-256.
 */
export interface InternalUsbTokenJob {
  jobId: string;
  digestBase64: string;
  /** `SHA256` | `SHA384` | `SHA512`. */
  digestAlgorithm?: string;
  /** Tên chuẩn JCA, ví dụ `SHA256withRSA`. */
  jcaSignatureAlgorithm?: string;
  expiresAt: string;
}

/**
 * Thân bước complete. `certificateBase64` gửi LẠI (backend đối chiếu với chứng
 * thư đã dùng lúc prepare), `certificateChainBase64` nên bỏ trống — intermediate
 * và trust anchor thuộc về cấu hình của dịch vụ ký.
 */
export interface InternalUsbTokenCompleteRequest {
  signatureBase64: string;
  certificateBase64: string;
  certificateChainBase64?: string[];
}
