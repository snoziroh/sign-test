/**
 * SIGNING LEASE — quyền ký ĐỘC QUYỀN của một lượt ký, do backend cấp.
 *
 * Vì sao có: một cấp trong quy trình có thể có nhiều người ký song song, nhưng
 * chữ ký được áp vào tài liệu TUẦN TỰ. Không có lease thì hai người cùng bấm ký
 * và người nộp sau ăn `SIGNING_DOCUMENT_CHANGED` sau khi đã nhập mật khẩu chứng
 * thư (hoặc tệ hơn: sau khi eSign Cloud đã trừ một lượt ký thật). Lease dịch cái
 * xung đột đó lên TRƯỚC bước ký, thành một câu chờ đọc được.
 *
 * Cùng một hợp đồng cho CẢ HAI luồng, chỉ khác cách xác thực:
 *
 * ```
 * GET|DELETE /api/signing-requests/{id}/sign/lease   → X-Username
 * GET|DELETE /api/public/signing-session/lease       → cookie phiên (+ CSRF cho DELETE)
 * ```
 *
 * `leaseToken` là chuyện NỘI BỘ của backend. Frontend không có nó, không sinh
 * ra nó, và không gửi nó trong bất kỳ request nào — mọi lệnh ký vẫn đi đúng
 * hình dạng cũ.
 *
 * Và quan trọng nhất: `AVAILABLE` KHÔNG phải một lời hứa. Giữa lúc GET trả về
 * và lúc POST tới nơi, người khác vẫn chen vào được — nên `SIGNING_LEASE_LOCKED`
 * (409) vẫn phải có nhánh xử lý ở mọi lệnh ký. Lease chỉ làm cho ca đó HIẾM,
 * không làm nó biến mất.
 */

/**
 * - `AVAILABLE` — chưa ai giữ. Đây là trạng thái DUY NHẤT cho phép START.
 * - `HELD_BY_YOU` — chính người ký này đang giữ một lượt ký đang mở. KHÔNG phải
 *   giấy phép START lần nữa: đường ra là tiếp tục lượt đó, hoặc huỷ nó đi.
 * - `LOCKED` — người khác đang giữ. Chờ, và hỏi lại.
 */
export type SigningLeaseState = "AVAILABLE" | "HELD_BY_YOU" | "LOCKED";

export interface SigningLeaseResponse {
  state: SigningLeaseState;
  /** Chỉ có nghĩa với `LOCKED`/`HELD_BY_YOU`. KHÔNG hiện ở màn ký công khai. */
  holderSignerId: string | null;
  /** Danh tính nội bộ của người đang giữ. KHÔNG hiện ở màn ký công khai. */
  holderUserId: string | null;
  /** Nhãn người đọc được ("Giám đốc"). Chỉ màn NỘI BỘ được hiện. */
  holderLabel: string | null;
  expiresAt: string | null;
  /**
   * Hạn tối đa của lease đang giữ, tính bằng giây.
   *
   * Dùng để NÓI cho người chờ biết còn tối đa bao lâu — KHÔNG dùng làm nhịp
   * poll: người ký hiện tại thường xong sớm hơn nhiều và backend giải phóng
   * lease ngay lúc đó. Đợi hết `retryAfterSeconds` mới hỏi lại là bắt người sau
   * ngồi không trong khi lượt ký đã trống từ lâu.
   */
  retryAfterSeconds: number;
}

/**
 * Bốn mã 409 mà MỌI lệnh ký (START, CONTINUE, USB prepare/complete) có thể trả
 * về, và mỗi mã có một đường ra khác nhau — xem `features/signing/signing-lease.ts`.
 *
 * `SIGNING_LEASE_REQUIRED` — riêng của bước START/USB prepare khi client KHÔNG
 * gửi kèm `X-Signing-Lease-Token`: cục bộ đã mất token trước khi lệnh kịp đi.
 */
export const SIGNING_LEASE_ERROR_CODES = [
  "SIGNING_LEASE_LOCKED",
  "SIGNING_LEASE_LOST",
  "SIGNING_LEASE_REQUIRED",
] as const;

export type SigningLeaseErrorCode = (typeof SIGNING_LEASE_ERROR_CODES)[number];

/**
 * Phản hồi của `POST /sign/lease` — GIÀNH lấy quyền ký độc quyền.
 *
 * `leaseToken` chỉ xuất hiện ở đây, KHÔNG có ở `GET`: nó đại diện cho đúng lượt
 * giành quyền này, và frontend giữ nó tạm thời (state sống xuyên navigation,
 * hoặc `sessionStorage` nếu điều hướng làm mất state) để đính vào bước START
 * (`X-Signing-Lease-Token`) và bước huỷ (`DELETE`). Không tự sinh, không log,
 * không hiện ra UI.
 */
export interface SigningLeaseAcquireResponse extends SigningLeaseResponse {
  leaseToken: string;
}
