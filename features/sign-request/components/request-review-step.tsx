"use client";

import type { Dictionary } from "@/lib/i18n";
import type { DocumentFormat } from "@/lib/types/signing";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckIcon,
  FileTextIcon,
  LayersIcon,
  PenLineIcon,
} from "@/components/ui/icons";
import { formatBytes } from "@/features/signing/document-format";
import { avatarTone, initialsOf } from "../directory";
import {
  signaturesBefore,
  totalSlots,
  type DraftIssue,
  type SignRequestDraft,
} from "../model";

/**
 * Bước 3 — xác nhận.
 *
 * Bên trái là những thứ CHƯA hỏi ở đâu cả (tên, hạn, lời nhắn); bên phải là bản
 * tóm tắt của hai bước trước. Danh sách lỗi không chỉ nói cái gì sai mà còn đưa
 * thẳng người dùng tới đúng bước có lỗi — bắt họ tự đi tìm trong một luồng mười
 * ô là cách chắc chắn nhất để họ bỏ cuộc ở đây.
 */
export function RequestReviewStep({
  t,
  draft,
  document,
  documentFormat,
  issues,
  onPatch,
  onGoToStep,
}: {
  t: Dictionary;
  draft: SignRequestDraft;
  document?: File;
  documentFormat?: DocumentFormat;
  issues: DraftIssue[];
  onPatch: (patch: Partial<SignRequestDraft>) => void;
  onGoToStep: (stepIndex: number) => void;
}) {
  const r = t.signRequest.review;
  const c = t.signRequest.flow.canvas;
  const signatures = totalSlots(draft.steps);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ---------------- Thông tin yêu cầu ---------------- */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h3 className="text-[13.5px] font-semibold text-fg">{r.title}</h3>

        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-fg">{r.nameLabel}</span>
          <input
            value={draft.name}
            onChange={(event) => onPatch({ name: event.target.value })}
            placeholder={r.namePlaceholder}
            className="h-9 w-full rounded-md border border-border bg-canvas px-2.5 text-[13px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-fg">{r.deadlineLabel}</span>
          <span className="relative block">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
            >
              <CalendarIcon size={14} />
            </span>
            <input
              type="date"
              value={draft.deadline}
              onChange={(event) => onPatch({ deadline: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-canvas pl-8 pr-2.5 text-[13px] text-fg focus:border-accent focus:outline-none"
            />
          </span>
          <span className="mt-1 block text-[11px] text-fg-muted">{r.deadlineHint}</span>
        </label>

        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-fg">{r.messageLabel}</span>
          <textarea
            value={draft.message}
            onChange={(event) => onPatch({ message: event.target.value })}
            placeholder={r.messagePlaceholder}
            rows={3}
            className="w-full resize-y rounded-md border border-border bg-canvas px-2.5 py-2 text-[13px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
        </label>

        <div className="flex flex-col gap-2.5 border-t border-border-muted pt-3">
          <Toggle
            label={r.remindLabel}
            hint={r.remindHint}
            checked={draft.remindSigners}
            onChange={(remindSigners) => onPatch({ remindSigners })}
          />
          <Toggle
            label={r.notifyLabel}
            hint={r.notifyHint}
            checked={draft.notifyOnComplete}
            onChange={(notifyOnComplete) => onPatch({ notifyOnComplete })}
          />
        </div>
      </section>

      {/* ---------------- Tóm tắt ---------------- */}
      <div className="flex flex-col gap-4">
        <section className="rounded-lg border border-border bg-surface shadow-sm">
          <h3 className="border-b border-border-muted px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-subtle">
            {r.documentSection}
          </h3>
          <div className="flex items-center gap-3 px-4 py-3">
            <span aria-hidden="true" className="text-fg-muted">
              <FileTextIcon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-fg">
                {document?.name ?? "—"}
              </p>
              <p className="font-mono text-[11px] text-fg-subtle">
                {documentFormat ?? "—"}
                {document ? ` · ${formatBytes(document.size)}` : ""}
              </p>
            </div>
          </div>

          <h3 className="border-y border-border-muted px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-subtle">
            {r.flowSection}
          </h3>
          <p className="flex items-center gap-2 px-4 pt-3 text-[12.5px] font-semibold text-fg">
            <LayersIcon size={15} className="text-fg-muted" />
            {r.flowSummary(draft.steps.length, signatures)}
          </p>

          <ol className="flex flex-col gap-2 p-4">
            {draft.steps.map((step, index) => (
              <li
                key={step.id}
                className="flex items-center gap-2.5 rounded-md border border-border-muted bg-surface-2 px-3 py-2"
              >
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border border-accent bg-accent-subtle font-mono text-[10.5px] font-semibold text-accent"
                >
                  {index + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-fg">
                    {step.name.trim() || c.stepLabel(index + 1)}
                  </span>
                  <span className="block truncate text-[10.5px] text-fg-muted">
                    {index === 0
                      ? c.coSign
                      : signaturesBefore(draft.steps, index) === 0
                        ? c.counterSignNothing
                        : c.counterSignHint(signaturesBefore(draft.steps, index), index)}
                  </span>
                </span>

                <span className="flex shrink-0 -space-x-1.5">
                  {step.slots.slice(0, 4).map((slot) => (
                    <span
                      key={slot.id}
                      title={slot.signer?.name || slot.signer?.email}
                      className={`flex size-6 items-center justify-center rounded-full border border-surface font-mono text-[9.5px] font-bold ${
                        slot.signer
                          ? avatarTone(slot.signer.email || slot.signer.name)
                          : "bg-inset text-fg-subtle"
                      }`}
                    >
                      {slot.signer ? initialsOf(slot.signer.name || slot.signer.email) : "?"}
                    </span>
                  ))}
                  {step.slots.length > 4 ? (
                    <span className="flex size-6 items-center justify-center rounded-full border border-surface bg-inset font-mono text-[9.5px] font-bold text-fg-muted">
                      +{step.slots.length - 4}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {issues.length === 0 ? (
          <section className="flex items-start gap-3 rounded-lg border border-success bg-success-subtle px-4 py-3">
            <span aria-hidden="true" className="mt-0.5 text-success">
              <CheckIcon size={17} />
            </span>
            <div>
              <p className="text-[12.5px] font-semibold text-fg">{r.readyTitle}</p>
              <p className="mt-0.5 text-[11.5px] text-fg-muted">{r.readyBody}</p>
            </div>
          </section>
        ) : (
          <section className="rounded-lg border border-warning bg-surface">
            <h3 className="flex items-center gap-2 border-b border-border-muted bg-warning-subtle px-4 py-2.5 text-[12.5px] font-semibold text-fg">
              <AlertTriangleIcon size={15} className="text-warning" />
              {r.issuesTitle}
            </h3>
            <ul className="flex flex-col gap-1.5 p-3">
              {issues.map((issue, index) => (
                <li
                  key={`${issue.code}-${issue.slotId ?? issue.stepIndex ?? index}`}
                  className="flex items-center gap-2 text-[12px] text-fg"
                >
                  <PenLineIcon size={13} className="shrink-0 text-warning" />
                  <span className="flex-1">{describeIssue(t, issue)}</span>
                  {issue.stepIndex !== undefined ? (
                    <button
                      type="button"
                      onClick={() => onGoToStep(issue.stepIndex as number)}
                      className="shrink-0 rounded border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-fg-muted hover:border-accent hover:text-accent"
                    >
                      {r.goToStep(issue.stepIndex + 1)}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export function describeIssue(t: Dictionary, issue: DraftIssue): string {
  const messages = t.signRequest.review.issue;
  const step = (issue.stepIndex ?? 0) + 1;

  switch (issue.code) {
    case "NO_DOCUMENT":
      return messages.NO_DOCUMENT;
    case "NO_NAME":
      return messages.NO_NAME;
    case "EMPTY_STEP":
      return messages.EMPTY_STEP(step);
    case "SLOT_WITHOUT_SIGNER":
      return messages.SLOT_WITHOUT_SIGNER(step);
    case "LINK_WITHOUT_EMAIL":
      return messages.LINK_WITHOUT_EMAIL(step);
    case "DUPLICATE_IN_STEP":
      return messages.DUPLICATE_IN_STEP(step, issue.signerName ?? "");
  }
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-[var(--accent)]"
      />
      <span>
        <span className="block text-[12.5px] font-semibold text-fg">{label}</span>
        <span className="block text-[11px] text-fg-muted">{hint}</span>
      </span>
    </label>
  );
}
