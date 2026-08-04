"use client";

/**
 * Ảnh giấy tờ của hồ sơ đăng ký chứng thư (`agreementDetails.photo*`,
 * `faceImage`) — đọc từ máy người dùng và quy về base64 để nhét thẳng vào JSON.
 *
 * Ba điểm định hình file này:
 *
 * 1. API nhận BASE64 THUẦN, không có tiền tố `data:image/...;base64,`. FileReader
 *    chỉ trả được data URL nên phần tiền tố bị cắt ngay ở đây, một lần — không để
 *    mỗi chỗ gọi tự nhớ mà cắt.
 * 2. Ảnh chụp CCCD bằng điện thoại thường 3–8 MB; base64 còn phình thêm ~33%.
 *    Gửi nguyên bản là một request vài chục MB đi qua proxy, nên ảnh quá khổ được
 *    thu nhỏ tại trình duyệt trước khi mã hoá.
 * 3. Thu nhỏ CHỈ chạy khi cần: ảnh đã vừa hạn thì giữ nguyên bản: phía CA còn đọc
 *    lại giấy tờ trên ảnh này, nén lại một tấm vốn đã nhỏ là bào chữ đi vô ích.
 *
 * Dữ liệu cá nhân — chỉ sống trong state của form, không log, không persist.
 */

export interface EnrollmentImage {
  /** Base64 THUẦN, đúng dạng API nhận. Không có tiền tố `data:`. */
  base64: string;
  /** MIME sau khi xử lý — dùng để dựng lại data URL cho ô xem trước. */
  contentType: string;
  fileName: string;
  /** Kích thước ảnh đã mã hoá (bytes, trước base64) — để hiển thị. */
  byteLength: number;
}

/**
 * `TOO_LARGE` chỉ được trả về khi ảnh đã bị thu nhỏ hết mức mà vẫn quá hạn.
 * `UNREADABLE` gồm cả định dạng trình duyệt không giải mã được (HEIC của iPhone
 * là ca hay gặp nhất).
 */
export type EnrollmentImageProblem = "NOT_IMAGE" | "TOO_LARGE" | "UNREADABLE";

export type EnrollmentImageResult =
  | { ok: true; image: EnrollmentImage }
  | { ok: false; problem: EnrollmentImageProblem };

/** Hạn sau khi thu nhỏ, tính trên bytes ảnh (base64 sẽ ≈ 1.34× số này). */
export const MAX_ENROLLMENT_IMAGE_BYTES = 2 * 1024 * 1024;

/** Cạnh dài tối đa khi phải thu nhỏ — vẫn đủ nét để đọc số trên CCCD. */
const MAX_DIMENSION = 1600;

/** Thử lần lượt tới khi vừa hạn; hết nấc mà vẫn quá thì báo `TOO_LARGE`. */
const JPEG_QUALITIES = [0.85, 0.7, 0.55] as const;

/** Ảnh đã mã hoá → data URL để đặt vào `<img>`. */
export function enrollmentImageDataUrl(image: EnrollmentImage): string {
  return `data:${image.contentType};base64,${image.base64}`;
}

/** Số bytes thật của một chuỗi base64 (không giải mã lại). */
function base64ByteLength(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** Bỏ tiền tố `data:<mime>;base64,` nếu có. Trả chuỗi rỗng khi không phải base64. */
function stripDataUrlPrefix(dataUrl: string): string {
  const marker = ";base64,";
  const index = dataUrl.indexOf(marker);
  return index === -1 ? "" : dataUrl.slice(index + marker.length);
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("READ_FAILED"));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  });
}

/**
 * Vẽ lại ảnh với cạnh dài ≤ `MAX_DIMENSION` rồi mã hoá JPEG. Trả `undefined` khi
 * trình duyệt không giải mã được ảnh — caller quy về `UNREADABLE`.
 */
async function downscaleToJpeg(file: File): Promise<{ base64: string; byteLength: number } | undefined> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return undefined;
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of JPEG_QUALITIES) {
      const base64 = stripDataUrlPrefix(canvas.toDataURL("image/jpeg", quality));
      if (!base64) return undefined;
      const byteLength = base64ByteLength(base64);
      if (byteLength <= MAX_ENROLLMENT_IMAGE_BYTES) return { base64, byteLength };
    }
    return undefined;
  } finally {
    bitmap.close();
  }
}

/**
 * Tệp người dùng chọn → `EnrollmentImage`. Không ném: mọi hỏng hóc quy về một
 * `problem` để màn hình dịch sang thông báo của đúng ngôn ngữ đang dùng.
 */
export async function readEnrollmentImage(file: File): Promise<EnrollmentImageResult> {
  if (!file.type.startsWith("image/")) return { ok: false, problem: "NOT_IMAGE" };

  if (file.size <= MAX_ENROLLMENT_IMAGE_BYTES) {
    let dataUrl: string;
    try {
      dataUrl = await readAsDataUrl(file);
    } catch {
      return { ok: false, problem: "UNREADABLE" };
    }
    const base64 = stripDataUrlPrefix(dataUrl);
    if (!base64) return { ok: false, problem: "UNREADABLE" };
    return {
      ok: true,
      image: {
        base64,
        contentType: file.type,
        fileName: file.name,
        byteLength: base64ByteLength(base64),
      },
    };
  }

  const reduced = await downscaleToJpeg(file);
  // Không phân biệt được "không giải mã nổi" với "nén hết cỡ vẫn quá khổ" ở
  // nhánh này, nên báo cái người dùng xử lý được: ảnh quá lớn.
  if (!reduced) return { ok: false, problem: "TOO_LARGE" };

  return {
    ok: true,
    image: {
      base64: reduced.base64,
      contentType: "image/jpeg",
      fileName: file.name,
      byteLength: reduced.byteLength,
    },
  };
}
