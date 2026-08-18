"use client";

import {
  AlertTriangleIcon,
  ClockIcon,
  InfoIcon,
  LockIcon,
  RotateCcwIcon,
  SpinnerIcon,
} from "@/components/ui/icons";
import type { SigningLeaseResponse } from "@/lib/types/signing-lease";

/**
 * Khối trả lời đúng một câu: "vì sao nút Ký đang tắt, và tôi làm gì bây giờ".
 *
 * Dùng chung cho cả màn ký nội bộ lẫn màn ký công khai — trạng thái lease giống
 * hệt nhau ở hai nơi, và hai bản sao của cùng bốn nhánh này là hai chỗ để một
 * nhánh được sửa còn nhánh kia thì không. Chỉ CÂU CHỮ đến từ ngoài (`copy`, đi
 * qua từ điển i18n của từng luồng), cộng đúng một khác biệt về nội dung:
 * `showHolder`.
 *
 * `showHolder` là ranh giới RIÊNG TƯ, không phải một tuỳ chọn giao diện. Màn nội
 * bộ được nói "Giám đốc đang ký tài liệu này" vì người đọc vốn đã thấy danh sách
 * người ký của quy trình. Màn công khai thì KHÔNG: người ký ngoài hệ thống chỉ
 * được biết "có một người ký khác", còn `holderLabel`/`holderUserId`/
 * `holderSignerId` là danh tính của người khác trong một tổ chức mà họ không
 * thuộc về. Vì thế nhánh hiển thị nhãn nằm sau cờ này, chứ không nằm sau một
 * phép kiểm tra "có nhãn thì hiện".
 */

export interface SigningLeaseCopy {
  checking: string;
  lockedTitle: string;
  lockedBody: string;
  lockedByBody: (holder: string) => string;
  lockedRetryHint: (seconds: number) => string;
  heldTitle: string;
  heldBody: string;
  cancel: string;
  cancelling: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
}

export function SigningLeasePanel({
  copy,
  lease,
  loading,
  error,
  cancelling,
  showHolder,
  heldBody,
  onRetry,
  onCancel,
  onResume,
  resumeLabel,
}: {
  copy: SigningLeaseCopy;
  lease?: SigningLeaseResponse;
  loading: boolean;
  error?: unknown;
  cancelling: boolean;
  /** Chỉ màn NỘI BỘ được bật — xem chú thích riêng tư ở đầu file. */
  showHolder: boolean;
  /**
   * Câu thay cho `copy.heldBody` khi lượt ký đang mở KHÔNG nối lại được từ màn
   * này — hiện chỉ có USB Token: phiên của nó giữ digest của một tài liệu đã
   * dựng sẵn, và chỉ chính tab đã dựng nó mới ký xong được.
   */
  heldBody?: string;
  onRetry: () => void;
  /** Vắng mặt thì nhánh `HELD_BY_YOU` không hiện nút huỷ (đang bận, hoặc thiếu CSRF). */
  onCancel?: () => void;
  /**
   * Nối lại lượt ký đang mở. Vắng mặt là KHÔNG nối lại được — và khi đó nút duy
   * nhất còn lại là huỷ. Ở đây không bao giờ có nhánh nào tự gửi START: đó là
   * đúng cái mà `HELD_BY_YOU` nói rằng không được làm.
   */
  onResume?: () => void;
  resumeLabel?: string;
}) {
  /*
   * Lỗi đứng TRƯỚC mọi thứ khác, kể cả khi còn một `lease` cũ trong tay: không
   * đọc được trạng thái nghĩa là không biết, và "không biết" ở đây phải trông
   * như "không biết" chứ không như một câu trả lời cũ vẫn còn hiệu lực.
   */
  if (error) {
    return (
      <div
        role="status"
        className="flex gap-2 rounded-md border border-danger bg-danger-subtle p-3"
      >
        <AlertTriangleIcon size={14} className="mt-0.5 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold text-danger">{copy.errorTitle}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-danger">{copy.errorBody}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-fg hover:bg-inset"
        >
          <RotateCcwIcon size={12} />
          {copy.retry}
        </button>
      </div>
    );
  }

  /*
   * Lượt đọc ĐẦU TIÊN chưa xong. Hiện ra chứ không im lặng: nút Ký đang tắt vì
   * lý do này, và một cái nút tắt không giải thích gì là thứ người ký sẽ bấm đi
   * bấm lại.
   */
  if (!lease && loading) {
    return (
      <p className="flex items-center gap-2 text-[11.5px] text-fg-muted">
        <SpinnerIcon size={13} className="animate-spin" />
        {copy.checking}
      </p>
    );
  }

  if (lease?.state === "LOCKED") {
    const holder = showHolder ? lease.holderLabel?.trim() : undefined;

    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-md border border-warning bg-warning-subtle p-3"
      >
        <div className="flex gap-2">
          <LockIcon size={14} className="mt-0.5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-semibold text-warning">{copy.lockedTitle}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-warning">
              {holder ? copy.lockedByBody(holder) : copy.lockedBody}
            </p>
            {lease.retryAfterSeconds > 0 ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-warning">
                <ClockIcon size={11} className="shrink-0" />
                {copy.lockedRetryHint(lease.retryAfterSeconds)}
              </p>
            ) : null}
          </div>
          {/* Nhịp poll đang chạy — con quay là thứ duy nhất nói rằng màn hình tự cập nhật. */}
          <SpinnerIcon size={13} className="mt-0.5 shrink-0 animate-spin text-warning" />
        </div>
      </div>
    );
  }

  if (lease?.state === "HELD_BY_YOU") {
    return (
      <div
        role="status"
        className="flex gap-2 rounded-md border border-warning bg-warning-subtle p-3"
      >
        <InfoIcon size={14} className="mt-0.5 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold text-warning">{copy.heldTitle}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-warning">
            {heldBody ?? copy.heldBody}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-fg hover:bg-inset disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelling ? (
                <SpinnerIcon size={12} className="animate-spin" />
              ) : (
                <RotateCcwIcon size={12} />
              )}
              {cancelling ? copy.cancelling : copy.cancel}
            </button>
          ) : null}
          {onResume && resumeLabel ? (
            <button
              type="button"
              onClick={onResume}
              disabled={cancelling}
              className="inline-flex h-8 shrink-0 items-center rounded-md border border-accent bg-accent px-3 text-[11.5px] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resumeLabel}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  /* `AVAILABLE` — không có gì để nói, và im lặng là câu trả lời đúng. */
  return null;
}
