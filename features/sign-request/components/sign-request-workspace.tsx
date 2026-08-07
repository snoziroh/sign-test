"use client";

import { useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useToast } from "@/components/ui/toast";
import { StepProgress } from "@/components/ui/step-progress";
import { ArrowLeftIcon, ArrowRightIcon, SendIcon, SpinnerIcon } from "@/components/ui/icons";
import { detectDocumentFormat } from "@/features/signing/document-format";
import { FlowCanvas, type FlowDrag, type FlowEditHandlers } from "./flow-canvas";
import { SignerPalette } from "./signer-palette";
import { SlotConfigDialog } from "./slot-config-dialog";
import { RequestDocumentStep } from "./request-document-step";
import { RequestReviewStep } from "./request-review-step";
import { RequestProgressView } from "./request-progress-view";
import {
  addStep as addStepTo,
  createDraft,
  createSlot,
  createStep,
  findSlot,
  insertSlot,
  makeRequestCode,
  moveSlot,
  moveStep as moveStepIn,
  removeSlot as removeSlotFrom,
  removeStep as removeStepFrom,
  resetProgress,
  simulateNextSignature,
  totalSlots,
  updateSlot,
  updateStep,
  validateDraft,
  type DirectoryUser,
  type FlowStep,
  type SignatureSlot,
  type SignRequestDraft,
  type SignRequestRecord,
  type SlotSigner,
} from "../model";

/**
 * Toàn bộ màn tạo yêu cầu ký: ba bước soạn, rồi màn theo dõi tiến trình.
 *
 * Một component giữ state chứ không phải ba màn rời nhau, vì cả ba bước nói về
 * CÙNG một bản nháp và người dùng nhảy qua lại giữa chúng liên tục — sửa luồng
 * xong quay lại đổi tệp là chuyện thường. Bản nháp chỉ mất khi họ tạo yêu cầu
 * xong và bấm tạo cái mới.
 *
 * Không có route API nào phía sau: đây là bản dựng giao diện. "Tạo yêu cầu"
 * đóng băng bản nháp thành một `SignRequestRecord` trong bộ nhớ và chuyển sang
 * màn tiến trình.
 */

type WizardStep = "document" | "flow" | "review";
const WIZARD_ORDER: WizardStep[] = ["document", "flow", "review"];

export function SignRequestWorkspace() {
  const { t } = useLocale();
  const { toast } = useToast();
  const s = t.signRequest.steps;

  const [wizardStep, setWizardStep] = useState<WizardStep>("document");
  const [document, setDocument] = useState<File>();
  const [draft, setDraft] = useState<SignRequestDraft>(() => createDraft());
  const [record, setRecord] = useState<SignRequestRecord>();
  const [drag, setDragState] = useState<FlowDrag>();
  const dragRef = useRef<FlowDrag | undefined>(undefined);
  const [selectedStepId, setSelectedStepId] = useState(() => draft.steps[0].id);
  const [openSlotId, setOpenSlotId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  function setDrag(next?: FlowDrag) {
    /*
    * Ref được cập nhật đồng bộ ngay lập tức để native DnD
    * luôn đọc được payload hiện tại.
    *
    * State vẫn được giữ để FlowCanvas render trạng thái hover.
    */
    dragRef.current = next;
    setDragState(next);
  }

  const documentFormat = useMemo(
    () => (document ? detectDocumentFormat(document) : undefined),
    [document],
  );
  const issues = useMemo(() => validateDraft(draft, document), [draft, document]);
  const flowIssues = useMemo(
    () => issues.filter((issue) => issue.stepIndex !== undefined),
    [issues],
  );

  /** Sau khi phát yêu cầu thì cây bước sống trong `record`, không còn ở bản nháp. */
  const steps = record?.steps ?? draft.steps;
  const openSlot = openSlotId ? findSlot(steps, openSlotId) : undefined;

  function patchSteps(next: FlowStep[]) {
    setDraft((current) => ({ ...current, steps: next }));
    if (!next.some((step) => step.id === selectedStepId)) {
      setSelectedStepId(next[next.length - 1]?.id ?? "");
    }
  }

  /* -------------------- Kéo thả -------------------- */

  /** Dựng ô mới từ thứ đang được kéo; `undefined` nghĩa là đang kéo một ô có sẵn. */
  function slotFromDrag(current: FlowDrag): SignatureSlot | undefined {
    if (current.kind === "user") return createSlot(totalSlots(draft.steps), signerOf(current.user));
    if (current.kind === "link") {
      return createSlot(totalSlots(draft.steps), { kind: "link", name: "", email: "" });
    }
    return undefined;
  }

  function dropOnStep(stepId: string, index?: number) {
    const currentDrag = dragRef.current;

    if (!currentDrag) return;

    setSelectedStepId(stepId);

    /*
    * Slot đã tồn tại trong flow:
    * chỉ di chuyển sang Step/vị trí mới.
    */
    if (currentDrag.kind === "slot") {
      patchSteps(
        moveSlot(
          draft.steps,
          currentDrag.slotId,
          stepId,
          index
        )
      );

      return;
    }

    /*
    * User/link từ palette:
    * tạo SignatureSlot mới rồi insert vào Step.
    */
    const slot = slotFromDrag(currentDrag);

    if (!slot) return;

    patchSteps(
      insertSlot(
        draft.steps,
        stepId,
        slot,
        index
      )
    );

    /*
    * Với link signer chưa có thông tin,
    * mở luôn dialog cấu hình.
    */
    if (currentDrag.kind === "link") {
      setOpenSlotId(slot.id);
    }
  }

  function dropAsNewStep() {
    const currentDrag = dragRef.current;

    if (!currentDrag) return;

    /*
    * Slot đang tồn tại:
    * lấy nó khỏi Step hiện tại rồi tạo Step mới.
    */
    if (currentDrag.kind === "slot") {
      const found = findSlot(draft.steps, currentDrag.slotId);

      if (!found) return;

      const stripped = removeSlotFrom(
        draft.steps,
        currentDrag.slotId
      );

      const next = [
        ...stripped,
        createStep([found.slot])
      ];

      patchSteps(next);
      setSelectedStepId(next[next.length - 1].id);

      return;
    }

    /*
    * User/link từ palette:
    * tạo slot mới rồi tạo Step mới chứa slot đó.
    */
    const slot = slotFromDrag(currentDrag);

    if (!slot) return;

    const next = [
      ...draft.steps,
      createStep([slot])
    ];

    patchSteps(next);
    setSelectedStepId(next[next.length - 1].id);

    if (currentDrag.kind === "link") {
      setOpenSlotId(slot.id);
    }
  }

  /* -------------------- Thao tác bằng nút -------------------- */

  function addSignerToSelected(signer?: SlotSigner) {
    const stepId = draft.steps.some((step) => step.id === selectedStepId)
      ? selectedStepId
      : draft.steps[draft.steps.length - 1].id;
    const slot = createSlot(totalSlots(draft.steps), signer);
    patchSteps(insertSlot(draft.steps, stepId, slot));
    if (!signer || signer.kind === "link") setOpenSlotId(slot.id);
  }

  const edit: FlowEditHandlers = {
    drag,
    setDrag,
    selectedStepId,
    selectStep: setSelectedStepId,
    issues: flowIssues,
    dropOnStep,
    dropAsNewStep,
    addSlot: (stepId) => {
      const slot = createSlot(totalSlots(draft.steps));
      patchSteps(insertSlot(draft.steps, stepId, slot));
      setOpenSlotId(slot.id);
    },
    removeSlot: (slotId) => patchSteps(removeSlotFrom(draft.steps, slotId)),
    patchStep: (stepId, patch) => patchSteps(updateStep(draft.steps, stepId, patch)),
    moveStep: (from, to) => patchSteps(moveStepIn(draft.steps, from, to)),
    moveStepById: (stepId, toIndex) =>
      patchSteps(moveStepIn(draft.steps, draft.steps.findIndex((step) => step.id === stepId), toIndex)),
    removeStep: (stepId) => patchSteps(removeStepFrom(draft.steps, stepId)),
    addStep: () => {
      const next = addStepTo(draft.steps);
      patchSteps(next);
      setSelectedStepId(next[next.length - 1].id);
    },
  };

  /* -------------------- Điều hướng wizard -------------------- */

  const documentReady = Boolean(document);
  const flowReady = documentReady && flowIssues.length === 0;
  const reviewReady = issues.length === 0;

  const wizard = [
    { id: "document", label: s.document.label, complete: documentReady, reachable: true },
    { id: "flow", label: s.flow.label, complete: flowReady, reachable: documentReady },
    { id: "review", label: s.review.label, complete: reviewReady, reachable: flowReady },
  ];
  const activeIndex = WIZARD_ORDER.indexOf(wizardStep);
  const canContinue = wizardStep === "document" ? documentReady : flowReady;

  function submit() {
    setSubmitting(true);
    // Bản dựng giao diện: không có lệnh gọi nào cả. Độ trễ ngắn để nút kịp hiện
    // trạng thái đang chạy — người dùng thật sẽ chờ một vòng mạng ở đây.
    window.setTimeout(() => {
      setRecord({
        ...draft,
        code: makeRequestCode(),
        createdAt: new Date().toISOString(),
        documentName: document?.name ?? "",
        documentSize: document?.size ?? 0,
        documentFormat,
      });
      setSubmitting(false);
      toast.success(t.signRequest.review.submit, draft.name);
    }, 500);
  }

  function startOver() {
    const fresh = createDraft();
    setRecord(undefined);
    setDraft(fresh);
    setDocument(undefined);
    setSelectedStepId(fresh.steps[0].id);
    setWizardStep("document");
  }

  /* -------------------- Màn tiến trình -------------------- */

  if (record) {
    return (
      <>
        <RequestProgressView
          t={t}
          record={record}
          document={document}
          onOpenSlot={setOpenSlotId}
          onSimulateSignature={() =>
            setRecord((current) =>
              current ? { ...current, steps: simulateNextSignature(current.steps) } : current,
            )
          }
          onResetProgress={() =>
            setRecord((current) =>
              current ? { ...current, steps: resetProgress(current.steps) } : current,
            )
          }
          onCancel={() =>
            setRecord((current) =>
              current ? { ...current, cancelledAt: new Date().toISOString() } : current,
            )
          }
          onNewRequest={startOver}
        />

        {openSlot ? (
          <SlotConfigDialog
            key={openSlot.slot.id}
            t={t}
            open
            readOnly
            onClose={() => setOpenSlotId(undefined)}
            slot={openSlot.slot}
            stepIndex={openSlot.stepIndex}
            steps={record.steps}
            document={document}
            documentFormat={documentFormat}
            onPatch={() => undefined}
            onMoveToStep={() => undefined}
            onRemove={() => undefined}
          />
        ) : null}
      </>
    );
  }

  /* -------------------- Ba bước soạn -------------------- */

  const selectedStepNumber =
    draft.steps.findIndex((step) => step.id === selectedStepId) + 1 || draft.steps.length;

  return (
    <div className="flex flex-col gap-4">
      <StepProgress
        steps={wizard}
        activeIndex={activeIndex}
        onSelect={(id) => setWizardStep(id as WizardStep)}
        navLabel={s.navLabel}
        stepOfLabel={s.stepOf}
        lockedHint={s.lockedHint}
      />

      <p className="text-[12.5px] text-fg-muted">{s[wizardStep].description}</p>

      {wizardStep === "document" ? (
        <RequestDocumentStep
          t={t}
          file={document}
          format={documentFormat}
          onSelect={(file) => setDocument(file)}
          onRemove={() => setDocument(undefined)}
        />
      ) : null}

      {wizardStep === "flow" ? (
        <div className="grid items-start gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <SignerPalette
            t={t}
            selectedStepNumber={selectedStepNumber}
            onDrag={setDrag}
            onAddUser={(user: DirectoryUser) => addSignerToSelected(signerOf(user))}
            onAddLink={() => addSignerToSelected({ kind: "link", name: "", email: "" })}
          />
          <FlowCanvas t={t} steps={draft.steps} onOpenSlot={setOpenSlotId} edit={edit} />
        </div>
      ) : null}

      {wizardStep === "review" ? (
        <RequestReviewStep
          t={t}
          draft={draft}
          document={document}
          documentFormat={documentFormat}
          issues={issues}
          onPatch={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          onGoToStep={(stepIndex) => {
            setWizardStep("flow");
            setSelectedStepId(draft.steps[stepIndex]?.id ?? selectedStepId);
          }}
        />
      ) : null}

      {/* -------------------- Thanh điều hướng -------------------- */}
      <nav className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
        {(activeIndex !== 0) ? (
          <button
            type="button"
            onClick={() => setWizardStep(WIZARD_ORDER[activeIndex - 1])}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 text-[12.5px] font-semibold text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeftIcon size={14} />
            {s.back}
          </button>                                       
        ): (<div></div>)}

        {wizardStep === "review" ? (
          <button
            type="button"
            disabled={!reviewReady || submitting}
            onClick={submit}
            className="inline-flex h-8.5 items-center gap-2 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <SpinnerIcon size={14} className="animate-spin" />
            ) : (
              <SendIcon size={14} />
            )}
            {submitting ? t.signRequest.review.submitting : t.signRequest.review.submit}
          </button>
        ) : (
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => setWizardStep(WIZARD_ORDER[activeIndex + 1])}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {s.next}
            <ArrowRightIcon size={14} />
          </button>
        )}
      </nav>

      {openSlot ? (
        <SlotConfigDialog
          key={openSlot.slot.id}
          t={t}
          open
          onClose={() => setOpenSlotId(undefined)}
          slot={openSlot.slot}
          stepIndex={openSlot.stepIndex}
          steps={draft.steps}
          document={document}
          documentFormat={documentFormat}
          onPatch={(patch) => patchSteps(updateSlot(draft.steps, openSlot.slot.id, patch))}
          onMoveToStep={(stepId) => patchSteps(moveSlot(draft.steps, openSlot.slot.id, stepId))}
          onRemove={() => patchSteps(removeSlotFrom(draft.steps, openSlot.slot.id))}
        />
      ) : null}
    </div>
  );
}

function signerOf(user: DirectoryUser): SlotSigner {
  return {
    kind: "system",
    userId: user.id,
    name: user.name,
    email: user.email,
    department: user.department,
  };
}
