import { NextRequest } from "next/server";
import { proxySignBinary } from "@/lib/server/sign-proxy";

/**
 * `GET /api/templates/{id}/versions/{versionId}/preview` — PDF của một BẢN cụ
 * thể, kể cả bản còn `DRAFT`.
 *
 * Hai biến thể, và trình soạn mẫu cần cả hai:
 *
 * - `HIGHLIGHT` (mặc định của backend) tô nền chỗ có biến — dùng ở bước cấu hình
 *   biến và ở bản kiểm tra cuối.
 * - `PLAIN` không tô gì — dùng ở bước đặt vị trí chữ ký, vì mảng nền vàng ngay
 *   chỗ định đặt khung ký làm người soạn không nhìn ra mình đang che lên chữ gì.
 *
 * Nhị phân nên đi qua `proxySignBinary`; `ETag`/`304` của backend được giữ
 * nguyên, và vì cùng một bản nháp được xem đi xem lại giữa các bước, đó là khác
 * biệt giữa tải lại cả tệp và không tải gì.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string; versionId: string }> },
) {
  const { templateId, versionId } = await params;
  const variant = new URL(request.url).searchParams.get("variant");
  const suffix = variant ? `?variant=${encodeURIComponent(variant)}` : "";

  return proxySignBinary(
    request,
    `/api/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(
      versionId,
    )}/preview${suffix}`,
  );
}
