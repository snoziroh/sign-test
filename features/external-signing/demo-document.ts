/**
 * Tài liệu PDF cho chế độ mô phỏng, dựng ngay tại trình duyệt.
 *
 * Vì sao không đặt một tệp `.pdf` vào `public/`: bản mô phỏng cần một tài liệu có
 * ĐÚNG hai trang và một khoảng trống ở đúng toạ độ mà signature plan mô phỏng
 * khai báo. Hai thứ đó phải khớp nhau, và cách chắc chắn nhất là sinh chúng từ
 * cùng một chỗ — một tệp nhị phân trong repo sẽ lệch khỏi plan ngay lần đầu ai đó
 * sửa toạ độ.
 *
 * Chữ trong tài liệu là ASCII: font Type1 chuẩn (Helvetica) mã hoá WinAnsi nên
 * không chở được dấu tiếng Việt. Đây là tài liệu giả để xem bố cục, không phải
 * bản dịch.
 */

/** A4 tính bằng PDF points. */
export const DEMO_PAGE_WIDTH = 595;
export const DEMO_PAGE_HEIGHT = 842;

/**
 * Ô chữ ký mô phỏng — gốc góc DƯỚI-TRÁI, cùng quy ước với signature plan thật.
 * `demo-session.ts` đọc lại đúng các số này nên overlay luôn nằm trên khoảng
 * trống đã chừa sẵn ở trang 2.
 */
export const DEMO_SLOT = {
  page: 2,
  x: 330,
  y: 470,
  width: 190,
  height: 80,
} as const;

interface Line {
  text: string;
  x: number;
  y: number;
  size?: number;
  bold?: boolean;
}

/** `(`, `)` và `\` là ký tự điều khiển của chuỗi PDF. */
function escapeText(text: string): string {
  return text.replace(/[\\()]/g, (character) => `\\${character}`);
}

function contentStream(lines: Line[], boxes: { x: number; y: number; w: number; h: number }[] = []): string {
  const drawnBoxes = boxes
    .map(
      (box) =>
        `0.55 0.6 0.65 RG 1 w [4 3] 0 d ${box.x} ${box.y} ${box.w} ${box.h} re S [] 0 d`,
    )
    .join("\n");

  const drawnText = lines
    .map(
      (line) =>
        `BT /${line.bold ? "F2" : "F1"} ${line.size ?? 10.5} Tf 0.12 0.14 0.16 rg ${line.x} ${
          line.y
        } Td (${escapeText(line.text)}) Tj ET`,
    )
    .join("\n");

  return `${drawnBoxes}\n${drawnText}`;
}

const PAGE_ONE: Line[] = [
  { text: "SERVICE AGREEMENT", x: 60, y: 770, size: 19, bold: true },
  { text: "Contract No. DEMO-2026-0813  ·  Effective 13 Aug 2026", x: 60, y: 748, size: 9.5 },
  { text: "1. Parties", x: 60, y: 706, size: 12, bold: true },
  { text: "This agreement is made between FIS CA Demo Company (the Provider) and the", x: 60, y: 686 },
  { text: "individual named in the signature block on page 2 (the Contractor).", x: 60, y: 670 },
  { text: "2. Scope of work", x: 60, y: 634, size: 12, bold: true },
  { text: "The Contractor will deliver the services described in Appendix A, on the", x: 60, y: 614 },
  { text: "schedule agreed by both parties in writing.", x: 60, y: 598 },
  { text: "3. Term", x: 60, y: 562, size: 12, bold: true },
  { text: "Twelve months from the effective date, renewable by written agreement.", x: 60, y: 542 },
  { text: "4. Confidentiality", x: 60, y: 506, size: 12, bold: true },
  { text: "Both parties keep commercial terms of this agreement confidential for the", x: 60, y: 486 },
  { text: "duration of the term and for two years after it ends.", x: 60, y: 470 },
  { text: "5. Governing law", x: 60, y: 434, size: 12, bold: true },
  { text: "The laws of Vietnam govern this agreement.", x: 60, y: 414 },
  {
    text: "-- This is a mock document generated in the browser for interface review only. --",
    x: 60,
    y: 90,
    size: 8.5,
  },
  { text: "Page 1 of 2", x: 500, y: 60, size: 8.5 },
];

const PAGE_TWO: Line[] = [
  { text: "SIGNATURES", x: 60, y: 770, size: 15, bold: true },
  { text: "Both parties agree to the terms set out on page 1.", x: 60, y: 744, size: 9.5 },
  { text: "For the Provider", x: 60, y: 566, size: 11, bold: true },
  { text: "FIS CA Demo Company", x: 60, y: 546, size: 9.5 },
  { text: "Signed electronically on 12 Aug 2026", x: 60, y: 530, size: 9 },
  { text: "For the Contractor", x: 330, y: 566, size: 11, bold: true },
  { text: "Sign in the box below", x: 330, y: 546, size: 9 },
  { text: "Page 2 of 2", x: 500, y: 60, size: 8.5 },
];

/**
 * Xếp các object thành một tệp PDF hợp lệ.
 *
 * Bảng `xref` cần OFFSET BYTE của từng object, nên chuỗi phải được dựng tuần tự
 * và đo độ dài dọc đường. Toàn bộ nội dung là ASCII nên `string.length` bằng số
 * byte — điều kiện này vỡ ngay nếu ai đó thêm chữ có dấu vào tài liệu.
 */
function buildPdfString(pages: Line[][]): string {
  const offsets: number[] = [];
  let pdf = "%PDF-1.7\n";

  const add = (id: number, body: string) => {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  };

  const pageId = (index: number) => 3 + index * 2;
  const contentId = (index: number) => 4 + index * 2;
  const fontRegularId = 3 + pages.length * 2;
  const fontBoldId = fontRegularId + 1;

  add(1, "<< /Type /Catalog /Pages 2 0 R >>");
  add(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages
      .map((_, index) => `${pageId(index)} 0 R`)
      .join(" ")}] >>`,
  );

  pages.forEach((lines, index) => {
    const boxes =
      index + 1 === DEMO_SLOT.page
        ? [{ x: DEMO_SLOT.x, y: DEMO_SLOT.y, w: DEMO_SLOT.width, h: DEMO_SLOT.height }]
        : [];
    const stream = contentStream(lines, boxes);

    add(
      pageId(index),
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${DEMO_PAGE_WIDTH} ${DEMO_PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> ` +
        `/Contents ${contentId(index)} 0 R >>`,
    );
    add(contentId(index), `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  add(fontRegularId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  add(fontBoldId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  const lastId = fontBoldId;
  const xrefOffset = pdf.length;

  pdf += `xref\n0 ${lastId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= lastId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${lastId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return pdf;
}

/**
 * Chuỗi → bytes bằng `charCodeAt`, không qua `TextEncoder`.
 *
 * Chỉ đúng vì tệp là ASCII thuần — cùng điều kiện đã giữ cho bảng `xref` đúng
 * (`string.length` = số byte). Một hàm mã hoá UTF-8 ở đây sẽ che mất chính ràng
 * buộc đó: chữ có dấu vẫn ra bytes hợp lệ, nhưng mọi offset trong xref lệch đi.
 */
function toBytes(text: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index);
  return bytes;
}

export function buildDemoDocument(): Blob {
  return new Blob([toBytes(buildPdfString([PAGE_ONE, PAGE_TWO]))], {
    type: "application/pdf",
  });
}

/** Base64 thuần — hình dạng `SignedDocument.contentBase64` của backend. */
export function demoDocumentBase64(): string {
  return btoa(buildPdfString([PAGE_ONE, PAGE_TWO]));
}
