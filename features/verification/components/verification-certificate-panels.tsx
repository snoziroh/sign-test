import type {
  CertificateChain,
  VerificationSignature,
  VerificationTimestamp,
} from "@/lib/types/verification";
import type { Dictionary } from "@/lib/i18n";
import {
  DetailCard,
  OutcomeIcon,
  chainNodeBadgeClass,
  chainNodeDotClass,
  checkOutcomeTone,
  formatDateTime,
  formatFingerprint,
  matchLabel,
  truncateHex,
} from "./verification-ui";
import { IssueCard } from "./verification-issues";

export function CertificateChainPanel({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
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
                <p className="mt-1 pl-6.75 text-[11px] text-fg-muted">{entry.reason}</p>
              ) : null}
              {entry.blockedByCheckIds.length > 0 ? (
                <p className="mt-1 pl-6.75 text-[11px] text-warning">
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

export function TimestampPanel({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
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