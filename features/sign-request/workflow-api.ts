"use client";

import type {
  ConfigureSignerRoleRequest,
  ConfigureTemplateFieldRequest,
  CreateSigningRequestBody,
  CreateTemplatePreviewRequest,
  DocumentArtifact,
  InternalSignRequest,
  InternalSignResponse,
  InternalUsbTokenCompleteRequest,
  InternalUsbTokenJob,
  InternalUsbTokenPrepareRequest,
  SigningRequestSignaturePlan,
  SigningRequestCreated,
  SigningRequestDetail,
  SigningRequestListPage,
  SigningRequestStatus,
  TemplateCreated,
  TemplateDetail,
  TemplateListPage,
  TemplatePreviewVariant,
  TemplatePublished,
  TemplateRuntimePreview,
  TemplateStatus,
  TemplateVersionDetail,
  UpdateTemplateMetadataBody,
} from "@/lib/types/workflow";
import type {
  SigningLeaseAcquireResponse,
  SigningLeaseResponse,
} from "@/lib/types/signing-lease";
import { baseUrlHeaders } from "@/features/signing/api-base-url";
import { readProblem } from "@/features/signing/api";
import { actorHeaders, ActorRequiredError } from "./actor";

/**
 * Client cho phân hệ QUY TRÌNH KÝ. Mọi lời gọi đi qua proxy `/api/workflow/*`
 * và mang theo hai header:
 *
 * - `X-Signing-Base-Url` — môi trường backend, dùng chung với màn `/sign`.
 * - `X-Username` — người đang thao tác. Ném `ActorRequiredError` ngay ở client
 *   khi chưa có, thay vì gửi một lời gọi chắc chắn 400.
 *
 * Body trả về KHÔNG bọc envelope: chính nó là dữ liệu. Lỗi là problem+json và
 * được đọc bằng `readProblem` dùng chung với client ký.
 */

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await readProblem(response);
  return (await response.json()) as T;
}

/**
 * Cho các lệnh ghi trả `204 No Content`.
 *
 * Không dùng `readJson` được: thân rỗng làm `response.json()` ném, và lỗi ném ra
 * lúc đó trông y hệt một lỗi mạng — trong khi lời gọi vừa THÀNH CÔNG. Lớp proxy
 * chuẩn hoá 204 thành `{}`, nhưng hàm này vẫn không đụng tới thân để đúng cả khi
 * gọi thẳng.
 */
async function readNoContent(response: Response): Promise<void> {
  if (!response.ok) throw await readProblem(response);
}

/**
 * Khoá idempotency cho một lần bấm nút.
 *
 * Sinh MỘT lần rồi giữ nguyên qua mọi lần thử lại của cùng thao tác đó — đó là
 * toàn bộ điểm của cơ chế này. Sinh khoá mới cho mỗi lần retry thì mỗi lần bấm
 * lại tạo thêm một yêu cầu ký trùng, đúng thứ mà khoá sinh ra để chặn.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

/* ------------------------------------------------------------------ *
 * Mẫu
 * ------------------------------------------------------------------ */

/**
 * Danh sách mẫu để chọn. Mặc định `ACTIVE`: mẫu chưa publish chưa có bản đã chốt
 * nào để ký, hiện nó lên chỉ dẫn tới một lỗi ở bước cuối.
 */
export async function listTemplates(
  options: {
    page?: number;
    size?: number;
    search?: string;
    status?: TemplateStatus;
    signal?: AbortSignal;
  } = {},
): Promise<TemplateListPage> {
  const query = new URLSearchParams();
  if (options.page !== undefined) query.set("page", String(options.page));
  if (options.size !== undefined) query.set("size", String(options.size));
  if (options.search?.trim()) query.set("search", options.search.trim());
  query.set("status", options.status ?? "ACTIVE");

  const response = await fetch(`/api/workflow/templates?${query.toString()}`, {
    headers: baseUrlHeaders(),
    signal: options.signal,
  });
  return readJson<TemplateListPage>(response);
}

/** Bản đang phục vụ của một mẫu: ô phải điền, vai ký, vị trí chữ ký, preview. */
export async function getTemplate(
  templateId: string,
  signal?: AbortSignal,
): Promise<TemplateDetail> {
  const response = await fetch(
    `/api/workflow/templates/${encodeURIComponent(templateId)}`,
    { headers: baseUrlHeaders(), signal },
  );
  return readJson<TemplateDetail>(response);
}

/** Đường dẫn PDF preview của mẫu — dùng thẳng trong `<embed>`/`fetch`. */
export function templatePreviewUrl(templateId: string, variant?: "HIGHLIGHT" | "PLAIN"): string {
  const suffix = variant ? `?variant=${variant}` : "";
  return `/api/workflow/templates/${encodeURIComponent(templateId)}/preview${suffix}`;
}

/**
 * Dựng tài liệu thật từ mẫu + giá trị vừa nhập.
 *
 * `previewId` trả về là thứ `createSigningRequest` nhận. Nó có `expiresAt`, nên
 * đừng dựng sẵn từ sớm rồi giữ: gọi ngay trước khi tạo yêu cầu.
 */
export async function createTemplatePreview(
  templateId: string,
  payload: CreateTemplatePreviewRequest,
  signal?: AbortSignal,
): Promise<TemplateRuntimePreview> {
  const response = await fetch(
    `/api/workflow/templates/${encodeURIComponent(templateId)}/previews`,
    {
      method: "POST",
      headers: { ...baseUrlHeaders(), ...actorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    },
  );
  return readJson<TemplateRuntimePreview>(response);
}

export function templatePreviewContentUrl(previewId: string): string {
  return `/api/workflow/template-previews/${encodeURIComponent(previewId)}/content`;
}

/* ------------------------------------------------------------------ *
 * Soạn mẫu
 * ------------------------------------------------------------------ */

/**
 * Mở một bản nháp mẫu trên máy chủ.
 *
 * KHÔNG đặt `Content-Type`: trình duyệt phải tự sinh boundary cho multipart, đặt
 * tay là backend đọc ra body rỗng.
 *
 * Lời gọi này chuyển DOCX/XLSX sang PDF nên chậm hơn hẳn các lời gọi khác —
 * hàng chục giây với tệp nặng. Giao diện phải khoá nút chứ đừng để bấm lại: mỗi
 * lần bấm là một mẫu mới, và lần thứ hai còn trùng `code` nên ăn 409.
 */
export async function createTemplateDraft(
  input: { code: string; name: string; description: string; file: File },
  signal?: AbortSignal,
): Promise<TemplateCreated> {
  const form = new FormData();
  form.set("code", input.code);
  form.set("name", input.name);
  form.set("description", input.description);
  form.set("file", input.file, input.file.name);

  const response = await fetch("/api/workflow/templates", {
    method: "POST",
    headers: { ...baseUrlHeaders(), ...actorHeaders() },
    body: form,
    signal,
  });
  return readJson<TemplateCreated>(response);
}

/** Một BẢN cụ thể, kể cả bản còn `DRAFT` — `getTemplate` chỉ thấy bản đang phục vụ. */
export async function getTemplateVersion(
  templateId: string,
  versionId: string,
  signal?: AbortSignal,
): Promise<TemplateVersionDetail> {
  const response = await fetch(
    `/api/workflow/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(
      versionId,
    )}`,
    { headers: baseUrlHeaders(), signal },
  );
  return readJson<TemplateVersionDetail>(response);
}

/** Thay thế TOÀN BỘ cấu hình ô của một bản nháp. Thiếu một `fieldId` là 400. */
export async function configureTemplateFields(
  templateId: string,
  versionId: string,
  fields: ConfigureTemplateFieldRequest[],
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    `/api/workflow/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(
      versionId,
    )}/fields`,
    {
      method: "PUT",
      headers: { ...baseUrlHeaders(), ...actorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
      signal,
    },
  );
  return readNoContent(response);
}

/**
 * Thay thế TOÀN BỘ vai ký và vị trí chữ ký của một bản nháp.
 *
 * Khung chữ ký đi kèm trong `roles[].signatureSlots` — không có endpoint riêng
 * cho slot, và publish cũng không nhận chúng.
 */
export async function configureTemplateSigners(
  templateId: string,
  versionId: string,
  roles: ConfigureSignerRoleRequest[],
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    `/api/workflow/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(
      versionId,
    )}/signers`,
    {
      method: "PUT",
      headers: { ...baseUrlHeaders(), ...actorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ roles }),
      signal,
    },
  );
  return readNoContent(response);
}

/** Chỉ đổi được tên và mô tả, và CHỈ khi mẫu còn `DRAFT`. */
export async function updateTemplateMetadata(
  templateId: string,
  body: UpdateTemplateMetadataBody,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`/api/workflow/templates/${encodeURIComponent(templateId)}`, {
    method: "PATCH",
    headers: { ...baseUrlHeaders(), ...actorHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw await readProblem(response);
}

/**
 * Chốt bản nháp: Template `DRAFT` → `ACTIVE`, Version `DRAFT` → `PUBLISHED`.
 *
 * KHÔNG gửi thân request — backend đọc lại những gì hai PUT đã ghi. Mọi thay đổi
 * còn treo ở client phải lưu trước, nếu không chúng đơn giản là không được chốt.
 */
export async function publishTemplateVersion(
  templateId: string,
  versionId: string,
  signal?: AbortSignal,
): Promise<TemplatePublished> {
  const response = await fetch(
    `/api/workflow/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(
      versionId,
    )}/publish`,
    { method: "POST", headers: { ...baseUrlHeaders(), ...actorHeaders() }, signal },
  );
  return readJson<TemplatePublished>(response);
}

/** Đưa mẫu về `ARCHIVED`. Backend không xoá hẳn — bản ghi vẫn tra ngược được. */
export async function archiveTemplate(
  templateId: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`/api/workflow/templates/${encodeURIComponent(templateId)}`, {
    method: "DELETE",
    headers: { ...baseUrlHeaders(), ...actorHeaders() },
    signal,
  });
  if (!response.ok) throw await readProblem(response);
}

/** Đường dẫn PDF của một BẢN cụ thể — qua proxy, không phải `preview.contentUrl` của backend. */
export function templateVersionPreviewUrl(
  templateId: string,
  versionId: string,
  variant: TemplatePreviewVariant,
): string {
  return `/api/workflow/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(
    versionId,
  )}/preview?variant=${variant}`;
}

/* ------------------------------------------------------------------ *
 * Tài liệu tự tải lên
 * ------------------------------------------------------------------ */

export async function uploadDocument(
  file: File,
  signal?: AbortSignal,
): Promise<DocumentArtifact> {
  const form = new FormData();
  form.append("file", file, file.name);

  const response = await fetch("/api/workflow/documents", {
    method: "POST",
    headers: { ...baseUrlHeaders(), ...actorHeaders() },
    body: form,
    signal,
  });
  return readJson<DocumentArtifact>(response);
}

/* ------------------------------------------------------------------ *
 * Yêu cầu ký
 * ------------------------------------------------------------------ */

export interface CreateSigningRequestResult {
  result: SigningRequestCreated;
  idempotentReplay: boolean;
}

export async function createSigningRequest(
  body: CreateSigningRequestBody,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<CreateSigningRequestResult> {
  const response = await fetch("/api/workflow/signing-requests", {
    method: "POST",
    headers: {
      ...baseUrlHeaders(),
      ...actorHeaders(),
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
    signal,
  });

  const result = await readJson<SigningRequestCreated>(response);

  return {
    result,
    idempotentReplay:
      response.headers.get("Idempotent-Replay") === "true",
  };
}

/**
 * Danh sách yêu cầu ký của NGƯỜI ĐANG THAO TÁC.
 *
 * Không có tham số nào nói "của ai": backend đọc `X-Username` và trả về những
 * yêu cầu mà người đó tạo hoặc được chỉ định ký. Đổi danh tính trên header là
 * đổi hẳn danh sách — đó là tính năng, không phải hiệu ứng phụ.
 *
 * `status` bỏ trống nghĩa là mọi trạng thái. Lọc theo QUAN HỆ
 * (`userRelation`) thì không có tham số nào cả, nên phần đó lọc ở client trên
 * đúng trang đang xem.
 */
export async function listSigningRequests(
  options: {
    page?: number;
    size?: number;
    search?: string;
    status?: SigningRequestStatus;
    signal?: AbortSignal;
  } = {},
): Promise<SigningRequestListPage> {
  const query = new URLSearchParams();
  if (options.page !== undefined) query.set("page", String(options.page));
  if (options.size !== undefined) query.set("size", String(options.size));
  if (options.search?.trim()) query.set("search", options.search.trim());
  if (options.status) query.set("status", options.status);

  const response = await fetch(`/api/workflow/signing-requests?${query.toString()}`, {
    headers: { ...baseUrlHeaders(), ...actorHeaders() },
    signal: options.signal,
  });
  return readJson<SigningRequestListPage>(response);
}

export async function getSigningRequest(
  signingRequestId: string,
  signal?: AbortSignal,
): Promise<SigningRequestDetail> {
  const response = await fetch(
    `/api/workflow/signing-requests/${encodeURIComponent(signingRequestId)}`,
    { headers: { ...baseUrlHeaders(), ...actorHeaders() }, signal },
  );
  return readJson<SigningRequestDetail>(response);
}

/**
 * Huỷ một yêu cầu ký. Chỉ NGƯỜI TẠO huỷ được, và chỉ khi còn `DRAFT`/
 * `IN_PROGRESS` — backend tự áp hai luật đó và trả lỗi nếu vi phạm; ở đây
 * không đoán trước, chỉ chuyển tiếp.
 *
 * Không dùng `actorHeaders()`: chữ ký hàm nhận thẳng `actorUserId` để khớp với
 * người gọi (nút Huỷ đọc từ `useActor()` rồi truyền vào), thay vì đọc lại
 * `localStorage` một lần nữa cho cùng một giá trị.
 */
export async function cancelSigningRequest(
  signingRequestId: string,
  actorUserId: string,
  signal?: AbortSignal,
): Promise<SigningRequestDetail> {
  if (!actorUserId.trim()) throw new ActorRequiredError();

  const response = await fetch(
    `/api/workflow/signing-requests/${encodeURIComponent(signingRequestId)}/cancel`,
    {
      method: "POST",
      headers: { ...baseUrlHeaders(), "X-Username": actorUserId },
      signal,
    },
  );
  return readJson<SigningRequestDetail>(response);
}

/**
 * Từ chối một lượt ký nội bộ.
 *
 * Chỉ chính người ký đó từ chối được, và chỉ khi lượt của họ còn `PENDING` và
 * đang đúng tới lượt — backend tự áp cả ba luật đó (kể cả luật `INTERNAL` mới
 * ký được, người ký qua link ngoài không gọi hàm này) và trả lỗi nếu vi phạm,
 * ở đây không đoán trước. Thành công thì lượt ký chuyển `DECLINED` và cả yêu
 * cầu chuyển `CANCELLED` — phản hồi là `SigningRequestDetail` mới nhất, dùng
 * thẳng để thay `detail` trên màn, không tự suy trạng thái.
 *
 * Không dùng `actorHeaders()`: chữ ký hàm nhận thẳng `actorUserId` để khớp với
 * người gọi (nút Từ chối đọc từ `useActor()` rồi truyền vào), thay vì đọc lại
 * `localStorage` một lần nữa cho cùng một giá trị.
 */
export async function declineWorkflowSlot(
  signingRequestId: string,
  signerId: string,
  actorUserId: string,
  signal?: AbortSignal,
): Promise<SigningRequestDetail> {
  if (!actorUserId.trim()) throw new ActorRequiredError();

  const response = await fetch(
    `/api/workflow/signing-requests/${encodeURIComponent(
      signingRequestId,
    )}/signers/${encodeURIComponent(signerId)}/decline`,
    {
      method: "POST",
      headers: { ...baseUrlHeaders(), "X-Username": actorUserId },
      signal,
    },
  );
  return readJson<SigningRequestDetail>(response);
}

export function signingRequestDocumentUrl(signingRequestId: string): string {
  return `/api/workflow/signing-requests/${encodeURIComponent(signingRequestId)}/document`;
}

/**
 * Tải tài liệu của một yêu cầu ký.
 *
 * Không dùng `<a download>` trỏ thẳng vào URL được: endpoint đòi `X-Username`,
 * mà thẻ neo không gắn header. Phải fetch rồi dựng blob.
 */
export async function downloadSigningRequestDocument(
  signingRequestId: string,
  fileName: string,
): Promise<void> {
  const response = await fetch(signingRequestDocumentUrl(signingRequestId), {
    headers: { ...baseUrlHeaders(), ...actorHeaders() },
  });
  if (!response.ok) throw await readProblem(response);

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "document";
  anchor.hidden = true;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/* ------------------------------------------------------------------ *
 * Ký nội bộ một ô của quy trình
 * ------------------------------------------------------------------ */

/**
 * Khung chữ ký của MỘT người trong yêu cầu này.
 *
 * Chỉ để chỉ chỗ. Toạ độ trả về không bao giờ đi ngược lên trong lệnh ký —
 * backend đọc lại chính plan này và ghi đè lên request của client.
 */
export async function getSignaturePlan(
  signingRequestId: string,
  signerId: string,
  signal?: AbortSignal,
): Promise<SigningRequestSignaturePlan> {
  const response = await fetch(
    `/api/workflow/signing-requests/${encodeURIComponent(
      signingRequestId,
    )}/signers/${encodeURIComponent(signerId)}/signature-plan`,
    { headers: { ...baseUrlHeaders(), ...actorHeaders() }, signal },
  );
  return readJson<SigningRequestSignaturePlan>(response);
}

/**
 * Một bước ký (START hoặc CONTINUE) của người ký nội bộ.
 *
 * Part `request` phải là JSON có `Content-Type` rõ ràng — append chuỗi trần thì
 * backend đọc nó như text/plain rồi từ chối, nên ở đây gói bằng `Blob`. Không
 * đặt `Content-Type` cho cả request: trình duyệt phải tự sinh multipart boundary.
 *
 * KHÔNG có part `file`: tài liệu là bản đang nằm trong kho của yêu cầu ký, và
 * backend tự đọc nó ở bước START. Cũng KHÔNG tự gửi lại khi lỗi mạng — với eSign
 * Cloud, mỗi lần START là một lượt ký bị trừ, nên quyết định thử lại luôn thuộc
 * về người dùng.
 *
 * `leaseToken` CHỈ đính kèm khi `request.step === "START"`: đó là token vừa
 * giành được ở Workflow Detail (`acquireInternalSigningLease`), đại diện cho
 * đúng lượt ký này. Bước `CONTINUE` không cần — backend đọc token authoritative
 * từ chính `pendingJob` đang mở, không phải từ header.
 */
export async function submitWorkflowSignStep(
  signingRequestId: string,
  request: InternalSignRequest,
  p12File?: File,
  leaseToken?: string,
  signal?: AbortSignal,
): Promise<InternalSignResponse> {
  const form = new FormData();
  form.append(
    "request",
    new Blob([JSON.stringify(request)], { type: "application/json" }),
  );
  if (p12File) form.append("p12File", p12File, p12File.name);

  const headers = { ...baseUrlHeaders(), ...actorHeaders() };
  if (request.step === "START" && leaseToken) {
    headers["X-Signing-Lease-Token"] = leaseToken;
  }

  const response = await fetch(
    `/api/workflow/signing-requests/${encodeURIComponent(signingRequestId)}/sign`,
    { method: "POST", headers, body: form, signal },
  );
  return readJson<InternalSignResponse>(response);
}

/* ------------------------------------------------------------------ *
 * Quyền ký độc quyền (signing lease)
 * ------------------------------------------------------------------ */

/**
 * Lượt ký này đang trống, đang do CHÍNH mình giữ, hay đang có người khác ký.
 *
 * Đọc trước khi cho bấm Ký — xem `lib/types/signing-lease.ts` cho lý do và cho
 * điều nó KHÔNG hứa (`AVAILABLE` không loại bỏ được cuộc đua; `SIGNING_LEASE_LOCKED`
 * vẫn phải có nhánh xử lý ở mọi lệnh ký).
 *
 * `signal` bắt buộc phải dùng ở nơi gọi: lời gọi này chạy theo nhịp poll, và một
 * phản hồi về sau khi màn hình đã đổi người ký là một phản hồi nói về lượt ký
 * khác.
 */
export async function getInternalSigningLease(
  signingRequestId: string,
  signal?: AbortSignal,
): Promise<SigningLeaseResponse> {
  const response = await fetch(
    `/api/workflow/signing-requests/${encodeURIComponent(signingRequestId)}/sign/lease`,
    { headers: { ...baseUrlHeaders(), ...actorHeaders() }, signal },
  );
  return readJson<SigningLeaseResponse>(response);
}

/**
 * GIÀNH quyền ký độc quyền — gọi đúng lúc người dùng bấm "Ký ngay", KHÔNG gọi
 * khi chỉ mở Workflow Detail.
 *
 * Đây là lớp chống race condition CUỐI CÙNG: `GET` phía trên chỉ là ảnh chụp để
 * quyết định hiện/ẩn nút, còn `POST` này mới là nơi backend phân xử dứt khoát ai
 * thắng khi hai người bấm gần như cùng lúc. `leaseToken` trong phản hồi đại diện
 * cho đúng lượt giành này — nơi gọi lưu nó lại (xem `signing-lease-token.ts`)
 * rồi mới điều hướng sang màn ký; không tự sinh, không dùng lại cho một yêu cầu
 * ký khác.
 */
export async function acquireInternalSigningLease(
  signingRequestId: string,
  signal?: AbortSignal,
): Promise<SigningLeaseAcquireResponse> {
  const response = await fetch(
    `/api/workflow/signing-requests/${encodeURIComponent(signingRequestId)}/sign/lease`,
    { method: "POST", headers: { ...baseUrlHeaders(), ...actorHeaders() }, signal },
  );
  return readJson<SigningLeaseAcquireResponse>(response);
}

/**
 * Trả lại lượt ký đang mở của chính mình.
 *
 * Phản hồi là trạng thái MỚI, không phải một lời xác nhận — và nó có thể vẫn là
 * `HELD_BY_YOU` (ví dụ một lượt ký khác của chính người này còn treo ở tab thứ
 * hai). Vì vậy nơi gọi không được suy ra "đã huỷ xong" từ việc lệnh này không
 * ném; phải đọc `state`.
 *
 * `204 No Content` cũng là một câu trả lời hợp lệ của backend cho lệnh này, nên
 * ở đây không ép có thân: thiếu thân thì trả `undefined` và nơi gọi đọc lại
 * bằng một lần GET.
 *
 * `leaseToken` PHẢI là token của chính lượt đang huỷ — thiếu nó thì đây là một
 * DELETE mù, và nơi gọi (xem `cancelAttempt` ở `workflow-sign-workspace.tsx`)
 * không được gọi hàm này khi chưa có token cục bộ nào.
 */
export async function cancelInternalSigningLease(
  signingRequestId: string,
  leaseToken?: string,
  signal?: AbortSignal,
): Promise<SigningLeaseResponse | undefined> {
  const headers = { ...baseUrlHeaders(), ...actorHeaders() };
  if (leaseToken) headers["X-Signing-Lease-Token"] = leaseToken;

  const response = await fetch(
    `/api/workflow/signing-requests/${encodeURIComponent(signingRequestId)}/sign/lease`,
    { method: "DELETE", headers, signal },
  );
  if (!response.ok) throw await readProblem(response);
  return (await response.json().catch(() => undefined)) as SigningLeaseResponse | undefined;
}

/* ------------------------------------------------------------------ *
 * Ký một ô của quy trình bằng USB Token
 * ------------------------------------------------------------------ */

/**
 * Bước 1: nộp chứng thư trong token, nhận digest để agent ký.
 *
 * KHÔNG có part `file` và cũng không multipart: tài liệu là bản trong kho của
 * yêu cầu ký. Backend đọc CN từ chính `certificateBase64` để in lên ô chữ ký,
 * nên ở đây cũng không có `signerDisplayName` như luồng `/sign`.
 *
 * Mỗi lần gọi là MỘT job mới, và một lần nhập PIN nữa — không tự gọi lại.
 * Backend còn từ chối khi người ký đã có một phiên ký khác đang mở
 * (`pendingJobs` phải rỗng), nên gọi lần hai lúc lần một còn treo chỉ nhận về
 * `SIGNING_ALREADY_STARTED`.
 *
 * `leaseToken` là token đã giành ở "Ký ngay" — USB Token dùng LẠI đúng token đó,
 * không tự giành lần hai (không có bước START riêng để làm việc đó).
 */
export async function prepareWorkflowUsbTokenJob(
  signingRequestId: string,
  payload: InternalUsbTokenPrepareRequest,
  leaseToken?: string,
  signal?: AbortSignal,
): Promise<InternalUsbTokenJob> {
  const headers: Record<string, string> = {
    ...baseUrlHeaders(),
    ...actorHeaders(),
    "Content-Type": "application/json",
  };
  if (leaseToken) headers["X-Signing-Lease-Token"] = leaseToken;

  const response = await fetch(
    `/api/workflow/signing-requests/${encodeURIComponent(
      signingRequestId,
    )}/sign/usb-token/prepare`,
    { method: "POST", headers, body: JSON.stringify(payload), signal },
  );
  return readJson<InternalUsbTokenJob>(response);
}

/**
 * Bước cuối: nộp chữ ký của token. Thành công là backend đã ghi bản đã ký vào
 * tài liệu của yêu cầu và đánh dấu người này đã ký — `document` trong phản hồi
 * chỉ là một bản tiện tay cho người ký tải về.
 */
export async function completeWorkflowUsbTokenJob(
  signingRequestId: string,
  jobId: string,
  payload: InternalUsbTokenCompleteRequest,
  signal?: AbortSignal,
): Promise<InternalSignResponse> {
  const response = await fetch(
    `/api/workflow/signing-requests/${encodeURIComponent(
      signingRequestId,
    )}/sign/usb-token/jobs/${encodeURIComponent(jobId)}/complete`,
    {
      method: "POST",
      headers: { ...baseUrlHeaders(), ...actorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    },
  );
  return readJson<InternalSignResponse>(response);
}

/**
 * Tải một tệp PDF qua proxy thành `File` để các thành phần xem trước sẵn có
 * (vốn nhận `File`) dùng lại được mà không phải viết nhánh riêng cho URL.
 */
export async function fetchPdfAsFile(
  url: string,
  fileName: string,
  withActor: boolean,
  signal?: AbortSignal,
): Promise<File> {
  const response = await fetch(url, {
    headers: withActor ? { ...baseUrlHeaders(), ...actorHeaders() } : baseUrlHeaders(),
    signal,
  });
  if (!response.ok) throw await readProblem(response);

  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || "application/pdf" });
}
