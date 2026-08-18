import { NextRequest } from "next/server";
import { proxyPublicJson } from "@/lib/server/public-signing-proxy";

/**
 * `GET|DELETE /api/public/signing-session/lease` — quyền ký độc quyền của phiên
 * ký công khai.
 *
 * GET chỉ cần cookie phiên. DELETE còn cần `X-Public-Signing-CSRF` — nó là một
 * lệnh GHI, và cookie một mình không đủ để phân biệt lệnh của người ký với lệnh
 * do một trang khác bắt trình duyệt của họ gửi hộ.
 *
 * Cả hai header đó do `upstreamHeaders` của `public-signing-proxy` chuyển tiếp
 * nguyên văn; ở đây không có gì phải tự dựng, và cũng không được tự dựng —
 * proxy không có cách nào sinh ra giá trị CSRF đúng.
 */
export async function GET(request: NextRequest) {
  return proxyPublicJson(request, "/signing-session/lease");
}

export async function DELETE(request: NextRequest) {
  return proxyPublicJson(request, "/signing-session/lease", { method: "DELETE" });
}
