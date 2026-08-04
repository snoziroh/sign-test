"use client";

import type {
  FptEnrollmentRequest,
  FptEnrollmentResponse,
  FptEnrollmentStatusResponse,
  MaterialMode,
  MpkiCredential,
  MpkiCredentialDetail,
  RemoteCaVendor,
  SignCapabilities,
  SignRequestPayload,
  SignResponse,
  SignedDocument,
  UsbTokenCompleteRequest,
  UsbTokenJob,
  UsbTokenJobRequest,
} from "@/lib/types/signing";
import { baseUrlHeaders } from "./api-base-url";
import { readProblem } from "./api";

/**
 * Client cho Signing Service. Mọi lời gọi đi qua proxy `/api/signing/*` và mang
 * theo header `X-Signing-Base-Url` để proxy biết gọi môi trường nào.
 *
 * Khác với các contract trước: response KHÔNG bọc envelope `{ data, meta }` —
 * body chính là dữ liệu. Đừng bóc `.data`.
 */

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await readProblem(response);
  return (await response.json()) as T;
}

/* ------------------------------------------------------------------ *
 * Capabilities
 * ------------------------------------------------------------------ */

/**
 * Ma trận nguồn chữ ký. Gọi không tham số để dựng màn hình chọn nguồn — lọc
 * theo `materialMode`/`vendor` chỉ hữu ích khi soi một nguồn cụ thể.
 *
 * `baseUrlOverride` phục vụ nút "Kiểm tra kết nối": nó phải thử một địa chỉ
 * NGƯỜI DÙNG ĐANG GÕ, chưa lưu vào store.
 */
export async function getCapabilities(options?: {
  materialMode?: MaterialMode;
  vendor?: RemoteCaVendor;
  baseUrlOverride?: string;
  signal?: AbortSignal;
}): Promise<SignCapabilities> {
  const query = new URLSearchParams();
  if (options?.materialMode) query.set("materialMode", options.materialMode);
  if (options?.vendor) query.set("vendor", options.vendor);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  const response = await fetch(`/api/signing/capabilities${suffix}`, {
    headers: options?.baseUrlOverride
      ? { "X-Signing-Base-Url": options.baseUrlOverride }
      : baseUrlHeaders(),
    signal: options?.signal,
  });
  return readJson<SignCapabilities>(response);
}

/* ------------------------------------------------------------------ *
 * POST /sign
 * ------------------------------------------------------------------ */

export interface SignRequestFiles {
  /** Tài liệu cần ký. KHÔNG gửi ở bước CONTINUE — bản đã dựng nằm trong phiên. */
  file?: File;
  /** File .p12/.pfx, chỉ luồng PKCS#12. */
  p12File?: File;
}

/**
 * Gửi một bước ký. Part `request` phải là JSON có `Content-Type` rõ ràng —
 * append chuỗi trần thì backend đọc nó như text/plain và từ chối, nên ở đây gói
 * bằng `Blob` với type `application/json`.
 *
 * KHÔNG tự gửi lại khi lỗi mạng: với eSign Cloud, một lần START hay một lần
 * CONTINUE-từ-PENDING_IDENTITY là một lượt ký bị trừ. Quyết định gửi lại luôn
 * thuộc về người dùng, sau khi họ đã đọc cảnh báo.
 */
export async function submitSignStep(
  payload: SignRequestPayload,
  files: SignRequestFiles = {},
  signal?: AbortSignal,
): Promise<SignResponse> {
  const form = new FormData();
  form.append(
    "request",
    new Blob([JSON.stringify(payload)], { type: "application/json" }),
  );
  if (files.file) form.append("file", files.file, files.file.name);
  if (files.p12File) form.append("p12File", files.p12File, files.p12File.name);

  const response = await fetch("/api/signing/sign", {
    method: "POST",
    headers: baseUrlHeaders(),
    body: form,
    signal,
  });
  return readJson<SignResponse>(response);
}

/* ------------------------------------------------------------------ *
 * FPT MPKI App
 * ------------------------------------------------------------------ */

export async function listMpkiCredentials(
  username: string,
  signal?: AbortSignal,
): Promise<MpkiCredential[]> {
  const query = new URLSearchParams({ username });
  const response = await fetch(`/api/signing/remote-ca/mpki/credentials?${query.toString()}`, {
    headers: baseUrlHeaders(),
    signal,
  });
  const body = await readJson<MpkiCredential[] | { credentials?: MpkiCredential[] }>(response);
  // Backend trả mảng trần. Chấp nhận cả dạng bọc để một lần đổi contract nhỏ ở
  // phía service không làm trắng màn hình chọn credential.
  return Array.isArray(body) ? body : (body.credentials ?? []);
}

export async function getMpkiCredential(
  credentialId: string,
  signal?: AbortSignal,
): Promise<MpkiCredentialDetail> {
  const response = await fetch(
    `/api/signing/remote-ca/mpki/credentials/${encodeURIComponent(credentialId)}`,
    { headers: baseUrlHeaders(), signal },
  );
  return readJson<MpkiCredentialDetail>(response);
}

/* ------------------------------------------------------------------ *
 * FPT eSign Cloud
 * ------------------------------------------------------------------ */

/**
 * Đăng ký chứng thư riêng lẻ. Chỉ dùng khi muốn tách pha đăng ký khỏi pha ký —
 * bước START tự đăng ký khi thiếu `agreementUuid`.
 *
 * `agreementUuid` trả về phải được GIỮ LẠI: mỗi lần đăng ký lại là một giao dịch
 * mới bên FPT cho cùng một người ký.
 */
export async function createFptEnrollment(
  payload: FptEnrollmentRequest,
  signal?: AbortSignal,
): Promise<FptEnrollmentResponse> {
  const response = await fetch("/api/signing/remote-ca/fpt/enrollments", {
    method: "POST",
    headers: { ...baseUrlHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  return readJson<FptEnrollmentResponse>(response);
}

/**
 * 💸 TẠO GIAO DỊCH, trừ một lượt ký mỗi lần gọi. Không có API chỉ-đọc thay thế.
 * Chỉ gọi khi người dùng chủ động bấm và đã đọc cảnh báo — tuyệt đối không poll.
 */
export async function checkFptEnrollmentStatus(
  agreementUuid: string,
  signal?: AbortSignal,
): Promise<FptEnrollmentStatusResponse> {
  const response = await fetch(
    `/api/signing/remote-ca/fpt/enrollments/${encodeURIComponent(agreementUuid)}/status`,
    { method: "POST", headers: baseUrlHeaders(), signal },
  );
  return readJson<FptEnrollmentStatusResponse>(response);
}

/* ------------------------------------------------------------------ *
 * FPT USB Token
 * ------------------------------------------------------------------ */

/**
 * Nộp PDF, nhận digest để USB Token ký. Job sống 15 phút và chỉ dùng được MỘT
 * lần — gọi lại là một job mới, và một lần nhập PIN nữa.
 *
 * Part `request` gói bằng `Blob` có type `application/json` vì lý do y hệt
 * `submitSignStep`: append chuỗi trần thì backend đọc nó như text/plain.
 */
export async function createUsbTokenJob(
  file: File,
  request: UsbTokenJobRequest,
  signal?: AbortSignal,
): Promise<UsbTokenJob> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append(
    "request",
    new Blob([JSON.stringify(request)], { type: "application/json" }),
  );

  const response = await fetch("/api/signing/usb-token/signing-jobs", {
    method: "POST",
    headers: baseUrlHeaders(),
    body: form,
    signal,
  });
  return readJson<UsbTokenJob>(response);
}

/**
 * Nộp chữ ký lấy từ agent để backend hoàn thiện PDF. Response dùng chung vỏ
 * `SignResponse`, và `document` chỉ tồn tại trong đúng phản hồi này.
 */
export async function completeUsbTokenJob(
  jobId: string,
  payload: UsbTokenCompleteRequest,
  signal?: AbortSignal,
): Promise<SignResponse> {
  const response = await fetch(
    `/api/signing/usb-token/signing-jobs/${encodeURIComponent(jobId)}/complete`,
    {
      method: "POST",
      headers: { ...baseUrlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    },
  );
  return readJson<SignResponse>(response);
}

/* ------------------------------------------------------------------ *
 * Tải tệp đã ký
 * ------------------------------------------------------------------ */

/**
 * Tệp đã ký chỉ tồn tại trong response dưới dạng base64 — không có endpoint tải
 * riêng, và phiên bị xoá ngay sau khi COMPLETED. Vì vậy việc dựng lại Blob phải
 * làm từ dữ liệu đang giữ trong bộ nhớ, không gọi lại mạng.
 */
export function signedDocumentBlob(document: SignedDocument): Blob {
  const binary = atob(document.contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: document.contentType || "application/octet-stream" });
}

export function downloadSignedDocument(document: SignedDocument): void {
  const blob = signedDocumentBlob(document);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = document.fileName || "signed";
  anchor.hidden = true;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/** Tệp đã ký thành `File` để nộp lại ngay cho lần ký kế tiếp (co-sign / counter-sign). */
export function signedDocumentAsFile(document: SignedDocument): File {
  return new File([signedDocumentBlob(document)], document.fileName || "signed", {
    type: document.contentType || "application/octet-stream",
  });
}

export function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      window.clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
