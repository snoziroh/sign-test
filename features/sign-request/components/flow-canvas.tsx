"use client";

import { useState, type DragEvent } from "react";
import type { Dictionary } from "@/lib/i18n";
import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronUpIcon,
  ClockIcon,
  GripVerticalIcon,
  LinkIcon,
  PenLineIcon,
  PlusIcon,
  TrashIcon,
  UserPlusIcon,
  XIcon,
} from "@/components/ui/icons";
import { avatarTone, initialsOf } from "../directory";
import {
  activeStepIndex,
  isStepComplete,
  signaturesBefore,
  slotStatus,
  type DirectoryUser,
  type DraftIssue,
  type FlowStep,
  type SignatureSlot,
  type SlotStatus,
  type StepRule,
} from "../model";

/**
 * Bức tranh của cả quy trình ký — thứ người dùng nhìn vào để trả lời "ai ký, sau
 * ai, và cái nào đè lên cái nào".
 *
 * Một component cho CẢ HAI màn: lúc soạn và lúc theo dõi tiến trình. Đó là chủ ý
 * chứ không phải tiết kiệm code — người soạn đã học cách đọc sơ đồ này một lần
 * rồi, bắt họ học lại một cách trình bày khác cho cùng một quy trình khi nó đang
 * chạy là chi phí vô ích. `edit` có mặt thì các tay nắm kéo thả hiện ra; vắng
 * mặt thì mỗi ô đổi thành một chỉ báo trạng thái.
 *
 * Kéo thả bằng HTML5 DnD thuần: nó không chạy trên cảm ứng và không dùng được
 * bằng bàn phím, nên MỌI thao tác kéo đều có một nút tương đương (thêm người ký,
 * đưa bước lên/xuống, đổi bước trong hộp thoại cấu hình). Kéo thả là đường
 * nhanh, không phải đường duy nhất.
 */

export type FlowDrag =
  | { kind: "user"; user: DirectoryUser }
  | { kind: "link" }
  | { kind: "slot"; slotId: string }
  | { kind: "step"; stepId: string };

/** Kéo người/ô — thứ rơi vào trong một bước. Kéo bước thì rơi giữa các bước. */
function isSignerDrag(drag?: FlowDrag): boolean {
  return drag?.kind === "user" || drag?.kind === "link" || drag?.kind === "slot";
}

export interface FlowEditHandlers {
  drag?: FlowDrag;
  setDrag: (drag?: FlowDrag) => void;
  /** Bước đang được chọn — đích của nút "+" trên danh bạ bên trái. */
  selectedStepId: string;
  selectStep: (stepId: string) => void;
  issues: DraftIssue[];
  /** Thả thứ đang kéo vào một bước, trước ô thứ `index` (bỏ trống là cuối hàng). */
  dropOnStep: (stepId: string, index?: number) => void;
  dropAsNewStep: () => void;
  addSlot: (stepId: string) => void;
  removeSlot: (slotId: string) => void;
  patchStep: (stepId: string, patch: { name?: string; rule?: StepRule }) => void;
  moveStep: (from: number, to: number) => void;
  /** Dùng cho thả bước: handler chỉ cầm được id của bước đang kéo. */
  moveStepById: (stepId: string, toIndex: number) => void;
  removeStep: (stepId: string) => void;
  addStep: () => void;
}

export function FlowCanvas({
  t,
  steps,
  onOpenSlot,
  edit,
}: {
  t: Dictionary;
  steps: FlowStep[];
  onOpenSlot: (slotId: string) => void;
  edit?: FlowEditHandlers;
}) {
  const c = t.signRequest.flow.canvas;
  const [overStepId, setOverStepId] = useState<string>();
  const [overSlot, setOverSlot] = useState<{ stepId: string; index: number }>();
  const [overNewStep, setOverNewStep] = useState(false);
  const active = activeStepIndex(steps);

  function clearHover() {
    setOverStepId(undefined);
    setOverSlot(undefined);
    setOverNewStep(false);
  }

  return (
    <div className="flex flex-col">
      {steps.map((step, index) => (
        <div key={step.id}>
          {index > 0 ? <StepConnector t={t} /> : null}

          <StepLane
            t={t}
            step={step}
            index={index}
            total={steps.length}
            signaturesBeforeCount={signaturesBefore(steps, index)}
            progressState={edit ? undefined : laneState(steps, index, active)}
            onOpenSlot={onOpenSlot}
            edit={edit}
            hover={{
              overStepId,
              overSlot,
              setOverStepId,
              setOverSlot,
              clearHover,
            }}
            slotStatusOf={(slot) => slotStatus(steps, index, slot)}
          />
        </div>
      ))}

      {edit ? (
        <>
          <StepConnector t={t} muted />

          {/* Vùng thả cuối luồng: kéo một người xuống đây là mở luôn bước mới,
              không phải bấm thêm bước rồi mới kéo. */}
          <div
            onDragOver={(event) => {
              if (!isSignerDrag(edit.drag)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setOverNewStep(true);
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
              setOverNewStep(false);
            }}
            onDrop={(event) => {
              if (!isSignerDrag(edit.drag)) return;
              event.preventDefault();
              edit.dropAsNewStep();
              edit.setDrag(undefined);
              clearHover();
            }}
            className={`flex flex-wrap items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 transition-colors ${
              overNewStep
                ? "border-accent bg-accent-subtle"
                : isSignerDrag(edit.drag)
                  ? "border-accent bg-surface"
                  : "border-border bg-surface"
            }`}
          >
            <button
              type="button"
              onClick={edit.addStep}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-3.5 text-[12.5px] font-semibold text-accent-fg hover:opacity-90"
            >
              <PlusIcon size={15} />
              {c.addStep}
            </button>
            <span className="text-[11.5px] text-fg-muted">{c.newStepDrop}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Một bước ký
 * ------------------------------------------------------------------ */

type LaneState = "done" | "active" | "queued";

function laneState(steps: FlowStep[], index: number, active: number): LaneState {
  if (isStepComplete(steps[index])) return "done";
  return index === active ? "active" : "queued";
}

interface HoverState {
  overStepId?: string;
  overSlot?: { stepId: string; index: number };
  setOverStepId: (id?: string) => void;
  setOverSlot: (value?: { stepId: string; index: number }) => void;
  clearHover: () => void;
}

function StepLane({
  t,
  step,
  index,
  total,
  signaturesBeforeCount,
  progressState,
  onOpenSlot,
  edit,
  hover,
  slotStatusOf,
}: {
  t: Dictionary;
  step: FlowStep;
  index: number;
  total: number;
  signaturesBeforeCount: number;
  progressState?: LaneState;
  onOpenSlot: (slotId: string) => void;
  edit?: FlowEditHandlers;
  hover: HoverState;
  slotStatusOf: (slot: SignatureSlot) => SlotStatus;
}) {
  const c = t.signRequest.flow.canvas;
  const p = t.signRequest.progress;
  const number = index + 1;
  const title = step.name.trim() || c.stepLabel(number);
  const counterSign = index > 0;
  const selected = edit?.selectedStepId === step.id;
  const stepIssues = edit?.issues.filter((issue) => issue.stepIndex === index) ?? [];
  const droppingSigner = isSignerDrag(edit?.drag) && hover.overStepId === step.id;
  const droppingStep = edit?.drag?.kind === "step" && hover.overStepId === step.id;

  return (
    <section
      aria-label={title}
      onClick={edit ? () => edit.selectStep(step.id) : undefined}
      onDragOver={
        edit
          ? (event: DragEvent<HTMLElement>) => {
              if (edit.drag?.kind !== "step" || edit.drag.stepId === step.id) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              hover.setOverStepId(step.id);
            }
          : undefined
      }
      onDragLeave={
        edit
          ? (event: DragEvent<HTMLElement>) => {
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
              hover.setOverStepId(undefined);
            }
          : undefined
      }
      onDrop={
        edit
          ? (event: DragEvent<HTMLElement>) => {
              const drag = edit.drag;
              if (drag?.kind !== "step") return;
              event.preventDefault();
              edit.moveStepById(drag.stepId, index);
              edit.setDrag(undefined);
              hover.clearHover();
            }
          : undefined
      }
      className={`rounded-lg border bg-surface shadow-sm transition-colors ${laneBorder({
        droppingStep,
        selected: Boolean(selected && edit),
        progressState,
        hasIssue: stepIssues.length > 0,
      })}`}
    >
      {/* ---------- Đầu bước ---------- */}
      <header className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-border-muted px-3 py-2.5">
        {edit ? (
          <span
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", title);
              edit.setDrag({ kind: "step", stepId: step.id });
            }}
            onDragEnd={() => {
              edit.setDrag(undefined);
              hover.clearHover();
            }}
            title={c.dragStep(number)}
            aria-hidden="true"
            className="-ml-1 cursor-grab rounded p-1 text-fg-subtle hover:bg-inset hover:text-fg-muted active:cursor-grabbing"
          >
            <GripVerticalIcon size={15} />
          </span>
        ) : null}

        <span
          aria-hidden="true"
          className={`flex size-6.5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold ${badgeStyle(
            progressState,
          )}`}
        >
          {progressState === "done" ? <CheckIcon size={13} /> : number}
        </span>

        {edit ? (
          <input
            value={step.name}
            onChange={(event) => edit.patchStep(step.id, { name: event.target.value })}
            placeholder={c.stepNamePlaceholder(number)}
            aria-label={c.renameLabel(number)}
            className="min-w-32 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[13.5px] font-semibold text-fg placeholder:font-medium placeholder:text-fg-subtle hover:border-border focus:border-accent focus:bg-canvas focus:outline-none"
          />
        ) : (
          <h3 className="flex-1 text-[13.5px] font-semibold text-fg">{title}</h3>
        )}

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            counterSign ? "bg-inset text-fg-muted" : "bg-accent-subtle text-accent"
          }`}
        >
          <PenLineIcon size={12} />
          {counterSign ? c.counterSign : c.coSign}
        </span>

        {progressState ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${lanePill(
              progressState,
            )}`}
          >
            {progressState === "done" ? <CheckIcon size={12} /> : <ClockIcon size={12} />}
            {progressState === "done"
              ? p.stepStatus.done
              : progressState === "active"
                ? p.stepStatus.active
                : p.stepStatus.queued}
          </span>
        ) : null}

        {edit ? (
          <div className="flex items-center gap-1">
            <RuleToggle
              t={t}
              rule={step.rule}
              disabled={step.slots.length < 2}
              onChange={(rule) => edit.patchStep(step.id, { rule })}
            />
            <IconButton
              label={c.moveUp(number)}
              disabled={index === 0}
              onClick={() => edit.moveStep(index, index - 1)}
            >
              <ChevronUpIcon size={15} />
            </IconButton>
            <IconButton
              label={c.moveDown(number)}
              disabled={index === total - 1}
              onClick={() => edit.moveStep(index, index + 1)}
            >
              <ChevronUpIcon size={15} className="rotate-180" />
            </IconButton>
            <IconButton
              label={c.removeStep(number)}
              /* Nút khoá vẫn phải nói LÝ DO nó khoá, không chỉ nói nó làm gì. */
              title={total <= 1 ? c.lastStepLocked : undefined}
              disabled={total <= 1}
              danger
              onClick={() => edit.removeStep(step.id)}
            >
              <TrashIcon size={15} />
            </IconButton>
          </div>
        ) : null}
      </header>

      {/* ---------- Quan hệ với các bước trước ---------- */}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pt-2 text-[11.5px] text-fg-muted">
        <span>
          {/* Bước trên còn trống thì "ký đè lên 0 chữ ký" là một câu vô nghĩa. */}
          {!counterSign
            ? c.coSignHint
            : signaturesBeforeCount === 0
              ? c.counterSignNothing
              : c.counterSignHint(signaturesBeforeCount, index)}
        </span>
        {step.slots.length > 1 ? (
          <span className="font-mono text-[10.5px] text-fg-subtle">
            · {step.rule === "ANY" ? c.ruleAnyHint : c.ruleAllHint}
          </span>
        ) : null}
      </p>

      {/* ---------- Hàng ô chữ ký ---------- */}
      <ul
        onDragOver={
          edit
            ? (event) => {
                if (!isSignerDrag(edit.drag)) return;
                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = "move";
                hover.setOverStepId(step.id);
              }
            : undefined
        }
        onDragLeave={
          edit
            ? (event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                hover.setOverStepId(undefined);
                hover.setOverSlot(undefined);
              }
            : undefined
        }
        onDrop={
          edit
            ? (event) => {
                if (!isSignerDrag(edit.drag)) return;
                event.preventDefault();
                event.stopPropagation();
                edit.dropOnStep(step.id, hover.overSlot?.stepId === step.id ? hover.overSlot.index : undefined);
                edit.setDrag(undefined);
                hover.clearHover();
              }
            : undefined
        }
        className={`m-3 flex flex-wrap items-stretch gap-2.5 rounded-md p-1 transition-colors ${
          droppingSigner ? "bg-accent-subtle outline-2 outline-dashed outline-accent" : ""
        }`}
      >
        {step.slots.map((slot, slotIndex) => (
          <li key={slot.id} className="contents">
            <SlotCard
              t={t}
              slot={slot}
              status={progressState ? slotStatusOf(slot) : undefined}
              issue={edit?.issues.find((item) => item.slotId === slot.id)}
              onOpen={() => onOpenSlot(slot.id)}
              edit={edit}
              insertBefore={
                hover.overSlot?.stepId === step.id && hover.overSlot.index === slotIndex
              }
              onDragOverCard={() => hover.setOverSlot({ stepId: step.id, index: slotIndex })}
            />
          </li>
        ))}

        {step.slots.length === 0 ? (
          <li
            className={`flex min-h-21 flex-1 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-3 text-center ${
              stepIssues.some((issue) => issue.code === "EMPTY_STEP")
                ? "border-warning bg-warning-subtle"
                : "border-border"
            }`}
          >
            <p className="text-[12px] font-semibold text-fg">{c.emptyStep}</p>
            {edit ? <p className="text-[11px] text-fg-muted">{c.emptyStepHint}</p> : null}
          </li>
        ) : null}

        {edit ? (
          <li>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                edit.selectStep(step.id);
                edit.addSlot(step.id);
              }}
              className="flex h-full min-h-21 w-33 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-surface-2 px-3 text-fg-muted transition-colors hover:border-accent hover:bg-accent-subtle hover:text-accent"
            >
              <UserPlusIcon size={17} />
              <span className="text-[11.5px] font-semibold">{c.addSigner}</span>
            </button>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Ô chữ ký
 * ------------------------------------------------------------------ */

function SlotCard({
  t,
  slot,
  status,
  issue,
  onOpen,
  edit,
  insertBefore,
  onDragOverCard,
}: {
  t: Dictionary;
  slot: SignatureSlot;
  status?: SlotStatus;
  issue?: DraftIssue;
  onOpen: () => void;
  edit?: FlowEditHandlers;
  insertBefore: boolean;
  onDragOverCard: () => void;
}) {
  const s = t.signRequest.flow.slot;
  const signer = slot.signer;
  /* Người ký qua link có thể chưa kịp điền tên — email đã đủ để nhận ra họ. */
  const identity = signer ? signer.name.trim() || signer.email.trim() : "";
  const name = identity || s.unassigned;
  const link = signer?.kind === "link";

  return (
    <div className="flex items-stretch">
      {/* Vạch chèn: nói rõ ô sẽ rơi vào TRƯỚC ô này, không phải "đâu đó trong bước". */}
      <span
        aria-hidden="true"
        className={`mr-1 w-0.5 shrink-0 rounded-full transition-colors ${
          insertBefore ? "bg-accent" : "bg-transparent"
        }`}
      />

      <div
        draggable={Boolean(edit && signer)}
        onDragStart={
          edit
            ? (event) => {
                event.stopPropagation();
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", name);
                edit.setDrag({ kind: "slot", slotId: slot.id });
              }
            : undefined
        }
        onDragEnd={edit ? () => edit.setDrag(undefined) : undefined}
        onDragOver={
          edit
            ? () => {
                const current = edit.drag;
                if (!isSignerDrag(current)) return;
                // Kéo chính nó thì không có vạch chèn nào cả.
                if (current?.kind === "slot" && current.slotId === slot.id) return;
                onDragOverCard();
              }
            : undefined
        }
        className={`group relative w-52 rounded-md border text-left transition-colors ${slotSurface(
          { status, issue: Boolean(issue), assigned: Boolean(signer) },
        )}`}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          aria-label={identity ? s.configure(identity) : s.unassigned}
          className="flex w-full flex-col gap-2 px-2.5 py-2.5 text-left"
        >
          <span className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className={`flex size-7.5 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold ${
                signer ? avatarTone(signer.email || signer.name) : "bg-inset text-fg-subtle"
              }`}
            >
              {signer ? initialsOf(signer.name) : "?"}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-[12.5px] font-semibold ${
                  signer ? "text-fg" : "text-fg-muted"
                }`}
              >
                {name}
              </span>
              <span className="block truncate font-mono text-[10.5px] text-fg-subtle">
                {signer?.email || (edit ? s.unassignedHint : "—")}
              </span>
            </span>

            {edit && signer ? (
              <span
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", name);
                  edit.setDrag({ kind: "slot", slotId: slot.id });
                }}
                onDragEnd={() => edit.setDrag(undefined)}
                title={s.drag(name)}
                aria-hidden="true"
                className="cursor-grab rounded p-0.5 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
              >
                <GripVerticalIcon size={13} />
              </span>
            ) : null}
          </span>

          {/* Dòng cấu hình — thứ phân biệt hai ô của cùng một người. */}
          <span className="flex flex-wrap items-center gap-1">
            <Chip>{t.signRequest.config.baseline[slot.config.baselineLevel].label.split(" ")[0]}</Chip>
            <Chip>{slot.config.method === "ESIGN_OTP" ? "eSign" : slot.config.method === "MPKI_APP" ? "MPKI" : slot.config.method === "USB_TOKEN" ? "USB" : "P12"}</Chip>
            {slot.config.visible ? (
              <Chip>{s.pageLabel(slot.config.position.page)}</Chip>
            ) : (
              <Chip>{s.invisible}</Chip>
            )}
            {link ? (
              <span className="inline-flex items-center gap-1 rounded-sm bg-accent-subtle px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent">
                <LinkIcon size={10} />
                {s.linkBadge}
              </span>
            ) : null}
          </span>

          {status ? <SlotStatusLine t={t} slot={slot} status={status} /> : null}
          {issue ? (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-warning">
              <AlertTriangleIcon size={11} />
              {s.incomplete}
            </span>
          ) : null}
        </button>

        {edit ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              edit.removeSlot(slot.id);
            }}
            aria-label={identity ? s.remove(identity) : s.removeEmpty}
            className="absolute right-1 top-1 flex size-5.5 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-danger-subtle hover:text-danger"
          >
            <XIcon size={13} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SlotStatusLine({
  t,
  slot,
  status,
}: {
  t: Dictionary;
  slot: SignatureSlot;
  status: SlotStatus;
}) {
  const p = t.signRequest.progress;
  const time = slot.signedAt
    ? new Date(slot.signedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : undefined;

  const tone =
    status === "signed"
      ? "text-success"
      : status === "declined"
        ? "text-danger"
        : status === "pending"
          ? "text-warning"
          : "text-fg-subtle";

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${tone}`}>
      {status === "signed" ? (
        <CheckIcon size={12} />
      ) : status === "declined" ? (
        <XIcon size={12} />
      ) : (
        <ClockIcon size={12} />
      )}
      {status === "signed" && time ? p.signedAt(time) : p.slotStatus[status]}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Mảnh nhỏ
 * ------------------------------------------------------------------ */

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm bg-inset px-1.5 py-0.5 font-mono text-[10px] font-semibold text-fg-muted">
      {children}
    </span>
  );
}

function StepConnector({ t, muted = false }: { t: Dictionary; muted?: boolean }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-2 py-1.5 pl-6">
      <span className={`h-6 w-0.5 rounded-full ${muted ? "bg-border-muted" : "bg-border"}`} />
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-subtle">
        {t.signRequest.flow.canvas.thenLabel}
      </span>
    </div>
  );
}

function RuleToggle({
  t,
  rule,
  disabled,
  onChange,
}: {
  t: Dictionary;
  rule: StepRule;
  disabled: boolean;
  onChange: (rule: StepRule) => void;
}) {
  const c = t.signRequest.flow.canvas;
  if (disabled) return null;

  return (
    <div
      role="group"
      aria-label={c.ruleLabel}
      className="mr-1 inline-flex gap-0.5 rounded-md bg-inset p-[2px]"
    >
      {(["ALL", "ANY"] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={rule === value}
          title={value === "ALL" ? c.ruleAllHint : c.ruleAnyHint}
          onClick={(event) => {
            event.stopPropagation();
            onChange(value);
          }}
          className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
            rule === value ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
          }`}
        >
          {value === "ALL" ? c.ruleAll : c.ruleAny}
        </button>
      ))}
    </div>
  );
}

function IconButton({
  label,
  title,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  /** Chú thích khác nhãn — dùng khi cần nói thêm lý do nút đang khoá. */
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      className={`flex size-7 items-center justify-center rounded-md border border-border bg-surface text-fg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "hover:bg-danger-subtle hover:text-danger" : "hover:bg-inset hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Bảng màu theo trạng thái
 * ------------------------------------------------------------------ */

function laneBorder({
  droppingStep,
  selected,
  progressState,
  hasIssue,
}: {
  droppingStep: boolean;
  selected: boolean;
  progressState?: LaneState;
  hasIssue: boolean;
}): string {
  if (droppingStep) return "border-accent ring-2 ring-accent-subtle";
  if (progressState === "active") return "border-accent ring-2 ring-accent-subtle";
  if (progressState === "queued") return "border-border-muted opacity-80";
  if (hasIssue) return "border-warning";
  if (selected) return "border-accent";
  return "border-border";
}

function badgeStyle(state?: LaneState): string {
  if (state === "done") return "border-success bg-success-subtle text-success";
  if (state === "active") return "border-accent bg-accent text-accent-fg";
  if (state === "queued") return "border-border-muted bg-inset text-fg-subtle";
  return "border-accent bg-accent-subtle text-accent";
}

function lanePill(state: LaneState): string {
  if (state === "done") return "bg-success-subtle text-success";
  if (state === "active") return "bg-warning-subtle text-warning";
  return "bg-inset text-fg-subtle";
}

function slotSurface({
  status,
  issue,
  assigned,
}: {
  status?: SlotStatus;
  issue: boolean;
  assigned: boolean;
}): string {
  if (status === "signed") return "border-success bg-success-subtle";
  if (status === "declined") return "border-danger bg-danger-subtle";
  if (status === "pending") return "border-warning bg-surface";
  if (status === "queued") return "border-border-muted bg-surface-2";
  if (issue) return "border-warning bg-warning-subtle";
  if (!assigned) return "border-dashed border-border bg-surface-2 hover:border-accent";
  return "border-border bg-surface hover:border-accent hover:bg-accent-subtle";
}
