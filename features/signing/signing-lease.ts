"use client";

/**
 * Bốn mã 409 mà lease sinh ra, và cách đọc chúng từ CẢ HAI kiểu lỗi của ứng
 * dụng — `SigningApiClientError` (luồng nội bộ, problem+json) và
 * `ExternalSigningError` (luồng công khai, `{ timestamp, status, code, … }`).
 *
 * Vì sao không import hai lớp lỗi đó vào đây: file này được dùng bởi cả hai
 * luồng, và kéo `features/external-signing` vào phần dùng chung của `signing`
 * là dựng một vòng phụ thuộc chỉ để đọc đúng một trường `code` mà cả hai lớp
 * đều có sẵn dưới cùng một cái tên. Đọc theo hình dạng là đủ, và nó còn đúng
 * với mọi lớp lỗi được thêm về sau.
 */

function codeOf(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

/**
 * Người khác đã giành được lượt ký trước.
 *
 * Đây là ca mà `GET lease → AVAILABLE` KHÔNG loại bỏ được: giữa lúc đọc trạng
 * thái và lúc lệnh START tới nơi, một người cùng cấp vẫn chen vào được. Đường
 * ra là chuyển sang trạng thái CHỜ (đọc lại lease, bật poll) — KHÔNG phải gửi
 * lại START: lần thử thứ hai chỉ nhận đúng mã này lần nữa, và với eSign Cloud
 * mỗi lần START là một lượt ký bị trừ.
 */
export function isLeaseLocked(error: unknown): boolean {
  return codeOf(error) === "SIGNING_LEASE_LOCKED";
}

/**
 * Lease của lượt ký ĐANG DỞ đã mất — hết hạn, hoặc đã được chuyển cho người
 * khác.
 *
 * Khác `SIGNING_LEASE_LOCKED` ở chỗ nó luôn tới GIỮA một lượt ký: bước CONTINUE
 * của eSign Cloud, hoặc bước complete của USB Token. Mọi thứ client còn giữ của
 * lượt đó (phiên engine, `jobId`, digest đã dựng, hộp thoại OTP đang mở) từ giây
 * này trở đi là rác — nối tiếp chúng chỉ ra lỗi, và tệ hơn là làm người ký tưởng
 * mình vẫn đang trong một lượt ký còn sống.
 */
export function isLeaseLost(error: unknown): boolean {
  return codeOf(error) === "SIGNING_LEASE_LOST";
}

/**
 * Client KHÔNG gửi kèm `X-Signing-Lease-Token` ở một lệnh bắt buộc có nó (START,
 * USB prepare) — cục bộ đã mất token (chưa từng giành, hay đã bị xoá) trước khi
 * lệnh kịp đi. Đường ra: xoá token cục bộ (không có gì để xoá thêm) và quay lại
 * màn giành quyền ký (Workflow Detail) — KHÔNG tự POST acquire ở đây.
 */
export function isLeaseRequired(error: unknown): boolean {
  return codeOf(error) === "SIGNING_LEASE_REQUIRED";
}

/** Bất kỳ mã nào của lease — dùng khi cả hai nhánh đều phải đọc lại trạng thái. */
export function isLeaseConflict(error: unknown): boolean {
  return isLeaseLocked(error) || isLeaseLost(error) || isLeaseRequired(error);
}
