"use client";

import type { Dictionary } from "@/lib/i18n";
import type { ExternalSigningError } from "./api";

/**
 * Mã lỗi → câu người ký ngoài hệ thống đọc được.
 *
 * Khác `describeSigningError` của màn `/sign` ở hai điểm, và cả hai đều cố ý:
 *
 * 1. **Đi qua từ điển i18n.** Bảng bên `/sign` là tiếng Việt cứng, chấp nhận được
 *    cho một bàn thử nội bộ. Trang này có công tắc ngôn ngữ và người đọc có thể
 *    không đọc được tiếng Việt.
 * 2. **Mỗi lỗi có TITLE và VIỆC CẦN LÀM.** Người ký không sửa được cấu hình, không
 *    đọc được log và không tự tạo lại link. Một câu chẩn đoán không kèm đường ra
 *    chỉ làm họ bấm lại đúng thứ vừa thất bại.
 *
 * Mã lạ rơi về `unknown` KÈM câu của backend: câu đó do người viết dịch vụ đặt và
 * thường cụ thể hơn bất cứ câu chung nào ở đây. Bản thân `code` cũng được hiện ra
 * để họ đọc lại cho người gửi.
 */

export interface ExternalSigningMessage {
  title: string;
  body: string;
  /** Mã kỹ thuật — hiện nhỏ, để đọc lại cho người gửi khi cần báo lỗi. */
  code?: string;
  correlationId?: string;
}

type ErrorDictionary = Dictionary["externalSign"]["errors"];

export function describeExternalSigningError(
  t: Dictionary,
  error?: ExternalSigningError,
): ExternalSigningMessage {
  const dictionary = t.externalSign.errors;
  const code = error?.code;

  const known =
    code && code in dictionary
      ? (dictionary[code as keyof ErrorDictionary] as { title: string; body: string })
      : undefined;

  if (known) {
    return {
      title: known.title,
      body: known.body,
      code,
      correlationId: error?.correlationId,
    };
  }

  return {
    title: dictionary.unknownTitle,
    body: error?.serverMessage || dictionary.unknownBody,
    code,
    correlationId: error?.correlationId,
  };
}

/**
 * Xung đột của KÝ SONG SONG, không phải hỏng hóc.
 *
 * Nhiều người cùng một `signingOrder` mở lượt cùng lúc, nhưng chữ ký được áp vào
 * tài liệu tuần tự — nên người nộp sau gặp `SIGNING_DOCUMENT_CHANGED` (409). Cách
 * xử lý là tải lại tài liệu + signature plan rồi ký lại, KHÔNG phải báo "ký thất
 * bại": phiên vẫn sống và lần ký lại thường thành công ngay.
 *
 * Cùng mã đó gặp ở bước ĐỔI LINK thì lại là chuyện khác — tài liệu đã đổi từ
 * trước khi link được mở, và người ký cần một link mới. Vì thế màn "link không
 * dùng được" vẫn giữ câu cũ trong `errors.SIGNING_DOCUMENT_CHANGED`; chỉ luồng ký
 * mới đi qua hàm này.
 */
export function isDocumentChanged(error?: ExternalSigningError): boolean {
  return error?.code === "SIGNING_DOCUMENT_CHANGED";
}

/**
 * Lỗi mà thử lại có nghĩa. Hết hạn, link sai, chưa tới lượt — thử lại chỉ ra đúng
 * kết quả đó lần nữa, nên nút "thử lại" không được xuất hiện ở những màn đó: nó
 * biến một câu trả lời rõ ràng thành một vòng lặp. Tài liệu đã đổi thì KHÔNG nằm
 * ở đây vì nó không bao giờ tới màn lỗi — xem `isDocumentChanged`.
 */
export function isRetryable(error?: ExternalSigningError): boolean {
  if (!error) return false;
  return (
    error.code === "EXTERNAL_SIGNING_API_UNREACHABLE" ||
    error.code === "EXTERNAL_SIGNING_UNKNOWN_ERROR"
  );
}
