"use client";

import { Fragment } from "react";
import { CheckIcon, LockIcon } from "@/components/ui/icons";

/**
 * Thanh tiến trình của một luồng nhiều bước — thuần trình bày, KHÔNG giữ trạng
 * thái nào. Một bước sáng lên ở đây đúng bằng nghĩa "màn hình gọi nó là xong";
 * component này không tự kết luận điều đó.
 *
 * Bước đã mở bấm được để quay lại; bước bị khoá vẫn hiện ra (kèm ổ khoá và lý
 * do) thay vì bị ẩn — ẩn đi thì người dùng không biết còn bao nhiêu việc.
 *
 * Dùng chung giữa màn ký (`features/signing`) và màn tạo yêu cầu ký
 * (`features/sign-request`), nên mọi câu chữ đều đi vào bằng props.
 */

export interface StepProgressItem {
  id: string;
  label: string;
  /** Không còn lỗi nào thuộc bước này. */
  complete: boolean;
  /** Mọi bước trước đã xong — bấm thẳng vào được. */
  reachable: boolean;
}

export function StepProgress({
  steps,
  activeIndex,
  onSelect,
  navLabel,
  stepOfLabel,
  lockedHint,
}: {
  steps: StepProgressItem[];
  activeIndex: number;
  onSelect: (id: string) => void;
  navLabel: string;
  stepOfLabel: (current: number, total: number) => string;
  lockedHint: string;
}) {
  /**
   * Đếm theo TIỀN TỐ liền mạch, không đếm tổng số bước không lỗi: bước cuối có
   * thể hợp lệ sẵn (giá trị mặc định đã đúng) trong khi bước giữa còn trống, và
   * báo nó là tiến độ đã đi được thì con số phần trăm nói dối.
   */
  let done = 0;
  while (done < steps.length && steps[done].complete) done += 1;
  const percent = steps.length ? Math.round((done / steps.length) * 100) : 0;

  return (
    <nav
      aria-label={navLabel}
      className="rounded-lg border border-border bg-surface px-4 py-3 shadow-sm"
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
          {stepOfLabel(activeIndex + 1, steps.length)}
        </span>
        <span className="font-mono text-[10.5px] text-fg-muted">{percent}%</span>
      </div>

      <ol className="flex items-center">
        {steps.map((step, index) => {
          const active = index === activeIndex;
          /*
           * Dấu tích chỉ dành cho bước đã ĐI QUA. Một bước còn khoá vẫn có thể
           * không có lỗi nào — đánh dấu xong lúc đó là nói người dùng đã làm một
           * việc họ chưa hề thấy.
           */
          const passed = step.complete && step.reachable;

          return (
            <Fragment key={step.id}>
              {index > 0 ? (
                <li
                  aria-hidden="true"
                  className={`mx-1.5 h-0.5 min-w-3 flex-1 rounded-full transition-colors sm:mx-2 ${
                    steps[index - 1].complete && steps[index - 1].reachable
                      ? "bg-accent"
                      : "bg-border-muted"
                  }`}
                />
              ) : null}

              <li className="shrink-0">
                <button
                  type="button"
                  disabled={!step.reachable}
                  onClick={() => onSelect(step.id)}
                  aria-current={active ? "step" : undefined}
                  title={step.reachable ? step.label : lockedHint}
                  className={`flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 transition-colors ${
                    step.reachable ? "cursor-pointer hover:bg-inset" : "cursor-not-allowed"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold transition-colors ${circleStyle(
                      { done: passed, reachable: step.reachable, active },
                    )}`}
                  >
                    {passed ? (
                      <CheckIcon size={14} />
                    ) : step.reachable ? (
                      index + 1
                    ) : (
                      <LockIcon size={12} />
                    )}
                  </span>

                  <span
                    className={`whitespace-nowrap text-[12px] font-semibold ${
                      active ? "inline" : "hidden md:inline"
                    } ${
                      active
                        ? "text-fg"
                        : step.reachable
                          ? "text-fg-muted"
                          : "text-fg-subtle"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Bốn trạng thái, và "đang đứng ở đây" thắng "đã xong": người dùng quay lại một
 * bước đã hoàn tất vẫn phải thấy mình đang ở đâu.
 */
function circleStyle({
  done,
  reachable,
  active,
}: {
  done: boolean;
  reachable: boolean;
  active: boolean;
}): string {
  if (active) return "border-accent bg-accent text-accent-fg ring-3 ring-accent-subtle";
  if (done) return "border-accent bg-accent-subtle text-accent";
  if (reachable) return "border-border bg-surface text-fg-muted";
  return "border-border-muted bg-inset text-fg-subtle";
}
