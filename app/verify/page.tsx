import type { Metadata } from "next";
import { PageChrome } from "@/components/shell/page-chrome";
import { VerifySignatureWorkspace } from "@/features/verification/components/verify-signature-workspace";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const meta = getDictionary(await getLocale()).routes.verify;
  return { title: "FIS CA Verification Tool", description: meta.description };
}

/**
 * Màn verify: thả một tệp đã ký vào, nhận báo cáo thẩm định.
 *
 * `canManageAllowlist` bên signing-tool đọc quyền `trust:admin` của người đăng
 * nhập. Dịch vụ đang test không có xác thực nên không có quyền để đọc — mọi người
 * dùng đều được phép, đúng như mọi thao tác khác trong bàn thử này.
 */
export default async function VerifyPage() {
  const t = getDictionary(await getLocale());
  const meta = t.routes.verify;

  return (
    <PageChrome title={meta.title} description={meta.description} scope="verify">
      {/* <div className="mb-4 rounded-lg border border-accent bg-accent-subtle px-4 py-3">
        <p className="text-[12.5px] font-semibold text-fg">{t.verify.banner.title}</p>
        <p className="mt-0.5 text-[11.5px] text-fg-muted">{t.verify.banner.description}</p>
      </div> */}

      <VerifySignatureWorkspace canManageAllowlist />
    </PageChrome>
  );
}
