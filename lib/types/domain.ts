/**
 * Vốn từ vựng domain mà màn ký dùng tới. Bản rút gọn của `lib/types/domain.ts`
 * bên signing-tool: chỉ giữ những kiểu màn ký thật sự chạm vào, bỏ toàn bộ phần
 * chứng thư / key provider / notification / user vì project này không có các
 * màn đó.
 */

/** PRD §05 Axis A — cái gì đang được ký. */
export type ContentType = "pdf" | "xml" | "ooxml" | "raw" | "large-file";

type OoxmlKind = "docx" | "xlsx" | "pptx";

export function detectOoxmlKind(fileName: string): OoxmlKind | undefined {
  const ext = fileExtension(fileName).toLowerCase();
  if (ext === "docx") return "docx";
  if (ext === "xlsx") return "xlsx";
  if (ext === "pptx") return "pptx";
  return undefined;
}

function fileExtension(fileName: string): string {
  return fileName.includes(".") ? (fileName.split(".").pop() ?? "") : "";
}
