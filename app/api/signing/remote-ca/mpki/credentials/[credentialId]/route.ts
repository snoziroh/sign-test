import { NextRequest } from "next/server";
import { proxySignJson } from "@/lib/server/sign-proxy";

/**
 * Chi tiết một credential MPKI. Chỉ đọc: không tạo giao dịch bên FPT, không trừ
 * lượt ký — nên GET là đúng, khác với enrollment của eSign Cloud.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  const { credentialId } = await params;
  return proxySignJson(
    request,
    `/api/v1/remote-ca/mpki/credentials/${encodeURIComponent(credentialId)}`,
  );
}
