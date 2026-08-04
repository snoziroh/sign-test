import { NextRequest } from "next/server";
import { proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `POST /api/v1/usb-token/signing-jobs/{jobId}/complete` — nộp chữ ký RSA và
 * chứng thư để backend dựng CMS, chèn vào PDF rồi verify lại.
 *
 * Job DÙNG MỘT LẦN: gửi lặp (hoặc hai tab cùng hoàn tất) thì chỉ request giành
 * được job trước mới chạy, phần còn lại nhận `USB_TOKEN_JOB_NOT_FOUND`. Vì vậy
 * ở đây không có retry tự động — quyết định ký lại là của người dùng, và ký lại
 * nghĩa là tạo job mới cộng thêm một lần nhập PIN.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const payload = await request.text();
  return proxySignJson(
    request,
    `/api/v1/usb-token/signing-jobs/${encodeURIComponent(jobId)}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    },
  );
}
