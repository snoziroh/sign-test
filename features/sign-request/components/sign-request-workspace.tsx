"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useToast } from "@/components/ui/toast";
import { StepProgress } from "@/components/ui/step-progress";
import type {
  CreateSigningRequestBody,
  SignerAssignmentRequest,
  TemplateDetail,
  TemplateListItem,
} from "@/lib/types/workflow";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  LayersIcon,
  SendIcon,
  SpinnerIcon,
  UploadCloudIcon,
} from "@/components/ui/icons";
import { detectDocumentFormat } from "@/features/signing/document-format";
import { errorMessage } from "@/features/signing/api";
import { FlowCanvas, type FlowDrag, type FlowEditHandlers } from "./flow-canvas";
import { SlotConfigDialog } from "./slot-config-dialog";
import { RequestDocumentStep } from "./request-document-step";
import { RequestReviewStep } from "./request-review-step";
import { RequestProgressView } from "./request-progress-view";
import { TemplatePicker } from "./template-picker";
import { TemplateBuilderDialog, type TemplateBuilderSaveResult } from "./template-builder-dialog";
import { TemplateVariablesStep, summarizeValues } from "./template-variables-step";
import { ActorRequiredError, useActor } from "../actor";
import {
  stepsFromTemplate,
  suggestedRequestName,
  templateDefaultValues,
  templatePlaceholderBoxes,
  templateVariables,
} from "../server-template";
import {
  archiveTemplate,
  createSigningRequest,
  createTemplatePreview,
  fetchPdfAsFile,
  getTemplate,
  listTemplates,
  newIdempotencyKey,
  templatePreviewUrl,
  uploadDocument,
} from "../workflow-api";
import {
  addStep as addStepTo,
  createDraft,
  createSlot,
  createStep,
  findSlot,
  insertSlot,
  moveSlot,
  moveStep as moveStepIn,
  removeSlot as removeSlotFrom,
  removeStep as removeStepFrom,
  signerIdOf,
  totalSlots,
  updateSlot,
  updateStep,
  validateDraft,
  type DirectoryUser,
  type DraftIssue,
  type FlowStep,
  type SignatureSlot,
  type SignRequestDraft,
  type SignRequestRecord,
  type SlotSigner,
} from "../model";
import { CreatedExternalLinksPanel, ShareableExternalSigningLink } from "./created-external-links-panel";

/**
 * Toàn bộ màn tạo yêu cầu ký: các bước soạn, rồi màn theo dõi tiến trình.
 *
 * Một component giữ state chứ không phải nhiều màn rời nhau, vì mọi bước nói về
 * CÙNG một bản nháp và người dùng nhảy qua lại giữa chúng liên tục — sửa luồng
 * xong quay lại đổi tệp là chuyện thường. Bản nháp chỉ mất khi họ tạo yêu cầu
 * xong và bấm tạo cái mới.
 *
 * Số bước KHÔNG cố định: chọn một mẫu thì chèn thêm bước "điền thông tin" vào
 * giữa. Đó là bước duy nhất tồn tại có điều kiện, và nó chỉ tồn tại khi có thứ
 * để điền — hiện một bước rỗng rồi bảo người dùng bấm qua là thêm việc chứ không
 * thêm thông tin.
 *
 * ------------------------------------------------------------------
 * HAI NGUỒN TÀI LIỆU, HAI CONTRACT KHÁC HẲN NHAU
 * ------------------------------------------------------------------
 *
 * Đây là thứ định hình cả file, nên nói ra trước:
 *
 * - **Tệp tự tải lên** → `POST /api/documents` lấy `documentArtifactId`, rồi
 *   `POST /api/signing-requests` với `signers[].signingOrder` và
 *   `signers[].signatureSlots`. Người soạn dựng luồng tự do: thêm bước, kéo
 *   người, đặt vị trí chữ ký.
 * - **Mẫu** → `POST /api/templates/{id}/previews` với các giá trị vừa điền, lấy
 *   `previewId`, rồi `POST /api/signing-requests` với `signers[].roleCode`.
 *   Cấu trúc luồng KHOÁ: số ô, thứ tự bước và toạ độ chữ ký chép từ bản đã
 *   publish, và gửi kèm chúng là bị backend từ chối.
 *
 * ------------------------------------------------------------------
 * THỨ KHÔNG ĐI ĐƯỢC LÊN MÁY CHỦ
 * ------------------------------------------------------------------
 *
 * `POST /api/signing-requests` chỉ nhận `title`, `source` và `signers[]`. Lời
 * nhắn, hạn ký, cờ nhắc nhở, luật ALL/ANY của bước, và cấu hình ký của từng ô
 * (phương thức, thuật toán, mức baseline, lý do, nơi ký) KHÔNG có trường nào để
 * chở. Chúng ở lại client: hiển thị trên màn tiến trình và dành cho bước ký thật
 * (`POST /api/v1/sign`) về sau. Hệ quả phải nhớ: tải lại trang là mất, và màn
 * xác nhận nói thẳng điều đó thay vì để người dùng tưởng đã gửi đi.
 */

type WizardStep = "document" | "variables" | "flow" | "review";
type DocumentSource = "upload" | "template";

export function SignRequestWorkspace() {
  const { t } = useLocale();
  const { toast } = useToast();
  const { actor } = useActor();
  const s = t.signRequest.steps;
  const tpl = t.signRequest.template;

  const [wizardStep, setWizardStep] = useState<WizardStep>("document");
  const [source, setSource] = useState<DocumentSource>("upload");
  const [uploadedDocument, setUploadedDocument] = useState<File>();
  const [draft, setDraft] = useState<SignRequestDraft>(() => createDraft());
  const [record, setRecord] = useState<SignRequestRecord>();
  const [createdExternalLinks, setCreatedExternalLinks] = useState<ShareableExternalSigningLink[]>([]);
  const [drag, setDragState] = useState<FlowDrag>();
  const dragRef = useRef<FlowDrag | undefined>(undefined);
  const [selectedStepId, setSelectedStepId] = useState(() => draft.steps[0].id);
  const [openSlotId, setOpenSlotId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  /* -------------------- Mẫu từ máy chủ -------------------- */

  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string>();
  const [templateSearch, setTemplateSearch] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  /**
   * Hộp thoại thêm/sửa mẫu: `undefined` là đóng, `{}` là tạo mới, `{ template }`
   * là sửa mẫu đó. Một state thay vì hai (mở/đang-sửa-cái-nào) vì hai state ấy
   * không bao giờ độc lập — "đang mở mà không biết sửa cái gì" là trạng thái
   * không tồn tại.
   */
  const [templateForm, setTemplateForm] = useState<{ template?: TemplateListItem }>();

  const [template, setTemplate] = useState<TemplateDetail>();
  const [templateLoading, setTemplateLoading] = useState(false);
  /**
   * Bản PDF preview đã tải về, ĐÁNH DẤU bằng id của mẫu sinh ra nó.
   *
   * Nhờ cái dấu đó, preview của mẫu cũ không bao giờ hiện nhầm dưới mẫu mới:
   * id lệch thì rơi ngay về "chưa có", không cần một lượt dọn dẹp nào — và
   * không cần một `setState` dọn dẹp bên trong effect.
   */
  const [preview, setPreview] = useState<{ templateId: string; file: File }>();
  const [values, setValues] = useState<Record<string, string>>({});
  /**
   * Người dùng đã tự sửa tên yêu cầu chưa. Một khi họ sửa, chọn mẫu khác thôi
   * ghi đè — gõ lại tên rồi thấy nó bị thay ngược là hành vi không ai đoán được.
   */
  const nameTouched = useRef(false);

  /**
   * Danh sách mẫu, tải lại khi đổi từ khoá tìm.
   *
   * Tìm ở MÁY CHỦ chứ không lọc mảng đã tải: danh sách phân trang (mặc định 20
   * mẫu), nên lọc ở client sẽ bỏ sót đúng cái mẫu người dùng đang tìm. Hoãn
   * 300 ms để mỗi phím gõ không thành một lời gọi.
   */
  useEffect(() => {
    if (source !== "template") return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setTemplatesLoading(true);
      setTemplatesError(undefined);
      listTemplates({ search: templateSearch, size: 50, signal: controller.signal })
        .then((page) => setTemplates(page.items))
        .catch((error) => {
          if (controller.signal.aborted) return;
          setTemplatesError(errorMessage(error, tpl.picker.loadFailed));
        })
        .finally(() => {
          if (!controller.signal.aborted) setTemplatesLoading(false);
        });
    }, templateSearch ? 300 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [source, templateSearch, reloadToken, tpl.picker.loadFailed]);

  /**
   * PDF preview của mẫu đang chọn, tải về thành `File` để bước điền biến dựng
   * được bằng pdf.js.
   *
   * Tải một lần cho mỗi mẫu chứ không mỗi lần gõ: bản này là tờ giấy TRỐNG, giá
   * trị được vẽ chồng lên bằng toạ độ `fields[].boxes`. Tài liệu thật chỉ dựng
   * khi bấm tạo yêu cầu.
   */
  const templateId = template?.template.id;
  const templateCode = template?.template.code;

  useEffect(() => {
    if (!templateId) return;

    const controller = new AbortController();
    fetchPdfAsFile(
      templatePreviewUrl(templateId, "PLAIN"),
      `${templateCode ?? templateId}.pdf`,
      false,
      controller.signal,
    )
      .then((file) => setPreview({ templateId, file }))
      .catch(() => {
        // Không dựng được preview thì bước điền biến vẫn dùng được, chỉ mất
        // khung bên phải. Không chặn cả luồng vì một bản xem trước.
      });

    return () => controller.abort();
  }, [templateId, templateCode]);

  const templatePreview =
    preview && preview.templateId === templateId ? preview.file : undefined;

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

  /**
   * Tài liệu dùng để xem trước và đặt vị trí chữ ký.
   *
   * Với mẫu, đó là PDF preview của bản đã publish — chính tờ giấy mà toạ độ chữ
   * ký trong mẫu quy chiếu tới.
   */
  const document = source === "template" ? templatePreview : uploadedDocument;

  const documentFormat = useMemo(
    () => (document ? detectDocumentFormat(document) : undefined),
    [document],
  );

  const variables = useMemo(() => (template ? templateVariables(template) : []), [template]);
  const placeholderBoxes = useMemo(
    () => (template ? templatePlaceholderBoxes(template) : []),
    [template],
  );

  const templateIssues = useMemo<DraftIssue[]>(
    () =>
      variables
        .filter((variable) => variable.required && !(values[variable.key] ?? "").trim())
        .map((variable) => ({
          code: "MISSING_VARIABLE",
          variableLabel: variable.label || variable.key,
        })),
    [variables, values],
  );

  /**
   * Với mẫu, "đã có tài liệu" nghĩa là đã chọn mẫu — chứ không phải đã tải xong
   * PDF preview. Bản preview chỉ để nhìn; thiếu nó vẫn tạo được yêu cầu.
   */
  const documentReady = source === "template" ? Boolean(template) : Boolean(uploadedDocument);

  const issues = useMemo(
    () => [
      ...validateDraft(draft, documentReady ? (document ?? new File([], "")) : undefined),
      ...templateIssues,
    ],
    [draft, document, documentReady, templateIssues],
  );
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

  /* -------------------- Chọn và bỏ mẫu -------------------- */

  async function chooseTemplate(chosen: TemplateListItem) {
    setTemplateLoading(true);
    try {
      const detail = await getTemplate(chosen.templateId);
      const initialValues = templateDefaultValues(detail);
      const appliedSteps = stepsFromTemplate(detail);

      setTemplate(detail);
      setValues(initialValues);
      setSource("template");
      setUploadedDocument(undefined);
      setDraft((current) => ({
        ...current,
        name: nameTouched.current ? current.name : suggestedRequestName(detail),
        steps: appliedSteps,
      }));
      setSelectedStepId(appliedSteps[0].id);

      toast.success(
        tpl.picker.applied(detail.template.name),
        tpl.picker.appliedBody(detail.signerRoles.length, templateVariables(detail).length),
      );
    } catch (error) {
      toast.warning(tpl.picker.loadFailed, errorMessage(error, tpl.picker.loadFailed));
    } finally {
      setTemplateLoading(false);
    }
  }

  /* -------------------- Thêm, sửa, nhân bản, xoá mẫu -------------------- */

  const reloadTemplates = useCallback(() => setReloadToken((token) => token + 1), []);

  /**
   * `TemplateBuilderDialog` tự gọi toàn bộ vòng đời mẫu (tạo bản nháp, cấu hình
   * biến, cấu hình vai ký, publish). Ở đây chỉ còn đóng hộp thoại và tải lại
   * danh sách để thấy trạng thái mới trên máy chủ.
   */
  function templateSaved(result: TemplateBuilderSaveResult) {
    void result;
    setTemplateForm(undefined);
    reloadTemplates();
  }

  /**
   * Nhân bản mẫu: KHÔNG có endpoint nào làm được.
   *
   * Không tự dựng bằng cách tải tệp nguồn về rồi nộp lại — frontend không đọc
   * được tệp nguồn của một mẫu (chỉ có PDF preview), nên "bản sao" dựng kiểu đó
   * sẽ mất chính cái tệp DOCX/XLSX mà mẫu dựa vào.
   */
  function duplicateTemplate(item: TemplateListItem) {
    void item;
    toast.warning(
      tpl.manager.duplicate,
      "Dịch vụ chưa có API nhân bản mẫu. Hãy tạo mẫu mới từ cùng tệp nguồn.",
    );
  }

  /**
   * `DELETE /api/templates/{id}` kèm `X-Username`. Backend gọi đây là archive:
   * bản ghi vẫn còn, chỉ chuyển sang `ARCHIVED`.
   *
   * Thiếu danh tính thì lời gọi hỏng NGAY ở client (xem `actorHeaders`), và lỗi
   * đó phải nói ra đúng chỗ cần sửa — "không lưu trữ được mẫu" khiến người dùng
   * đi tìm lỗi ở máy chủ trong khi thứ thiếu là cái tên trên thanh tiêu đề.
   */
  async function deleteTemplate(item: TemplateListItem) {
    try {
      await archiveTemplate(item.templateId);
      if (template?.template.id === item.templateId) {
        setTemplate(undefined);
        setValues({});
      }
      toast.success(tpl.manager.deleted, item.name);
      reloadTemplates();
    } catch (error) {
      toast.warning(
        tpl.manager.deleteFailed,
        error instanceof ActorRequiredError
          ? t.signRequest.actor.requiredHint
          : errorMessage(error, tpl.manager.deleteFailed),
      );
    }
  }

  /**
   * Tự tải tệp lên khi đang dùng mẫu = thôi dùng mẫu, và luồng ký dựng lại từ
   * đầu.
   *
   * Bản dựng trước giữ lại luồng ("người ký không đổi, chỉ tờ giấy đổi"). Giờ
   * không giữ được nữa: các ô của mẫu mang `roleCode` của bản đã publish, mà
   * `roleCode` gửi kèm một tài liệu tự tải lên là bị backend từ chối. Thà dựng
   * lại một luồng trống còn hơn để người dùng bấm tạo rồi ăn một lỗi 400 không
   * giải thích được.
   */
  function selectUploadedFile(file?: File) {
    setUploadedDocument(file);
    if (template) {
      const fresh = createStep();
      setTemplate(undefined);
      setValues({});
      setDraft((current) => ({ ...current, steps: [fresh] }));
      setSelectedStepId(fresh.id);
      if (wizardStep === "variables") setWizardStep("document");
      toast.info(tpl.picker.detached);
    }
  }

  function setValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
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

  const edit: FlowEditHandlers = {
    drag,
    setDrag,
    // Luồng của mẫu: gán được người, không đổi được cấu trúc. Xem `lockStructure`.
    lockStructure: Boolean(template),
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

  const variablesReady = templateIssues.length === 0;
  const flowReady = documentReady && variablesReady && flowIssues.length === 0;
  const reviewReady = issues.length === 0 && Boolean(actor);

  /* Bước "điền thông tin" chỉ có mặt khi mẫu thật sự có gì để điền. */
  const hasVariables = variables.length > 0;
  const order: WizardStep[] = hasVariables
    ? ["document", "variables", "flow", "review"]
    : ["document", "flow", "review"];

  const wizard = [
    { id: "document", label: s.document.label, complete: documentReady, reachable: true },
    ...(hasVariables
      ? [
          {
            id: "variables",
            label: tpl.variables.label,
            complete: variablesReady,
            reachable: documentReady,
          },
        ]
      : []),
    {
      id: "flow",
      label: s.flow.label,
      complete: flowReady,
      reachable: documentReady && variablesReady,
    },
    { id: "review", label: s.review.label, complete: reviewReady, reachable: flowReady },
  ];

  /*
   * Bỏ mẫu lúc đang đứng ở bước biến sẽ để `wizardStep` trỏ vào một bước không
   * còn trong danh sách. Rơi về bước đầu là hành vi an toàn duy nhất — mọi hàm
   * dưới đây đều tính chỉ số từ `order`.
   */
  const activeIndex = Math.max(order.indexOf(wizardStep), 0);
  const current = order[activeIndex];
  const canContinue =
    current === "document" ? documentReady : current === "variables" ? variablesReady : flowReady;

  /* -------------------- Phát yêu cầu -------------------- */

  /**
   * Khoá idempotency của LẦN BẤM này, giữ nguyên qua mọi lần thử lại.
   *
   * Đây là điểm mấu chốt: nếu lời gọi hỏng ở giữa (mạng rớt, 502) thì không ai
   * biết backend đã tạo yêu cầu hay chưa. Gửi lại với cùng khoá thì backend trả
   * đúng yêu cầu cũ; gửi lại với khoá mới thì tạo thêm một yêu cầu ký nữa cho
   * cùng một tài liệu, và cả hai đều gửi thông báo cho người ký. Khoá chỉ được
   * làm mới khi bản nháp đổi hoặc khi người dùng bắt đầu lại.
   */
  const idempotencyKey = useRef(newIdempotencyKey());

  /**
   * Chuyển cây bước sang `signers[]` của backend.
   *
   * Mỗi Ô là một người ký, không phải mỗi NGƯỜI: một người đứng ở hai bước là
   * hai mục trong danh sách, đúng như hai lượt ký khác nhau. `signingOrder` đánh
   * số từ 1 theo chỉ số bước, nên các ô cùng bước có cùng số và backend hiểu là
   * ký song song — trùng số là hợp lệ, backend nén dải giá trị về `1..N` giúp.
   *
   * THỨ TỰ MẢNG là thứ tự hiển thị: duyệt bước từ trên xuống rồi ô từ trái sang
   * đúng như sơ đồ, vì backend lưu chính thứ tự đó thành `displayOrder` của người
   * ký và trả về y như vậy ở màn chi tiết.
   */
  const buildSigners = useCallback(
  (fromTemplate: boolean): SignerAssignmentRequest[] =>
    draft.steps.flatMap((step, stepIndex) =>
      step.slots.flatMap((slot): SignerAssignmentRequest[] => {
        const userId = signerIdOf(slot);
        if (!userId || !slot.signer) return [];

        const accessMode =
          slot.signer.kind === "link"
            ? "EXTERNAL_LINK"
            : "INTERNAL";

        /*
         * Với nguồn template, backend tự lấy signingOrder và signatureSlots
         * từ template version đã publish.
         */
        if (fromTemplate) {
          return slot.roleCode
            ? [
                {
                  roleCode: slot.roleCode,
                  userId,
                  accessMode,
                },
              ]
            : [];
        }

        const position = slot.config.position;

        return [
          {
            userId,
            accessMode,
            signingOrder: stepIndex + 1,
            signatureSlots: [
              {
                code: slot.id,
                title: slot.roleName || slot.signer.name || undefined,
                page: position.page,
                x: position.xPct,
                y: position.yPct,
                width: position.widthPct,
                height: position.heightPct,
                required: true,
                /*
                 * `displayOrder` của khung chỉ xếp thứ tự TRONG một người ký, và
                 * mỗi người ký ở đây có đúng một khung — backend đánh lại thành
                 * `0..n-1` nên mọi giá trị đều ra `0`. Không có gì để đánh số.
                 */
                displayOrder: 0,
                appearanceConfig: {
                  method: slot.config.method,
                  algorithm: slot.config.algorithm,
                  baselineLevel: slot.config.baselineLevel,
                  reason: slot.config.reason,
                  location: slot.config.location,
                  visible: slot.config.visible,
                },
              },
            ],
          },
        ];
      }),
    ),
  [draft.steps],
);

  async function submit() {
    setSubmitting(true);
    setSubmitError(undefined);

    try {
      const fromTemplate = Boolean(template);
      let body: CreateSigningRequestBody;
      let documentName: string;
      let documentSize: number;
      let previewWarnings: string[] | undefined;

      if (fromTemplate && template) {
        /*
         * Dựng tài liệu thật NGAY TRƯỚC khi tạo yêu cầu: bản xem thử có
         * `expiresAt`, nên dựng sẵn từ lúc điền biến rồi giữ là tự chuốc lấy một
         * `previewId` đã hết hạn ở đúng lúc người dùng bấm nút.
         */
        const preview = await createTemplatePreview(template.template.id, {
          values,
          signers: buildSigners(true).map((signer) => ({
            roleCode: signer.roleCode!,
            userId: signer.userId,
          })),
        });

        previewWarnings = preview.warnings;
        documentName = `${template.template.code}.pdf`;
        documentSize = 0;
        body = {
          title: draft.name.trim(),
          source: { type: "TEMPLATE_PREVIEW", previewId: preview.previewId },
          signers: buildSigners(true),
        };
      } else {
        if (!uploadedDocument) throw new Error("NO_DOCUMENT");
        const artifact = await uploadDocument(uploadedDocument);
        documentName = artifact.fileName;
        documentSize = artifact.sizeBytes;
        body = {
          title: draft.name.trim(),
          source: { type: "UPLOADED_DOCUMENT", documentArtifactId: artifact.documentArtifactId },
          signers: buildSigners(false),
        };
      }

      const {
        result: created,
        idempotentReplay,
      } = await createSigningRequest(
        body,
        idempotencyKey.current,
      );

      const shareableLinks: ShareableExternalSigningLink[] =
        idempotentReplay
          ? []
          : created.externalSigningLinks.filter(
              (
                item,
              ): item is ShareableExternalSigningLink =>
                typeof item.url === "string" &&
                item.url.trim().length > 0,
            );

      setCreatedExternalLinks(shareableLinks);

      setRecord({
        ...draft,
        signingRequestId: created.signingRequestId,
        createdAt: created.createdAt,
        documentName,
        documentSize,
        documentFormat,
        sourceType: created.sourceType,
        serverStatus: created.status,
        templateId: template?.template.id,
        templateName: template?.template.name,
        variableValues: template ? values : undefined,
        previewWarnings,
      });
      toast.success(t.signRequest.review.submit, draft.name);
    } catch (error) {
      setSubmitError(
        error instanceof ActorRequiredError
          ? t.signRequest.actor.required
          : errorMessage(error, t.signRequest.review.submitFailed),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startOver() {
    const fresh = createDraft();
    idempotencyKey.current = newIdempotencyKey();
    nameTouched.current = false;
    setRecord(undefined);
    setDraft(fresh);
    setUploadedDocument(undefined);
    setTemplate(undefined);
    setValues({});
    setSource("upload");
    setSubmitError(undefined);
    setSelectedStepId(fresh.steps[0].id);
    setWizardStep("document");
    setCreatedExternalLinks([]);
  }

  /* -------------------- Màn tiến trình -------------------- */

  if (record) {
    return (
      <>
        <RequestProgressView
          t={t}
          record={record}
          onRecordChange={setRecord}
          onOpenSlot={setOpenSlotId}
          onNewRequest={startOver}
          sidebarTop={
            createdExternalLinks.length > 0 ? (
              <CreatedExternalLinksPanel
                t={t}
                links={createdExternalLinks}
                onDismiss={() => setCreatedExternalLinks([])}
              />
            ) : undefined
          }
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

  /* -------------------- Các bước soạn -------------------- */

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

      <p className="text-[12.5px] text-fg-muted">
        {current === "variables" ? tpl.variables.description : s[current].description}
      </p>

      {current === "document" ? (
        <div className="flex flex-col gap-4">
          <div
            role="group"
            aria-label={tpl.source.label}
            className="inline-flex gap-0.5 self-start rounded-lg bg-inset p-0.75"
          >
            {(["upload", "template"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={source === value}
                onClick={() => setSource(value)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  source === value ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
                }`}
              >
                {value === "upload" ? <UploadCloudIcon size={14} /> : <LayersIcon size={14} />}
                {value === "upload" ? tpl.source.uploadTab : tpl.source.templateTab}
              </button>
            ))}
          </div>

          {source === "upload" ? (
            <RequestDocumentStep
              t={t}
              file={uploadedDocument}
              format={documentFormat}
              onSelect={selectUploadedFile}
              onRemove={() => selectUploadedFile(undefined)}
            />
          ) : (
            <TemplatePicker
              t={t}
              templates={templates}
              loading={templatesLoading}
              error={templatesError}
              onRetry={reloadTemplates}
              search={templateSearch}
              onSearch={setTemplateSearch}
              selectedId={template?.template.id}
              detail={template}
              detailLoading={templateLoading}
              previewFile={templatePreview}
              onSelect={chooseTemplate}
              onCreate={() => setTemplateForm({})}
              onDuplicate={duplicateTemplate}
              onDelete={deleteTemplate}
            />
          )}
        </div>
      ) : null}

      {current === "variables" && template ? (
        <TemplateVariablesStep
          t={t}
          variables={variables}
          boxes={placeholderBoxes}
          document={templatePreview}
          values={values}
          onChange={setValue}
          onReset={() => setValues(templateDefaultValues(template))}
        />
      ) : null}

      {current === "flow" ? (
        <FlowCanvas t={t} steps={draft.steps} onOpenSlot={setOpenSlotId} edit={edit} />
      ) : null}

      {current === "review" ? (
        <RequestReviewStep
          t={t}
          draft={draft}
          document={document}
          documentFormat={documentFormat}
          issues={issues}
          actorMissing={!actor}
          templateName={template?.template.name}
          variableSummary={template ? summarizeValues(variables, values) : undefined}
          onGoToVariables={() => setWizardStep("variables")}
          onPatch={(patch) => {
            if (patch.name !== undefined) nameTouched.current = true;
            setDraft((state) => ({ ...state, ...patch }));
          }}
          onGoToStep={(stepIndex) => {
            setWizardStep("flow");
            setSelectedStepId(draft.steps[stepIndex]?.id ?? selectedStepId);
          }}
        />
      ) : null}

      {submitError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger bg-danger-subtle px-4 py-3"
        >
          <AlertTriangleIcon size={15} className="mt-0.5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-danger">
              {t.signRequest.review.submitFailed}
            </p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-muted">{submitError}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-fg-subtle">
              {t.signRequest.review.retryNote}
            </p>
          </div>
        </div>
      ) : null}

      {/* -------------------- Thanh điều hướng -------------------- */}
      <nav className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
        {(activeIndex !== 0) ? (
          <button
            type="button"
            onClick={() => setWizardStep(order[activeIndex - 1])}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 text-[12.5px] font-semibold text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeftIcon size={14} />
            {s.back}
          </button>
        ): (<div></div>)}

        {current === "review" ? (
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
            onClick={() => setWizardStep(order[activeIndex + 1])}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {s.next}
            <ArrowRightIcon size={14} />
          </button>
        )}
      </nav>

      {templateForm ? (
        /* `key` để editor dựng lại state từ đầu mỗi lần đổi mẫu đang sửa. */
        <TemplateBuilderDialog
          key={templateForm.template?.templateId ?? "new"}
          t={t}
          open
          meta={
            templateForm.template
              ? {
                  id: templateForm.template.templateId,
                  code: templateForm.template.code,
                  status: templateForm.template.status,
                  name: templateForm.template.name,
                  description: templateForm.template.description ?? "",
                }
              : undefined
          }
          onClose={() => setTemplateForm(undefined)}
          onSaved={templateSaved}
        />
      ) : null}

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
          /* Ô của mẫu: đổi được người ký, không đổi được chỗ ký hay bước. */
          lockPlacement={Boolean(template)}
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