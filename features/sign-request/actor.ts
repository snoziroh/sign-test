"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * NGƯỜI ĐANG THAO TÁC — giá trị của header `X-Username`.
 *
 * Dịch vụ ký trong bàn thử này chạy không có xác thực (xem đầu
 * `lib/server/sign-proxy.ts`), nhưng mọi endpoint của phân hệ quy trình ký đều
 * đòi `X-Username`, và nó không phải thứ trang trí: nó đi vào audit log, vào cột
 * `createdBy` của yêu cầu ký, và vào quyền đọc tài liệu — chỉ người tạo yêu cầu
 * và những người được chỉ định ký mới tải được tệp.
 *
 * Vì thế danh tính phải do NGƯỜI DÙNG chọn và nhìn thấy được, chứ không phải một
 * hằng số giấu trong code. Một bàn thử âm thầm gắn tên `demo` vào mọi yêu cầu sẽ
 * dựng ra một sổ audit vô nghĩa, và người test sẽ không hiểu vì sao mình không
 * mở được tài liệu của yêu cầu do "người khác" tạo.
 *
 * Cơ chế giống hệt `features/signing/api-base-url.ts`: giá trị nằm ở
 * `localStorage`, mỗi lời gọi gắn kèm header, route handler chuyển tiếp.
 */

const STORAGE_KEY = "sign-request:username";

/** Gợi ý điền nhanh. Chỉ là placeholder — không có tài khoản nào được tạo. */
export const ACTOR_SUGGESTIONS = ["admin", "user123"];

/** Giới hạn của backend: `X-Username must not exceed 128 characters`. */
export const MAX_ACTOR_LENGTH = 128;

export function normalizeActor(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_ACTOR_LENGTH);
}

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

const listeners = new Set<() => void>();
/** Xem chú thích `cached` trong `api-base-url.ts` — cùng lý do. */
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

export function getActor(): string | null {
  return snapshot();
}

export function setActor(value: string | null): void {
  const next = normalizeActor(value) ?? null;
  cached = next;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, next);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode chặn ghi: danh tính vẫn sống trong phiên hiện tại.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cached = event.newValue;
    for (const each of listeners) each();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** `null` trên server và ở lần render đầu, để markup hai bên khớp nhau. */
export function useActor(): { actor: string | null; setActor: (value: string | null) => void } {
  const actor = useSyncExternalStore(subscribe, snapshot, () => null);
  const update = useCallback((value: string | null) => setActor(value), []);
  return { actor, setActor: update };
}

/**
 * Ném khi chưa có danh tính, thay vì gửi một lời gọi chắc chắn 400.
 *
 * Bắt lỗi ở client cho người dùng câu trả lời đúng chỗ ("chọn danh tính"), còn
 * để backend từ chối thì họ nhận về một lỗi validation của framework không nói
 * được phải làm gì.
 */
export class ActorRequiredError extends Error {
  constructor() {
    super("ACTOR_REQUIRED");
    this.name = "ActorRequiredError";
  }
}

/** Header danh tính cho MỌI lời gọi tới `/api/workflow/*`. */
export function actorHeaders(): Record<string, string> {
  const actor = getActor();
  if (!actor) throw new ActorRequiredError();
  return { "X-Username": actor };
}
