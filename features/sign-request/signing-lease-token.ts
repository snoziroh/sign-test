"use client";

/**
 * Nơi giữ tạm `leaseToken` giữa lúc bấm "Ký ngay" ở Workflow Detail và lúc màn
 * ký thật sự gửi bước START.
 *
 * `sessionStorage`, KHÔNG `localStorage`: token đại diện cho một lượt giành
 * quyền ký còn hiệu lực, không phải một thứ nên sống qua việc đóng tab. Khoá
 * theo `signingRequestId` để token của yêu cầu A không lẫn sang yêu cầu B khi
 * người dùng mở nhiều quy trình trong cùng một phiên trình duyệt.
 *
 * Không bao giờ được render ra UI, log ra console, hay đưa vào URL — xem
 * `lib/types/signing-lease.ts`.
 */

function storageKey(signingRequestId: string): string {
  return `signingLease:${signingRequestId}`;
}

export function readLeaseToken(signingRequestId: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage.getItem(storageKey(signingRequestId)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveLeaseToken(signingRequestId: string, leaseToken: string): void {
  try {
    window.sessionStorage.setItem(storageKey(signingRequestId), leaseToken);
  } catch {
    // Private mode / policy chặn ghi: token chỉ sống trong state của trang hiện
    // tại, không chặn luồng ký vì chuyện đó.
  }
}

export function clearLeaseToken(signingRequestId: string): void {
  try {
    window.sessionStorage.removeItem(storageKey(signingRequestId));
  } catch {
    // Không có gì để dọn nếu ghi vốn đã không hoạt động.
  }
}
