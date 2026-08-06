import type { ReactNode } from "react";
import { PageChrome } from "@/components/shell/page-chrome";

/**
 * Khung của màn ký. Phần dùng chung với màn verify (điều hướng, địa chỉ API, ngôn
 * ngữ, sáng/tối) nằm ở `PageChrome`; ở đây chỉ còn banner riêng của màn ký.
 */
export function SignPageChrome({
  title,
  description,
  // bannerTitle,
  // bannerDescription,
  children,
}: {
  title: string;
  description: string;
  bannerTitle: string;
  bannerDescription: string;
  children: ReactNode;
}) {
  return (
    <PageChrome title={title} description={description}>
      {/* <div className="mb-4 flex items-start gap-3 rounded-lg border border-accent bg-accent-subtle px-4 py-3">
        <div>
          <p className="text-[12.5px] font-semibold text-fg">{bannerTitle}</p>
          <p className="mt-0.5 text-[11.5px] text-fg-muted">{bannerDescription}</p>
        </div>
      </div> */}

      {children}
    </PageChrome>
  );
}
