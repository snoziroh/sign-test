import { NextRequest } from "next/server";
import {
  actorHeaders,
  proxySignJson,
  TEMPLATE_CONVERT_TIMEOUT_MS,
} from "@/lib/server/sign-proxy";

/**
 * `GET /api/templates` — danh sách mẫu để chọn.
 *
 * `status` mặc định của backend là `ACTIVE`, và đó là mặc định đúng cho màn tạo
 * yêu cầu: mẫu chưa publish chưa có bản đã chốt để ký. Tham số vẫn được chuyển
 * tiếp để màn quản lý soi được cả DRAFT khi cần.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of ["page", "size", "search", "status"] as const) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return proxySignJson(request, `/api/templates${suffix}`);
}

/**
 * `POST /api/templates` — nộp tệp nguồn và mở một bản nháp mẫu trên máy chủ.
 *
 * Đây là bước DUY NHẤT tạo `templateId`/`versionId`, không phải bước lưu cuối:
 * backend đọc DOCX/XLSX, dò `{{biến}}`, dựng PDF preview (bản thường và bản tô
 * nền), rồi trả về Template DRAFT + Version DRAFT kèm danh sách ô đã dò được.
 * Mọi bước sau (`fields`, `signers`, `publish`) đều đi theo hai id đó.
 *
 * Chuyển tiếp nguyên `FormData` như `documents/route.ts` và KHÔNG tự đặt
 * `Content-Type` — đặt tay là mất boundary và backend đọc ra body rỗng.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  return proxySignJson(request, "/api/templates", {
    method: "POST",
    headers: actorHeaders(request),
    body: formData,
    signal: AbortSignal.timeout(TEMPLATE_CONVERT_TIMEOUT_MS),
  });
}
