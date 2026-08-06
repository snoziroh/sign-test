"use client";

import { useCallback, useSyncExternalStore } from "react";
import { validateBaseUrl } from "@/features/signing/api-base-url";

/**
 * Địa chỉ dịch vụ **verify**, cấu hình được ngay trên giao diện.
 *
 * Vì sao tách hẳn khỏi địa chỉ dịch vụ ký (`features/signing/api-base-url.ts`):
 * đây là hai service chạy trên hai cổng khác nhau (ký `:8080`, verify `:8082`).
 * Dùng chung một ô nhập thì mỗi lần chuyển màn lại phải sửa địa chỉ, và luồng
 * dùng thật — ký ở tab này, verify kết quả ở tab kia — không chạy được.
 *
 * Cơ chế giống hệt bên ký: giá trị nằm ở `localStorage`, mỗi lời gọi gắn header
 * `X-Verify-Base-Url`, route handler đọc header đó. Trình duyệt KHÔNG gọi thẳng
 * địa chỉ này — vẫn đi qua `/api/verify/*` để tránh CORS.
 *
 * `VERIFY_API_URL` trong `.env` là giá trị dùng khi người dùng chưa đặt gì.
 */

const STORAGE_KEY = "verify:api-base-url";

/** Gợi ý điền nhanh. Chỉ là placeholder — không có gì được gọi tự động. */
export const VERIFY_BASE_URL_SUGGESTIONS = [
  "http://localhost:8082",
  "http://127.0.0.1:8082",
];

const listeners = new Set<() => void>();
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
export function getVerifyBaseUrl(): string | null {
  return snapshot();
}

export function setVerifyBaseUrl(value: string | null): void {
  const next = value ? validateBaseUrl(value).normalized ?? null : null;
  cached = next;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, next);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode / policy chặn: giá trị vẫn sống trong phiên hiện tại.
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
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

/** `null` trên server và ở lần render đầu để markup khớp nhau. */
export function useVerifyBaseUrl(): {
  baseUrl: string | null;
  setBaseUrl: (value: string | null) => void;
} {
  const baseUrl = useSyncExternalStore(subscribe, snapshot, () => null);
  const setBaseUrl = useCallback((value: string | null) => setVerifyBaseUrl(value), []);
  return { baseUrl, setBaseUrl };
}

/** Header gắn vào MỌI lời gọi tới `/api/verify/*`. */
export function verifyBaseUrlHeaders(override?: string): Record<string, string> {
  const baseUrl = override ?? getVerifyBaseUrl();
  return baseUrl ? { "X-Verify-Base-Url": baseUrl } : {};
}
