"use client";

import type { Dictionary } from "@/lib/i18n";
import { StepProgress } from "@/components/ui/step-progress";
import type { SignStepId } from "../sign-configuration";

/**
 * Thanh tiến trình của màn ký, đứng trên cả bản xem trước lẫn khối cấu hình.
 *
 * Phần vẽ nằm ở `components/ui/step-progress.tsx` — dùng chung với màn tạo yêu
 * cầu ký. Ở đây chỉ còn việc dịch: nối `SignStepId` với câu chữ trong từ điển.
 *
 * Nó KHÔNG giữ trạng thái nào: `complete` và `reachable` do workspace tính từ
 * chính kết quả `validateSignForm` đang chặn nút ký, nên một bước sáng lên ở đây
 * đúng bằng nghĩa "phần cấu hình của bước đó không còn lỗi".
 */

export interface SignStepView {
  id: SignStepId;
  /** Không còn lỗi nào thuộc bước này. */
  complete: boolean;
  /** Mọi bước trước đã xong — bấm thẳng vào được. */
  reachable: boolean;
}

export function SignStepProgress({
  t,
  steps,
  activeIndex,
  onSelect,
}: {
  t: Dictionary;
  steps: SignStepView[];
  activeIndex: number;
  onSelect: (step: SignStepId) => void;
}) {
  const s = t.sign.steps;

  return (
    <StepProgress
      steps={steps.map((step) => ({ ...step, label: s[step.id].label }))}
      activeIndex={activeIndex}
      onSelect={(id) => onSelect(id as SignStepId)}
      navLabel={s.navLabel}
      stepOfLabel={s.stepOf}
      lockedHint={s.lockedHint}
    />
  );
}
