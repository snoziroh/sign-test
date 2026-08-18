import type { PrimaryCheck } from "@/lib/types/verification";
import type { Dictionary } from "@/lib/i18n";
import { OutcomeIcon, checkOutcomeTone, userOutcomeLabel } from "./verification-ui";

/**
 * Tầng 2 của màn kết quả — năm thẻ do backend tổng hợp sẵn ở `primaryChecks`
 * (schema 6.1.0).
 *
 * Danh sách này KHÔNG được suy lại từ `checks[]` ở giao diện: backend đã gộp
 * kết quả xấu nhất trên mọi chữ ký theo một thứ tự cố định, và tự suy lại là
 * cách chắc chắn để màn tổng quan nói khác màn chi tiết.
 *
 * Ba quy tắc render nằm trong `PrimaryCheckCard` bên dưới:
 *
 * 1. Khoá React theo `check.id`, không theo index — thứ tự hiện ổn định nhưng
 *    một bản minor sau có thể chèn thẻ mới vào giữa.
 * 2. `id` lạ vẫn hiện được: nhãn rơi về `title` của backend rồi mới tới `id`.
 * 3. `NOT_APPLICABLE` (điển hình: `TIMESTAMP_PRESENT` trên PAdES-B-B) là xám
 *    "không áp dụng", tuyệt đối không phải đỏ — tài liệu không có dấu thời gian
 *    khác hẳn tài liệu có dấu thời gian hỏng.
 */
export function PrimaryChecksPanel({
  t,
  checks,
  onShowIssues,
}: {
  t: Dictionary;
  checks: PrimaryCheck[];
  onShowIssues?: () => void;
}) {
  if (checks.length === 0) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border-muted">
      {checks.map((check, index) => (
        <PrimaryCheckCard
          key={check.id}
          t={t}
          check={check}
          divided={index > 0}
          onShowIssues={onShowIssues}
        />
      ))}
    </div>
  );
}

function PrimaryCheckCard({
  t,
  check,
  divided,
  onShowIssues,
}: {
  t: Dictionary;
  check: PrimaryCheck;
  divided: boolean;
  onShowIssues?: () => void;
}) {
  const tone = checkOutcomeTone(check.outcome);
  const labels = t.verify.primaryChecks.byId[check.id];

  // `detail` là thứ duy nhất nói được lý do của chính ca này — ví dụ vì sao
  // `SIGNED_WITHIN_VALIDITY` ra `INDETERMINATE`. Câu mô tả tĩnh trong từ điển
  // chỉ là phương án dự phòng khi backend không kèm câu chữ.
  const description = check.detail ?? labels?.description ?? null;

  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 ${divided ? "border-t border-border-muted" : ""}`}>
      <span className={`mt-0.5 ${tone.color}`}>
        <OutcomeIcon outcome={check.outcome} size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[12.5px] font-semibold text-fg">
            {labels?.title ?? check.title ?? check.id}
          </h3>
          <span className={`text-[11px] font-semibold ${tone.color}`}>
            {userOutcomeLabel(t, check.outcome)}
          </span>
        </div>

        {description ? (
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-muted">{description}</p>
        ) : null}

        {check.issues.length > 0 && onShowIssues ? (
          <button
            type="button"
            onClick={onShowIssues}
            className="mt-1.5 text-[11px] font-semibold text-accent hover:underline"
          >
            {t.verify.primaryChecks.linkedIssues(check.issues.length)}
          </button>
        ) : null}
      </div>
    </div>
  );
}
