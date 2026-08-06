"use client";

import { useRef, useState } from "react";
import {
  addToAllowlistAndReverify,
  describeVerifyError,
  FileTooLargeError,
  VerifyApiClientError,
  verifyFile,
} from "@/features/verification/api";
import type {
  ChainNodeStatus,
  IssueSeverity,
  VerificationIssue,
  VerificationReport,
  VerificationSignature,
  VerificationStatus,
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

const ALLOWLIST_ISSUE_CODES = new Set(["OCSP_URL_NOT_ALLOWED", "CRL_URL_NOT_ALLOWED"]);

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

      <main className="min-w-0">
        {phase === "idle" ? <EmptyVerificationState t={t} /> : null}

        {phase === "verifying" ? <VerificationProgress t={t} /> : null}

        {phase === "error" && error ? <VerificationErrorState t={t} error={error} /> : null}

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
          {signatures.map((signature) => {
            const selected = signature.index === selectedIndex;

            return (
              <button
                key={signature.index}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(signature.index)}
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
            {report.issues.map((issue, index) => (
              <IssueCard
                key={index}
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
  const visibleTabs = ALL_TABS.filter((id) => id !== "timestamp" || Boolean(signature.timestamp));
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
      </div>

      <span className="rounded-full bg-warning-subtle px-2.5 py-1 text-[10.5px] font-semibold text-warning">
        {warningCount > 0 ? t.verify.banner2.warnings(warningCount) : t.verify.banner2.noWarnings}
      </span>
    </header>
  );
}

function ResultPanel({
  t,
  signature,
  onTabChange,
}: {
  t: Dictionary;
  signature: VerificationSignature;
  onTabChange: (tab: InspectorTab) => void;
}) {
  const warningCount = signature.issues.filter((issue) => issue.severity === "WARNING").length;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label={t.verify.result.standard} value={standardLabel(signature)} />
        <Metric
          label={t.verify.result.signatureAlgorithm}
          value={signature.signatureAlgorithm.name}
          mono
        />
        <Metric label={t.verify.result.digestAlgorithm} value={signature.digest.algorithm} mono />
      </div>

      <div className="mt-5">
        <h3 className="text-[13px] font-semibold text-fg">
          {t.verify.result.validationSummary}
        </h3>

        <div className="mt-2 divide-y divide-border-muted">
          <ValidationCheck
            label={
              signature.digest.matched === true
                ? t.verify.result.checks.cryptoValid
                : signature.digest.matched === false
                  ? t.verify.result.checks.cryptoInvalid
                  : t.verify.result.checks.cryptoUnknown
            }
            tabLabel={t.verify.tabs.tree}
            ok={signature.digest.matched === true}
            unknown={signature.digest.matched === null}
            onClick={() => onTabChange("tree")}
          />
          <ValidationCheck
            label={
              !signature.certificateChain
                ? t.verify.result.checks.chainUnknown
                : signature.certificateChain.trusted
                  ? t.verify.result.checks.chainTrusted
                  : t.verify.result.checks.chainNotTrusted
            }
            tabLabel={t.verify.tabs.chain}
            ok={signature.certificateChain?.trusted === true}
            unknown={!signature.certificateChain}
            onClick={() => onTabChange("chain")}
          />
          {signature.timestamp ? (
            <ValidationCheck
              label={
                signature.timestamp.status === "VALID"
                  ? t.verify.result.checks.timestampValid
                  : signature.timestamp.status === "INDETERMINATE"
                    ? t.verify.result.checks.timestampIndeterminate
                    : t.verify.result.checks.timestampInvalid
              }
              tabLabel={t.verify.tabs.timestamp}
              ok={signature.timestamp.status === "VALID"}
              unknown={signature.timestamp.status === "INDETERMINATE"}
              onClick={() => onTabChange("timestamp")}
            />
          ) : null}
          {warningCount > 0 ? (
            <ValidationCheck
              label={t.verify.result.checks.warningsFound(warningCount)}
              tabLabel={t.verify.tabs.issues}
              warning
              onClick={() => onTabChange("issues")}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

function ValidationTreePanel({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
  const matchedRefs = signature.references.filter((ref) => ref.matched === true).length;

  return (
    <div className="rounded-lg bg-[#0d1117] p-5 font-mono text-[11.5px] leading-7 text-[#e6edf3]">
      <TreeLine text={`${t.verify.tree.standard}: ${standardLabel(signature)}`} />
      <TreeLine
        text={`${t.verify.tree.canonicalization}: ${
          signature.canonicalizationMethod ?? t.verify.tree.notApplicable
        }`}
      />
      <TreeLine
        text={`${t.verify.tree.signatureAlgorithm}: ${signature.signatureAlgorithm.name} (${signature.signatureAlgorithm.oid})`}
      />
      <TreeLine
        text={`${t.verify.tree.digest}: ${signature.digest.algorithm} — ${matchLabel(t, signature.digest.matched)}`}
      />
      <TreeLine
        text={`${t.verify.tree.certificateChain}: ${signature.certificateChain?.nodes.length ?? 0} nodes — ${
          signature.certificateChain?.trusted ? t.verify.tree.trusted : t.verify.tree.notTrusted
        }`}
      />
      <TreeLine
        text={`${t.verify.tree.references(matchedRefs, signature.references.length)}`}
      />
      <TreeLine
        text={`${t.verify.tree.timestamp}: ${
          signature.timestamp ? t.verify.tree.present : t.verify.tree.absent
        }`}
      />
    </div>
  );
}

function CertificateChainPanel({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
  const chain = signature.certificateChain;

  if (!chain || chain.nodes.length === 0) {
    return <p className="text-[12.5px] text-fg-muted">{t.verify.chain.notTrustedBanner}</p>;
  }

  return (
    <>
      <div
        className={`mb-5 flex items-center gap-2 text-[12.5px] font-semibold ${
          chain.trusted ? "text-success" : "text-warning"
        }`}
      >
        {chain.trusted ? <CheckIcon size={15} /> : <AlertTriangleIcon size={15} />}
        {chain.trusted && chain.trustAnchor
          ? t.verify.chain.trustedBanner(chain.trustAnchor)
          : t.verify.chain.notTrustedBanner}
      </div>

      <ol className="space-y-0">
        {chain.nodes.map((node, index) => (
          <li key={`${node.position}-${node.role}`} className="relative flex gap-3">
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
                  {t.verify.chain.role[node.role]}
                  {node.trustAnchor ? ` · ${t.verify.chain.trustAnchorBadge}` : ""}
                  {node.selfSigned ? ` · ${t.verify.chain.selfSigned}` : ""}
                </p>
                <p className="mt-1 font-mono text-[10px] text-fg-subtle">
                  {t.verify.chain.serial}: {node.serialNumberHex}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">
                  {t.verify.chain.fingerprint}: {formatFingerprint(node.sha256Fingerprint)}
                </p>
                <p className="mt-0.5 text-[10px] text-fg-subtle">
                  {t.verify.chain.validity(formatDateTime(node.validFrom), formatDateTime(node.validTo))}
                </p>
              </div>

              <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${chainNodeBadgeClass(node.status)}`}>
                ● {t.verify.chain.status[node.status]}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

function TimestampPanel({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
  const timestamp = signature.timestamp;

  if (!timestamp) {
    return <p className="text-[12.5px] text-fg-muted">{t.verify.timestamp.none}</p>;
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <span
          className={`flex size-9 items-center justify-center rounded-full ${
            timestamp.status === "VALID" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"
          }`}
        >
          {timestamp.status === "VALID" ? <CheckIcon size={18} /> : <AlertTriangleIcon size={18} />}
        </span>
        <div>
          <h3 className="text-[14px] font-semibold text-fg">{timestamp.type}</h3>
          <p className="text-[11.5px] text-fg-muted">
            {t.verify.timestamp.status}: {timestamp.status}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <DetailCard label={t.verify.timestamp.timestampLabel} value={formatDateTime(timestamp.genTime)} />
        <DetailCard
          label={t.verify.timestamp.messageImprint}
          value={`${timestamp.messageImprint.algorithm} · ${truncateHex(timestamp.messageImprint.value)}`}
          mono
        />
        <DetailCard label={t.verify.timestamp.tsa} value={timestamp.tsaName ?? "—"} />
        <DetailCard label={t.verify.timestamp.policy} value={timestamp.policyOid ?? "—"} mono />
        {timestamp.accuracy ? (
          <DetailCard label={t.verify.timestamp.accuracy} value={timestamp.accuracy} />
        ) : null}
      </dl>
    </>
  );
}

function ManifestPanel({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
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
              <td className="max-w-60 truncate px-4 py-3 font-mono text-fg">{reference.uri}</td>
              <td className="px-4 py-3 text-fg-muted">{reference.type}</td>
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
  const errorCount = signature.issues.filter((issue) => issue.severity === "ERROR").length;
  const warningCount = signature.issues.filter((issue) => issue.severity === "WARNING").length;

  if (signature.issues.length === 0) {
    return <p className="text-[12.5px] text-fg-muted">{t.verify.issues.none}</p>;
  }

  return (
    <>
      <div
        className={`mb-4 rounded-md px-4 py-3 text-[12px] ${
          errorCount > 0 ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning"
        }`}
      >
        <strong>{t.verify.issues.summary(errorCount, warningCount)}</strong>
      </div>

      <div className="space-y-3">
        {signature.issues.map((issue, index) => (
          <IssueCard
            key={index}
            issue={issue}
            t={t}
            canManageAllowlist={canManageAllowlist}
            onAllowlistReverify={onAllowlistReverify}
          />
        ))}
      </div>
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
          <p className="mt-1 font-mono text-[10px] text-fg-subtle">{issue.code}</p>

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

function ValidationCheck({
  label,
  tabLabel,
  ok = false,
  unknown = false,
  warning = false,
  onClick,
}: {
  label: string;
  tabLabel: string;
  ok?: boolean;
  unknown?: boolean;
  warning?: boolean;
  onClick: () => void;
}) {
  const tone = warning ? "warning" : unknown ? "unknown" : ok ? "ok" : "bad";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 text-left"
    >
      <span
        className={
          tone === "warning"
            ? "text-warning"
            : tone === "unknown"
              ? "text-fg-subtle"
              : tone === "ok"
                ? "text-success"
                : "text-danger"
        }
      >
        {tone === "warning" ? (
          <AlertTriangleIcon size={15} />
        ) : tone === "unknown" ? (
          <InfoIcon size={15} />
        ) : tone === "ok" ? (
          <CheckIcon size={15} />
        ) : (
          <AlertCircleIcon size={15} />
        )}
      </span>
      <span className="flex-1 text-[12.5px] text-fg">{label}</span>
      <span className="text-[11px] text-accent">{tabLabel} →</span>
    </button>
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
  if (severity === "ERROR") return <AlertCircleIcon size={size} />;
  if (severity === "WARNING") return <AlertTriangleIcon size={size} />;
  return <InfoIcon size={size} />;
}

function issueStyle(severity: IssueSeverity) {
  if (severity === "ERROR") {
    return { border: "border-danger", background: "bg-danger-subtle", color: "text-danger" };
  }
  if (severity === "WARNING") {
    return { border: "border-warning", background: "bg-warning-subtle", color: "text-warning" };
  }
  return { border: "border-border-muted", background: "bg-inset", color: "text-fg-muted" };
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
  if (status === "EXPIRED") return "border-danger bg-danger-subtle";
  return "border-warning bg-warning-subtle";
}

function chainNodeBadgeClass(status: ChainNodeStatus): string {
  if (status === "VALID") return "bg-success-subtle text-success";
  if (status === "EXPIRED") return "bg-danger-subtle text-danger";
  return "bg-warning-subtle text-warning";
}

function matchLabel(t: Dictionary, matched: boolean | null): string {
  if (matched === true) return t.verify.tree.matched;
  if (matched === false) return t.verify.tree.notMatched;
  return t.verify.tree.unknownMatch;
}

function standardLabel(signature: VerificationSignature): string {
  const prefix =
    signature.standard === "PADES" ? "PAdES" : signature.standard === "XADES" ? "XAdES" : "OOXML";
  return `${prefix}-${signature.baselineLevel}`;
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
