"use client";

import {
  AlertTriangleIcon,
  CheckIcon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  LinkIcon,
  MailIcon,
  RotateCcwIcon,
  UsersIcon,
} from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import type { SignedDocument } from "@/lib/types/signing";
import { Spinner } from "@/features/signing/components/sign-dialog-parts";
import { downloadSignedDocument } from "@/features/signing/sign-api";
import { isRetryable, type ExternalSigningMessage } from "../errors";
import type { ExternalSigningError } from "../api";

/**
 * Ba màn toàn trang của luồng ký công khai: đang mở liên kết, liên kết không dùng
 * được, và ký xong.
 *
 * Cả ba đều là màn ĐƠN — không có tài liệu, không có panel, không có gì để bấm
 * ngoài đúng một việc. Người ký tới đây đang ở một trong ba tình huống không có
 * lựa chọn nào để đưa ra, và bày ra thêm thứ gì cũng chỉ là tiếng ồn.
 */

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-8">
      <div className="w-full max-w-125 rounded-xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}

export function ExternalSigningLoading({ t }: { t: Dictionary }) {
  const l = t.externalSign.loading;
  return (
    <CenteredCard>
      <Spinner />
      <h1 className="mt-4 text-[17px] font-semibold text-fg">{l.title}</h1>
      <p className="mx-auto mt-2 max-w-85 text-[12.5px] leading-relaxed text-fg-muted">{l.body}</p>
    </CenteredCard>
  );
}

/**
 * Liên kết không dùng được.
 *
 * Ba thứ luôn có mặt: điều gì đã xảy ra, việc cần làm, và mã lỗi để đọc lại cho
 * người gửi. Nút "thử lại" CHỈ hiện với lỗi mà thử lại có nghĩa — mời người ký
 * bấm lại vào một link đã hết hạn là hứa một thứ không thể xảy ra.
 */
export function ExternalSigningUnavailable({
  t,
  message,
  error,
  onRetry,
}: {
  t: Dictionary;
  message: ExternalSigningMessage;
  error?: ExternalSigningError;
  onRetry: () => void;
}) {
  const u = t.externalSign.unavailable;
  /** Chưa tới lượt là một trạng thái BÌNH THƯỜNG của quy trình, không phải lỗi. */
  const informational = error?.code === "SIGNER_NOT_CURRENT";
  const alreadyDone = error?.code === "SIGNER_ALREADY_PROCESSED";

  const tone = alreadyDone
    ? { border: "border-success", bg: "bg-success-subtle", fg: "text-success" }
    : informational
      ? { border: "border-accent", bg: "bg-accent-subtle", fg: "text-accent" }
      : { border: "border-warning", bg: "bg-warning-subtle", fg: "text-warning" };

  return (
    <CenteredCard>
      <span
        className={`mx-auto flex size-12 items-center justify-center rounded-xl border ${tone.border} ${tone.bg} ${tone.fg}`}
      >
        {alreadyDone ? (
          <CheckIcon size={22} />
        ) : informational ? (
          <UsersIcon size={22} />
        ) : (
          <LinkIcon size={22} />
        )}
      </span>

      <h1 className="mt-4 text-[17px] font-semibold text-fg">{message.title}</h1>
      <p className="mx-auto mt-2 max-w-90 text-[12.5px] leading-relaxed text-fg-muted">
        {message.body}
      </p>

      {!alreadyDone ? (
        <div className="mt-5 rounded-lg border border-border-muted bg-surface-2 p-3 text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
            {u.whatNow}
          </p>
          <p className="mt-1.5 flex items-start gap-2 text-[12px] leading-relaxed text-fg">
            <MailIcon size={14} className="mt-0.5 shrink-0 text-fg-muted" />
            {u.contactSender}
          </p>
        </div>
      ) : null}

      {isRetryable(error) ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg"
        >
          <RotateCcwIcon size={14} />
          {u.retry}
        </button>
      ) : null}

      {message.code ? (
        <dl className="mt-5 space-y-1 border-t border-border-muted pt-3 text-left">
          <div className="flex justify-between gap-3">
            <dt className="text-[10.5px] text-fg-subtle">{u.codeLabel}</dt>
            <dd className="font-mono text-[10.5px] text-fg-muted">{message.code}</dd>
          </div>
          {message.correlationId ? (
            <p className="font-mono text-[10.5px] text-fg-subtle">
              {u.correlationLabel(message.correlationId)}
            </p>
          ) : null}
        </dl>
      ) : null}
    </CenteredCard>
  );
}

/**
 * Ký xong.
 *
 * Nút tải bản đã ký chỉ hiện KHI backend thật sự trả tệp về: tài liệu tích hợp để
 * ngỏ câu "có cho tải trước/sau khi ký hay không", nên màn hình không được vẽ một
 * nút rồi mới phát hiện không có gì để tải. Không có tệp thì nói thẳng rằng người
 * gửi đang giữ bản đã ký.
 *
 * Object URL bị thu hồi ngay sau cú bấm — đây là object URL DUY NHẤT trong cả
 * luồng ký công khai.
 */
export function ExternalSigningCompleted({
  t,
  documentName,
  signerLabel,
  signed,
}: {
  t: Dictionary;
  documentName: string;
  signerLabel: string | null;
  signed?: SignedDocument | null;
}) {
  const c = t.externalSign.completed;
  const signedAt = new Date().toLocaleString();

  return (
    <CenteredCard>
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-success bg-success-subtle text-success">
        <CheckIcon size={28} />
      </span>

      <h1 className="mt-4 text-[19px] font-semibold text-fg">{c.title}</h1>
      <p className="mx-auto mt-2 max-w-90 text-[12.5px] leading-relaxed text-fg-muted">{c.body}</p>

      <dl className="mt-5 divide-y divide-border-muted rounded-lg border border-border-muted bg-surface-2 px-3 text-left">
        <Row icon={<FileTextIcon size={13} />} label={c.documentLabel} value={documentName} />
        {signerLabel ? (
          <Row icon={<UsersIcon size={13} />} label={c.signerLabel} value={signerLabel} />
        ) : null}
        <Row icon={<ClockIcon size={13} />} label={c.signedAtLabel} value={signedAt} />
      </dl>

      {signed ? (
        <>
          <button
            type="button"
            onClick={() => downloadSignedDocument(signed)}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-accent bg-accent text-[13px] font-semibold text-accent-fg"
          >
            <DownloadIcon size={15} />
            {c.download}
          </button>
          <p className="mt-1.5 text-[10.5px] text-fg-muted">{c.downloadHint}</p>
        </>
      ) : (
        <p className="mt-4 text-[11.5px] leading-relaxed text-fg-muted">{c.noCopyNote}</p>
      )}

      <p className="mt-4 text-[11px] text-fg-subtle">{c.closeHint}</p>
    </CenteredCard>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[104px_1fr] items-center gap-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[11.5px] text-fg-muted">
        <span className="shrink-0 text-fg-subtle">{icon}</span>
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right text-[12px] font-semibold text-fg" title={value}>
        {value}
      </dd>
    </div>
  );
}

/** Cảnh báo phiên đã hết hạn, hiện tại chỗ nút ký. */
export function SessionExpiredNotice({ t }: { t: Dictionary }) {
  const c = t.externalSign.chrome;
  return (
    <div className="flex gap-2 rounded-md border border-danger bg-danger-subtle p-3">
      <AlertTriangleIcon size={14} className="mt-0.5 shrink-0 text-danger" />
      <div>
        <p className="text-[11.5px] font-semibold text-danger">{c.sessionExpired}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-danger">{c.sessionExpiredBody}</p>
      </div>
    </div>
  );
}
