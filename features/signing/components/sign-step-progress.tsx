"use client";

import { Fragment } from "react";
import type { Dictionary } from "@/lib/i18n";
import { CheckIcon, LockIcon } from "@/components/ui/icons";
import type { SignStepId } from "../sign-configuration";

/**
 * Thanh tiến trình của màn ký, đứng trên cả bản xem trước lẫn khối cấu hình.
 *
 * Nó KHÔNG giữ trạng thái nào: `complete` và `reachable` do workspace tính từ
 * chính kết quả `validateSignForm` đang chặn nút ký, nên một bước sáng lên ở đây
 * đúng bằng nghĩa "phần cấu hình của bước đó không còn lỗi".
 *
 * Bước đã mở bấm được để quay lại; bước bị khoá vẫn hiện ra (kèm ổ khoá và lý
 * do) thay vì bị ẩn — ẩn đi thì người dùng không biết còn bao nhiêu việc.
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
  /**
   * Đếm theo TIỀN TỐ liền mạch, không đếm tổng số bước không lỗi: bước 4 có thể
   * hợp lệ sẵn (thuật toán mặc định đã đúng) trong khi bước 3 còn trống, và báo
   * nó là tiến độ đã đi được thì con số phần trăm nói dối.
   */
  let done = 0;
  while (done < steps.length && steps[done].complete) done += 1;
  const percent = steps.length ? Math.round((done / steps.length) * 100) : 0;

  return (
    <nav
      aria-label={s.navLabel}
      className="rounded-lg border border-border bg-surface px-4 py-3 shadow-sm"
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
          {s.stepOf(activeIndex + 1, steps.length)}
        </span>
        <span className="font-mono text-[10.5px] text-fg-muted">{percent}%</span>
      </div>

      <ol className="flex items-center">
        {steps.map((step, index) => {
          const active = index === activeIndex;
          const label = s[step.id].label;
          /*
           * Dấu tích chỉ dành cho bước đã ĐI QUA. Một bước còn khoá vẫn có thể
           * không có lỗi nào (giá trị mặc định của nó đã hợp lệ) — đánh dấu xong
           * lúc đó là nói người dùng đã làm một việc họ chưa hề thấy.
           */
          const done = step.complete && step.reachable;

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
                  title={step.reachable ? label : s.lockedHint}
                  className={`flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 transition-colors ${
                    step.reachable ? "cursor-pointer hover:bg-inset" : "cursor-not-allowed"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold transition-colors ${circleStyle(
                      { done, reachable: step.reachable, active },
                    )}`}
                  >
                    {done ? (
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
                    {label}
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
