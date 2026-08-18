import type { ContentType } from "@/lib/types/domain";
import type { DocumentFormat } from "@/lib/types/signing";

/**
 * Helper về tệp và định dạng, dùng chung giữa panel tài liệu và form cấu hình ký.
 *
 * Nhãn thuật toán CỐ Ý không nằm ở đây nữa: nó đến từ
 * `capabilities.algorithmCatalog[].label` — xem `signature-algorithm.ts`.
 */

export const ACCEPTED_EXTENSIONS = [".pdf", ".xml", ".docx", ".xlsx", ".pptx"];

export function fileExtension(fileName: string): string {
  return fileName.includes(".") ? (fileName.split(".").pop() ?? "") : "";
}

/** Loại nội dung của lớp trình bày (chọn bộ xem trước nào). */
export function detectContentType(file: File): ContentType {
  const extension = fileExtension(file.name).toLowerCase();
  if (extension === "pdf") return "pdf";
  if (extension === "xml") return "xml";
  if (["docx", "xlsx", "pptx"].includes(extension)) return "ooxml";
  if (file.size >= 100 * 1024 * 1024) return "large-file";
  return "raw";
}

/**
 * Tên định dạng theo backend. OOXML KHÔNG gộp thành một giá trị: `documentFormats`
 * của capability liệt kê riêng WORD / EXCEL / POWERPOINT, nên đối chiếu phải ở
 * cùng mức chi tiết đó.
 */
export function detectDocumentFormat(file: File): DocumentFormat | undefined {
  return documentFormatFromName(file.name);
}

/**
 * Cùng phép suy luận, nhưng chỉ từ TÊN tệp.
 *
 * Cần cho những chỗ chưa có tệp trong tay: danh sách và chi tiết yêu cầu ký chỉ
 * biết `document.fileName` từ máy chủ, và tải cả tệp về chỉ để đọc phần mở rộng
 * là một lần tải hoàn toàn thừa.
 */
export function documentFormatFromName(fileName: string): DocumentFormat | undefined {
  switch (fileExtension(fileName).toLowerCase()) {
    case "pdf":
      return "PDF";
    case "xml":
      return "XML";
    case "docx":
      return "WORD";
    case "xlsx":
      return "EXCEL";
    case "pptx":
      return "POWERPOINT";
    default:
      return undefined;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function certificateCommonName(subject: string): string {
  return subject.match(/(?:^|,)\s*CN=([^,]+)/i)?.[1]?.trim() || subject;
}

/* ------------------------------------------------------------------ *
 * Chữ ký đích của COUNTER_SIGN
 * ------------------------------------------------------------------ */

export interface TargetSignature {
  id: string;
  /** `FIS` là chữ ký do chính service này tạo; `SHA256` là chữ ký của công cụ khác. */
  origin: "FIS" | "SHA256" | "XML";
}

/**
 * Đọc id các chữ ký có sẵn ngay trên trình duyệt.
 *
 * Vì sao phải làm: service SINH ra id chữ ký nhưng KHÔNG trả nó về trong
 * response. Cách duy nhất để có `targetSignatureId` là đọc ngược từ chính file
 * đã ký — hướng dẫn của collection là lưu file ra đĩa rồi chạy PowerShell. Quét
 * tại chỗ cho ra cùng kết quả mà không bắt người dùng rời khỏi màn hình, và
 * quan trọng hơn: nó bảo đảm id được lấy từ ĐÚNG file sắp nộp lên, chứ không
 * phải từ một bản khác trông giống.
 *
 * Trả về mảng rỗng khi không tìm thấy — đó là trạng thái bình thường với tài
 * liệu chưa ký, không phải lỗi.
 */
export async function readTargetSignatures(file: File): Promise<TargetSignature[]> {
  const format = detectDocumentFormat(file);
  if (format === "PDF") return readPdfTargetSignatures(file);
  if (format === "XML") return readXmlTargetSignatures(file);
  // OOXML giấu chữ ký trong các part XML bên trong ZIP và service không nhận
  // counter-sign cho định dạng này ở cùng dạng id — không đoán bừa.
  return [];
}

/**
 * PDF: id nằm ở khoá `/FISSignatureId` trong signature dictionary. Phải đọc
 * bytes theo latin1 chứ không phải UTF-8 — PDF trộn nhị phân với text, và giải
 * mã UTF-8 sẽ thay các byte không hợp lệ bằng U+FFFD, phá luôn chuỗi cần tìm.
 */
async function readPdfTargetSignatures(file: File): Promise<TargetSignature[]> {
  const text = new TextDecoder("latin1").decode(await file.arrayBuffer());
  const found = new Map<string, TargetSignature>();

  for (const match of text.matchAll(/\/FISSignatureId\s*\(([^)]+)\)/g)) {
    const id = match[1].trim();
    if (id) found.set(id, { id, origin: "FIS" });
  }

  return [...found.values()];
}

/** XML: id là thuộc tính `Id` của `<ds:Signature>`, dạng `id-<uuid không dấu gạch>`. */
async function readXmlTargetSignatures(file: File): Promise<TargetSignature[]> {
  const text = await file.text();
  const found = new Map<string, TargetSignature>();

  for (const match of text.matchAll(/<[^>]*\bSignature\b[^>]*\sId="([^"]+)"/g)) {
    const id = match[1].trim();
    // Bỏ qua id của `<ds:SignatureValue>` counter-sign tự sinh: nó không phải
    // chữ ký nào cả, chỉ là điểm neo của một counter-signature đã có.
    if (id && !id.endsWith("-counter-target")) found.set(id, { id, origin: "XML" });
  }

  return [...found.values()];
}
