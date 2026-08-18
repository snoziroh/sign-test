import type {
  ChainNodeStatus,
  CheckOutcome,
  IssueSeverity,
  ValidationGroup,
  VerificationSignature,
  VerificationStatus,
} from "@/lib/types/verification";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckIcon,
  CircleSlashIcon,
  HelpCircleIcon,
  InfoIcon,
  MinusIcon,
} from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";

export function TreeLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#3fb950]">›</span>
      <span>{text}</span>
    </div>
  );
}

export function DetailCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
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

export function VerdictIcon({ status, size }: { status: VerificationStatus; size: number }) {
  if (status === "VALID") return <CheckIcon size={size} />;
  if (status === "INVALID") return <AlertCircleIcon size={size} />;
  return <InfoIcon size={size} />;
}

export function IssueIcon({ severity, size }: { severity: IssueSeverity; size: number }) {
  if (severity === "CRITICAL" || severity === "ERROR") return <AlertCircleIcon size={size} />;
  if (severity === "WARNING") return <AlertTriangleIcon size={size} />;
  return <InfoIcon size={size} />;
}

export function issueStyle(severity: IssueSeverity) {
  if (severity === "CRITICAL" || severity === "ERROR") {
    return { border: "border-danger", background: "bg-danger-subtle", color: "text-danger" };
  }
  if (severity === "WARNING") {
    return { border: "border-warning", background: "bg-warning-subtle", color: "text-warning" };
  }
  return { border: "border-border-muted", background: "bg-inset", color: "text-fg-muted" };
}

/**
 * Bảy trạng thái, bảy hình. Cố tình KHÔNG vẽ theo `tone.kind`: `INDETERMINATE`
 * (đã chạy, không kết luận được) và `WARNING` (đạt, có điểm lưu ý) cùng màu vàng
 * nhưng là hai chuyện khác nhau, `NOT_APPLICABLE` (không áp dụng) và
 * `NOT_EVALUATED` (chưa chạy) cùng màu xám cũng vậy — gộp hình là xoá đúng phần
 * thông tin người đọc cần.
 */
export function OutcomeIcon({ outcome, size }: { outcome: CheckOutcome | null; size: number }) {
  switch (outcome) {
    case "PASS":
      return <CheckIcon size={size} />;
    case "FAIL":
      return <AlertCircleIcon size={size} />;
    case "WARNING":
      return <AlertTriangleIcon size={size} />;
    case "INDETERMINATE":
      return <HelpCircleIcon size={size} />;
    case "NOT_APPLICABLE":
      return <MinusIcon size={size} />;
    case "NOT_EVALUATED":
    case "UNSUPPORTED":
      return <CircleSlashIcon size={size} />;
    default:
      // Bao gồm cả `null` và mã lạ của một bản minor sau — không tô đỏ, không đoán.
      return <InfoIcon size={size} />;
  }
}

/**
 * Tô màu cho bảy trạng thái của schema 6.
 *
 * `NOT_EVALUATED` / `NOT_APPLICABLE` / `UNSUPPORTED` cố tình KHÔNG tô đỏ: chúng
 * nghĩa là engine chưa chạy bước đó, không phải bước đó hỏng. Tô đỏ ở đây là biến
 * một báo cáo bình thường thành báo động giả.
 *
 * Ngược lại `INDETERMINATE` KHÔNG tô xám: nó nghĩa là đã chạy và không kết luận
 * được — một trạng thái cần người xử lý, không phải một ô để bỏ qua.
 */

export function checkOutcomeTone(outcome: CheckOutcome | null): {
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

/**
 * Bốn nhóm `validation` dùng làm nguồn dự phòng khi backend còn ở 6.0.x — cùng
 * tập với `UserValidationSummary` ở màn tổng quan, để con số trên badge không
 * nói khác danh sách người dùng mở ra xem.
 */
const FALLBACK_TALLY_GROUPS: ValidationGroup[] = [
  "signedScope",
  "cryptographicIntegrity",
  "certificatePath",
  "trustedTime",
];

/**
 * Số đầu mục "đạt" của một chữ ký, để hiện dạng `4/5` ngay trên danh sách.
 *
 * `NOT_APPLICABLE` bị loại khỏi CẢ tử lẫn mẫu: một tài liệu PAdES-B-B không có
 * dấu thời gian thì thẻ `TIMESTAMP_PRESENT` không phải một mục có thể đạt hay
 * trượt, và tính nó vào mẫu sẽ biến một chữ ký lành lặn thành `4/5` vàng.
 *
 * Sắc thái đọc từ chính các outcome đang đếm chứ không từ `signature.status`,
 * để badge không bao giờ tự mâu thuẫn (`5/5` mà lại đỏ).
 */
export function primaryCheckTally(signature: VerificationSignature): {
  passed: number;
  total: number;
  tone: "ok" | "bad" | "warn";
} | null {
  const outcomes =
    signature.primaryChecks.length > 0
      ? signature.primaryChecks.map((check) => check.outcome)
      : FALLBACK_TALLY_GROUPS.map((group) => signature.validation[group]);

  const applicable = outcomes.filter((outcome) => outcome !== "NOT_APPLICABLE");
  if (applicable.length === 0) return null;

  const passed = applicable.filter((outcome) => outcome === "PASS").length;
  const tone = applicable.some((outcome) => outcome === "FAIL")
    ? "bad"
    : passed === applicable.length
      ? "ok"
      : "warn";

  return { passed, total: applicable.length, tone };
}

export function checkTallyBadgeClass(tone: "ok" | "bad" | "warn"): string {
  if (tone === "ok") return "bg-success-subtle text-success";
  if (tone === "bad") return "bg-danger-subtle text-danger";
  return "bg-warning-subtle text-warning";
}

export function verdictMeta(t: Dictionary, status: VerificationStatus) {
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

export function chainNodeDotClass(status: ChainNodeStatus): string {
  if (status === "VALID") return "border-success bg-success-subtle";
  if (status === "EXPIRED" || status === "INVALID") return "border-danger bg-danger-subtle";
  if (status === "UNKNOWN") return "border-border bg-inset";
  return "border-warning bg-warning-subtle";
}

export function chainNodeBadgeClass(status: ChainNodeStatus): string {
  if (status === "VALID") return "bg-success-subtle text-success";
  if (status === "EXPIRED" || status === "INVALID") return "bg-danger-subtle text-danger";
  if (status === "UNKNOWN") return "bg-inset text-fg-subtle";
  return "bg-warning-subtle text-warning";
}

export function matchLabel(t: Dictionary, matched: boolean | null): string {
  if (matched === true) return t.verify.tree.matched;
  if (matched === false) return t.verify.tree.notMatched;
  return t.verify.tree.unknownMatch;
}

export function boolLabel(t: Dictionary, value: boolean | null | undefined): string {
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
 * `standard` và baseline đều là chuỗi tự do ở schema 6 (backend có thể thêm chuẩn
 * mới trong một bản minor), nên chỗ này chỉ làm đẹp những giá trị đã biết và cho
 * giá trị lạ đi qua nguyên văn thay vì ép nó về "OOXML".
 */

export function standardLabel(signature: VerificationSignature): string {
  const standard = STANDARD_LABELS[signature.standard] ?? signature.standard;
  const level = signature.baselineLevel;
  if (!level) return standard;
  return level.startsWith(standard) ? level : `${standard}-${level}`;
}

export function formatDateTimeCompact(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

export function formatFingerprint(hex: string): string {
  return hex.replace(/(.{2})/g, "$1:").replace(/:$/, "");
}

export function truncateHex(value: string): string {
  if (value.length <= 20) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

export function fileExtension(fileName: string): string {
  return fileName.includes(".")
    ? fileName.split(".").pop() ?? ""
    : "";
}

export function formatBytes(bytes: number): string {
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

export function SectionHeading({ title }: { title: string }) {
  return <h2 className="text-[13px] font-semibold text-fg">{title}</h2>;
}

export function userOutcomeLabel(t: Dictionary, outcome: CheckOutcome | null): string {
  return t.verify.checks.outcome[outcome ?? "NOT_EVALUATED"];
}

export function checkOutcomeLabel(t: Dictionary, outcome: CheckOutcome | null): string {
  if (!outcome) return "—";
  return userOutcomeLabel(t, outcome);
}

export function statusBadgeClass(status: VerificationStatus): string {
  if (status === "VALID") return "bg-success-subtle text-success";
  if (status === "INVALID") return "bg-danger-subtle text-danger";
  return "bg-warning-subtle text-warning";
}