import { useState } from "react";
import type {
  VerificationReport,
  VerificationSignature,
} from "@/lib/types/verification";
import type { Dictionary } from "@/lib/i18n";
import {
  ADVANCED_SECTIONS,
  type AdvancedSection,
  type VerificationView,
} from "./verification-config";
import { OverviewPanel } from "./verification-overview";
import { ValidationTreePanel, ManifestPanel } from "./verification-validation-panels";
import { CertificateChainPanel, TimestampPanel } from "./verification-certificate-panels";
import { IssuesPanel } from "./verification-issues";
import {
  DetailCard,
  SectionHeading,
  formatDateTime,
  standardLabel,
  truncateHex,
} from "./verification-ui";

export function VerificationInspector({
  report,
  signature,
  view,
  onViewChange,
  advancedSection,
  onAdvancedSectionChange,
  t,
  canManageAllowlist,
  onAllowlistReverify,
}: {
  report: VerificationReport;
  signature: VerificationSignature;
  view: VerificationView;
  onViewChange: (view: VerificationView) => void;
  advancedSection: AdvancedSection;
  onAdvancedSectionChange: (section: AdvancedSection) => void;
  t: Dictionary;
  canManageAllowlist: boolean;
  onAllowlistReverify: (host: string) => Promise<void>;
}) {
  // Không có khung thẻ riêng: inspector nằm trong modal chi tiết chữ ký, khung
  // của modal đã là khung của nó — và cũng là thứ ấn định chiều cao, nên mọi
  // tầng ở đây đều `min-h-0` để phần cuộn rơi đúng vào panel trong cùng.
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-surface">
      <VerificationViewTabs t={t} value={view} onChange={onViewChange} />

      <div
        id={`verification-panel-${view}`}
        role="tabpanel"
        aria-labelledby={`verification-tab-${view}`}
        className="flex min-h-0 flex-1 flex-col"
      >
        {view === "overview" ? (
          <OverviewPanel t={t} signature={signature} onShowAdvanced={() => onViewChange("advanced")} />
        ) : (
          <AdvancedPanel
            t={t}
            report={report}
            signature={signature}
            section={advancedSection}
            onSectionChange={onAdvancedSectionChange}
            canManageAllowlist={canManageAllowlist}
            onAllowlistReverify={onAllowlistReverify}
          />
        )}
      </div>
    </section>
  );
}

function VerificationViewTabs({
  t,
  value,
  onChange,
}: {
  t: Dictionary;
  value: VerificationView;
  onChange: (value: VerificationView) => void;
}) {
  const tabs: Array<{ id: VerificationView; label: string }> = [
    { id: "overview", label: t.verify.ux.overview },
    { id: "advanced", label: t.verify.ux.advanced },
  ];

  return (
    <div className="shrink-0 border-b border-border-muted bg-surface px-4">
      <div role="tablist" aria-label={t.verify.ux.viewTablistAriaLabel} className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`verification-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={value === tab.id}
            aria-controls={`verification-panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`h-11 border-b-2 px-3 text-[13px] font-semibold ${
              value === tab.id
                ? "border-accent text-accent"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AdvancedPanel({
  t,
  report,
  signature,
  section,
  onSectionChange,
  canManageAllowlist,
  onAllowlistReverify,
}: {
  t: Dictionary;
  report: VerificationReport;
  signature: VerificationSignature;
  section: AdvancedSection;
  onSectionChange: (section: AdvancedSection) => void;
  canManageAllowlist: boolean;
  onAllowlistReverify: (host: string) => Promise<void>;
}) {
  const visibleSections = ADVANCED_SECTIONS.filter(
    (item) => item !== "timestamp" || signature.timestamps.length > 0,
  );
  const activeSection = visibleSections.includes(section) ? section : "technical";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border-muted bg-surface-2 px-5 py-3">
        <p className="text-[11.5px] leading-relaxed text-fg-muted">{t.verify.ux.advancedDescription}</p>
      </div>

      {/*
        Flex thay cho grid: menu là một rail cố định (`shrink-0`), chỉ cột nội
        dung bên phải nhận `overflow-y-auto`. Dưới `lg` menu nằm trên và cuộn
        ngang như cũ, phần cuộn dọc vẫn thuộc về cột nội dung.
      */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav
          aria-label={t.verify.ux.advancedNavAriaLabel}
          className="shrink-0 overflow-x-auto border-b border-border-muted lg:w-47.5 lg:overflow-visible lg:border-r lg:border-b-0"
        >
          <div className="flex min-w-max gap-1 p-2 lg:min-w-0 lg:flex-col">
            {visibleSections.map((item) => {
              const active = activeSection === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onSectionChange(item)}
                  className={`flex h-9 items-center justify-between gap-3 rounded-md px-3 text-left text-[12px] font-medium lg:w-full ${
                    active
                      ? "bg-accent-subtle text-accent"
                      : "text-fg-muted hover:bg-inset hover:text-fg"
                  }`}
                >
                  <span>{advancedSectionLabel(t, item)}</span>
                  {item === "issues" && signature.issues.length > 0 ? (
                    <span className="rounded-full bg-warning-subtle px-1.5 py-0.5 text-[9.5px] font-semibold text-warning">
                      {signature.issues.length}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5">
          {activeSection === "technical" ? (
            <TechnicalOverviewPanel t={t} report={report} signature={signature} />
          ) : null}
          {activeSection === "checks" ? <ValidationTreePanel t={t} signature={signature} /> : null}
          {activeSection === "certificate" ? <CertificateChainPanel t={t} signature={signature} /> : null}
          {activeSection === "timestamp" ? <TimestampPanel t={t} signature={signature} /> : null}
          {activeSection === "scope" ? <ManifestPanel t={t} signature={signature} /> : null}
          {activeSection === "issues" ? (
            <IssuesPanel
              t={t}
              signature={signature}
              canManageAllowlist={canManageAllowlist}
              onAllowlistReverify={onAllowlistReverify}
            />
          ) : null}
          {activeSection === "raw" ? <RawJsonPanel t={t} report={report} signature={signature} /> : null}
        </div>
      </div>
    </div>
  );
}

function TechnicalOverviewPanel({
  t,
  report,
  signature,
}: {
  t: Dictionary;
  report: VerificationReport;
  signature: VerificationSignature;
}) {
  const signerDomain = report.trustDomain.signer;
  const tsaDomain = report.trustDomain.tsa;

  return (
    <div className="space-y-6">
      <section>
        <SectionHeading title={t.verify.ux.reportMetadata} />
        <dl className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <DetailCard
            label={t.verify.report.policy}
            value={report.policy ? `${report.policy.id} · v${report.policy.version}` : "—"}
          />
          <DetailCard label={t.verify.report.engine} value={`${report.engine.name} ${report.engine.version}`} />
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
      </section>

      <section>
        <SectionHeading title={t.verify.ux.trustDomain} />
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <TrustDomainCard
            t={t}
            title={t.verify.ux.signerTrust}
            anchors={signerDomain?.anchorCount ?? 0}
          />
          <TrustDomainCard
            t={t}
            title={t.verify.ux.tsaTrust}
            anchors={tsaDomain?.anchorCount ?? 0}
          />
        </div>
      </section>

      <section>
        <SectionHeading title={t.verify.ux.signatureMetadata} />
        <dl className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <DetailCard label={t.verify.result.standard} value={standardLabel(signature)} />
          <DetailCard
            label={t.verify.result.signatureAlgorithm}
            value={signature.signatureAlgorithm.name || "—"}
            mono
          />
          <DetailCard label={t.verify.result.digestAlgorithm} value={signature.digest.algorithm || "—"} mono />
          <DetailCard label={t.verify.ux.mainIndication} value={signature.mainIndication || "—"} mono />
          <DetailCard
            label={t.verify.ux.subIndications}
            value={signature.subIndications.length > 0 ? signature.subIndications.join(", ") : "—"}
            mono
          />
          <DetailCard label={t.verify.ux.signatureId} value={signature.signatureId} mono />
        </dl>
      </section>
    </div>
  );
}

function TrustDomainCard({
  t,
  title,
  anchors,
}: {
  t: Dictionary;
  title: string;
  anchors: number;
}) {
  const configured = anchors > 0;
  return (
    <article className="rounded-lg border border-border-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[12.5px] font-semibold text-fg">{title}</h3>
          <p className="mt-1 font-mono text-[10.5px] text-fg-muted">
            {configured ? t.common.configured : t.common.notConfigured}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${configured ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"}`}>
          {t.verify.ux.anchorsCount(anchors)}
        </span>
      </div>
    </article>
  );
}

function RawJsonPanel({
  t,
  report,
  signature,
}: {
  t: Dictionary;
  report: VerificationReport;
  signature: VerificationSignature;
}) {
  const [copied, setCopied] = useState(false);
  const raw = JSON.stringify({ report, selectedSignature: signature }, null, 2);

  async function copy() {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5">
        <span className="font-mono text-[11px] font-semibold text-fg-muted">verification-response.json</span>
        <button
          type="button"
          onClick={copy}
          className="h-7 rounded-md border border-border bg-surface-2 px-2.5 text-[11px] font-semibold text-fg hover:bg-inset"
        >
          {copied ? t.common.copied : t.verify.ux.copyJson}
        </button>
      </div>
      {/* Chỉ cuộn ngang: cuộn dọc đã thuộc về cột nội dung của tab nâng cao,
          để `max-h` ở đây nữa là sinh ra hai thanh cuộn lồng nhau. */}
      <pre className="overflow-x-auto bg-[#0d1117] p-4 font-mono text-[11px] leading-6 text-[#e6edf3]">
        {raw}
      </pre>
    </div>
  );
}

function advancedSectionLabel(t: Dictionary, section: AdvancedSection): string {
  switch (section) {
    case "technical":
      return t.verify.ux.sections.technical;
    case "checks":
      return t.verify.ux.sections.checks;
    case "certificate":
      return t.verify.ux.identityCertificate;
    case "timestamp":
      return t.verify.ux.sections.timestamp;
    case "scope":
      return t.verify.ux.sections.scope;
    case "issues":
      return t.verify.ux.sections.issues;
    case "raw":
      return t.verify.ux.sections.raw;
  }
}