import { NextRequest, NextResponse } from "next/server";
import { proxySignJson } from "@/lib/server/sign-proxy";

/**
 * `GET /api/v1/remote-ca/mpki/credentials?username=` — chứng thư của một người
 * ký trên FPT MPKI.
 *
 * `username` BẮT BUỘC: accessToken là của relying party nên FPT không suy ra
 * được đang hỏi chứng thư của ai. Chặn ngay ở đây để lỗi hiện ra là "thiếu
 * username" chứ không phải một 400 chung chung từ backend.
 */
export async function GET(request: NextRequest) {
  const username = new URL(request.url).searchParams.get("username");
  if (!username?.trim()) {
    return NextResponse.json({ code: "MPKI_USERNAME_REQUIRED" }, { status: 400 });
  }

  const query = new URLSearchParams({ username: username.trim() });
  return proxySignJson(request, `/api/v1/remote-ca/mpki/credentials?${query.toString()}`);
}
