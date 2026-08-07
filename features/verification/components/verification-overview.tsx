import type {
  CheckOutcome,
  VerificationIssue,
  VerificationSignature,
} from "@/lib/types/verification";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckIcon,
  InfoIcon,
} from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import {
  IssueIcon,
  OutcomeIcon,
  SectionHeading,
  VerdictIcon,
  checkOutcomeLabel,
  checkOutcomeTone,
  formatDateTime,
  issueStyle,
  standardLabel,
  statusBadgeClass,
  userOutcomeLabel,
  verdictMeta,
} from "./verification-ui";

export function OverviewPanel({
  t,
  signature,
  onShowAdvanced,
}: {
  t: Dictionary;
  signature: VerificationSignature;
  onShowAdvanced: () => void;
}) {
  const rootIssues = signature.issues.filter((issue) => issue.rootCause);
  const displayedIssues = rootIssues.length > 0 ? rootIssues.slice(0, 2) : signature.issues.slice(0, 1);
  const requiresResigning = signature.issues.some((issue) => issue.fileNeedsResigning);
  const scopeHasLaterRevisions =
    signature.scope?.coversCurrentDocument === false &&
    (signature.scope?.unsignedTrailingBytes ?? 0) > 0;

  return (
    <div className="space-y-5 p-5">
      <SignerSummaryCard t={t} signature={signature} />

      <section>
        <SectionHeading title={t.verify.ux.userChecks} />
        <UserValidationSummary t={t} signature={signature} />
      </section>

      {scopeHasLaterRevisions ? (
        <article className="rounded-lg border border-border-muted bg-inset p-4">
          <div className="flex gap-3">
            <span className="mt-0.5 text-fg-muted">
              <InfoIcon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[12.5px] font-semibold text-fg">{t.verify.ux.laterRevisionTitle}</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">
                {t.verify.ux.laterRevisionDescription}
              </p>
            </div>
          </div>
        </article>
      ) : null}

      {displayedIssues.length > 0 ? (
        <section>
          <SectionHeading title={t.verify.ux.needsAttention} />
          <div className="space-y-2">
            {displayedIssues.map((issue) => (
              <UserIssueNotice key={issue.issueId} t={t} issue={issue} />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2.5">
            <span
              className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${
                requiresResigning ? "text-danger" : "text-success"
              }`}
            >
              {requiresResigning ? <AlertCircleIcon size={14} /> : <CheckIcon size={14} />}
              {requiresResigning ? t.verify.issues.needsResigning : t.verify.ux.noResignRequired}
            </span>
            <button
              type="button"
              onClick={onShowAdvanced}
              className="text-[11.5px] font-semibold text-accent hover:underline"
            >
              {t.verify.ux.details} →
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SignerSummaryCard({
  t,
  signature,
}: {
  t: Dictionary;
  signature: VerificationSignature;
}) {
  const meta = verdictMeta(t, signature.status);

  return (
    <section className="overflow-hidden rounded-lg border border-border-muted">
      <div className="flex flex-wrap items-start gap-3 p-4">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.background} ${meta.color}`}>
          <VerdictIcon status={signature.status} size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            {t.verify.ux.signer}
          </p>
          <h2 className="mt-1 truncate text-[15px] font-semibold text-fg">
            {signature.signer?.commonName ?? t.verify.banner2.unknownSigner}
          </h2>
          <p className="mt-0.5 text-[11.5px] text-fg-muted">{meta.title}</p>
        </div>

        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${statusBadgeClass(signature.status)}`}>
          ● {meta.title}
        </span>
      </div>

      <dl className="grid border-t border-border-muted sm:grid-cols-2 lg:grid-cols-3">
        <SummaryField label={t.verify.ux.signingTime} value={formatDateTime(signature.signingTime)} />
        <SummaryField label={t.verify.result.standard} value={standardLabel(signature)} />
        <SummaryField
          label={t.verify.ux.trust}
          value={
            signature.certificateChain?.trustAnchor
              ? signature.certificateChain.trustAnchor
              : checkOutcomeLabel(t, signature.validation.certificatePath)
          }
        />
      </dl>

      {signature.signingTime && !signature.signingTimeTrusted ? (
        <div className="flex gap-2 border-t border-border-muted bg-warning-subtle px-4 py-2.5 text-[11.5px] text-warning">
          <AlertTriangleIcon size={14} className="mt-0.5 shrink-0" />
          <span>{t.verify.banner2.signingTimeUntrusted}</span>
        </div>
      ) : null}
    </section>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border-muted px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{label}</dt>
      <dd className="mt-1 text-[12px] font-semibold text-fg">{value}</dd>
    </div>
  );
}

function UserValidationSummary({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
  const checks: Array<{
    key: string;
    title: string;
    description: string;
    outcome: CheckOutcome | null;
  }> = [
    {
      key: "scope",
      title: t.verify.ux.integrity,
      description: t.verify.ux.integrityDescription,
      outcome: signature.validation.signedScope,
    },
    {
      key: "crypto",
      title: t.verify.ux.cryptography,
      description: t.verify.ux.cryptographyDescription,
      outcome: signature.validation.cryptographicIntegrity,
    },
    {
      key: "certificate",
      title: t.verify.ux.identityCertificate,
      description: t.verify.ux.identityCertificateDescription,
      outcome: signature.validation.certificatePath,
    },
    {
      key: "time",
      title: t.verify.ux.trustedTime,
      description: t.verify.ux.trustedTimeDescription,
      outcome: signature.validation.trustedTime,
    },
  ];

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border-muted">
      {checks.map((check, index) => {
        const tone = checkOutcomeTone(check.outcome);
        return (
          <div
            key={check.key}
            className={`flex items-start gap-3 px-4 py-3.5 ${index > 0 ? "border-t border-border-muted" : ""}`}
          >
            <span className={`mt-0.5 ${tone.color}`}>
              <OutcomeIcon outcome={check.outcome} size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[12.5px] font-semibold text-fg">{check.title}</h3>
                <span className={`text-[11px] font-semibold ${tone.color}`}>
                  {userOutcomeLabel(t, check.outcome)}
                </span>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-muted">{check.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UserIssueNotice({ t, issue }: { t: Dictionary; issue: VerificationIssue }) {
  const style = issueStyle(issue.severity);

  return (
    <article className={`rounded-lg border p-4 ${style.border} ${style.background}`}>
      <div className="flex gap-3">
        <span className={`mt-0.5 shrink-0 ${style.color}`}>
          <IssueIcon severity={issue.severity} size={16} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[12.5px] font-semibold text-fg">{userIssueTitle(t, issue)}</h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">{userIssueDescription(t, issue)}</p>
        </div>
      </div>
    </article>
  );
}

function userIssueTitle(t: Dictionary, issue: VerificationIssue): string {
  return t.verify.issues.byCode[issue.code]?.title ?? issue.message;
}

function userIssueDescription(t: Dictionary, issue: VerificationIssue): string {
  return t.verify.issues.byCode[issue.code]?.description ?? (issue.detail || issue.message);
}