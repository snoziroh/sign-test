import type {
  ChainNodeStatus,
  CheckOutcome,
  IssueSeverity,
  VerificationSignature,
  VerificationStatus,
} from "@/lib/types/verification";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckIcon,
  InfoIcon,
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

export function OutcomeIcon({ outcome, size }: { outcome: CheckOutcome | null; size: number }) {
  const kind = checkOutcomeTone(outcome).kind;
  if (kind === "ok") return <CheckIcon size={size} />;
  if (kind === "bad") return <AlertCircleIcon size={size} />;
  if (kind === "warn") return <AlertTriangleIcon size={size} />;
  return <InfoIcon size={size} />;
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