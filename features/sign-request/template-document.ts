import type { DocumentFormat } from "@/lib/types/signing";
import { detectDocumentFormat } from "@/features/signing/document-format";
import { VARIABLE_PATTERN, resolveText, variableKeysIn } from "./template-model";

/**
 * Đọc và điền biến TRONG NỘI DUNG TỆP.
 *
 * Đây là chỗ tính năng mẫu chạm vào thứ khó nhất: mỗi định dạng giấu chữ ở một
 * nơi khác nhau, và không phải định dạng nào cũng cho ghi lại.
 *
 * | Định dạng | Quét biến | Điền được? |
 * |-----------|-----------|------------|
 * | XML       | text thẳng| có         |
 * | DOCX/XLSX/PPTX | XML trong ZIP | có |
 * | PDF       | lớp text của pdf.js | KHÔNG |
 *
 * PDF không điền được ngay trên trình duyệt và đó không phải thiếu sót tạm thời:
 * thay một chuỗi trong PDF nghĩa là dựng lại content stream, cập nhật bảng xref
 * và nhúng font cho chữ mới — một thư viện riêng, và với tệp đã ký thì việc ghi
 * lại phá luôn chữ ký. Bản dựng này nói thẳng điều đó ra: với PDF, giá trị biến
 * được ghi kèm yêu cầu và bản xem trước vẽ chúng CHỒNG lên chỗ trống, còn tệp
 * gửi đi vẫn là tệp gốc. Dịch vụ sinh tài liệu phía sau mới là nơi ghép thật.
 */

/* ------------------------------------------------------------------ *
 * Quét biến
 * ------------------------------------------------------------------ */

export interface ScanResult {
  keys: string[];
  /** Text đã trích, dùng cho bản xem trước của định dạng không dựng hình được. */
  text: string;
  /** Không đọc được nội dung — biến phải khai báo tay. */
  unreadable?: boolean;
}

export async function scanDocument(file: File): Promise<ScanResult> {
  const format = detectDocumentFormat(file);
  try {
    const text = await extractText(file, format);
    return { keys: variableKeysIn(text), text };
  } catch {
    // Tệp hỏng, mã hoá lạ, hoặc bộ đọc không nhận: không chặn người soạn mẫu —
    // họ vẫn khai báo biến bằng tay được.
    return { keys: [], text: "", unreadable: true };
  }
}

async function extractText(file: File, format?: DocumentFormat): Promise<string> {
  if (format === "PDF") return extractPdfText(file);
  if (format === "XML") return file.text();
  if (format === "WORD" || format === "EXCEL" || format === "POWERPOINT") {
    return extractOoxmlText(file, format);
  }
  return file.text();
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    /*
     * Nối KHÔNG có dấu cách giữa các item. pdf.js cắt một dòng thành nhiều item
     * ở mỗi lần đổi font hay đổi toạ độ, và `{{so_hop_dong}}` rất hay bị cắt
     * giữa chừng. Chèn dấu cách vào đó là tự tay phá luôn cái token cần tìm.
     */
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(""),
    );
  }
  return pages.join("\n");
}

const OOXML_PARTS: Record<string, RegExp> = {
  WORD: /^word\/(document|header\d*|footer\d*)\.xml$/,
  EXCEL: /^xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/,
  POWERPOINT: /^ppt\/(slides|notesSlides)\/[^/]+\.xml$/,
};

async function extractOoxmlText(file: File, format: DocumentFormat): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const matcher = OOXML_PARTS[format];

  const parts: string[] = [];
  for (const path of Object.keys(zip.files)) {
    if (!matcher?.test(path)) continue;
    const xml = await zip.files[path].async("string");
    parts.push(stripTags(xml));
  }
  return parts.join("\n");
}

/**
 * Ranh giới đoạn của từng họ OOXML: `<w:p>` của Word, `<a:p>` của PowerPoint,
 * `<si>`/`<row>` của Excel. Không giữ lại thì cả tài liệu dồn thành một dòng.
 */
const PARAGRAPH_END = /<\/(w:p|a:p|si|row)>|<w:br\s*\/>/g;

/**
 * Bỏ thẻ XML để còn lại chữ.
 *
 * Bước này là thứ làm cho việc quét biến chịu được tệp Word thật: Word hay cắt
 * một từ thành nhiều `<w:t>` (do kiểm tra chính tả, do sửa đi sửa lại), nên
 * `{{ngay_hieu_luc}}` trong tệp có thể nằm rải rác qua bốn thẻ. Ghép hết lại rồi
 * mới dò thì token trở lại nguyên vẹn — nhưng chỉ ghép TRONG một đoạn: một biến
 * không bao giờ vắt qua hai đoạn, còn hai đoạn dính liền nhau thì bản xem trước
 * đọc không nổi.
 */
function stripTags(xml: string): string {
  return xml
    .replace(PARAGRAPH_END, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/* ------------------------------------------------------------------ *
 * Vị trí biến trên trang PDF
 * ------------------------------------------------------------------ */

export interface PlaceholderBox {
  key: string;
  page: number;
  /** Toạ độ theo TỈ LỆ trang, cùng quy ước với `SignaturePosition`. */
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

/**
 * Tìm chỗ đứng của từng `{{bien}}` trên trang PDF, để bản xem trước vẽ được giá
 * trị đã điền đúng chỗ trống thay vì bắt người dùng tự hình dung.
 *
 * Chỉ nhận token nằm GỌN trong một text item. Token bị pdf.js cắt qua nhiều item
 * vẫn quét ra ở `scanDocument` (nối chuỗi rồi mới dò) nhưng không có một khung
 * bao nào đúng để vẽ — thà thiếu một ô đánh dấu còn hơn vẽ đè lên chữ khác.
 */
export async function readPlaceholderBoxes(file: File): Promise<PlaceholderBox[]> {
  if (detectDocumentFormat(file) !== "PDF") return [];

  try {
    const pdfjs = await loadPdfjs();
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const boxes: PlaceholderBox[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      for (const item of content.items) {
        if (!("str" in item) || !item.str.includes("{{")) continue;

        const width = item.width ?? 0;
        const height = item.height ?? 0;
        const [x, y] = [item.transform[4], item.transform[5]];

        for (const match of item.str.matchAll(VARIABLE_PATTERN)) {
          /*
           * Ước lượng vị trí ngang theo TỈ LỆ KÝ TỰ trong item. Không chính xác
           * với font tỉ lệ, nhưng đây là một dấu chỉ chỗ — sai vài pixel không
           * đổi ý nghĩa, còn dựng cả bộ đo bề rộng glyph thì đổi hẳn chi phí.
           */
          const start = match.index ?? 0;
          const ratio = item.str.length === 0 ? 0 : start / item.str.length;
          const tokenWidth = item.str.length === 0 ? width : (match[0].length / item.str.length) * width;

          boxes.push({
            key: match[1],
            page: pageNumber,
            xPct: clamp01((x + ratio * width) / viewport.width),
            // PDF đếm y từ đáy trang, DOM đếm từ đỉnh.
            yPct: clamp01((viewport.height - y - height) / viewport.height),
            widthPct: clamp01(tokenWidth / viewport.width),
            heightPct: clamp01(height / viewport.height),
          });
        }
      }
    }

    return boxes;
  } catch {
    return [];
  }
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/* ------------------------------------------------------------------ *
 * Điền biến vào tệp
 * ------------------------------------------------------------------ */

export interface FilledDocument {
  file: File;
  /**
   * `false` nghĩa là tệp trả về vẫn còn nguyên `{{bien}}`. Người dùng phải được
   * nói điều này chứ không được để tưởng tài liệu đã hoàn chỉnh.
   */
  substituted: boolean;
}

/**
 * Trả về bản tài liệu đã thay biến.
 *
 * Tên tệp giữ NGUYÊN: đây vẫn là cùng một tài liệu, và đổi tên ở đây sẽ làm
 * người ký nhận được một cái tên khác với cái người soạn nhìn thấy lúc chọn mẫu.
 */
export async function fillDocument(
  file: File,
  values: Record<string, string>,
): Promise<FilledDocument> {
  const format = detectDocumentFormat(file);

  try {
    if (format === "XML") {
      const filled = resolveText(await file.text(), values);
      return {
        file: new File([filled], file.name, { type: file.type || "application/xml" }),
        substituted: true,
      };
    }

    if (format === "WORD" || format === "EXCEL" || format === "POWERPOINT") {
      return { file: await fillOoxml(file, values, format), substituted: true };
    }
  } catch {
    // Không ghi lại được thì dùng tệp gốc — mất phần điền, không mất yêu cầu ký.
    return { file, substituted: false };
  }

  return { file, substituted: false };
}

async function fillOoxml(
  file: File,
  values: Record<string, string>,
  format: DocumentFormat,
): Promise<File> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const matcher = OOXML_PARTS[format];

  for (const path of Object.keys(zip.files)) {
    if (!matcher?.test(path)) continue;
    const xml = await zip.files[path].async("string");
    zip.file(path, resolveText(healSplitTokens(xml), escapeValues(values)));
  }

  const blob = await zip.generateAsync({ type: "blob", mimeType: file.type });
  return new File([blob], file.name, { type: file.type });
}

/**
 * Gom một token bị Word cắt rời trở lại thành một khối liền.
 *
 * `{{ho</w:t></w:r><w:r><w:t>_ten}}` là hình dạng rất thường gặp trong tệp thật:
 * Word chia run theo lịch sử chỉnh sửa chứ không theo từ. Xoá mọi thẻ nằm GIỮA
 * `{{` và `}}` khôi phục token mà không đụng tới phần còn lại của tài liệu.
 *
 * Đánh đổi đã biết: nếu tệp có `{{` lạc lõng không bao giờ đóng, biểu thức sẽ
 * bắt tới cặp `}}` kế tiếp và nuốt mất định dạng của đoạn ở giữa. Chấp nhận
 * được — một chuỗi `{{` không đóng trong tài liệu hành chính là gõ nhầm, và hậu
 * quả nhìn thấy ngay ở bản xem trước.
 */
function healSplitTokens(xml: string): string {
  return xml.replace(/\{\{[^{}]*?\}\}/g, (token) => token.replace(/<[^>]*>/g, ""));
}

/** Giá trị người dùng gõ đi thẳng vào XML — phải escape, nếu không một dấu `&` là hỏng tệp. */
function escapeValues(values: Record<string, string>): Record<string, string> {
  const escaped: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    escaped[key] = value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  return escaped;
}

/* ------------------------------------------------------------------ *
 * pdf.js
 * ------------------------------------------------------------------ */

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  return pdfjs;
}
