import { NextRequest } from "next/server";
import { proxyPublicDocument } from "@/lib/server/public-signing-proxy";

/**
 * `GET /api/public/signing-session/document` — chính tệp người ký sắp ký.
 *
 * Backend tự xác định tài liệu từ phiên; không có id nào trong đường dẫn, nên
 * không có tham số nào để người ký sửa nhằm đọc tài liệu của yêu cầu ký khác.
 *
 * `documentContentUrl` trong signature plan trỏ tới endpoint NỘI BỘ (đòi
 * `X-Username`) — trang public không gọi đường đó, mọi lần tải tài liệu đi qua
 * đây.
 */
export async function GET(request: NextRequest) {
  return proxyPublicDocument(request, "/signing-session/document");
}
