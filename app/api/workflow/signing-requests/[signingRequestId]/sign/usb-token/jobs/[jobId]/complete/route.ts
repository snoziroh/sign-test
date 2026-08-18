import { NextRequest } from "next/server";
import { actorHeaders, proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `POST /api/signing-requests/{id}/sign/usb-token/jobs/{jobId}/complete` — bước
 * cuối: nộp chữ ký lấy từ USB Token để backend verify, ghép CMS, chèn vào PDF
 * rồi ghi bản đã ký vào chính tài liệu của yêu cầu ký.
 *
 * `X-Username` vẫn bắt buộc: backend chạy `requireTurn` lần nữa ở đây, để một
 * người khác không complete hộ job của người này.
 *
 * Job DÙNG MỘT LẦN nên không có retry tự động — hỏng là làm lại từ đầu, và làm
 * lại nghĩa là một job mới cộng thêm một lần nhập PIN.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ signingRequestId: string; jobId: string }> },
) {
  const { signingRequestId, jobId } = await params;
  const payload = await request.text();

  const headers = actorHeaders(request);
  headers.set("Content-Type", "application/json");

  return proxySignJson(
    request,
    `/api/signing-requests/${encodeURIComponent(
      signingRequestId,
    )}/sign/usb-token/jobs/${encodeURIComponent(jobId)}/complete`,
    { method: "POST", headers, body: payload },
  );
}
