import {
  describeVerifyError,
  FileTooLargeError,
  VerifyApiClientError,
} from "@/features/verification/api";
import type {
  CheckOutcome,
  VerificationReport,
} from "@/lib/types/verification";
import { AlertCircleIcon, AlertTriangleIcon, InfoIcon } from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import {
  OutcomeIcon,
  VerdictIcon,
  checkOutcomeTone,
  verdictMeta,
} from "./verification-ui";
import { IssueCard } from "./verification-issues";

export function EmptyVerificationState({ t }: { t: Dictionary }) {
  return (
    <section className="flex min-h-130 items-center justify-center rounded-lg border border-dashed border-border bg-surface p-8 text-center">
      <div className="max-w-sm">
        <p className="text-[14px] font-semibold text-fg">
          {t.verify.empty.title}
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-fg-muted">
          {t.verify.empty.description}
        </p>
      </div>
    </section>
  );
}

export function VerificationProgress({ t }: { t: Dictionary }) {
  const checks = t.verify.progress.checks;

  return (
    <section
      aria-live="polite"
      className="min-h-130 rounded-lg border border-border bg-surface p-8 shadow-sm"
    >
      <div className="mx-auto max-w-lg">
        <h2 className="text-[16px] font-semibold text-fg">
          {t.verify.progress.title}
        </h2>
        <p className="mt-1 text-[12.5px] text-fg-muted">
          {t.verify.progress.description}
        </p>

        <ol className="mt-6 space-y-3">
          {checks.map((check) => (
            <li
              key={check}
              className="flex items-center gap-3 rounded-md border border-border-muted p-3"
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-inset text-[10px] font-bold text-fg-muted">
                <span className="size-2 animate-pulse rounded-full bg-accent" />
              </span>
              <span className="text-[12.5px] text-fg">{check}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function VerificationErrorState({
  t,
  error,
}: {
  t: Dictionary;
  error: VerifyApiClientError | FileTooLargeError | Error;
}) {
  const message =
    error instanceof FileTooLargeError
      ? describeVerifyError(t, "FILE_TOO_LARGE")
      : error instanceof VerifyApiClientError
        ? describeVerifyError(t, error.code, error.detail)
        : describeVerifyError(t, "UNKNOWN_ERROR");

  const correlationId = error instanceof VerifyApiClientError ? error.correlationId : undefined;

  return (
    <section className="flex min-h-130 items-center justify-center rounded-lg border border-danger bg-danger-subtle p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-danger-subtle text-danger">
          <AlertCircleIcon size={22} />
        </span>
        <p className="mt-3 text-[14px] font-semibold text-fg">
          {t.verify.error.title}
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-fg-muted">
          {message}
        </p>
        {correlationId ? (
          <p className="mt-2 font-mono text-[10.5px] text-fg-subtle">
            {t.verify.error.correlationId(correlationId)}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function NoSignaturesState({
  t,
  report,
  canManageAllowlist,
  onAllowlistReverify,
}: {
  t: Dictionary;
  report: VerificationReport;
  canManageAllowlist: boolean;
  onAllowlistReverify: (host: string) => Promise<void>;
}) {
  return (
    <section className="flex min-h-130 items-center justify-center rounded-lg border border-dashed border-border bg-surface p-8 text-center">
      <div className="max-w-sm">
        <p className="text-[14px] font-semibold text-fg">
          {t.verify.signatureList.empty}
        </p>
        {report.issues.length > 0 ? (
          <div className="mt-4 space-y-2 text-left">
            {report.issues.map((issue) => (
              <IssueCard
                key={issue.issueId}
                issue={issue}
                t={t}
                canManageAllowlist={canManageAllowlist}
                onAllowlistReverify={onAllowlistReverify}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Header cấp tài liệu: chỉ giữ những thông tin giúp người dùng hiểu kết luận ngay.
 * Metadata kỹ thuật được chuyển xuống tab Nâng cao.
 */

export function VerificationResultHeader({
  t,
  report,
}: {
  t: Dictionary;
  report: VerificationReport;
}) {
  const meta = verdictMeta(t, report.status);
  const stats = report.signatureStatistics;
  const hasRootIssues = report.rootIssues.length > 0;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className={`flex flex-wrap items-start gap-3 p-5 ${meta.background}`}>
        <span className={`mt-0.5 ${meta.color}`}>
          <VerdictIcon status={report.status} size={24} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
            {t.verify.ux.verificationResult}
          </p>
          <h1 className={`mt-1 text-[18px] font-semibold ${meta.color}`}>{meta.title}</h1>
          <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-fg-muted">
            {reportSummarySentence(t, report)}
          </p>

          {/*
            `TOTAL_PASSED` + `PARTIAL` là trạng thái có thật và người đọc cần
            biết: kết luận đạt, nhưng không phải bước nào cũng chạy hết. Ẩn dòng
            này là để người dùng tin rằng mọi thứ đã được kiểm tra.
          */}
          {report.completeness === "PARTIAL" ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-fg-muted">
              <InfoIcon size={13} className="shrink-0" />
              {t.verify.report.completenessValue.PARTIAL}
            </p>
          ) : null}
        </div>

        <span className="rounded-full bg-surface px-2.5 py-1 text-[10.5px] font-semibold text-fg-muted shadow-sm">
          {stats.processed}/{stats.detected} {t.verify.ux.signatures.toLowerCase()}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border-muted px-5 py-3 text-[11.5px] text-fg-muted">
        <CompactStatus
          outcome={stats.cryptographicallyValid === stats.processed && stats.processed > 0 ? "PASS" : null}
          label={t.verify.summary.cryptoValidCount(stats.cryptographicallyValid, stats.processed)}
        />
        {stats.totalFailed > 0 ? (
          <CompactStatus outcome="FAIL" label={t.verify.summary.failedCount(stats.totalFailed)} />
        ) : null}
        {stats.indeterminate > 0 ? (
          <CompactStatus outcome="INDETERMINATE" label={t.verify.summary.indeterminateCount(stats.indeterminate)} />
        ) : null}
        {hasRootIssues ? (
          <span className="inline-flex items-center gap-1.5 text-warning">
            <AlertTriangleIcon size={13} />
            {t.verify.summary.rootIssuesCount(report.rootIssues.length)}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function CompactStatus({ outcome, label }: { outcome: CheckOutcome | null; label: string }) {
  const tone = checkOutcomeTone(outcome);
  return (
    <span className={`inline-flex items-center gap-1.5 ${tone.color}`}>
      <OutcomeIcon outcome={outcome} size={13} />
      {label}
    </span>
  );
}

function reportSummarySentence(t: Dictionary, report: VerificationReport): string {
  const stats = report.signatureStatistics;

  if (report.status === "VALID") {
    return t.verify.summary.validSummary(stats.processed);
  }

  if (report.status === "INVALID") {
    return t.verify.summary.invalidSummary;
  }

  return t.verify.summary.indeterminateSummary(stats.cryptographicallyValid, stats.processed);
}

/**
 * Một hành động khắc phục. Danh sách đã gộp theo `actionCode` và sắp sẵn theo
 * `priority` ở backend — render đúng thứ tự nhận được, KHÔNG sort lại.
 *
 * `stage` quyết định hiển thị cho ai: `VERIFIER_CONFIGURATION` là việc của admin
 * hệ thống chứ không phải của người vừa tải tệp lên.
 */