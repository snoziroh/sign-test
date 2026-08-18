"use client";

import type {
  CreatePublicSigningLinkBody,
  PublicSigningLink,
} from "@/lib/types/external-signing";
import { baseUrlHeaders } from "@/features/signing/api-base-url";
import { readProblem, SigningApiClientError } from "@/features/signing/api";
import { actorHeaders } from "./actor";

/**
 * Quản trị link ký ngoài hệ thống — phía NGƯỜI TẠO yêu cầu ký (§4 của
 * `EXTERNAL_SIGNING_FRONTEND_INTEGRATION.md`).
 *
 * Đây là nửa còn lại của luồng mà `/external-sign` phục vụ, và hai nửa đi qua hai
 * lớp proxy khác nhau vì hai lý do khác nhau:
 *
 * - Nửa này là API NỘI BỘ: đòi `X-Username`, đi qua `/api/workflow/*`, dùng chung
 *   base URL cấu hình trên giao diện với màn `/sign`.
 * - Nửa công khai không có danh tính nội bộ nào, đi qua `/api/public/*`, và địa chỉ
 *   backend chỉ đến từ biến môi trường.
 *
 * Trộn hai bên là mở đường cho một trang công khai gọi API nội bộ.
 *
 * **BACKEND CHƯA CÓ.** Ba endpoint dưới đây thuộc cùng contract mục tiêu với nhóm
 * `/api/public/**`. Client viết đúng theo tài liệu để lúc backend lên là chạy được;
 * tới lúc đó `isEndpointMissing` phân biệt "chưa cài" với lỗi thật, và panel dùng
 * nó để nói ra điều gì đang thiếu thay vì hiện một lỗi đỏ chung chung.
 */

function linksPath(signingRequestId: string, signerId: string): string {
  return `/api/workflow/signing-requests/${encodeURIComponent(
    signingRequestId,
  )}/signers/${encodeURIComponent(signerId)}/public-links`;
}

/**
 * Danh sách link của một signer.
 *
 * `url` của mọi phần tử là `null` — xem chú thích `PublicSigningLink`. Đừng dựng
 * giao diện nào chờ đọc lại token từ đây.
 */
export async function listPublicLinks(
  signingRequestId: string,
  signerId: string,
  signal?: AbortSignal,
): Promise<PublicSigningLink[]> {
  const response = await fetch(linksPath(signingRequestId, signerId), {
    headers: { ...baseUrlHeaders(), ...actorHeaders() },
    signal,
  });
  if (!response.ok) throw await readProblem(response);
  return (await response.json()) as PublicSigningLink[];
}

/**
 * Phát một link mới.
 *
 * Phản hồi `201` mang `url` — **lần duy nhất** token thô tồn tại ngoài backend.
 * Người gọi phải đưa nó thẳng vào state của giao diện; không log, không persist,
 * không gửi sang bất kỳ dịch vụ theo dõi nào.
 *
 * Backend THU HỒI link `ACTIVE` cũ trước khi tạo (mỗi signer chỉ có một link còn
 * hiệu lực). Vì thế lời gọi này luôn phải đứng sau một hộp thoại xác nhận khi
 * signer đang có link — nó là thao tác phá huỷ, dù trông như một thao tác thêm.
 */
export async function createPublicLink(
  signingRequestId: string,
  signerId: string,
  body: CreatePublicSigningLinkBody = {},
  signal?: AbortSignal,
): Promise<PublicSigningLink> {
  const hasBody = Boolean(body.expiresAt);

  const response = await fetch(linksPath(signingRequestId, signerId), {
    method: "POST",
    headers: {
      ...baseUrlHeaders(),
      ...actorHeaders(),
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? JSON.stringify(body) : undefined,
    signal,
  });
  if (!response.ok) throw await readProblem(response);
  return (await response.json()) as PublicSigningLink;
}

/** Thu hồi. `204 No Content` nên không đọc thân. */
export async function revokePublicLink(
  signingRequestId: string,
  signerId: string,
  linkId: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    `${linksPath(signingRequestId, signerId)}/${encodeURIComponent(linkId)}/revoke`,
    {
      method: "POST",
      headers: { ...baseUrlHeaders(), ...actorHeaders() },
      signal,
    },
  );
  if (!response.ok) throw await readProblem(response);
}

/**
 * Lỗi này là "backend chưa cài endpoint", không phải "thao tác thất bại".
 *
 * Chỉ nhận `404` và `501`. CỐ Ý không nhận `500`: một endpoint đã tồn tại mà lỗi
 * bên trong cũng trả 500, và gộp hai thứ đó lại sẽ nói với người test rằng API còn
 * thiếu trong khi thật ra nó vừa hỏng — hai kết luận dẫn tới hai chỗ sửa khác nhau.
 */
export function isEndpointMissing(error: unknown): boolean {
  return (
    error instanceof SigningApiClientError && (error.status === 404 || error.status === 501)
  );
}
