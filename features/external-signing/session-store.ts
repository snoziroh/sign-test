"use client";

/**
 * Hai mẩu trạng thái mà trang ký công khai phải tự giữ, và ranh giới rất rõ giữa
 * chúng:
 *
 * - **Link token** — chỉ tồn tại trong URL fragment, đọc đúng một lần rồi xoá
 *   khỏi thanh địa chỉ. KHÔNG bao giờ đi vào `localStorage`, `sessionStorage`,
 *   IndexedDB, state persist, log hay analytics. Nó đủ để ký thay người khác.
 * - **CSRF token** — được phép nằm trong `sessionStorage`, vì một mình nó không
 *   ký được gì: lệnh ký còn cần cookie phiên `HttpOnly` mà JS không đọc nổi. Đây
 *   là thứ duy nhất giúp phiên sống qua một lần F5.
 *
 * Cookie phiên KHÔNG có mặt trong file này và không thể có: `HttpOnly` nghĩa là
 * trình duyệt tự gắn nó, JS không thấy. Mọi lời gọi vì thế phải dùng
 * `credentials: "include"`.
 */

const CSRF_STORAGE_KEY = "external-signing-csrf";

/** Fragment `#t=RAW_TOKEN` — quy ước của link ký. */
const TOKEN_FRAGMENT_KEY = "t";

/** `#demo=1` — bật chế độ mô phỏng, xem `demo-session.ts`. */
const DEMO_FRAGMENT_KEY = "demo";

interface StoredSession {
  csrfToken: string;
  /** Chỉ là một mốc thời gian — không bí mật, và giữ được đồng hồ đếm ngược qua F5. */
  sessionExpiresAt?: string;
}

function fragmentParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
}

/**
 * Token nằm trong FRAGMENT chứ không phải query string, và đó là một quyết định
 * có hệ quả: fragment không được trình duyệt gửi lên server, không vào access
 * log, không vào header `Referer`. Chuyển nó sang `?t=` là làm token xuất hiện
 * trong log của mọi lớp hạ tầng trên đường đi.
 */
export function readExternalSigningToken(): string | null {
  return fragmentParams().get(TOKEN_FRAGMENT_KEY);
}

export function readDemoFlag(): boolean {
  return fragmentParams().get(DEMO_FRAGMENT_KEY) === "1";
}

/**
 * Xoá fragment ngay sau khi exchange thành công.
 *
 * `replaceState` chứ không phải `pushState`: đẩy thêm một mục vào history nghĩa
 * là nút Back đưa người ký trở lại đúng URL còn mang token.
 *
 * Giữ lại các tham số khác của fragment (hiện chỉ có `demo`) để chế độ mô phỏng
 * không tự tắt sau bước đầu tiên.
 */
export function clearExternalSigningToken(): void {
  if (typeof window === "undefined") return;

  const params = fragmentParams();
  params.delete(TOKEN_FRAGMENT_KEY);
  const rest = params.toString();

  window.history.replaceState(
    null,
    document.title,
    `${window.location.pathname}${rest ? `#${rest}` : ""}`,
  );
}

/* ------------------------------------------------------------------ *
 * CSRF
 * ------------------------------------------------------------------ */

function read(): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(CSRF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    return typeof parsed?.csrfToken === "string" ? parsed : null;
  } catch {
    // Private mode / JSON hỏng: coi như chưa có phiên nào. Người ký mở lại link.
    return null;
  }
}

export function saveExternalSigningSession(session: StoredSession): void {
  try {
    window.sessionStorage.setItem(CSRF_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Không lưu được thì phiên chỉ sống tới lần F5 kế tiếp — không chặn luồng ký
    // vì chuyện đó.
  }
}

export function getExternalSigningCsrf(): string | null {
  return read()?.csrfToken ?? null;
}

export function getExternalSigningExpiry(): string | undefined {
  return read()?.sessionExpiresAt;
}

/**
 * Xoá mọi dấu vết của phiên. Gọi ở ba chỗ: ký xong, phiên hết hạn, và mọi lỗi
 * 401/403/410 — giữ lại một CSRF chết chỉ khiến lần tải trang sau tưởng còn phiên
 * rồi lại thất bại thêm một lần nữa.
 */
export function clearExternalSigningSession(): void {
  try {
    window.sessionStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    // Không đọc được storage thì cũng không có gì để xoá.
  }
}
