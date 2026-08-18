import { redirect } from "next/navigation";

/**
 * `/sign-request` không còn là một màn: nó tách làm hai đường dẫn thật —
 * `/sign-request/workflows` (những quy trình đang chạy) và
 * `/sign-request/create` (soạn một quy trình mới).
 *
 * Đường dẫn cũ vẫn sống và trỏ về DANH SÁCH, không phải màn tạo. Người mở màn
 * này thường xuyên nhất là người ký vào tìm việc của mình; người tạo yêu cầu
 * chỉ ghé mỗi khi có việc mới, và họ luôn đi qua đúng một nút bấm.
 */
export default function SignRequestIndexPage() {
  redirect("/sign-request/workflows");
}
