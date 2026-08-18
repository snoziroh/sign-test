"use client";

import {
  compareLinksNewestFirst,
  type PublicSigningLink,
} from "@/lib/types/external-signing";

/**
 * BẢN DỰNG của kho link ký — dữ liệu giả, sống trong bộ nhớ trang.
 *
 * Vì sao nó tồn tại: ba endpoint `…/public-links` chưa được cài vào dịch vụ ký, và
 * bốn trạng thái link (`ACTIVE` / `EXPIRED` / `REVOKED` / `CONSUMED`) là phần khó
 * nhất của giao diện quản trị — mỗi trạng thái bật/tắt một bộ nút khác nhau. Không
 * có bản dựng thì chỉ xem được đúng một trạng thái: "chưa có link".
 *
 * Hai trạng thái KHÔNG thể tới bằng cách bấm nút thật: `CONSUMED` cần một người
 * ngoài hệ thống ký xong, `EXPIRED` cần chờ hết hạn. Vì thế bản dựng có thêm hai
 * lệnh mô phỏng chúng — cùng tinh thần với khối "Điều khiển bản dựng" của màn tiến
 * trình, và cũng được dán nhãn viền đứt như thế.
 *
 * Kho này KHÔNG persist: không `localStorage`, không cookie. Tải lại trang là mất
 * — đúng như một bản dựng nên hành xử, và tránh việc dữ liệu giả nằm lại trên máy
 * người test rồi bị nhầm là dữ liệu thật.
 *
 * Xoá file này (cùng công tắc bản dựng trong `public-link-panel.tsx`) khi backend
 * lên; `public-link-api.ts` không biết tới nó.
 */

/** TTL mặc định của bản dựng khi người dùng không chọn hạn — 3 ngày. */
const DEFAULT_TTL_MS = 3 * 24 * 60 * 60_000;

const store = new Map<string, PublicSigningLink[]>();

function read(signerId: string): PublicSigningLink[] {
  return store.get(signerId) ?? [];
}

function write(signerId: string, links: PublicSigningLink[]): void {
  store.set(signerId, links);
}

/** Mới nhất trước — cùng thứ tự mà panel áp lên dữ liệu thật. */
export function previewListLinks(signerId: string): PublicSigningLink[] {
  return [...read(signerId)].sort(compareLinksNewestFirst);
}

/**
 * Phát link mới.
 *
 * Thu hồi link `ACTIVE` cũ trước khi tạo, đúng luật "một signer chỉ có một link còn
 * hiệu lực" của backend. Bản dựng phải giữ luật đó, vì nó chính là lý do giao diện
 * có hộp thoại xác nhận — một bản dựng cho phép hai link active sẽ khiến hộp thoại
 * đó trông như một bước thừa.
 */
export function previewCreateLink(
  signingRequestId: string,
  signerId: string,
  expiresAt?: string,
): PublicSigningLink {
  const now = new Date();
  const revoked = read(signerId).map((link) =>
    link.status === "ACTIVE"
      ? { ...link, status: "REVOKED" as const, revokedAt: now.toISOString() }
      : link,
  );

  const token = crypto.randomUUID().replaceAll("-", "");
  const link: PublicSigningLink = {
    id: crypto.randomUUID(),
    signingRequestId,
    signerId,
    tokenHint: token.slice(0, 8),
    status: "ACTIVE",
    expiresAt: expiresAt ?? new Date(now.getTime() + DEFAULT_TTL_MS).toISOString(),
    revokedAt: null,
    consumedAt: null,
    createdAt: now.toISOString(),
    /*
     * Link trỏ vào chính trang ký của ứng dụng này, kèm `demo=1` — bấm vào là mở
     * được luồng ký mô phỏng. Token ở đây là chuỗi ngẫu nhiên vô nghĩa: bản dựng
     * không có phiên nào để đổi, và `/external-sign` ở chế độ mô phỏng cũng không
     * đọc nó.
     */
    url: `${window.location.origin}/external-sign#demo=1&t=${token}`,
  };

  write(signerId, [...revoked, link]);
  return link;
}

export function previewRevokeLink(signerId: string, linkId: string): void {
  write(
    signerId,
    read(signerId).map((link) =>
      link.id === linkId && link.status === "ACTIVE"
        ? { ...link, status: "REVOKED" as const, revokedAt: new Date().toISOString() }
        : link,
    ),
  );
}

/** Mô phỏng: người ký ngoài hệ thống đã ký xong bằng link đang hoạt động. */
export function previewConsumeLink(signerId: string): void {
  const now = new Date().toISOString();
  write(
    signerId,
    read(signerId).map((link) =>
      link.status === "ACTIVE"
        ? { ...link, status: "CONSUMED" as const, consumedAt: now }
        : link,
    ),
  );
}

/** Mô phỏng: link đang hoạt động đã quá hạn. */
export function previewExpireLink(signerId: string): void {
  write(
    signerId,
    read(signerId).map((link) =>
      link.status === "ACTIVE"
        ? {
            ...link,
            status: "EXPIRED" as const,
            // Lùi hạn về quá khứ, không chỉ đổi nhãn: panel còn tự kiểm `expiresAt`
            // (xem `isLinkUsable`), nên một bản ghi `EXPIRED` mà hạn còn ở tương lai
            // là dữ liệu tự mâu thuẫn.
            expiresAt: new Date(Date.now() - 60_000).toISOString(),
          }
        : link,
    ),
  );
}

/** Có link nào đang hoạt động để mô phỏng tiếp không. */
export function previewHasActive(signerId: string): boolean {
  return read(signerId).some((link) => link.status === "ACTIVE");
}

export function previewReset(): void {
  store.clear();
}
