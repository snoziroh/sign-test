import type { Metadata } from "next";
import { ExternalSigningWorkspace } from "@/features/external-signing/components/external-signing-workspace";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const meta = getDictionary(await getLocale()).externalSign.meta;
  return {
    title: meta.title,
    description: meta.description,
    /*
     * Trang này nằm sau một liên kết bí mật. Cho công cụ tìm kiếm đánh chỉ mục nó
     * là mời chúng đi theo mọi liên kết ký từng bị dán ở đâu đó — và một crawler mở
     * link ký sẽ tiêu luôn token đó.
     */
    robots: { index: false, follow: false },
  };
}

/**
 * `/external-sign` — màn ký cho người NGOÀI hệ thống, mở bằng liên kết
 * `#t=RAW_TOKEN` do người tạo yêu cầu ký gửi tới.
 *
 * Ba điều tách hẳn màn này khỏi ba màn còn lại của ứng dụng:
 *
 * 1. **Không đăng nhập, và cũng không có gì để đăng nhập.** Danh tính người ký là
 *    cookie phiên do backend cấp khi đổi link token. Trang chỉ gọi nhóm API
 *    `/api/public/*` và không bao giờ mượn danh tính nội bộ (`X-Username`) để giả
 *    lập người ký.
 * 2. **Không có khung nội bộ.** `AppNavbar` tự ẩn trên đường dẫn này — thanh đó chở
 *    tên các màn nghiệp vụ và ô địa chỉ dịch vụ ký, thứ người ngoài hệ thống không
 *    có lý do gì để thấy. Khung riêng nằm ở `ExternalSigningChrome`.
 * 3. **Không có ô cấu hình địa chỉ API.** Địa chỉ dịch vụ ký cho luồng công khai chỉ
 *    đến từ `SIGNING_API_URL` phía máy chủ; xem `lib/server/public-signing-proxy.ts`.
 *
 * Component là Client Component: cả luồng sống trong `window` — token nằm ở URL
 * fragment (server không bao giờ nhận được fragment), CSRF nằm trong
 * `sessionStorage`, tài liệu dựng bằng pdf.js. Không có gì ở đây render được trên
 * máy chủ, và cũng không nên.
 */
export default function ExternalSignPage() {
  return <ExternalSigningWorkspace />;
}
