"use client";

import { useRef, useState } from "react";
import {
  addToAllowlistAndReverify,
  describeVerifyError,
  FileTooLargeError,
  VerifyApiClientError,
  verifyFile,
} from "@/features/verification/api";
import {
  VALIDATION_GROUPS,
  type CertificateChain,
  type ChainNodeStatus,
  type CheckOutcome,
  type IssueSeverity,
  type SignatureCheck,
  type ValidationGroup,
  type VerificationIssue,
  type VerificationRemediation,
  type VerificationReport,
  type VerificationSignature,
  type VerificationStatus,
  type VerificationTimestamp,
} from "@/lib/types/verification";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckIcon,
  ChevronRightIcon,
  InfoIcon,
  XIcon,
} from "@/components/ui/icons";
import { useLocale } from "@/components/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n";

type Phase = "idle" | "verifying" | "done" | "error";

type InspectorTab = "result" | "tree" | "chain" | "timestamp" | "manifest" | "issues";

const ALL_TABS: InspectorTab[] = ["result", "tree", "chain", "timestamp", "manifest", "issues"];

const ALLOWLIST_ISSUE_CODES = new Set([
  "OCSP_URL_NOT_ALLOWED",
  "CRL_URL_NOT_ALLOWED",
  "REVOCATION_ENDPOINT_NOT_ALLOWED",
]);

export function VerifySignatureWorkspace({
  canManageAllowlist = false,
}: {
  canManageAllowlist?: boolean;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);

  const [artifact, setArtifact] = useState<File>();
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tab, setTab] = useState<InspectorTab>("result");
  const [error, setError] = useState<VerifyApiClientError | FileTooLargeError | Error | null>(null);

  const selectedSignature = report?.signatures[selectedIndex];

  async function handleFile(file?: File) {
    if (!file) return;

    setArtifact(file);
    setPhase("verifying");
    setReport(null);
    setError(null);
    setSelectedIndex(0);
    setTab("result");

    try {
      const result = await verifyFile(file);
      setReport(result);
      setPhase("done");
    } catch (err) {
      setError(err as VerifyApiClientError | FileTooLargeError | Error);
      setPhase("error");
    }
  }

  async function handleAllowlistReverify(host: string) {
    if (!artifact) return;
    const result = await addToAllowlistAndReverify(host, artifact);
    setReport(result);
  }

  function clearArtifact() {
    setArtifact(undefined);
    setPhase("idle");
    setReport(null);
    setError(null);
    setSelectedIndex(0);
    setTab("result");

    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <ArtifactUpload
          t={t}
          artifact={artifact}
          dragging={dragging}
          inputRef={inputRef}
          phase={phase}
          onDraggingChange={setDragging}
          onSelect={handleFile}
          onClear={clearArtifact}
        />

        {phase === "done" && report ? (
          <SignatureList
            t={t}
            signatures={report.signatures}
            selectedIndex={selectedIndex}
            onSelect={(index) => {
              setSelectedIndex(index);
              setTab("result");
            }}
          />
        ) : null}
      </aside>

      <main className="min-w-0 space-y-4">
        {phase === "idle" ? <EmptyVerificationState t={t} /> : null}

        {phase === "verifying" ? <VerificationProgress t={t} /> : null}

        {phase === "error" && error ? <VerificationErrorState t={t} error={error} /> : null}

        {phase === "done" && report ? <ReportSummary t={t} report={report} /> : null}

        {phase === "done" && report && report.signatures.length === 0 ? (
          <NoSignaturesState
            t={t}
            report={report}
            canManageAllowlist={canManageAllowlist}
            onAllowlistReverify={handleAllowlistReverify}
          />
        ) : null}

        {phase === "done" && selectedSignature ? (
          <VerificationInspector
            t={t}
            signature={selectedSignature}
            tab={tab}
            onTabChange={setTab}
            canManageAllowlist={canManageAllowlist}
            onAllowlistReverify={handleAllowlistReverify}
          />
        ) : null}
      </main>
    </div>
  );
}

function ArtifactUpload({
  t,
  artifact,
  dragging,
  inputRef,
  phase,
  onDraggingChange,
  onSelect,
  onClear,
}: {
  t: Dictionary;
  artifact?: File;
  dragging: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  phase: Phase;
  onDraggingChange: (value: boolean) => void;
  onSelect: (file?: File) => void;
  onClear: () => void;
}) {
  if (artifact) {
    const statusText =
      phase === "verifying"
        ? t.verify.upload.verifying
        : phase === "error"
          ? t.verify.upload.failed
          : t.verify.upload.completed;

    return (
      <section className="rounded-lg border border-border bg-surface shadow-sm">
        <header className="border-b border-border-muted px-4 py-2.5 text-[13px] font-semibold text-fg">
          {t.verify.upload.sectionTitle}
        </header>

        <div className="flex items-start gap-3 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-subtle font-mono text-[9px] font-bold uppercase text-accent">
            {fileExtension(artifact.name) || "FILE"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-fg">
              {artifact.name}
            </p>
            <p className="mt-0.5 text-[11px] text-fg-muted">
              {formatBytes(artifact.size)}
            </p>
            <p
              className={`mt-1 text-[10.5px] ${
                phase === "error" ? "text-danger" : "text-fg-subtle"
              }`}
            >
              {statusText}
            </p>
          </div>

          <button
            type="button"
            onClick={onClear}
            aria-label={t.verify.upload.remove(artifact.name)}
            className="rounded-md p-1 text-fg-muted hover:bg-inset hover:text-fg"
          >
            <XIcon size={15} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-lg border-2 border-dashed bg-surface p-6 text-center transition-colors ${
        dragging
          ? "border-accent bg-accent-subtle"
          : "border-border"
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        onDraggingChange(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          onDraggingChange(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDraggingChange(false);
        onSelect(event.dataTransfer.files[0]);
      }}
    >
      <p className="text-[13px] font-semibold text-fg">
        {t.verify.upload.dropHere}
      </p>
      <p className="mt-1 text-[11.5px] text-fg-muted">
        {t.verify.upload.acceptedTypes}
      </p>

      <input
        ref={inputRef}
        id="verification-artifact"
        type="file"
        className="sr-only"
        accept=".pdf,.xml,.docx,.xlsx,.pptx"
        onChange={(event) =>
          onSelect(event.target.files?.[0])
        }
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 h-8.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg"
      >
        {t.verify.upload.chooseFile}
      </button>
    </section>
  );
}

function SignatureList({
  t,
  signatures,
  selectedIndex,
  onSelect,
}: {
  t: Dictionary;
  signatures: VerificationSignature[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <header className="flex items-center justify-between border-b border-border-muted px-4 py-2.5">
        <span className="text-[13px] font-semibold text-fg">
          {t.verify.signatureList.title}
        </span>
        <span className="rounded-full bg-inset px-2 py-0.5 text-[10.5px] font-semibold text-fg-muted">
          {signatures.length}
        </span>
      </header>

      {signatures.length === 0 ? (
        <p className="px-4 py-3 text-[11.5px] text-fg-muted">
          {t.verify.signatureList.empty}
        </p>
      ) : (
        <div>
          {signatures.map((signature, position) => {
            const selected = position === selectedIndex;

            return (
              <button
                key={signature.signatureId}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(position)}
                className={`flex w-full items-center gap-3 border-b border-border-muted px-4 py-3 text-left last:border-b-0 ${
                  selected
                    ? "border-l-3 border-l-accent bg-accent-subtle"
                    : "border-l-3 border-l-transparent hover:bg-inset"
                }`}
              >
                <VerdictIcon status={signature.status} size={16} />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-fg">
                    {signature.signer?.commonName ?? t.verify.banner2.unknownSigner}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10.5px] text-fg-muted">
                    {standardLabel(signature)} · {formatDateTime(signature.signingTime)}
                  </span>
                </span>

                <ChevronRightIcon size={14} className="text-fg-subtle" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyVerificationState({ t }: { t: Dictionary }) {
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

function VerificationProgress({ t }: { t: Dictionary }) {
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

function VerificationErrorState({
  t,
  error,
}: {
  t: Dictionary;
  error: VerifyApiClientError | FileTooLargeError | Error;
}) {
  const message =
    error instanceof FileTooLargeError
      ? describeVerifyError("FILE_TOO_LARGE")
      : error instanceof VerifyApiClientError
        ? describeVerifyError(error.code, error.detail)
        : describeVerifyError("UNKNOWN_ERROR");

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

function NoSignaturesState({
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
 * Kết luận mức tài liệu + bối cảnh của lần chạy verify.
 *
 * Có mặt vì báo cáo trả về những thứ giải thích được kết quả mà không nằm trong
 * bất kỳ chữ ký nào: policy đang áp dụng, trạng thái trust domain và — quan trọng
 * nhất — **số trust anchor đang cấu hình**. `signer.anchorCount = 0` là nguyên
 * nhân thường gặp nhất của một báo cáo INDETERMINATE, và nếu không hiện ra ở đây
 * thì người test sẽ đi tìm lỗi trong tệp.
 *
 * Hai con số chữ ký hiển thị TÁCH nhau: đúng-mật-mã và đạt-đầy-đủ. Gộp lại thành
 * một sẽ hiện "0 hợp lệ" cho một tệp hoàn toàn lành lặn chỉ vì server chưa nạp
 * trust anchor.
 */
function ReportSummary({ t, report }: { t: Dictionary; report: VerificationReport }) {
  const meta = verdictMeta(t, report.status);
  const stats = report.signatureStatistics;
  const signerDomain = report.trustDomain.signer;
  const noAnchors = (signerDomain?.anchorCount ?? 0) === 0;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <header className={`flex flex-wrap items-start gap-3 p-4 ${meta.background}`}>
        <span className={meta.color}>
          <VerdictIcon status={report.status} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={`text-[15px] font-bold ${meta.color}`}>{meta.title}</h2>
          <p className="mt-0.5 text-[12px] text-fg-muted">
            {t.verify.report.statisticsLine(stats.cryptographicallyValid, stats.processed)}
          </p>
          {/* subIndications đã xếp sẵn theo mức nghiêm trọng — hiện nguyên thứ tự. */}
          <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
            {report.mainIndication}
            {report.subIndications.length > 0 ? ` · ${report.subIndications.join(" · ")}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-inset px-2.5 py-1 text-[10.5px] font-semibold text-fg-muted">
          {t.verify.report.signatureCounts(stats.totalPassed, stats.processed, stats.detected)}
        </span>
      </header>

      <dl className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailCard
          label={t.verify.report.artifact}
          value={`${report.contentType} · ${formatBytes(report.fileSize)}`}
        />
        <DetailCard
          label={t.verify.report.trustAnchors}
          value={t.verify.report.anchorCounts(
            signerDomain?.anchorCount ?? 0,
            report.trustDomain.tsa?.anchorCount ?? 0,
          )}
        />
        <DetailCard
          label={t.verify.report.policy}
          value={report.policy ? `${report.policy.id} · v${report.policy.version}` : "—"}
        />
        <DetailCard
          label={t.verify.report.engine}
          value={`${report.engine.name} ${report.engine.version}`}
        />
        <DetailCard label={t.verify.report.verifiedAt} value={formatDateTime(report.verifiedAt)} />
        <DetailCard label={t.verify.report.runId} value={report.runId} mono />
        <DetailCard label={t.verify.report.sha256} value={truncateHex(report.sha256)} mono />
        <DetailCard
          label={t.verify.report.completeness}
          value={
            report.completeness
              ? t.verify.report.completenessValue[report.completeness]
              : "—"
          }
        />
      </dl>

      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t.verify.report.stats.cryptographicallyValid} value={stats.cryptographicallyValid} />
        <StatTile label={t.verify.report.stats.totalPassed} value={stats.totalPassed} />
        <StatTile label={t.verify.report.stats.indeterminate} value={stats.indeterminate} />
        <StatTile label={t.verify.report.stats.totalFailed} value={stats.totalFailed} />
      </div>

      {noAnchors ? (
        <p className="mx-4 mb-4 rounded-md border border-warning bg-warning-subtle px-3 py-2 text-[11.5px] leading-relaxed text-warning">
          {t.verify.report.noAnchorsNote}
        </p>
      ) : null}

      {/*
        Chỉ nguyên nhân gốc ở màn tổng quan. Cùng một lỗi được phát hiện lại ở tầng
        chuỗi chứng thư, revocation, timestamp và tài liệu — đổ hết ra đây là biến
        một lỗi thành bốn và giấu mất cái cần sửa.
      */}
      {report.rootIssues.length > 0 ? (
        <div className="space-y-2 px-4 pb-4">
          <h3 className="text-[12px] font-semibold text-fg">{t.verify.issues.rootCauses}</h3>
          {report.rootIssues.map((issue) => (
            <IssueCard
              key={issue.issueId}
              issue={issue}
              t={t}
              canManageAllowlist={false}
              onAllowlistReverify={async () => {}}
            />
          ))}
        </div>
      ) : null}

      {report.remediations.length > 0 ? (
        <div className="space-y-2 border-t border-border-muted px-4 py-4">
          <h3 className="text-[12px] font-semibold text-fg">{t.verify.remediations.title}</h3>
          <p className="text-[11px] text-fg-muted">{t.verify.remediations.description}</p>
          {report.remediations.map((remediation) => (
            <RemediationCard key={remediation.remediationId} t={t} remediation={remediation} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Một hành động khắc phục. Danh sách đã gộp theo `actionCode` và sắp sẵn theo
 * `priority` ở backend — render đúng thứ tự nhận được, KHÔNG sort lại.
 *
 * `stage` quyết định hiển thị cho ai: `VERIFIER_CONFIGURATION` là việc của admin
 * hệ thống chứ không phải của người vừa tải tệp lên.
 */
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
            {remediation.requiresNetwork ? (
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
                {t.verify.remediations.requiresNetwork}
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

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-muted p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className="mt-1 text-[18px] font-bold text-fg">{value}</p>
    </div>
  );
}

function VerificationInspector({
  signature,
  tab,
  onTabChange,
  t,
  canManageAllowlist,
  onAllowlistReverify,
}: {
  signature: VerificationSignature;
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  t: Dictionary;
  canManageAllowlist: boolean;
  onAllowlistReverify: (host: string) => Promise<void>;
}) {
  const visibleTabs = ALL_TABS.filter(
    (id) => id !== "timestamp" || signature.timestamps.length > 0,
  );
  const activeTab = visibleTabs.includes(tab) ? tab : "result";
  const warningCount = signature.issues.filter((issue) => issue.severity === "WARNING").length;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <VerdictBanner t={t} signature={signature} />

      <div className="overflow-x-auto border-b border-border-muted">
        <div
          role="tablist"
          aria-label={t.verify.tabs.ariaLabel}
          className="flex min-w-max px-2"
        >
          {visibleTabs.map((id) => (
            <button
              key={id}
              id={`verification-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`verification-panel-${id}`}
              onClick={() => onTabChange(id)}
              className={`h-10 border-b-2 px-3 text-[12px] font-semibold ${
                activeTab === id
                  ? "border-accent text-fg"
                  : "border-transparent text-fg-muted hover:text-fg"
              }`}
            >
              {t.verify.tabs[id]}
              {id === "issues" && warningCount > 0 ? (
                <span className="ml-1.5 text-warning">●{warningCount}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div
        id={`verification-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`verification-tab-${activeTab}`}
        className="min-h-105 p-5"
      >
        {activeTab === "result" ? (
          <ResultPanel t={t} signature={signature} onTabChange={onTabChange} />
        ) : null}
        {activeTab === "tree" ? <ValidationTreePanel t={t} signature={signature} /> : null}
        {activeTab === "chain" ? <CertificateChainPanel t={t} signature={signature} /> : null}
        {activeTab === "timestamp" ? <TimestampPanel t={t} signature={signature} /> : null}
        {activeTab === "manifest" ? <ManifestPanel t={t} signature={signature} /> : null}
        {activeTab === "issues" ? (
          <IssuesPanel
            t={t}
            signature={signature}
            canManageAllowlist={canManageAllowlist}
            onAllowlistReverify={onAllowlistReverify}
          />
        ) : null}
      </div>
    </section>
  );
}

function VerdictBanner({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
  const meta = verdictMeta(t, signature.status);
  const warningCount = signature.issues.filter((issue) => issue.severity === "WARNING").length;

  return (
    <header
      className={`flex flex-wrap items-start gap-3 border-b border-border-muted p-5 ${meta.background}`}
    >
      <span className={meta.color}>
        <VerdictIcon status={signature.status} size={25} />
      </span>

      <div className="min-w-0 flex-1">
        <h2 className={`text-[16px] font-bold ${meta.color}`}>
          {meta.title}
        </h2>
        <p className="mt-1 text-[12.5px] text-fg-muted">
          {t.verify.banner2.signedBy(standardLabel(signature), formatDateTime(signature.signingTime))}
          {signature.signer?.commonName ? (
            <>
              {t.verify.banner2.signedByPrefix}
              <strong className="text-fg">{signature.signer.commonName}</strong>
            </>
          ) : null}
          {signature.certificateChain?.trustAnchor
            ? t.verify.banner2.trustAnchor(signature.certificateChain.trustAnchor)
            : null}
        </p>
        {/*
          Thời điểm ký chỉ là lời khai của người ký cho tới khi có timestamp neo
          được — nói rõ ra, đừng để nó đứng cạnh dấu tick như một sự thật.
        */}
        {signature.signingTime && !signature.signingTimeTrusted ? (
          <p className="mt-1 text-[11px] text-warning">{t.verify.banner2.signingTimeUntrusted}</p>
        ) : null}
        {/* Mã kết luận của engine: cái duy nhất tra cứu được với backend khi cần hỏi. */}
        <p className="mt-1 font-mono text-[10.5px] text-fg-subtle">
          {signature.mainIndication}
          {signature.subIndications.length > 0
            ? ` · ${signature.subIndications.join(" · ")}`
            : ""}
        </p>
      </div>

      <span className="rounded-full bg-warning-subtle px-2.5 py-1 text-[10.5px] font-semibold text-warning">
        {warningCount > 0 ? t.verify.banner2.warnings(warningCount) : t.verify.banner2.noWarnings}
      </span>
    </header>
  );
}

/** Nhóm kiểm tra nào thì mở tab nào khi bấm vào. */
const GROUP_TAB: Partial<Record<ValidationGroup, InspectorTab>> = {
  cryptographicIntegrity: "tree",
  signedScope: "manifest",
  certificatePath: "chain",
  revocation: "chain",
  trustedTime: "timestamp",
};

function ResultPanel({
  t,
  signature,
  onTabChange,
}: {
  t: Dictionary;
  signature: VerificationSignature;
  onTabChange: (tab: InspectorTab) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label={t.verify.result.standard} value={standardLabel(signature)} />
        <Metric
          label={t.verify.result.signatureAlgorithm}
          value={signature.signatureAlgorithm.name || "—"}
          mono
        />
        <Metric
          label={t.verify.result.digestAlgorithm}
          value={signature.digest.algorithm || "—"}
          mono
        />
      </div>

      <div className="mt-5">
        <h3 className="text-[13px] font-semibold text-fg">
          {t.verify.result.validationSummary}
        </h3>

        {/*
          Bảy nhóm này là kết luận của chính engine, không phải suy diễn ở client.
          Trước đây màn này tự đọc `digest.matched` và `chain.trusted` rồi tự chốt
          — cách đó không phân biệt được "chưa chạy" với "chạy rồi mà không rõ".
        */}
        <div className="mt-2 divide-y divide-border-muted">
          {VALIDATION_GROUPS.map((group) => (
            <ValidationGroupRow
              key={group}
              t={t}
              group={group}
              outcome={signature.validation[group]}
              tab={GROUP_TAB[group]}
              onTabChange={onTabChange}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function ValidationGroupRow({
  t,
  group,
  outcome,
  tab,
  onTabChange,
}: {
  t: Dictionary;
  group: ValidationGroup;
  outcome: CheckOutcome | null;
  tab?: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
}) {
  const tone = checkOutcomeTone(outcome);
  const label = t.verify.validation.groups[group];
  const outcomeLabel = outcome ? t.verify.checks.outcome[outcome] ?? outcome : "—";

  const body = (
    <>
      <span className={tone.color}>
        <OutcomeIcon outcome={outcome} size={15} />
      </span>
      <span className="flex-1 text-[12.5px] text-fg">{label}</span>
      <span className={`text-[11px] font-semibold ${tone.color}`}>{outcomeLabel}</span>
      {tab ? <span className="text-[11px] text-accent">{t.verify.tabs[tab]} →</span> : null}
    </>
  );

  if (!tab) {
    return <div className="flex w-full items-center gap-3 py-3 text-left">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onTabChange(tab)}
      className="flex w-full items-center gap-3 py-3 text-left"
    >
      {body}
    </button>
  );
}

function ValidationTreePanel({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
  const matchedRefs = signature.references.filter((ref) => ref.matched === true).length;
  const scope = signature.scope;

  /**
   * `blockedByCheckIds` trỏ tới check của CHÍNH chữ ký này — `check-00X` chỉ duy
   * nhất trong phạm vi một chữ ký, nên map phải dựng theo từng chữ ký chứ không
   * gom phẳng nhiều chữ ký vào một chỗ.
   */
  const checkById = new Map(signature.checks.map((check) => [check.checkId, check]));

  return (
    <>
      {/*
        `checks` là kết luận của chính engine cho từng bước. Nó đứng TRƯỚC phần
        tóm tắt dựng ở client bên dưới: khi hai bên nói khác nhau thì cái đúng là
        cái backend nói, còn phần tóm tắt chỉ là cách đọc lại bằng chứng.
      */}
      {signature.checks.length > 0 ? (
        <div className="mb-4">
          <h3 className="mb-2 text-[13px] font-semibold text-fg">{t.verify.checks.title}</h3>
          <ul className="divide-y divide-border-muted rounded-lg border border-border-muted">
            {signature.checks.map((check) => (
              <EngineCheckRow key={check.checkId} t={t} check={check} checkById={checkById} />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-lg bg-[#0d1117] p-5 font-mono text-[11.5px] leading-7 text-[#e6edf3]">
        <TreeLine text={`${t.verify.tree.standard}: ${standardLabel(signature)}`} />
        <TreeLine
          text={`${t.verify.tree.canonicalization}: ${
            signature.canonicalizationMethod ?? t.verify.tree.notApplicable
          }`}
        />
        <TreeLine
          text={`${t.verify.tree.signatureAlgorithm}: ${
            signature.signatureAlgorithm.name || "—"
          }${signature.signatureAlgorithm.oid ? ` (${signature.signatureAlgorithm.oid})` : ""}`}
        />
        <TreeLine
          text={`${t.verify.tree.digest}: ${signature.digest.algorithm || "—"} — ${matchLabel(t, signature.digest.matched)}`}
        />
        <TreeLine
          text={`${t.verify.tree.certificateChain}: ${signature.certificateChain?.nodes.length ?? 0} nodes — ${
            t.verify.checks.outcome[signature.certificateChain?.trustStatus ?? "NOT_EVALUATED"]
          }`}
        />
        {/* Rẽ theo `scope.type`, không đoán từ loại tệp: PDF dùng byteRange, XML dùng references. */}
        {scope?.type === "PDF_BYTE_RANGE" ? (
          <>
            <TreeLine
              text={`${t.verify.tree.byteRange}: ${scope.byteRange?.join(", ") ?? "—"}`}
            />
            <TreeLine
              text={`${t.verify.tree.coversCurrentDocument}: ${boolLabel(t, scope.coversCurrentDocument)}`}
            />
            {scope.unsignedTrailingBytes ? (
              <TreeLine
                text={`${t.verify.tree.unsignedTrailingBytes}: ${scope.unsignedTrailingBytes}`}
              />
            ) : null}
          </>
        ) : (
          <TreeLine text={t.verify.tree.references(matchedRefs, signature.references.length)} />
        )}
        {scope?.signatureElementPath ? (
          <TreeLine text={`${t.verify.tree.elementPath}: ${scope.signatureElementPath}`} />
        ) : null}
        <TreeLine
          text={`${t.verify.tree.timestamp}: ${
            signature.timestamps.length > 0
              ? t.verify.tree.timestampCount(signature.timestamps.length)
              : t.verify.tree.absent
          }`}
        />
        {signature.longTermValidation ? (
          <TreeLine
            text={`${t.verify.tree.longTerm}: LT=${
              signature.longTermValidation.ltStatus ?? "—"
            } · LTA=${signature.longTermValidation.ltaStatus ?? "—"}`}
          />
        ) : null}
        {scope?.wrappingAttackIndicators.length ? (
          <TreeLine
            text={`${t.verify.tree.wrappingIndicators}: ${scope.wrappingAttackIndicators.join(", ")}`}
          />
        ) : null}
      </div>
    </>
  );
}

/**
 * Một bước kiểm tra của engine.
 *
 * `blockedByCheckIds` được render thành một dòng giải thích ngay dưới bước bị
 * chặn — đây là thứ khiến báo cáo không nói dối. `revocation: NOT_EVALUATED` kèm
 * `["check-004"]` nghĩa là *chưa kiểm tra thu hồi vì certificate path chưa neo
 * được trust*, không phải "chứng thư không bị thu hồi". Hiện một dấu gạch ngang
 * trống ở đây là đánh mất đúng câu trả lời người dùng đang tìm.
 */
function EngineCheckRow({
  t,
  check,
  checkById,
}: {
  t: Dictionary;
  check: SignatureCheck;
  checkById: Map<string, SignatureCheck>;
}) {
  const tone = checkOutcomeTone(check.outcome);
  const typeLabel = check.type
    ? t.verify.checks.type[check.type as keyof typeof t.verify.checks.type] ?? check.type
    : check.checkId;

  const blockedBy = check.blockedByCheckIds
    .map((id) => {
      const blocker = checkById.get(id);
      const blockerType = blocker?.type;
      return blockerType
        ? t.verify.checks.type[blockerType as keyof typeof t.verify.checks.type] ?? blockerType
        : id;
    })
    .filter(Boolean);

  return (
    <li className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className={tone.color}>
          <OutcomeIcon outcome={check.outcome} size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] text-fg">{typeLabel}</span>
          <span className="mt-0.5 block font-mono text-[10px] text-fg-subtle">
            {check.checkId}
            {check.component ? ` · ${check.component}` : ""}
          </span>
        </span>
        <span className={`text-[11px] font-semibold ${tone.color}`}>
          {t.verify.checks.outcome[check.outcome] ?? check.outcome}
        </span>
      </div>

      {check.actual ? (
        <p className="mt-1.5 pl-[27px] text-[11.5px] leading-relaxed text-fg-muted">
          {check.actual}
        </p>
      ) : null}

      {blockedBy.length > 0 ? (
        <p className="mt-1 pl-[27px] text-[11px] leading-relaxed text-warning">
          {t.verify.checks.blockedBy(blockedBy.join(", "))}
        </p>
      ) : null}
    </li>
  );
}

function CertificateChainPanel({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
  const chain = signature.certificateChain;

  if (!chain || chain.nodes.length === 0) {
    return <p className="text-[12.5px] text-fg-muted">{t.verify.chain.notTrustedBanner}</p>;
  }

  /*
   * `INDETERMINATE` ở đây gần như luôn là "verifier chưa có anchor", không phải
   * "chuỗi này đáng ngờ" — nên nó tô vàng và nói đúng như vậy, tách hẳn khỏi
   * `FAIL` là trường hợp chuỗi thật sự bị từ chối.
   */
  const tone = checkOutcomeTone(chain.trustStatus);

  return (
    <>
      <div className={`mb-5 flex items-center gap-2 text-[12.5px] font-semibold ${tone.color}`}>
        <OutcomeIcon outcome={chain.trustStatus} size={15} />
        {chain.trusted && chain.trustAnchor
          ? t.verify.chain.trustedBanner(chain.trustAnchor)
          : chain.trustStatus === "FAIL"
            ? t.verify.chain.rejectedBanner
            : t.verify.chain.notTrustedBanner}
      </div>

      {chain.failureReasons.length > 0 ? (
        <ul className="mb-5 space-y-1 rounded-md border border-border-muted bg-inset px-3 py-2">
          {chain.failureReasons.map((reason) => (
            <li key={reason} className="font-mono text-[10.5px] text-fg-muted">
              {reason}
            </li>
          ))}
        </ul>
      ) : null}

      <ChainList t={t} chain={chain} />

      {signature.revocation ? (
        <RevocationSection t={t} revocation={signature.revocation} />
      ) : null}
    </>
  );
}

/**
 * Kết quả kiểm tra thu hồi. Tách khỏi cây chứng thư vì đây là câu hỏi khác: cây
 * nói "chứng thư này có neo được về đâu không", thu hồi nói "tại thời điểm tham
 * chiếu nó còn hiệu lực không" — và bước sau thường bị chặn bởi bước trước.
 */
function RevocationSection({
  t,
  revocation,
}: {
  t: Dictionary;
  revocation: NonNullable<VerificationSignature["revocation"]>;
}) {
  const tone = checkOutcomeTone(revocation.status);

  return (
    <div className="mt-6">
      <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-fg">
        {t.verify.revocation.title}
        <span className={`text-[11px] font-semibold ${tone.color}`}>
          {t.verify.checks.outcome[revocation.status] ?? revocation.status}
        </span>
      </h3>

      {revocation.certificates.length === 0 ? (
        <p className="text-[11.5px] text-fg-muted">{t.verify.revocation.empty}</p>
      ) : (
        <ul className="divide-y divide-border-muted rounded-lg border border-border-muted">
          {revocation.certificates.map((entry, index) => (
            <li key={entry.certificateId ?? index} className="px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className={checkOutcomeTone(entry.status).color}>
                  <OutcomeIcon outcome={entry.status} size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] text-fg">{entry.subject || "—"}</span>
                  {entry.certificateStatus ? (
                    <span className="mt-0.5 block font-mono text-[10px] text-fg-subtle">
                      {entry.certificateStatus}
                      {entry.revocationTime ? ` · ${formatDateTime(entry.revocationTime)}` : ""}
                    </span>
                  ) : null}
                </span>
                <span className={`text-[11px] font-semibold ${checkOutcomeTone(entry.status).color}`}>
                  {t.verify.checks.outcome[entry.status] ?? entry.status}
                </span>
              </div>
              {entry.reason ? (
                <p className="mt-1 pl-[27px] text-[11px] text-fg-muted">{entry.reason}</p>
              ) : null}
              {entry.blockedByCheckIds.length > 0 ? (
                <p className="mt-1 pl-[27px] text-[11px] text-warning">
                  {t.verify.checks.blockedBy(entry.blockedByCheckIds.join(", "))}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Cây chứng thư dùng lại cho cả chuỗi người ký và chuỗi TSA — cùng một cấu trúc dữ liệu. */
function ChainList({ t, chain }: { t: Dictionary; chain: CertificateChain }) {
  return (
    <ol className="space-y-0">
      {chain.nodes.map((node, index) => (
          <li key={node.certificateId} className="relative flex gap-3">
            <div className="flex w-6 flex-col items-center">
              <span
                className={`mt-3 size-3 rounded-full border-2 ${chainNodeDotClass(node.status)}`}
              />
              {index < chain.nodes.length - 1 ? (
                <span className="h-full w-px bg-border" />
              ) : null}
            </div>

            <div className="mb-3 flex flex-1 flex-wrap items-center gap-3 rounded-lg border border-border-muted p-4">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-fg">
                  {node.subject.commonName}
                </p>
                <p className="mt-0.5 text-[11px] text-fg-muted">
                  {t.verify.chain.role[node.role] ?? node.role}
                  {node.trustAnchor ? ` · ${t.verify.chain.trustAnchorBadge}` : ""}
                  {node.selfSigned ? ` · ${t.verify.chain.selfSigned}` : ""}
                </p>
                <p className="mt-1 font-mono text-[10px] text-fg-subtle">
                  {t.verify.chain.serial}: {node.serialNumberHex || "—"}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">
                  {t.verify.chain.fingerprint}: {formatFingerprint(node.sha256Fingerprint)}
                </p>
                <p className="mt-0.5 text-[10px] text-fg-subtle">
                  {t.verify.chain.validity(formatDateTime(node.validFrom), formatDateTime(node.validTo))}
                </p>
              </div>

              <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${chainNodeBadgeClass(node.status)}`}>
                ● {t.verify.chain.status[node.status] ?? node.status}
              </span>
            </div>
        </li>
      ))}
    </ol>
  );
}

function TimestampPanel({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
  if (signature.timestamps.length === 0) {
    return <p className="text-[12.5px] text-fg-muted">{t.verify.timestamp.none}</p>;
  }

  return (
    <div className="space-y-8">
      {signature.timestamps.map((timestamp) => (
        <TimestampCard key={timestamp.timestampId} t={t} timestamp={timestamp} />
      ))}
    </div>
  );
}

function TimestampCard({ t, timestamp }: { t: Dictionary; timestamp: VerificationTimestamp }) {
  const tone = checkOutcomeTone(timestamp.status);

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className={`flex size-9 items-center justify-center rounded-full bg-inset ${tone.color}`}>
          <OutcomeIcon outcome={timestamp.status} size={18} />
        </span>
        <div>
          <h3 className="text-[14px] font-semibold text-fg">{timestamp.type}</h3>
          <p className="text-[11.5px] text-fg-muted">
            {t.verify.timestamp.status}: {t.verify.checks.outcome[timestamp.status] ?? timestamp.status}
          </p>
        </div>
      </div>

      {/*
        "Có timestamp" và "timestamp dùng được làm bằng chứng tồn tại" là hai
        chuyện khác nhau — đó chính là khác biệt giữa baseline T đạt và không đạt,
        nên nó phải hiện thành một dòng riêng chứ không ẩn trong trạng thái chung.
      */}
      {!timestamp.usableAsProofOfExistence ? (
        <p className="mt-2 rounded-md border border-warning bg-warning-subtle px-3 py-2 text-[11.5px] leading-relaxed text-warning">
          {t.verify.timestamp.notUsableAsPoe}
        </p>
      ) : null}

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <DetailCard label={t.verify.timestamp.timestampLabel} value={formatDateTime(timestamp.genTime)} />
        <DetailCard
          label={t.verify.timestamp.messageImprint}
          value={`${timestamp.messageImprint.algorithm || "—"} · ${truncateHex(
            timestamp.messageImprint.value,
          )} — ${matchLabel(t, timestamp.messageImprint.matched)}`}
          mono
        />
        <DetailCard label={t.verify.timestamp.tsa} value={timestamp.tsaName ?? "—"} />
        <DetailCard label={t.verify.timestamp.policy} value={timestamp.policyOid ?? "—"} mono />
        {timestamp.accuracy ? (
          <DetailCard label={t.verify.timestamp.accuracy} value={timestamp.accuracy} />
        ) : null}
        {timestamp.tsaRevocationStatus ? (
          <DetailCard
            label={t.verify.timestamp.revocation}
            value={
              t.verify.checks.outcome[timestamp.tsaRevocationStatus] ?? timestamp.tsaRevocationStatus
            }
          />
        ) : null}
      </dl>

      {/*
        Chuỗi của TSA tách riêng khỏi chuỗi người ký: một dấu thời gian chỉ dùng
        làm mốc thời gian tin cậy khi CHÍNH nó neo được vào một anchor.
      */}
      {timestamp.chain && timestamp.chain.nodes.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-3 text-[13px] font-semibold text-fg">{t.verify.timestamp.chainTitle}</h3>
          <ChainList t={t} chain={timestamp.chain} />
        </div>
      ) : null}

      {timestamp.issues.length > 0 ? (
        <div className="mt-6 space-y-2">
          <h3 className="text-[13px] font-semibold text-fg">{t.verify.timestamp.issuesTitle}</h3>
          {timestamp.issues.map((issue) => (
            <IssueCard
              key={issue.issueId}
              issue={issue}
              t={t}
              canManageAllowlist={false}
              onAllowlistReverify={async () => {}}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Phạm vi ký. Hai nhánh hoàn toàn khác nhau và rẽ theo `scope.type`, không theo
 * loại tệp: PDF ký một khoảng byte, XML/OOXML ký một tập reference.
 */
function ManifestPanel({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
  const scope = signature.scope;

  if (scope?.type === "PDF_BYTE_RANGE") {
    return (
      <dl className="grid gap-3 sm:grid-cols-2">
        <DetailCard
          label={t.verify.manifest.byteRange}
          value={scope.byteRange?.join(", ") ?? "—"}
          mono
        />
        <DetailCard
          label={t.verify.manifest.coversWholeRevision}
          value={boolLabel(t, scope.coversWholeSignedRevision)}
        />
        <DetailCard
          label={t.verify.manifest.coversCurrentDocument}
          value={boolLabel(t, scope.coversCurrentDocument)}
        />
        <DetailCard
          label={t.verify.manifest.unsignedTrailingBytes}
          value={scope.unsignedTrailingBytes != null ? String(scope.unsignedTrailingBytes) : "—"}
        />
      </dl>
    );
  }

  if (signature.references.length === 0) {
    return <p className="text-[12.5px] text-fg-muted">{t.verify.manifest.empty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-170 border-collapse text-left text-[12px]">
        <thead>
          <tr className="border-b border-border-muted bg-surface-2 text-[10.5px] uppercase tracking-wider text-fg-subtle">
            <th className="px-4 py-2.5">{t.verify.manifest.columns.uri}</th>
            <th className="px-4 py-2.5">{t.verify.manifest.columns.type}</th>
            <th className="px-4 py-2.5">{t.verify.manifest.columns.digestAlgorithm}</th>
            <th className="px-4 py-2.5">{t.verify.manifest.columns.digestValue}</th>
            <th className="px-4 py-2.5">{t.verify.manifest.columns.matched}</th>
          </tr>
        </thead>

        <tbody>
          {signature.references.map((reference) => (
            <tr key={reference.index} className="border-b border-border-muted last:border-b-0">
              <td className="max-w-60 truncate px-4 py-3 font-mono text-fg" title={reference.uri}>
                {reference.uri || t.verify.manifest.wholeDocument}
                {/* Reference trỏ ra ngoài tài liệu là dấu hiệu tấn công, không phải chi tiết kỹ thuật. */}
                {reference.external ? (
                  <span className="ml-1.5 text-[10px] font-semibold text-warning">
                    {t.verify.manifest.external}
                  </span>
                ) : null}
                {reference.duplicateIdDetected ? (
                  <span className="ml-1.5 text-[10px] font-semibold text-danger">
                    {t.verify.manifest.duplicateId}
                  </span>
                ) : null}
              </td>
              <td className="max-w-50 truncate px-4 py-3 text-fg-muted" title={reference.type ?? ""}>
                {reference.type ?? "—"}
              </td>
              <td className="px-4 py-3 font-mono text-fg-muted">{reference.digestAlgorithm}</td>
              <td className="max-w-40 truncate px-4 py-3 font-mono text-fg-muted">
                {truncateHex(reference.digestValue)}
              </td>
              <td className="px-4 py-3">
                {reference.matched === true ? (
                  <span className="text-success">✓</span>
                ) : reference.matched === false ? (
                  <span className="text-danger">✗</span>
                ) : (
                  <span className="text-fg-subtle">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IssuesPanel({
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

function IssueCard({
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
          ? describeVerifyError(err.code, err.detail)
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

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border-muted p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </p>
      <p
        className={`mt-1 text-[13px] font-semibold text-fg ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TreeLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#3fb950]">›</span>
      <span>{text}</span>
    </div>
  );
}

function DetailCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border-muted p-3">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </dt>
      <dd
        className={`mt-1 text-[12.5px] font-semibold text-fg ${
          mono ? "font-mono text-[11.5px]" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function VerdictIcon({ status, size }: { status: VerificationStatus; size: number }) {
  if (status === "VALID") return <CheckIcon size={size} />;
  if (status === "INVALID") return <AlertCircleIcon size={size} />;
  return <InfoIcon size={size} />;
}

function IssueIcon({ severity, size }: { severity: IssueSeverity; size: number }) {
  if (severity === "CRITICAL" || severity === "ERROR") return <AlertCircleIcon size={size} />;
  if (severity === "WARNING") return <AlertTriangleIcon size={size} />;
  return <InfoIcon size={size} />;
}

function issueStyle(severity: IssueSeverity) {
  if (severity === "CRITICAL" || severity === "ERROR") {
    return { border: "border-danger", background: "bg-danger-subtle", color: "text-danger" };
  }
  if (severity === "WARNING") {
    return { border: "border-warning", background: "bg-warning-subtle", color: "text-warning" };
  }
  return { border: "border-border-muted", background: "bg-inset", color: "text-fg-muted" };
}

function OutcomeIcon({ outcome, size }: { outcome: CheckOutcome | null; size: number }) {
  const kind = checkOutcomeTone(outcome).kind;
  if (kind === "ok") return <CheckIcon size={size} />;
  if (kind === "bad") return <AlertCircleIcon size={size} />;
  if (kind === "warn") return <AlertTriangleIcon size={size} />;
  return <InfoIcon size={size} />;
}

/**
 * Tô màu cho bảy trạng thái của schema 5.
 *
 * `NOT_EVALUATED` / `NOT_APPLICABLE` / `UNSUPPORTED` cố tình KHÔNG tô đỏ: chúng
 * nghĩa là engine chưa chạy bước đó, không phải bước đó hỏng. Tô đỏ ở đây là biến
 * một báo cáo bình thường thành báo động giả.
 *
 * Ngược lại `INDETERMINATE` KHÔNG tô xám: nó nghĩa là đã chạy và không kết luận
 * được — một trạng thái cần người xử lý, không phải một ô để bỏ qua.
 */
function checkOutcomeTone(outcome: CheckOutcome | null): {
  kind: "ok" | "bad" | "warn" | "muted";
  color: string;
} {
  if (outcome === "PASS") return { kind: "ok", color: "text-success" };
  if (outcome === "FAIL") return { kind: "bad", color: "text-danger" };
  if (outcome === "INDETERMINATE" || outcome === "WARNING") {
    return { kind: "warn", color: "text-warning" };
  }
  return { kind: "muted", color: "text-fg-subtle" };
}

function verdictMeta(t: Dictionary, status: VerificationStatus) {
  if (status === "VALID") {
    return {
      title: t.verify.verdict.valid,
      color: "text-success",
      background: "bg-success-subtle",
    };
  }

  if (status === "INVALID") {
    return {
      title: t.verify.verdict.invalid,
      color: "text-danger",
      background: "bg-danger-subtle",
    };
  }

  return {
    title: t.verify.verdict.indeterminate,
    color: "text-warning",
    background: "bg-warning-subtle",
  };
}

function chainNodeDotClass(status: ChainNodeStatus): string {
  if (status === "VALID") return "border-success bg-success-subtle";
  if (status === "EXPIRED" || status === "INVALID") return "border-danger bg-danger-subtle";
  if (status === "UNKNOWN") return "border-border bg-inset";
  return "border-warning bg-warning-subtle";
}

function chainNodeBadgeClass(status: ChainNodeStatus): string {
  if (status === "VALID") return "bg-success-subtle text-success";
  if (status === "EXPIRED" || status === "INVALID") return "bg-danger-subtle text-danger";
  if (status === "UNKNOWN") return "bg-inset text-fg-subtle";
  return "bg-warning-subtle text-warning";
}

function matchLabel(t: Dictionary, matched: boolean | null): string {
  if (matched === true) return t.verify.tree.matched;
  if (matched === false) return t.verify.tree.notMatched;
  return t.verify.tree.unknownMatch;
}

function boolLabel(t: Dictionary, value: boolean | null | undefined): string {
  if (value === true) return t.verify.tree.yes;
  if (value === false) return t.verify.tree.no;
  return "—";
}

const STANDARD_LABELS: Record<string, string> = {
  PADES: "PAdES",
  XADES: "XAdES",
  CADES: "CAdES",
  OOXML: "OOXML",
};

/**
 * `standard` và baseline đều là chuỗi tự do ở schema 5 (backend có thể thêm chuẩn
 * mới trong một bản minor), nên chỗ này chỉ làm đẹp những giá trị đã biết và cho
 * giá trị lạ đi qua nguyên văn thay vì ép nó về "OOXML".
 */
function standardLabel(signature: VerificationSignature): string {
  const standard = STANDARD_LABELS[signature.standard] ?? signature.standard;
  const level = signature.baselineLevel;
  if (!level) return standard;
  return level.startsWith(standard) ? level : `${standard}-${level}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function formatFingerprint(hex: string): string {
  return hex.replace(/(.{2})/g, "$1:").replace(/:$/, "");
}

function truncateHex(value: string): string {
  if (value.length <= 20) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

function fileExtension(fileName: string): string {
  return fileName.includes(".")
    ? fileName.split(".").pop() ?? ""
    : "";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** index).toFixed(
    index === 0 ? 0 : 1,
  )} ${units[index]}`;
}
