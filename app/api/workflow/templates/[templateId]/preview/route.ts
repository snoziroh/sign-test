import { NextRequest } from "next/server";
import { proxySignBinary } from "@/lib/server/sign-proxy";

/**
 * `GET /api/templates/{id}/preview` — PDF preview của bản đang phục vụ.
 *
 * `variant=HIGHLIGHT` (mặc định của backend) tô nền các chỗ trống, đúng thứ cần
 * ở màn chọn mẫu: người dùng thấy ngay mẫu này bắt điền những đâu. Frontend
 * không cần biết `versionId` — backend tự resolve từ template.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await params;
  const variant = new URL(request.url).searchParams.get("variant");
  const suffix = variant ? `?variant=${encodeURIComponent(variant)}` : "";

  return proxySignBinary(
    request,
    `/api/templates/${encodeURIComponent(templateId)}/preview${suffix}`,
  );
}
