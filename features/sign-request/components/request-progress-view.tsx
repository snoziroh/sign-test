"use client";

import type { Dictionary } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  LinkIcon,
  PlusIcon,
  RotateCcwIcon,
  SendIcon,
  XIcon,
} from "@/components/ui/icons";
import { formatBytes } from "@/features/signing/document-format";
import { FlowCanvas } from "./flow-canvas";
import {
  activeStepIndex,
  countSigned,
  isStepComplete,
  requestStatus,
  totalSlots,
  type RequestStatus,
  type SignRequestRecord,
} from "../model";

/**
 * Màn theo dõi một yêu cầu ký đã phát đi.
 *
 * Sơ đồ ở giữa là ĐÚNG component của lúc soạn (`FlowCanvas`), chỉ bỏ phần kéo
 * thả: người soạn đã đọc quen bố cục đó rồi, và một cách trình bày thứ hai cho
 * cùng một quy trình chỉ tạo thêm việc học. Mỗi ô đổi thành một chỉ báo trạng
 * thái — bước nào đang chờ ai là câu hỏi duy nhất người ta mở màn này để hỏi.
 */
export function RequestProgressView({
  t,
  record,
  document,
  onOpenSlot,
  onSimulateSignature,
  onResetProgress,
  onCancel,
  onNewRequest,
}: {
  t: Dictionary;
  record: SignRequestRecord;
  document?: File;
  onOpenSlot: (slotId: string) => void;
  onSimulateSignature: () => void;
  onResetProgress: () => void;
  onCancel: () => void;
  onNewRequest: () => void;
}) {
  const p = t.signRequest.progress;
  const { toast } = useToast();

  const status = requestStatus(record);
  const total = totalSlots(record.steps);
  const signed = countSigned(record.steps);
  const percent = total === 0 ? 0 : Math.round((signed / total) * 100);
  const active = activeStepIndex(record.steps);
  const linkSigners = record.steps.flatMap((step) =>
    step.slots.filter((slot) => slot.signer?.kind === "link"),
  );

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------- Thẻ tiêu đề ---------------- */}
      <section className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-start gap-3 border-b border-border-muted px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[16px] font-semibold text-fg">{record.name}</h2>
              <StatusPill t={t} status={status} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-fg-subtle">
              <span>{record.code}</span>
              <span>
                {p.createdAt(new Date(record.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }))}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toast.info(p.download, record.documentName)}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12.5px] font-semibold text-fg hover:bg-inset"
            >
              <DownloadIcon size={14} />
              {p.download}
            </button>
            {status === "running" ? (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12.5px] font-semibold text-danger hover:bg-danger-subtle"
              >
                <XIcon size={14} />
                {p.cancelRequest}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onNewRequest}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-3 text-[12.5px] font-semibold text-accent-fg hover:opacity-90"
            >
              <PlusIcon size={14} />
              {p.newRequest}
            </button>
          </div>
        </div>

        <div className="grid gap-4 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[12.5px] font-semibold text-fg">
                {active === -1 ? p.allSigned : p.waitingOnStep(active + 1)}
              </span>
              <span className="font-mono text-[11.5px] text-fg-muted">
                {p.progressLabel(signed, total)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-inset">
              <div
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{ width: `${percent}%` }}
                className={`h-full rounded-full transition-[width] duration-300 ${
                  status === "completed" ? "bg-success" : "bg-accent"
                }`}
              />
            </div>
          </div>

          <dl className="flex flex-wrap gap-x-6 gap-y-1.5 text-[11.5px] sm:justify-end">
            <div className="flex items-center gap-1.5">
              <dt className="text-fg-subtle">
                <FileTextIcon size={13} />
                <span className="sr-only">{p.documentLabel}</span>
              </dt>
              <dd className="max-w-52 truncate font-medium text-fg">
                {record.documentName}
                <span className="ml-1.5 font-mono text-[10.5px] text-fg-subtle">
                  {document ? formatBytes(document.size) : ""}
                </span>
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="text-fg-subtle">
                <CalendarIcon size={13} />
                <span className="sr-only">{p.deadlineLabel}</span>
              </dt>
              <dd className="font-medium text-fg">
                {record.deadline
                  ? new Date(record.deadline).toLocaleDateString(undefined, { dateStyle: "medium" })
                  : p.noDeadline}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------------- Sơ đồ + diễn biến ---------------- */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <FlowCanvas t={t} steps={record.steps} onOpenSlot={onOpenSlot} />

        <div className="flex flex-col gap-4">
          <section className="rounded-lg border border-border bg-surface shadow-sm">
            <h3 className="border-b border-border-muted px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-subtle">
              {p.timelineTitle}
            </h3>
            <Timeline t={t} record={record} />
          </section>

          {linkSigners.length > 0 ? (
            <section className="rounded-lg border border-border bg-surface shadow-sm">
              <h3 className="border-b border-border-muted px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-subtle">
                {t.signRequest.flow.palette.linkGroup}
              </h3>
              <ul className="flex flex-col gap-1.5 p-3">
                {linkSigners.map((slot) => (
                  <li
                    key={slot.id}
                    className="flex items-center gap-2 rounded-md border border-border-muted bg-surface-2 px-2.5 py-2"
                  >
                    <LinkIcon size={13} className="shrink-0 text-accent" />
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-fg">
                      {slot.signer?.name || slot.signer?.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/sign-request/${record.code}/${slot.id}`;
                        navigator.clipboard?.writeText(url).catch(() => undefined);
                        toast.success(p.linkCopied, url);
                      }}
                      aria-label={`${p.copyLink} — ${slot.signer?.email ?? ""}`}
                      className="flex size-6.5 shrink-0 items-center justify-center rounded border border-border bg-surface text-fg-muted hover:border-accent hover:text-accent"
                    >
                      <CopyIcon size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Bản dựng giao diện — nói thẳng ra thay vì để người xem tưởng nó thật. */}
          <section className="rounded-lg border border-dashed border-border bg-surface-2 p-3.5">
            <h3 className="text-[12.5px] font-semibold text-fg">{p.demoTitle}</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">{p.demoHint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSimulateSignature}
                disabled={active === -1}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[12px] font-semibold text-fg disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SendIcon size={13} />
                {active === -1 ? p.demoDone : p.demoSign}
              </button>
              <button
                type="button"
                onClick={onResetProgress}
                disabled={signed === 0}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[12px] font-semibold text-fg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcwIcon size={13} />
                {p.demoReset}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Diễn biến
 * ------------------------------------------------------------------ */

interface TimelineEntry {
  id: string;
  label: string;
  detail?: string;
  tone: "done" | "active" | "queued";
}

function Timeline({ t, record }: { t: Dictionary; record: SignRequestRecord }) {
  const p = t.signRequest.progress;
  const entries: TimelineEntry[] = [
    {
      id: "created",
      label: p.timelineCreated,
      detail: new Date(record.createdAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
      tone: "done",
    },
  ];

  const active = activeStepIndex(record.steps);

  record.steps.forEach((step, index) => {
    for (const slot of step.slots) {
      if (!slot.signedAt) continue;
      entries.push({
        id: slot.id,
        label: p.timelineSigned(slot.signer?.name || slot.signer?.email || "—"),
        detail: new Date(slot.signedAt).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
        tone: "done",
      });
    }
    if (isStepComplete(step)) {
      entries.push({ id: `${step.id}-done`, label: p.timelineStepDone(index + 1), tone: "done" });
    }
  });

  if (active === -1) {
    entries.push({ id: "completed", label: p.timelineCompleted, tone: "done" });
  } else {
    const waiting = record.steps[active].slots.find((slot) => !slot.signedAt && !slot.declinedAt);
    entries.push({
      id: "waiting",
      label: waiting
        ? p.timelineWaiting(waiting.signer?.name || waiting.signer?.email || "—")
        : p.waitingOnStep(active + 1),
      tone: "active",
    });
  }

  return (
    <ol className="relative flex flex-col gap-3.5 py-4 pl-9 pr-4">
      <span
        aria-hidden="true"
        className="absolute bottom-5 left-[1.45rem] top-5 w-0.5 rounded-full bg-border-muted"
      />
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            aria-hidden="true"
            className={`absolute -left-[1.05rem] top-0.5 flex size-3.5 items-center justify-center rounded-full ring-3 ring-surface ${
              entry.tone === "done"
                ? "bg-success text-success"
                : entry.tone === "active"
                  ? "bg-warning"
                  : "bg-border"
            }`}
          />
          <p className="text-[12px] font-semibold text-fg">{entry.label}</p>
          {entry.detail ? (
            <p className="font-mono text-[10.5px] text-fg-subtle">{entry.detail}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function StatusPill({ t, status }: { t: Dictionary; status: RequestStatus }) {
  const labels = t.signRequest.progress.status;
  const style: Record<RequestStatus, string> = {
    running: "bg-warning-subtle text-warning",
    completed: "bg-success-subtle text-success",
    declined: "bg-danger-subtle text-danger",
    cancelled: "bg-inset text-fg-muted",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${style[status]}`}
    >
      {status === "completed" ? (
        <CheckIcon size={12} />
      ) : status === "running" ? (
        <ClockIcon size={12} />
      ) : (
        <XIcon size={12} />
      )}
      {labels[status]}
    </span>
  );
}
