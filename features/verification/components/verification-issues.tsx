import { useState } from "react";
import {
  describeVerifyError,
  VerifyApiClientError,
} from "@/features/verification/api";
import type {
  VerificationIssue,
  VerificationRemediation,
  VerificationSignature,
} from "@/lib/types/verification";
import type { Dictionary } from "@/lib/i18n";
import { ALLOWLIST_ISSUE_CODES } from "./verification-config";
import { IssueIcon, issueStyle } from "./verification-ui";

function RemediationCard({
  t,
  remediation,
}: {
  t: Dictionary;
  remediation: VerificationRemediation;
}) {
  const stageLabel = remediation.stage
    ? t.verify.remediations.stage[remediation.stage as keyof typeof t.verify.remediations.stage] ??
      remediation.stage
    : null;

  return (
    <article className="rounded-lg border border-border-muted bg-inset p-4">
      <div className="flex gap-3">
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-fg">
          {remediation.priority}
        </span>
        <div className="min-w-0">
          <h4 className="text-[12.5px] font-semibold text-fg">{remediation.title}</h4>
          {remediation.description ? (
            <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">
              {remediation.description}
            </p>
          ) : null}
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            {stageLabel ? (
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
                {stageLabel}
              </span>
            ) : null}
            {remediation.requiresResigning ? (
              <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-[10px] font-semibold text-warning">
                {t.verify.remediations.requiresResigning}
              </span>
            ) : null}
            {remediation.networkRequirement !== "NOT_REQUIRED" ? (
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
                {t.verify.remediations.networkRequirement[remediation.networkRequirement]}
              </span>
            ) : null}
            {remediation.actionCode ? (
              <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] text-fg-subtle">
                {remediation.actionCode}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </article>
  );
}

export function IssuesPanel({
  t,
  signature,
  canManageAllowlist,
  onAllowlistReverify,
}: {
  t: Dictionary;
  signature: VerificationSignature;
  canManageAllowlist: boolean;
  onAllowlistReverify: (host: string) => Promise<void>;
}) {
  const errorCount = signature.issues.filter(
    (issue) => issue.severity === "ERROR" || issue.severity === "CRITICAL",
  ).length;
  const warningCount = signature.issues.filter((issue) => issue.severity === "WARNING").length;

  if (signature.issues.length === 0 && signature.remediations.length === 0) {
    return <p className="text-[12.5px] text-fg-muted">{t.verify.issues.none}</p>;
  }

  /*
   * Nguyên nhân gốc trước, hệ quả lồng bên dưới. `causedByIssueIds` là thứ cho
   * phép nói "revocation chưa chạy VÌ path chưa neo trust" thay vì liệt kê hai
   * lỗi ngang hàng và để người đọc tự đoán cái nào là cái phải sửa.
   */
  const roots = signature.issues.filter((issue) => issue.rootCause);
  const consequences = signature.issues.filter((issue) => !issue.rootCause);
  const orphans = consequences.filter(
    (issue) =>
      issue.causedByIssueIds.length === 0 ||
      !issue.causedByIssueIds.some((id) => roots.some((root) => root.issueId === id)),
  );

  return (
    <>
      {signature.issues.length > 0 ? (
        <div
          className={`mb-4 rounded-md px-4 py-3 text-[12px] ${
            errorCount > 0 ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning"
          }`}
        >
          <strong>{t.verify.issues.summary(errorCount, warningCount)}</strong>
        </div>
      ) : null}

      <div className="space-y-3">
        {roots.map((root) => {
          const caused = consequences.filter((issue) =>
            issue.causedByIssueIds.includes(root.issueId),
          );

          return (
            <div key={root.issueId}>
              <IssueCard
                issue={root}
                t={t}
                canManageAllowlist={canManageAllowlist}
                onAllowlistReverify={onAllowlistReverify}
              />
              {caused.length > 0 ? (
                <div className="mt-2 space-y-2 border-l-2 border-border-muted pl-4">
                  <p className="text-[11px] font-semibold text-fg-subtle">
                    {t.verify.issues.consequences(caused.length)}
                  </p>
                  {caused.map((issue) => (
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
          );
        })}

        {orphans.map((issue) => (
          <IssueCard
            key={issue.issueId}
            issue={issue}
            t={t}
            canManageAllowlist={canManageAllowlist}
            onAllowlistReverify={onAllowlistReverify}
          />
        ))}
      </div>

      {signature.remediations.length > 0 ? (
        <div className="mt-6 space-y-2">
          <h3 className="text-[13px] font-semibold text-fg">{t.verify.remediations.title}</h3>
          {signature.remediations.map((remediation) => (
            <RemediationCard key={remediation.remediationId} t={t} remediation={remediation} />
          ))}
        </div>
      ) : null}
    </>
  );
}

export function IssueCard({
  issue,
  t,
  canManageAllowlist,
  onAllowlistReverify,
}: {
  issue: VerificationIssue;
  t: Dictionary;
  canManageAllowlist: boolean;
  onAllowlistReverify: (host: string) => Promise<void>;
}) {
  const style = issueStyle(issue.severity);
  const isAllowlistIssue = ALLOWLIST_ISSUE_CODES.has(issue.code) && Boolean(issue.detail);

  return (
    <article className={`rounded-lg border p-4 ${style.border} ${style.background}`}>
      <div className="flex gap-3">
        <span className={`mt-0.5 shrink-0 ${style.color}`}>
          <IssueIcon severity={issue.severity} size={16} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[12.5px] font-semibold text-fg">{issue.message}</h3>
          {issue.detail ? (
            <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-fg-muted">
              {issue.detail}
            </p>
          ) : null}
          <p className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-fg-subtle">
            <span>{issue.code}</span>
            {issue.standardCode ? <span>· {issue.standardCode}</span> : null}
            {issue.category ? <span>· {issue.category}</span> : null}
          </p>

          {/*
            `fileNeedsResigning` là thứ quyết định CTA, không phải `severity`. Trust
            store rỗng là `ERROR` nhưng `fileNeedsResigning: false` — bảo người dùng
            ký lại ở ca đó là sai và làm mất bằng chứng gốc của một tệp lành lặn.
          */}
          {issue.fileNeedsResigning ? (
            <p className="mt-1.5 inline-block rounded-full bg-danger-subtle px-2 py-0.5 text-[10px] font-semibold text-danger">
              {t.verify.issues.needsResigning}
            </p>
          ) : null}

          {isAllowlistIssue && canManageAllowlist ? (
            <AllowlistAction t={t} host={issue.detail!} onReverify={onAllowlistReverify} />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function AllowlistAction({
  t,
  host,
  onReverify,
}: {
  t: Dictionary;
  host: string;
  onReverify: (host: string) => Promise<void>;
}) {
  const [phase, setPhase] = useState<"idle" | "adding" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPhase("adding");
    setError(null);
    try {
      await onReverify(host);
      setPhase("idle");
    } catch (err) {
      setPhase("error");
      setError(
        err instanceof VerifyApiClientError
          ? describeVerifyError(t, err.code, err.detail)
          : t.verify.allowlist.reverifyFailed,
      );
    }
  }

  return (
    <div className="mt-2.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={phase === "adding"}
        className="h-7 rounded-md border border-accent bg-accent px-3 text-[11.5px] font-semibold text-accent-fg disabled:opacity-60"
      >
        {phase === "adding" ? t.verify.allowlist.adding : t.verify.allowlist.action}
      </button>
      {phase === "error" && error ? (
        <p className="mt-1.5 text-[11px] text-danger">{error}</p>
      ) : null}
    </div>
  );
}