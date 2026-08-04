"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Địa chỉ dịch vụ ký, cấu hình được ngay trên giao diện.
 *
 * Vì sao không dùng biến môi trường: bàn thử này chạy đi chạy lại trên ba môi
 * trường (localhost, domain nội bộ, IP public) trong cùng một buổi. Sửa
 * `.env.local` rồi khởi động lại dev server cho mỗi lần đổi là quá chậm, và
 * người test thường không có quyền sửa file đó.
 *
 * Cơ chế: giá trị nằm ở `localStorage`, mỗi lời gọi API gắn kèm header
 * `X-Signing-Base-Url`, route handler đọc header đó. Địa chỉ KHÔNG bao giờ được
 * gọi thẳng từ trình duyệt — vẫn đi qua proxy, để tránh CORS và để một IP public
 * không bật CORS vẫn dùng được.
 *
 * `SIGNING_API_URL` trong `.env` vẫn còn tác dụng: nó là giá trị dùng khi người
 * dùng chưa đặt gì trên giao diện.
 */

const STORAGE_KEY = "sign:api-base-url";

/** Gợi ý điền nhanh. Chỉ là placeholder — không có gì được gọi tự động. */
export const BASE_URL_SUGGESTIONS = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

export interface BaseUrlValidation {
  valid: boolean;
  /** Giá trị đã chuẩn hoá (bỏ dấu `/` cuối) — chỉ có khi `valid`. */
  normalized?: string;
  reason?: "empty" | "malformed" | "scheme";
}

/**
 * Kiểm tra ở client bằng đúng luật của server (`normalizeBaseUrl` trong
 * `lib/server/sign-proxy.ts`), nhưng phân loại được lý do để hiện thông báo cụ
 * thể. Server vẫn kiểm lại — đây chỉ là lớp phản hồi sớm.
 */
export function validateBaseUrl(value: string): BaseUrlValidation {
  const raw = value.trim();
  if (!raw) return { valid: false, reason: "empty" };

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { valid: false, reason: "malformed" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, reason: "scheme" };
  }

  return { valid: true, normalized: `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}` };
}

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

const listeners = new Set<() => void>();
/**
 * Bản sao trong bộ nhớ: `useSyncExternalStore` yêu cầu `getSnapshot` trả về giá
 * trị ổn định giữa hai lần thay đổi, mà đọc thẳng `localStorage` mỗi lần render
 * thì không đảm bảo được điều đó khi storage ném lỗi.
 */
let cached: string | null | undefined;

function readStorage(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function snapshot(): string | null {
  if (cached === undefined) cached = readStorage();
  return cached;
}

function emit() {
  for (const listener of listeners) listener();
}

/** Địa chỉ người dùng đã đặt; `null` nghĩa là "dùng mặc định của máy chủ". */
export function getApiBaseUrl(): string | null {
  return snapshot();
}

export function setApiBaseUrl(value: string | null): void {
  const next = value ? validateBaseUrl(value).normalized ?? null : null;
  cached = next;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, next);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode / policy chặn: giá trị vẫn sống trong phiên hiện tại, chỉ
    // không sống qua lần tải trang sau. Không chặn luồng ký vì chuyện đó.
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Đổi baseUrl ở tab khác cũng phải phản ánh sang tab này — nếu không, hai tab
  // cùng mở sẽ ký vào hai môi trường khác nhau mà giao diện hiển thị như nhau.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cached = event.newValue;
    emit();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * `null` trên server và ở lần render đầu (server snapshot) để markup khớp nhau;
 * giá trị thật xuất hiện ngay sau khi hydrate.
 */
export function useApiBaseUrl(): {
  baseUrl: string | null;
  setBaseUrl: (value: string | null) => void;
} {
  const baseUrl = useSyncExternalStore(subscribe, snapshot, () => null);
  const setBaseUrl = useCallback((value: string | null) => setApiBaseUrl(value), []);
  return { baseUrl, setBaseUrl };
}

/**
 * Header gắn vào MỌI lời gọi tới `/api/signing/*`. Không đặt header khi người
 * dùng chưa chọn gì — lúc đó server dùng `SIGNING_API_URL`.
 */
export function baseUrlHeaders(): Record<string, string> {
  const baseUrl = getApiBaseUrl();
  return baseUrl ? { "X-Signing-Base-Url": baseUrl } : {};
}
