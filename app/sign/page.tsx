import type { Metadata } from "next";
import { SignPageChrome } from "@/features/signing/components/sign-page-chrome";
import { SignDocumentWorkspace } from "@/features/signing/components/sign-document-workspace";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const meta = getDictionary(await getLocale()).routes.sign;
  return { title: "FIS CA Signing Tool", description: meta.description };
}

/**
 * Màn ký một tài liệu — một trong ba màn con của bàn thử, ngang hàng với
 * `/sign-request` và `/verify`. Màn `/` chỉ là bảng điều hướng dẫn xuống đây.
 *
 * Dịch vụ ký đang test không có xác thực nên không có khái niệm tài khoản —
 * mọi trạng thái cục bộ (địa chỉ API, phiên ký dở, agreementUuid) dùng chung
 * một namespace trong localStorage của máy này.
 */
export default async function SignPage() {
  const t = getDictionary(await getLocale());
  const meta = t.routes.sign;

  return (
    <SignPageChrome
      title={meta.title}
      description={meta.description}
      bannerTitle={t.sign.banner.title}
      bannerDescription={t.sign.banner.description}
    >
      <SignDocumentWorkspace />
    </SignPageChrome>
  );
}
