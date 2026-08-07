import type { ReactNode } from "react";

/**
 * Bề ngang và lề chung của mọi màn, tách riêng khỏi `PageChrome` vì màn `/`
 * dùng khung này nhưng không có phần header — tiêu đề của nó đã nằm trên navbar.
 */
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-300 px-5 py-6 sm:px-8 sm:py-8">{children}</div>
  );
}
