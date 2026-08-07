import type {
  SignatureCheck,
  VerificationSignature,
} from "@/lib/types/verification";
import type { Dictionary } from "@/lib/i18n";
import {
  DetailCard,
  OutcomeIcon,
  TreeLine,
  boolLabel,
  checkOutcomeTone,
  matchLabel,
  standardLabel,
  truncateHex,
} from "./verification-ui";

export function ValidationTreePanel({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
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
        <p className="mt-1.5 pl-6.75 text-[11.5px] leading-relaxed text-fg-muted">
          {check.actual}
        </p>
      ) : null}

      {blockedBy.length > 0 ? (
        <p className="mt-1 pl-6.75 text-[11px] leading-relaxed text-warning">
          {t.verify.checks.blockedBy(blockedBy.join(", "))}
        </p>
      ) : null}
    </li>
  );
}

export function ManifestPanel({ t, signature }: { t: Dictionary; signature: VerificationSignature }) {
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