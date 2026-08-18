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
  LockIcon,
  PlusIcon,
  TrashIcon,
  UserPlusIcon,
  UsersIcon,
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

/**
 * User/link được kéo từ palette sang canvas => copy.
 * Slot đã nằm trong canvas và đang đổi vị trí => move.
 */
function signerDropEffect(drag?: FlowDrag): "copy" | "move" {
  return drag?.kind === "slot" ? "move" : "copy";
}

export interface FlowEditHandlers {
  drag?: FlowDrag;
  setDrag: (drag?: FlowDrag) => void;
  /**
   * Luồng đến từ một MẪU ĐÃ PUBLISH: gán được người, nhưng không thêm/bớt/đổi
   * chỗ được ô nào.
   *
   * Không phải để giao diện gọn hơn — đó là ràng buộc của backend.
   * `POST /api/signing-requests` với nguồn mẫu chép số ô, thứ tự bước và toạ độ
   * từng khung chữ ký từ bản đã publish, và từ chối thẳng nếu client gửi kèm
   * `signingOrder` hay `signatureSlots`. Cho kéo thả rồi vứt kết quả đi ở bước
   * cuối là kiểu giao diện tệ nhất: người dùng bỏ công sắp xếp một thứ không có
   * tác dụng gì.
   */
  lockStructure?: boolean;
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
  /**
   * `edit` trả lời "màn này sửa được không", `shape` trả lời "sửa được CẤU TRÚC
   * không". Luồng từ mẫu có `edit` mà không có `shape`: gán người thì được, đổi
   * số ô thì không.
   */
  const shape = edit && !edit.lockStructure ? edit : undefined;

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
            shape={shape}
            hover={{
              overStepId,
              overSlot,
              setOverStepId,
              setOverSlot,
              clearHover,
            }}
            slotStatusOf={(slot) => slotStatus(steps, index, slot)}
          />

          {/* Cảnh báo cấp bước sống NGOÀI ô bước: nó nói về cả cái bước, không
              phải về một ô ký nào trong đó, và ở ngoài thì nó không đẩy các ô ký
              xuống mỗi lần người dùng thêm một bước mới. */}
          <StepIssueNote t={t} issues={edit?.issues} stepIndex={index} />
        </div>
      ))}

      {shape ? (
        <>
          <StepConnector t={t} muted />

          {/* Vùng thả cuối luồng: kéo một người xuống đây là mở luôn bước mới,
              không phải bấm thêm bước rồi mới kéo. */}
          <div
            onDragOver={(event) => {
              if (!isSignerDrag(shape.drag)) return;

              event.preventDefault();
              event.dataTransfer.dropEffect = signerDropEffect(shape.drag);

              setOverNewStep(true);
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
              setOverNewStep(false);
            }}
            onDrop={(event) => {
              if (!isSignerDrag(shape.drag)) return;
              event.preventDefault();
              shape.dropAsNewStep();
              shape.setDrag(undefined);
              clearHover();
            }}
            className={`flex flex-wrap items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 transition-colors ${
              overNewStep
                ? "border-accent bg-accent-subtle"
                : isSignerDrag(shape.drag)
                  ? "border-accent bg-surface"
                  : "border-border bg-surface"
            }`}
          >
            <button
              type="button"
              onClick={shape.addStep}
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

/**
 * Cảnh báo "bước này chưa có ai ký", đặt NGOÀI ô bước.
 *
 * Lỗi cấp bước là lỗi không có `slotId` — lỗi của một ô thì chính ô đó đã tự nói
 * ra rồi, nhắc lại ở đây là báo hai lần cùng một chuyện.
 */
function StepIssueNote({
  t,
  issues,
  stepIndex,
}: {
  t: Dictionary;
  issues?: DraftIssue[];
  stepIndex: number;
}) {
  const c = t.signRequest.flow.canvas;
  const empty = issues?.some(
    (issue) => issue.stepIndex === stepIndex && !issue.slotId && issue.code === "EMPTY_STEP",
  );

  if (!empty) return null;

  return (
    <div
      role="alert"
      className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-warning bg-warning-subtle px-3 py-1.5"
    >
      <AlertTriangleIcon size={13} className="shrink-0 text-warning" />
      <p className="text-[11.5px] font-semibold text-fg">
        {t.signRequest.review.issue.EMPTY_STEP(stepIndex + 1)}
      </p>
      <span className="text-[11.5px] text-fg-muted">{c.emptyStepHint}</span>
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
  progressState,
  onOpenSlot,
  edit,
  shape,
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
  /** `edit` khi cấu trúc luồng sửa được; `undefined` với luồng đến từ mẫu. */
  shape?: FlowEditHandlers;
  hover: HoverState;
  slotStatusOf: (slot: SignatureSlot) => SlotStatus;
}) {
  const c = t.signRequest.flow.canvas;
  const p = t.signRequest.progress;
  const number = index + 1;
  const title = step.name.trim() || c.stepLabel(number);
  const selected = edit?.selectedStepId === step.id;
  const stepIssues = edit?.issues.filter((issue) => issue.stepIndex === index) ?? [];
  const droppingSigner = isSignerDrag(shape?.drag) && hover.overStepId === step.id;
  const droppingStep = shape?.drag?.kind === "step" && hover.overStepId === step.id;

  return (
    <section
      aria-label={title}
      onClick={edit ? () => edit.selectStep(step.id) : undefined}
      onDragOver={
        shape
          ? (event: DragEvent<HTMLElement>) => {
              const drag = shape.drag;

              if (!drag) return;

              /*
              * Kéo cả Step để đổi thứ tự.
              */
              if (drag.kind === "step") {
                if (drag.stepId === step.id) return;

                event.preventDefault();
                event.dataTransfer.dropEffect = "move";

                hover.setOverStepId(step.id);
                return;
              }

              /*
              * Kéo signer/link/slot vào Step.
              *
              * User và link đến từ palette => copy.
              * Slot đã tồn tại => move.
              */
              if (isSignerDrag(drag)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = signerDropEffect(drag);

                hover.setOverStepId(step.id);
              }
            }
          : undefined
      }
      onDragLeave={
        shape
          ? (event: DragEvent<HTMLElement>) => {
              /*
              * Nếu chỉ đang di chuyển giữa các element con
              * của cùng Step thì không xóa hover.
              */
              if (
                event.currentTarget.contains(
                  event.relatedTarget as Node | null
                )
              ) {
                return;
              }

              hover.setOverStepId(undefined);
              hover.setOverSlot(undefined);
            }
          : undefined
      }
      onDrop={
        shape
          ? (event: DragEvent<HTMLElement>) => {
              const drag = shape.drag;

              if (!drag) return;

              /*
              * Đổi vị trí cả Step.
              */
              if (drag.kind === "step") {
                if (drag.stepId === step.id) return;

                event.preventDefault();

                shape.moveStepById(drag.stepId, index);
                shape.setDrag(undefined);
                hover.clearHover();

                return;
              }

              /*
              * Thả signer vào Step.
              *
              * Nếu drop xảy ra trên <ul> bên dưới thì <ul>
              * đã stopPropagation(), nên đoạn này chỉ xử lý
              * những vùng khác như header/body của Step.
              */
              if (isSignerDrag(drag)) {
                event.preventDefault();

                shape.dropOnStep(step.id);

                shape.setDrag(undefined);
                hover.clearHover();
              }
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
        {shape ? (
          <span
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", title);
              shape.setDrag({ kind: "step", stepId: step.id });
            }}
            onDragEnd={() => {
              shape.setDrag(undefined);
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

        {shape ? (
          <input
            value={step.name}
            onChange={(event) => shape.patchStep(step.id, { name: event.target.value })}
            placeholder={c.stepNamePlaceholder(number)}
            aria-label={c.renameLabel(number)}
            className="min-w-32 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[13.5px] font-semibold text-fg placeholder:font-medium placeholder:text-fg-subtle hover:border-border focus:border-accent focus:bg-canvas focus:outline-none"
          />
        ) : (
          <h3 className="flex-1 text-[13.5px] font-semibold text-fg">{title}</h3>
        )}

        {/* <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            counterSign ? "bg-inset text-fg-muted" : "bg-accent-subtle text-accent"
          }`}
        >
          <PenLineIcon size={12} />
          {counterSign ? c.counterSign : c.coSign}
        </span> */}

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

        {shape ? (
          <div className="flex items-center gap-1">
            <RuleToggle
              t={t}
              rule={step.rule}
              disabled={step.slots.length < 2}
              onChange={(rule) => shape.patchStep(step.id, { rule })}
            />
            <IconButton
              label={c.moveUp(number)}
              disabled={index === 0}
              onClick={() => shape.moveStep(index, index - 1)}
            >
              <ChevronUpIcon size={15} />
            </IconButton>
            <IconButton
              label={c.moveDown(number)}
              disabled={index === total - 1}
              onClick={() => shape.moveStep(index, index + 1)}
            >
              <ChevronUpIcon size={15} className="rotate-180" />
            </IconButton>
            <IconButton
              label={c.removeStep(number)}
              /* Nút khoá vẫn phải nói LÝ DO nó khoá, không chỉ nói nó làm gì. */
              title={total <= 1 ? c.lastStepLocked : undefined}
              disabled={total <= 1}
              danger
              onClick={() => shape.removeStep(step.id)}
            >
              <TrashIcon size={15} />
            </IconButton>
          </div>
        ) : null}

        {/* Luồng khoá cấu trúc: nói RÕ vì sao không có nút nào, thay vì để một
            hàng công cụ biến mất không lời giải thích. */}
        {edit && !shape ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-inset px-2.5 py-0.5 text-[11px] font-semibold text-fg-muted">
            <LockIcon size={12} />
            {c.fromTemplate}
          </span>
        ) : null}
      </header>

      {/* ---------- Quan hệ với các bước trước ---------- */}
      {/*
        Nhiều ô trong một bước = cùng `signingOrder` = KÝ SONG SONG: cả nhóm mở
        lượt một lúc và bước sau chờ đủ. Nói thẳng ra ở đây, vì nhìn một hàng ô
        cạnh nhau người soạn dễ đọc thành "ký lần lượt từ trái sang phải".
      */}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pt-2 text-[11.5px] text-fg-muted">
        {step.slots.length > 1 ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-[10.5px] font-semibold text-accent">
              <UsersIcon size={11} />
              {c.parallelStep(step.slots.length)}
            </span>
            <span className="font-mono text-[10.5px] text-fg-subtle">
              · {step.rule === "ANY" ? c.ruleAnyHint : c.ruleAllHint}
            </span>
          </>
        ) : null}
      </p>

      {/* ---------- Hàng ô chữ ký ---------- */}
      <ul
        onDragOver={
          shape
            ? (event) => {
                if (!isSignerDrag(shape.drag)) return;
                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = signerDropEffect(shape.drag);
                hover.setOverStepId(step.id);
              }
            : undefined
        }
        onDragLeave={
          shape
            ? (event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                hover.setOverStepId(undefined);
                hover.setOverSlot(undefined);
              }
            : undefined
        }
        onDrop={
          shape
            ? (event) => {
                if (!isSignerDrag(shape.drag)) return;
                event.preventDefault();
                event.stopPropagation();
                shape.dropOnStep(step.id, hover.overSlot?.stepId === step.id ? hover.overSlot.index : undefined);
                shape.setDrag(undefined);
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
              shape={shape}
              insertBefore={
                hover.overSlot?.stepId === step.id && hover.overSlot.index === slotIndex
              }
              onDragOverCard={() => hover.setOverSlot({ stepId: step.id, index: slotIndex })}
            />
          </li>
        ))}

        {/* Lúc soạn, bước rỗng được cảnh báo BÊN NGOÀI ô bước (xem `StepIssueNote`):
            một ô báo lỗi nằm đúng chỗ ô chữ ký sắp xuất hiện thì vừa chiếm chỗ
            vừa trông như một ô ký hỏng. Màn theo dõi không sửa được gì nên vẫn
            cần một dòng nói ra bước này rỗng. */}
        {!edit && step.slots.length === 0 ? (
          <li className="flex min-h-21 flex-1 items-center justify-center rounded-md border-2 border-dashed border-border px-4 py-3 text-center">
            <p className="text-[12px] font-semibold text-fg-muted">{c.emptyStep}</p>
          </li>
        ) : null}

        {shape ? (
          <li>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                shape.selectStep(step.id);
                shape.addSlot(step.id);
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
  shape,
  insertBefore,
  onDragOverCard,
}: {
  t: Dictionary;
  slot: SignatureSlot;
  status?: SlotStatus;
  issue?: DraftIssue;
  onOpen: () => void;
  edit?: FlowEditHandlers;
  /** `edit` khi ô này thêm/bớt/kéo được; `undefined` với ô đến từ mẫu. */
  shape?: FlowEditHandlers;
  insertBefore: boolean;
  onDragOverCard: () => void;
}) {
  const s = t.signRequest.flow.slot;
  const signer = slot.signer;
  /* Người ký qua link có thể chưa kịp điền tên — email đã đủ để nhận ra họ. */
  const identity = signer ? signer.name.trim() || signer.email.trim() : "";
  /*
   * Ô trống của một mẫu đã biết mình là chỗ ký của AI — "Kế toán trưởng" nói
   * nhiều hơn "Chọn người ký" rất nhiều khi luồng có sáu ô.
   */
  const name = identity || slot.roleName || s.unassigned;
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
        draggable={Boolean(shape && signer)}
        onDragStart={
          shape
            ? (event) => {
                event.stopPropagation();
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", name);
                shape.setDrag({ kind: "slot", slotId: slot.id });
              }
            : undefined
        }
        onDragEnd={shape ? () => shape.setDrag(undefined) : undefined}
        onDragOver={
          shape
            ? () => {
                const current = shape.drag;
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
                {signer?.email ||
                  (slot.roleName ? s.roleHint : edit ? s.unassignedHint : "—")}
              </span>
            </span>

            {shape && signer ? (
              <span
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", name);
                  shape.setDrag({ kind: "slot", slotId: slot.id });
                }}
                onDragEnd={() => shape.setDrag(undefined)}
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
            {/* Vai của mẫu ký nhiều chỗ trên tài liệu — sơ đồ vẫn vẽ một ô, nên
                con số này là thứ duy nhất nói ra chuyện đó. */}
            {slot.slotCount && slot.slotCount > 1 ? (
              <Chip>{s.slotCount(slot.slotCount)}</Chip>
            ) : null}
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

        {shape ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              shape.removeSlot(slot.id);
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
      <span className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
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
      className="mr-1 inline-flex gap-0.5 rounded-md bg-inset p-0.5"
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
