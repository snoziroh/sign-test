import { NextRequest } from "next/server";
import { proxySignJson } from "@/lib/server/sign-proxy";

/**
 * Thăm dò xem người ký đã xác nhận danh tính chưa.
 *
 * POST chứ không GET vì đây KHÔNG phải thao tác đọc: bên trong backend gọi
 * `prepareHashSigningForSignCloud` với hash rác — một API TẠO GIAO DỊCH. 💸 Mỗi
 * lần chạy là một billCode mới và một lượt ký bị trừ.
 *
 * Cách dùng đúng là KHÔNG dùng: `POST /sign` bước CONTINUE đã trả về
 * `PENDING_IDENTITY` khi người ký chưa xác nhận — cùng thông tin, không tốn thêm
 * giao dịch. Endpoint được giữ lại để đối chiếu khi nghi ngờ, không để poll.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agreementUuid: string }> },
) {
  const { agreementUuid } = await params;
  return proxySignJson(
    request,
    `/api/v1/remote-ca/fpt/enrollments/${encodeURIComponent(agreementUuid)}/status`,
    { method: "POST" },
  );
}
