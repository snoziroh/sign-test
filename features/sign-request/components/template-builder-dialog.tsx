/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import type {
  CreatedTemplateField,
  TemplateCreated,
  TemplatePreviewVariant,
  TemplateStatus,
  TemplateVersionStatus,
} from "@/lib/types/workflow";
import { Dialog } from "@/components/ui/dialog";
import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileTextIcon,
  PlusIcon,
  SpinnerIcon,
  TrashIcon,
  UserPlusIcon,
  XIcon,
} from "@/components/ui/icons";
import { formatBytes } from "@/features/signing/document-format";
import { errorMessage, readProblem } from "@/features/signing/api";
import { ActorRequiredError } from "../actor";
import { DIRECTORY } from "../directory";
import {
  configureTemplateFields,
  configureTemplateSigners,
  createTemplateDraft,
  publishTemplateVersion,
  templateVersionPreviewUrl,
  updateTemplateMetadata,
} from "../workflow-api";
import {
  authoringBlockers,
  MAX_TEMPLATE_FILE_BYTES,
  normalizeRoleCode,
  normalizeTemplateCode,
  orderedRoles,
  TEMPLATE_ACCEPTED_EXTENSIONS,
  toFieldRequests,
  toSignerRoleRequests,
} from "../template-authoring";
import { BASELINE_LEVELS } from "../model";
import {
  addTemplateRole,
  addTemplateStep,
  createTemplate,
  createVariable,
  moveTemplateStep,
  removeTemplateRole,
  removeTemplateStep,
  rolesInStep,
  updateRoleConfig,
  updateTemplateRole,
  updateTemplateStep,
  updateTemplateVariable,
  validateTemplate,
  VARIABLE_TYPES,
  type SignTemplate,
  type TemplateIssue,
  type TemplateRole,
  type TemplateVariable,
  type VariableType,
} from "../template-model";
import { PdfPositionPicker, type GhostBox } from "./pdf-position-picker";

/**
 * TRÌNH SOẠN MẪU — bốn bước, và mỗi bước là một lời gọi thật tới máy chủ.
 *
 * Vòng đời do backend quy định, không phải do giao diện chọn:
 *
 *   1. Tài liệu   → `POST /api/templates`
 *                   Mở Template DRAFT + Version DRAFT. Đây là bước DUY NHẤT
 *                   sinh ra `templateId`/`versionId`, và nó KHÔNG phải bước lưu
 *                   cuối. Backend đọc DOCX/XLSX, dò `{{biến}}`, dựng PDF.
 *   2. Biến       → `PUT  …/versions/{id}/fields`
 *   3. Chữ ký     → `PUT  …/versions/{id}/signers`   (khung ký đi kèm trong vai)
 *   4. Kiểm tra   → `POST …/versions/{id}/publish`   (không có thân request)
 *
 * Ba điều đi ra từ đó và định hình toàn bộ component này:
 *
 * - **Danh sách biến là của máy chủ.** Frontend không quét `{{...}}`; `fieldId`
 *   do backend cấp và người soạn chỉ chỉnh nhãn/kiểu/bắt buộc quanh nó.
 * - **PDF là của máy chủ.** Hai biến thể: `HIGHLIGHT` (tô nền biến) để soi biến
 *   và để kiểm tra cuối, `PLAIN` để đặt khung chữ ký — đặt khung lên nền vàng
 *   thì không nhìn ra mình đang che lên chữ gì. Khung chữ ký KHÔNG được nướng
 *   vào PDF; bản kiểm tra cuối là PDF `HIGHLIGHT` cộng overlay vẽ ở frontend.
 * - **Bản nháp trên máy chủ sống độc lập với hộp thoại này.** Đóng hộp thoại
 *   giữa chừng không xoá nó, và một lỗi ở bước 2 không làm mất bước 1.
 *
 * Sửa mẫu ĐÃ TỒN TẠI gần như không làm được, và đó là giới hạn của backend chứ
 * không phải của màn hình: bản đã publish là bất biến, không có API tạo bản mới,
 * và `GET /api/templates` không trả `versionId` của bản nháp nên một bản nháp cũ
 * cũng không mở lại được. Nhánh sửa vì thế chỉ còn đổi tên/mô tả, và chỉ khi mẫu
 * còn DRAFT.
 */

const EMPTY_KEYS: string[] = [];
const EMPTY_FIELDS: CreatedTemplateField[] = [];

type BuilderStep = "DOCUMENT" | "VARIABLES" | "SIGNATURES" | "REVIEW";

/**
 * PDF preview đã tải về từ máy chủ và dựng thành File.
 *
 * `pageCount` lấy từ metadata của backend chứ không hỏi trình xem PDF: số trang
 * là thứ dùng để CHẶN một khung chữ ký đặt ra ngoài tài liệu, nên nó phải đến từ
 * cùng nguồn với thứ backend sẽ kiểm lại.
 */
export interface PreviewDocument {
  file: File;
  pageCount: number;
}

export interface TemplateBuilderMeta {
  /** ID backend của template khi edit. Không bắt buộc khi create. */
  id?: string;
  code: string;
  status: TemplateStatus;
  /**
   * Hai field này chỉ dùng để hydrate UI khi mở edit từ TemplateListItem.
   * Payload save vẫn lấy name/description từ SignTemplate.
   */
  name?: string;
  description?: string;
}

export interface TemplateBuilderSaveResult {
  meta: TemplateBuilderMeta;
  template?: SignTemplate;
  /** ID backend của mẫu vừa tạo hoặc vừa sửa. */
  templateId?: string;
  versionId?: string;
}

/** Bản nháp trên máy chủ — thứ duy nhất nối giao diện với backend sau bước 1. */
interface ServerDraft {
  templateId: string;
  versionId: string;
  versionNo: number;
  versionStatus: TemplateVersionStatus;
  fields: CreatedTemplateField[];
  pageCount: number;
  warnings: string[];
}

function toServerDraft(created: TemplateCreated): ServerDraft {
  return {
    templateId: created.templateId,
    versionId: created.versionId,
    versionNo: created.versionNo,
    versionStatus: created.versionStatus,
    fields: created.fields,
    pageCount: created.preview?.pageCount ?? 0,
    warnings: created.warnings ?? [],
  };
}

export function TemplateBuilderDialog({
  t,
  open,
  template: initialTemplate,
  meta: initialMeta,
  onClose,
  onSaved,
  /**
   * Backward compatibility với handler cũ của TemplateEditorDialog.
   * Nếu project đã chuyển sang onSaved thì có thể xóa prop này.
   */
  onSave,
}: {
  t: Dictionary;
  open: boolean;
  template?: SignTemplate;
  meta?: Partial<TemplateBuilderMeta>;
  onClose: () => void;
  onSaved?: (result: TemplateBuilderSaveResult) => void;
  onSave?: (template: SignTemplate) => void;
}) {
  const editing = Boolean(initialMeta?.id);
  const b = t.signRequest.template.builder;
  const inputRef = useRef<HTMLInputElement>(null);

  const [activeStep, setActiveStep] = useState<BuilderStep>("DOCUMENT");
  const [draft, setDraft] = useState<SignTemplate | undefined>(initialTemplate);
  const [code, setCode] = useState(initialMeta?.code ?? "");
  const [status, setStatus] = useState<TemplateStatus>(initialMeta?.status ?? "DRAFT");

  /** Tệp đã chọn nhưng CHƯA nộp — bước 1 cần cả mã và tên mới gọi được. */
  const [pendingFile, setPendingFile] = useState<File>();
  const [server, setServer] = useState<ServerDraft>();
  const [fileError, setFileError] = useState<string>();
  const [apiError, setApiError] = useState<string>();

  const [selectedRoleId, setSelectedRoleId] = useState<string>();
  const [reviewPage, setReviewPage] = useState(1);

  const [plainPreview, setPlainPreview] = useState<PreviewDocument>();
  const [highlightPreview, setHighlightPreview] = useState<PreviewDocument>();
  const [previewBusy, setPreviewBusy] = useState<TemplatePreviewVariant>();
  const [previewError, setPreviewError] = useState<string>();
  const [fullscreenPreview, setFullscreenPreview] = useState<{ preview: PreviewDocument; title: string }>();

  /*
   * Cờ bẩn theo TỪNG PHẦN, không phải một cờ chung: hai PUT là hai lời gọi độc
   * lập và mỗi cái thay thế trọn tập của nó. Gộp lại thành một cờ nghĩa là mỗi
   * lần sửa nhãn một biến cũng ghi đè lại toàn bộ vai ký và vị trí chữ ký.
   */
  const [fieldsDirty, setFieldsDirty] = useState(false);
  const [signersDirty, setSignersDirty] = useState(false);
  const [metadataDirty, setMetadataDirty] = useState(false);

  const [creating, setCreating] = useState(false);
  const [savingFields, setSavingFields] = useState(false);
  const [savingSigners, setSavingSigners] = useState(false);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const busy = creating || savingFields || savingSigners || savingMetadata || publishing;
  const published = server?.versionStatus === "PUBLISHED";

  /*
   * Sửa một mẫu đã tồn tại: bản đã publish là bất biến và danh sách mẫu không
   * trả `versionId` của bản nháp, nên không có gì để mở lại. Chỉ còn metadata,
   * và backend cũng chỉ cho sửa khi template còn DRAFT.
   */
  const metadataOnly = editing;
  const metadataLocked = editing && status !== "DRAFT";

  const serverFields = server?.fields ?? EMPTY_FIELDS;
  const detectedKeys = useMemo(
    () => (server ? server.fields.map((field) => field.code) : EMPTY_KEYS),
    [server],
  );

  const issues = useMemo(
    () => (draft && !metadataOnly ? validateTemplate(draft, detectedKeys) : []),
    [draft, detectedKeys, metadataOnly],
  );

  const blockers = useMemo(() => {
    if (metadataOnly) return [];
    return authoringBlockers({
      t,
      code,
      draft,
      serverFields,
      pageCount: server?.pageCount ?? 0,
      hasServerDraft: Boolean(server),
    });
  }, [t, code, draft, metadataOnly, server, serverFields]);

  const dirty = fieldsDirty || signersDirty || metadataDirty;

  /* Reset state đúng theo entity mỗi lần dialog mở cho template khác. */
  useEffect(() => {
    if (!open) return;
    setActiveStep("DOCUMENT");
    setDraft(initialTemplate);
    setCode(initialMeta?.code ?? "");
    setStatus(initialMeta?.status ?? "DRAFT");
    setPendingFile(undefined);
    setServer(undefined);
    setFileError(undefined);
    setApiError(undefined);
    setPreviewError(undefined);
    setPlainPreview(undefined);
    setHighlightPreview(undefined);
    setFullscreenPreview(undefined);
    setReviewPage(1);
    setFieldsDirty(false);
    setSignersDirty(false);
    setMetadataDirty(false);
    setSelectedRoleId(initialTemplate?.roles[0]?.id);
  }, [open, initialTemplate, initialMeta?.code, initialMeta?.status]);

  /** Sửa cấu hình vai/vị trí → phải PUT lại `signers`; sửa biến → PUT lại `fields`. */
  function patchSigners(next: SignTemplate) {
    setDraft(next);
    setSignersDirty(true);
  }

  function patchFields(next: SignTemplate) {
    setDraft(next);
    setFieldsDirty(true);
  }

  /**
   * Chọn tệp — CHƯA nộp.
   *
   * `POST /api/templates` là multipart mang cả `code` và `name`, nên nộp ngay
   * lúc chọn tệp sẽ tạo ra một mẫu mang tên rỗng. Việc nộp lùi tới lúc bấm
   * "Tiếp tục", khi hai ô kia chắc chắn đã có.
   */
  function attachFile(file?: File) {
    if (!file) return;
    setFileError(undefined);
    setApiError(undefined);

    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!TEMPLATE_ACCEPTED_EXTENSIONS.includes(extension as ".docx" | ".xlsx")) {
      setFileError(b.error.fileType(TEMPLATE_ACCEPTED_EXTENSIONS.join(" / ")));
      return;
    }

    if (file.size > MAX_TEMPLATE_FILE_BYTES) {
      setFileError(b.error.fileTooLarge(formatBytes(MAX_TEMPLATE_FILE_BYTES)));
      return;
    }

    setPendingFile(file);
    setDraft((current) => {
      const templateFile = { name: file.name, size: file.size, format: formatOf(file.name) };
      if (current) return { ...current, file: templateFile };
      return {
        ...createTemplate(templateFile),
        name: initialMeta?.name ?? "",
        description: initialMeta?.description ?? "",
      };
    });
  }

  /**
   * Nộp tệp và mở bản nháp trên máy chủ. Chỉ chạy MỘT LẦN cho mỗi hộp thoại.
   *
   * Gọi lần hai không cập nhật mẫu cũ mà tạo hẳn một mẫu khác — và trùng `code`
   * thì 409. Vì thế đã có `server` là trả về ngay, và nút bị khoá suốt lúc chạy.
   */
  async function ensureServerDraft(): Promise<ServerDraft | undefined> {
    if (server) return server;
    if (!draft || !pendingFile || creating) return undefined;

    setCreating(true);
    setApiError(undefined);
    try {
      const created = await createTemplateDraft({
        code: normalizeTemplateCode(code),
        name: draft.name.trim(),
        description: draft.description.trim(),
        file: pendingFile,
      });

      const next = toServerDraft(created);
      setServer(next);
      /* Danh sách biến của máy chủ thắng: nó đọc từ chính tệp vừa nộp. */
      setDraft((current) =>
        current ? { ...current, variables: reconcileDetectedVariables(current.variables, next.fields) } : current,
      );
      /* Chưa có gì được cấu hình trên máy chủ, nên cả hai phần đều đang bẩn. */
      setFieldsDirty(true);
      setSignersDirty(true);
      return next;
    } catch (error) {
      setApiError(authoringError(t, error, b.error.createDraft));
      return undefined;
    } finally {
      setCreating(false);
    }
  }

  /** Tải PDF của bản nháp về. Đi qua proxy `/api/workflow/*`, không chạm backend. */
  async function ensurePreview(
    variant: TemplatePreviewVariant,
    session = server,
  ): Promise<PreviewDocument | undefined> {
    if (!session) return undefined;

    const cached = variant === "PLAIN" ? plainPreview : highlightPreview;
    if (cached) return cached;

    setPreviewBusy(variant);
    setPreviewError(undefined);
    try {
      const response = await fetch(
        templateVersionPreviewUrl(session.templateId, session.versionId, variant),
        { headers: { Accept: "application/pdf" } },
      );
      if (!response.ok) throw await readPreviewProblem(response);

      const blob = await response.blob();
      const preview: PreviewDocument = {
        file: new File([blob], `template-${variant.toLowerCase()}.pdf`, {
          type: blob.type || "application/pdf",
        }),
        pageCount: session.pageCount,
      };

      if (variant === "PLAIN") setPlainPreview(preview);
      else setHighlightPreview(preview);
      return preview;
    } catch (error) {
      setPreviewError(errorMessage(error, b.error.preview(variant)));
      return undefined;
    } finally {
      setPreviewBusy(undefined);
    }
  }

  async function saveFields(session: ServerDraft): Promise<boolean> {
    if (!draft || !fieldsDirty) return true;
    setSavingFields(true);
    setApiError(undefined);
    try {
      await configureTemplateFields(
        session.templateId,
        session.versionId,
        toFieldRequests(session.fields, draft.variables),
      );
      setFieldsDirty(false);
      return true;
    } catch (error) {
      setApiError(authoringError(t, error, b.error.saveFields));
      return false;
    } finally {
      setSavingFields(false);
    }
  }

  async function saveSigners(session: ServerDraft): Promise<boolean> {
    if (!draft || !signersDirty) return true;
    setSavingSigners(true);
    setApiError(undefined);
    try {
      await configureTemplateSigners(
        session.templateId,
        session.versionId,
        toSignerRoleRequests(draft),
      );
      setSignersDirty(false);
      return true;
    } catch (error) {
      setApiError(authoringError(t, error, b.error.saveSigners));
      return false;
    } finally {
      setSavingSigners(false);
    }
  }

  async function saveMetadata(templateId: string): Promise<boolean> {
    if (!draft || !metadataDirty) return true;
    setSavingMetadata(true);
    setApiError(undefined);
    try {
      await updateTemplateMetadata(templateId, {
        name: draft.name.trim(),
        description: draft.description.trim(),
      });
      setMetadataDirty(false);
      return true;
    } catch (error) {
      setApiError(authoringError(t, error, b.error.saveMetadata));
      return false;
    } finally {
      setSavingMetadata(false);
    }
  }

  /**
   * Chuyển bước, và LƯU phần vừa cấu hình trước khi đi tiếp.
   *
   * Lưu tại đây chứ không lưu theo từng thao tác: kéo một khung chữ ký sinh ra
   * hàng trăm lần đổi toạ độ, và mỗi PUT lại xoá sạch rồi ghi lại toàn bộ vai ký.
   * Đi LÙI thì không lưu — người dùng quay lại để sửa, ghi đè lúc đó là ghi một
   * trạng thái họ đang định bỏ.
   */
  async function goToStep(step: BuilderStep) {
    if (busy) return;
    setPreviewError(undefined);

    const backwards = STEP_ORDER.indexOf(step) < STEP_ORDER.indexOf(activeStep);
    if (backwards) {
      setActiveStep(step);
      return;
    }

    const session = await ensureServerDraft();
    if (!session) return;

    if (activeStep === "VARIABLES" && !(await saveFields(session))) return;
    if (activeStep === "SIGNATURES" && !(await saveSigners(session))) return;

    setActiveStep(step);

    if (step === "VARIABLES") void ensurePreview("HIGHLIGHT", session);
    if (step === "SIGNATURES") {
      void ensurePreview("PLAIN", session);
      if (!selectedRoleId && draft?.roles[0]) setSelectedRoleId(draft.roles[0].id);
    }
    if (step === "REVIEW") void ensurePreview("HIGHLIGHT", session);
  }

  async function openFullPreview() {
    const preview = await ensurePreview("HIGHLIGHT");
    if (preview) setFullscreenPreview({ preview, title: draft?.name || b.fallbackPreviewTitle });
  }

  /** Lưu những phần đang bẩn, không đụng phần còn lại. */
  async function saveDraft() {
    if (!server || busy) return;
    if (!(await saveFields(server))) return;
    if (!(await saveSigners(server))) return;
  }

  /**
   * Chốt mẫu.
   *
   * Lưu hết phần bẩn TRƯỚC: `POST /publish` không nhận thân request, nó chỉ đọc
   * lại những gì hai PUT đã ghi. Một thay đổi còn treo ở client tại thời điểm
   * này đơn giản là không được chốt vào bản đã publish.
   */
  async function publish() {
    if (!server || busy || blockers.length > 0) return;
    if (!(await saveFields(server))) return;
    if (!(await saveSigners(server))) return;

    setPublishing(true);
    setApiError(undefined);
    try {
      const result = await publishTemplateVersion(server.templateId, server.versionId);
      setServer((current) =>
        current ? { ...current, versionStatus: result.versionStatus } : current,
      );
      setStatus(result.templateStatus);

      onSaved?.({
        meta: { id: result.templateId, code: normalizeTemplateCode(code), status: result.templateStatus },
        template: draft,
        templateId: result.templateId,
        versionId: result.versionId,
      });
      if (draft) onSave?.(draft);
      onClose();
    } catch (error) {
      setApiError(authoringError(t, error, b.error.publish));
    } finally {
      setPublishing(false);
    }
  }

  /** Nhánh sửa: metadata là thứ duy nhất backend còn cho đổi. */
  async function saveMetadataOnly() {
    if (!initialMeta?.id || busy) return;
    if (!(await saveMetadata(initialMeta.id))) return;

    onSaved?.({
      meta: { id: initialMeta.id, code, status },
      templateId: initialMeta.id,
    });
    onClose();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        label={editing ? b.titleEdit : b.titleCreate}
        className="flex h-[92vh] w-[96vw] max-w-[96vw]! flex-col overflow-hidden"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-border-muted px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-semibold text-fg">
                {editing ? b.headingEdit : b.headingCreate}
              </h2>
              <StatusChip status={status} />
              {server ? (
                <span className="rounded-sm bg-success-subtle px-1.5 py-0.5 font-mono text-[10px] font-semibold text-success">
                  {b.serverDraft(server.versionNo)}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-muted">
              {metadataOnly ? b.introMetadataOnly : b.intro}
            </p>
          </div>

          {metadataOnly ? null : (
            <button
              type="button"
              disabled={!server || previewBusy === "HIGHLIGHT"}
              onClick={() => void openFullPreview()}
              className="inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12px] font-semibold text-fg hover:bg-inset disabled:cursor-not-allowed disabled:opacity-50"
            >
              {previewBusy === "HIGHLIGHT" ? (
                <SpinnerIcon size={13} className="animate-spin" />
              ) : (
                <EyeSvg />
              )}
              {b.openFullscreen}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-inset hover:text-fg"
          >
            <XIcon size={16} />
          </button>
        </header>

        {metadataOnly ? null : (
          <BuilderStepper t={t} active={activeStep} onChange={(step) => void goToStep(step)} />
        )}

        <input
          ref={inputRef}
          type="file"
          accept={TEMPLATE_ACCEPTED_EXTENSIONS.join(",")}
          className="sr-only"
          onChange={(event) => {
            attachFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <main className="min-h-0 flex-1 overflow-hidden bg-canvas">
          {metadataOnly ? (
            <MetadataOnlyStep
              t={t}
              name={draft?.name ?? initialMeta?.name ?? ""}
              description={draft?.description ?? initialMeta?.description ?? ""}
              code={code}
              status={status}
              locked={metadataLocked}
              apiError={apiError}
              onNameChange={(name) => {
                setDraft((current) =>
                  current
                    ? { ...current, name }
                    : { ...createTemplate({ name: "", size: 0 }), name, description: initialMeta?.description ?? "" },
                );
                setMetadataDirty(true);
              }}
              onDescriptionChange={(description) => {
                setDraft((current) =>
                  current
                    ? { ...current, description }
                    : { ...createTemplate({ name: "", size: 0 }), name: initialMeta?.name ?? "", description },
                );
                setMetadataDirty(true);
              }}
            />
          ) : null}

          {!metadataOnly && activeStep === "DOCUMENT" ? (
            <DocumentStep
              t={t}
              draft={draft}
              code={code}
              status={status}
              creating={creating}
              fileError={fileError}
              apiError={apiError}
              server={server}
              onCodeChange={(value) => setCode(normalizeTemplateCode(value))}
              onNameChange={(name) =>
                setDraft((current) => (current ? { ...current, name } : current))
              }
              onDescriptionChange={(description) =>
                setDraft((current) => (current ? { ...current, description } : current))
              }
              onPickFile={() => inputRef.current?.click()}
            />
          ) : null}

          {!metadataOnly && activeStep === "VARIABLES" ? (
            <VariablesStep
              t={t}
              draft={draft}
              detected={serverFields}
              warnings={server?.warnings ?? []}
              preview={highlightPreview}
              previewBusy={previewBusy === "HIGHLIGHT"}
              previewError={previewError}
              onPatch={patchFields}
              onRefreshPreview={() => {
                setHighlightPreview(undefined);
                void ensurePreview("HIGHLIGHT");
              }}
              onOpenPreview={() => {
                if (highlightPreview) {
                  setFullscreenPreview({
                    preview: highlightPreview,
                    title: b.fieldPreviewTitle(draft?.name || b.fallbackName),
                  });
                }
              }}
            />
          ) : null}

          {!metadataOnly && activeStep === "SIGNATURES" ? (
            <SignaturesStep
              t={t}
              draft={draft}
              preview={plainPreview}
              previewBusy={previewBusy === "PLAIN"}
              previewError={previewError}
              selectedRoleId={selectedRoleId}
              onSelectRole={setSelectedRoleId}
              onPatch={patchSigners}
              onRefreshPreview={() => {
                setPlainPreview(undefined);
                void ensurePreview("PLAIN");
              }}
            />
          ) : null}

          {!metadataOnly && activeStep === "REVIEW" ? (
            <ReviewStep
              t={t}
              draft={draft}
              code={code}
              status={status}
              detectedVariables={serverFields}
              blockers={blockers}
              issues={issues}
              preview={highlightPreview}
              previewBusy={previewBusy === "HIGHLIGHT"}
              previewError={previewError}
              reviewPage={reviewPage}
              onReviewPageChange={setReviewPage}
              onOpenPreview={() => void openFullPreview()}
            />
          ) : null}
        </main>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border-muted bg-surface-2 px-5 py-3">
          <div className="min-w-0 flex-1">
            {apiError ? (
              <p className="inline-flex items-start gap-1.5 text-[11px] text-danger">
                <AlertTriangleIcon size={12} className="mt-0.5 shrink-0" />
                {apiError}
              </p>
            ) : activeStep === "REVIEW" && blockers.length > 0 ? (
              <p className="text-[11px] text-danger">{blockers[0]}</p>
            ) : (
              <p className="text-[11px] text-fg-muted">
                {footerHint(t, activeStep, metadataOnly, metadataLocked, server, draft, dirty)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8.5 rounded-md border border-border bg-surface px-3.5 text-[12.5px] font-semibold text-fg hover:bg-inset"
            >
              {t.common.cancel}
            </button>

            {metadataOnly ? (
              <button
                type="button"
                disabled={busy || metadataLocked || !metadataDirty}
                onClick={() => void saveMetadataOnly()}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingMetadata ? (
                  <SpinnerIcon size={14} className="animate-spin" />
                ) : (
                  <CheckIcon size={14} />
                )}
                {b.actions.saveChanges}
              </button>
            ) : (
              <>
                {activeStep !== "DOCUMENT" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void goToStep(previousStep(activeStep))}
                    className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 text-[12.5px] font-semibold text-fg hover:bg-inset disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeftSvg />
                    {b.actions.back}
                  </button>
                ) : null}

                {/*
                 * "Lưu bản nháp" chỉ có nghĩa khi bản nháp đã tồn tại trên máy
                 * chủ, và nó KHÔNG tạo mẫu mới — chỉ đẩy phần đang bẩn lên.
                 */}
                {server && !published ? (
                  <button
                    type="button"
                    disabled={busy || !dirty}
                    onClick={() => void saveDraft()}
                    className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 text-[12.5px] font-semibold text-fg hover:bg-inset disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingFields || savingSigners ? (
                      <SpinnerIcon size={14} className="animate-spin" />
                    ) : null}
                    {b.actions.saveDraft}
                  </button>
                ) : null}

                {activeStep !== "REVIEW" ? (
                  <button
                    type="button"
                    disabled={busy || !canContinue(activeStep, draft, pendingFile, server, code)}
                    onClick={() => void goToStep(nextStep(activeStep))}
                    className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creating || savingFields || savingSigners ? (
                      <SpinnerIcon size={14} className="animate-spin" />
                    ) : null}
                    {activeStep === "DOCUMENT" && !server ? b.actions.submitDocument : b.actions.continue}
                    <ArrowRightSvg />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy || !server || published || blockers.length > 0}
                    onClick={() => void publish()}
                    className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {publishing ? (
                      <SpinnerIcon size={14} className="animate-spin" />
                    ) : (
                      <CheckIcon size={14} />
                    )}
                    {b.actions.publish}
                  </button>
                )}
              </>
            )}
          </div>
        </footer>
      </Dialog>

      {fullscreenPreview ? (
        <FullscreenPreview
          t={t}
          preview={fullscreenPreview.preview}
          title={fullscreenPreview.title}
          overlays={signatureOverlays(draft, b.signatures.unnamedRole)}
          onClose={() => setFullscreenPreview(undefined)}
        />
      ) : null}
    </>
  );
}

/* ========================================================================== */
/* Step 1 — Document                                                         */
/* ========================================================================== */

function DocumentStep({
  t,
  draft,
  code,
  status,
  creating,
  fileError,
  apiError,
  server,
  onCodeChange,
  onNameChange,
  onDescriptionChange,
  onPickFile,
}: {
  t: Dictionary;
  draft?: SignTemplate;
  code: string;
  status: TemplateStatus;
  creating: boolean;
  fileError?: string;
  apiError?: string;
  server?: ServerDraft;
  onCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPickFile: () => void;
}) {
  /*
   * Sau khi bản nháp đã mở trên máy chủ, ba ô này khoá lại: `code` không có
   * endpoint nào đổi được, còn `name`/`description` thì đổi được nhưng bằng
   * `PATCH` riêng — sửa ở đây sẽ tạo cảm giác chúng được lưu cùng bước sau.
   */
  const locked = Boolean(server);
  const d = t.signRequest.template.builder.document;
  return (
    <div className="h-full overflow-y-auto px-5 py-5">
      <div className="mx-auto grid max-w-275 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
        <section className="rounded-lg border border-border bg-surface shadow-sm">
          <SectionHeader
            eyebrow={d.identityEyebrow}
            title={d.identityTitle}
            description={d.identityDescription}
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label={d.codeLabel} hint={d.codeHint}>
              <input
                value={code}
                onChange={(event) => onCodeChange(event.target.value)}
                placeholder={d.codePlaceholder}
                disabled={locked}
                className={`${inputClass} font-mono uppercase disabled:opacity-60`}
              />
            </Field>

            <Field label={d.statusLabel} hint={d.statusHint}>
              <div className="flex h-8.5 items-center">
                <StatusChip status={status} />
              </div>
            </Field>

            <div className="sm:col-span-2">
              <Field label={d.nameLabel}>
                <input
                  value={draft?.name ?? ""}
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder={d.namePlaceholder}
                  className={`${inputClass} disabled:opacity-60`}
                  disabled={!draft || locked}
                />
              </Field>
              {!draft ? (
                <p className="mt-1 text-[11px] text-fg-muted">{d.namePickFileFirst}</p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <Field label={d.descriptionLabel} hint={d.descriptionHint}>
                <textarea
                  value={draft?.description ?? ""}
                  onChange={(event) => onDescriptionChange(event.target.value)}
                  rows={3}
                  disabled={!draft || locked}
                  className={`${inputClass} h-auto resize-y py-2 disabled:opacity-60`}
                />
              </Field>
            </div>

            {locked ? (
              <div className="sm:col-span-2">
                <Notice>{d.lockedNote}</Notice>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface shadow-sm">
          <SectionHeader
            eyebrow={d.sourceEyebrow}
            title={d.sourceTitle}
            description={d.sourceDescription}
          />

          <div className="p-4">
            {!draft?.file?.name ? (
              <button
                type="button"
                onClick={onPickFile}
                disabled={creating}
                className="flex min-h-52 w-full flex-col items-center justify-center gap-2.5 rounded-lg border-2 border-dashed border-border bg-surface-2 px-6 text-center hover:border-accent disabled:cursor-wait disabled:opacity-70"
              >
                <span className="flex size-11 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                  <UploadSvg />
                </span>
                <span className="text-[13.5px] font-semibold text-fg">{d.dropzone}</span>
                <span className="max-w-[48ch] text-[11.5px] leading-relaxed text-fg-muted">
                  {d.dropzoneHint(formatBytes(MAX_TEMPLATE_FILE_BYTES))}
                </span>
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-subtle font-mono text-[9.5px] font-bold uppercase text-accent">
                    {draft.file.format ?? "FILE"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-fg">
                      {draft.file.name}
                    </span>
                    <span className="block font-mono text-[10.5px] text-fg-subtle">
                      {formatBytes(draft.file.size)}
                    </span>
                  </span>
                  {/*
                    * Đổi tệp sau khi đã nộp là chuyện của một BẢN khác, mà
                    * backend chưa có API tạo bản mới — nên nút biến mất thay vì
                    * hứa một thao tác không chạy được.
                    */}
                  {locked ? null : (
                    <button
                      type="button"
                      onClick={onPickFile}
                      disabled={creating}
                      className="h-8 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-fg hover:bg-inset disabled:opacity-50"
                    >
                      {d.replaceFile}
                    </button>
                  )}
                </div>

                <AnalysisStatus t={t} creating={creating} server={server} />

                {server ? (
                  <div className="grid grid-cols-3 gap-2">
                    <Metric label={d.metricFields} value={String(server.fields.length)} />
                    <Metric
                      label={d.metricPages}
                      value={server.pageCount ? String(server.pageCount) : "—"}
                    />
                    <Metric label={d.metricVersion} value={shortId(server.versionId)} mono />
                  </div>
                ) : null}

                {server?.warnings.length ? (
                  <Notice tone="warning">{server.warnings.join(" · ")}</Notice>
                ) : null}
              </div>
            )}

            {fileError ? <Notice tone="danger">{fileError}</Notice> : null}
            {apiError ? <Notice tone="danger">{apiError}</Notice> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Step 2 — Variables                                                        */
/* ========================================================================== */

function VariablesStep({
  t,
  draft,
  detected,
  warnings,
  preview,
  previewBusy,
  previewError,
  onPatch,
  onRefreshPreview,
  onOpenPreview,
}: {
  t: Dictionary;
  draft?: SignTemplate;
  detected: CreatedTemplateField[];
  warnings: string[];
  preview?: PreviewDocument;
  previewBusy: boolean;
  previewError?: string;
  onPatch: (next: SignTemplate) => void;
  onRefreshPreview: () => void;
  onOpenPreview: () => void;
}) {
  const b = t.signRequest.template.builder;
  const v = b.variables;
  if (!draft) return <EmptyState title={b.noDocumentTitle} body={b.noDocumentBody} />;

  return (
    <div className="grid h-full min-h-0 lg:grid-cols-[440px_minmax(0,1fr)]">
      <section className="min-h-0 overflow-y-auto border-r border-border-muted bg-surface">
        <div className="sticky top-0 z-10 border-b border-border-muted bg-surface px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[13.5px] font-semibold text-fg">{v.title}</h3>
              <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">{v.description}</p>
            </div>
            <span className="rounded-sm bg-inset px-2 py-1 font-mono text-[10.5px] font-semibold text-fg-muted">
              {v.count(detected.length)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 p-4">
          {warnings.length > 0 ? <Notice tone="warning">{warnings.join(" · ")}</Notice> : null}

          {detected.length === 0 ? (
            <Notice>{v.none}</Notice>
          ) : (
            /*
             * Duyệt theo danh sách CỦA MÁY CHỦ, không theo bản nháp: đó mới là
             * tập ô mà `PUT …/fields` bắt phải gửi đủ.
             */
            detected.map((field) => {
              const variable = draft.variables.find((item) => item.key === field.code);
              if (!variable) return null;
              return (
                <DetectedVariableCard
                  key={field.fieldId}
                  t={t}
                  variable={variable}
                  occurrenceCount={field.occurrenceCount}
                  onPatch={(patch) => onPatch(updateTemplateVariable(draft, variable.key, patch))}
                />
              );
            })
          )}
        </div>
      </section>

      <section className="min-h-0 bg-surface-2 p-3">
        <PreviewPanel
          t={t}
          title={v.previewTitle}
          subtitle={v.previewSubtitle}
          preview={preview}
          busy={previewBusy}
          error={previewError}
          onRefresh={onRefreshPreview}
          onFullscreen={onOpenPreview}
        />
      </section>
    </div>
  );
}

function DetectedVariableCard({
  t,
  variable,
  occurrenceCount,
  onPatch,
}: {
  t: Dictionary;
  variable: TemplateVariable;
  occurrenceCount?: number;
  onPatch: (patch: Partial<TemplateVariable>) => void;
}) {
  const b = t.signRequest.template.builder;
  const v = b.variables;
  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-2 border-b border-border-muted px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] font-semibold text-accent">
          {`{{${variable.key}}}`}
        </span>
        {typeof occurrenceCount === "number" ? (
          <span className="rounded-sm bg-inset px-1.5 py-0.5 font-mono text-[9.5px] text-fg-muted">
            {v.occurrences(occurrenceCount)}
          </span>
        ) : null}
        <span title={v.keyLocked} className="text-fg-subtle">
          <LockSvg />
        </span>
      </div>

      <div className="grid gap-2.5 p-3 sm:grid-cols-2">
        <Field label={v.labelLabel}>
          <input
            value={variable.label}
            onChange={(event) => onPatch({ label: event.target.value })}
            placeholder={v.labelPlaceholder}
            className={smallInput}
          />
        </Field>

        <Field label={v.typeLabel}>
          <select
            value={variable.type}
            onChange={(event) => onPatch({ type: event.target.value as VariableType })}
            className={smallInput}
          >
            {VARIABLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {b.variableType[type]}
              </option>
            ))}
          </select>
        </Field>

        {variable.type === "select" ? (
          <div className="sm:col-span-2">
            <Field label={v.optionsLabel} hint={v.optionsHint}>
              <input
                value={variable.options.join(", ")}
                onChange={(event) =>
                  onPatch({
                    options: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                className={smallInput}
              />
            </Field>
          </div>
        ) : null}

        <Field label={v.defaultLabel}>
          <input
            value={variable.defaultValue}
            onChange={(event) => onPatch({ defaultValue: event.target.value })}
            className={smallInput}
          />
        </Field>

        <Field label={v.hintLabel}>
          <input
            value={variable.hint}
            onChange={(event) => onPatch({ hint: event.target.value })}
            className={smallInput}
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2 text-[11.5px] font-semibold text-fg sm:col-span-2">
          <input
            type="checkbox"
            checked={variable.required}
            onChange={(event) => onPatch({ required: event.target.checked })}
            className="size-4 accent-accent"
          />
          {v.requiredLabel}
        </label>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Step 3 — Signature workflow + position                                    */
/* ========================================================================== */

function SignaturesStep({
  t,
  draft,
  preview,
  previewBusy,
  previewError,
  selectedRoleId,
  onSelectRole,
  onPatch,
  onRefreshPreview,
}: {
  t: Dictionary;
  draft?: SignTemplate;
  preview?: PreviewDocument;
  previewBusy: boolean;
  previewError?: string;
  selectedRoleId?: string;
  onSelectRole: (id: string | undefined) => void;
  onPatch: (next: SignTemplate) => void;
  onRefreshPreview: () => void;
}) {
  const b = t.signRequest.template.builder;
  const g = b.signatures;
  if (!draft) return <EmptyState title={b.noDocumentTitle} body={b.noDocumentBody} />;

  const selectedRole = draft.roles.find((role) => role.id === selectedRoleId);
  const ghosts: GhostBox[] = draft.roles
    .filter((role) => role.id !== selectedRoleId && role.config.visible)
    .map((role) => ({
      id: role.id,
      label: role.name.trim() || g.unnamedRole,
      position: role.config.position,
    }));

  return (
    <div className="grid h-full min-h-0 lg:grid-cols-[470px_minmax(0,1fr)]">
      <section className="min-h-0 overflow-y-auto border-r border-border-muted bg-surface">
        <div className="sticky top-0 z-10 border-b border-border-muted bg-surface px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[13.5px] font-semibold text-fg">{g.flowTitle}</h3>
              <p className="mt-0.5 text-[11px] text-fg-muted">{g.flowDescription}</p>
            </div>
            <span className="rounded-sm bg-inset px-2 py-1 font-mono text-[10.5px] font-semibold text-fg-muted">
              {g.roleCount(draft.roles.length)}
            </span>
          </div>
          <div className="mt-2">
            <Notice>{g.flowNotice}</Notice>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4">
          {draft.steps.map((step, stepIndex) => {
            const roles = rolesInStep(draft, stepIndex);
            return (
              <section key={stepIndex} className="rounded-lg border border-border bg-surface shadow-sm">
                <header className="flex flex-wrap items-center gap-2 border-b border-border-muted bg-surface-2 px-3 py-2">
                  <span className="flex size-6 items-center justify-center rounded-full border border-accent bg-accent-subtle font-mono text-[10.5px] font-semibold text-accent">
                    {stepIndex + 1}
                  </span>
                  <input
                    value={step.name}
                    onChange={(event) =>
                      onPatch(updateTemplateStep(draft, stepIndex, { name: event.target.value }))
                    }
                    placeholder={g.stepNamePlaceholder(stepIndex + 1)}
                    className="min-w-24 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[12.5px] font-semibold text-fg hover:border-border focus:border-accent focus:bg-canvas focus:outline-none"
                  />

                  {/*
                    * Vẫn không có công tắc ALL/ANY: `TemplateSignerRole` của máy
                    * chủ không có trường nào chở ngữ nghĩa đó, và mọi vai đều bắt
                    * buộc. Nhiều vai trong một bước thì cùng `signingOrder` —
                    * nghĩa là ký SONG SONG và tất cả đều phải ký, nên nhãn dưới
                    * đây nói đúng thứ sẽ xảy ra thay vì báo lỗi.
                    */}
                  {roles.length > 1 ? (
                    <span className="rounded-sm bg-accent-subtle px-1.5 py-0.5 text-[10.5px] font-semibold text-accent">
                      {g.parallelStep(roles.length)}
                    </span>
                  ) : null}

                  <IconButton
                    label={g.moveStepUp}
                    disabled={stepIndex === 0}
                    onClick={() => onPatch(moveTemplateStep(draft, stepIndex, stepIndex - 1))}
                  >
                    <ChevronUpIcon size={13} />
                  </IconButton>
                  <IconButton
                    label={g.moveStepDown}
                    disabled={stepIndex === draft.steps.length - 1}
                    onClick={() => onPatch(moveTemplateStep(draft, stepIndex, stepIndex + 1))}
                  >
                    <ChevronDownIcon size={13} />
                  </IconButton>
                  <IconButton
                    label={g.deleteStep}
                    disabled={draft.steps.length <= 1}
                    danger
                    onClick={() => onPatch(removeTemplateStep(draft, stepIndex))}
                  >
                    <TrashIcon size={13} />
                  </IconButton>
                </header>

                <div className="flex flex-col gap-2 p-2.5">
                  {roles.map((role) => (
                    <SignatureRoleCard
                      key={role.id}
                      t={t}
                      role={role}
                      selected={role.id === selectedRoleId}
                      onSelect={() => onSelectRole(role.id)}
                      onPatch={(rolePatch) => onPatch(updateTemplateRole(draft, role.id, rolePatch))}
                      onPatchConfig={(configPatch) =>
                        onPatch(updateRoleConfig(draft, role.id, configPatch))
                      }
                      onRemove={() => {
                        const next = removeTemplateRole(draft, role.id);
                        onPatch(next);
                        if (selectedRoleId === role.id) onSelectRole(next.roles[0]?.id);
                      }}
                    />
                  ))}

                  {/*
                    * Thêm được nhiều vai vào cùng một bước: backend nhận nhiều
                    * vai cùng `signingOrder` và cho họ ký song song. Trước đây nút
                    * này biến mất sau vai đầu tiên vì máy chủ từ chối trùng số.
                    */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = addTemplateRole(draft, stepIndex);
                      const added = next.roles.find(
                        (role) => !draft.roles.some((current) => current.id === role.id),
                      );
                      onPatch(next);
                      onSelectRole(added?.id);
                    }}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-surface-2 px-3 text-[11.5px] font-semibold text-fg-muted hover:border-accent hover:text-accent"
                  >
                    <UserPlusIcon size={14} />
                    {roles.length === 0 ? g.addRole : g.addParallelRole}
                  </button>
                </div>
              </section>
            );
          })}

          <button
            type="button"
            onClick={() => onPatch(addTemplateStep(draft))}
            className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-md border border-accent bg-accent px-3.5 text-[12px] font-semibold text-accent-fg hover:opacity-90"
          >
            <PlusIcon size={14} />
            {g.addStep}
          </button>
        </div>
      </section>

      {/*
        * Card có kích thước CỐ ĐỊNH: cao đúng bằng khung, rộng có trần rồi căn
        * giữa. Trước đây nó rộng bằng cả cột phải (gần 2000px trên màn lớn) và
        * thân card tự cuộn, chồng lên thanh cuộn sẵn có của vùng PDF — hai
        * thanh cuộn cho cùng một nội dung. Giờ chỉ vùng PDF cuộn.
        */}
      <section className="flex min-h-0 justify-center bg-surface-2 p-3">
        <div className="flex h-full min-h-0 w-full max-w-205 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-muted px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-fg">
                {selectedRole?.name.trim() || g.positionTitleEmpty}
              </p>
              <p className="text-[10.5px] text-fg-muted">{g.positionHint}</p>
            </div>
            <button
              type="button"
              onClick={onRefreshPreview}
              disabled={previewBusy}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[11.5px] font-semibold text-fg hover:bg-inset disabled:opacity-50"
            >
              {previewBusy ? <SpinnerIcon size={13} className="animate-spin" /> : <RefreshSvg />}
              {g.reloadPdf}
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            {previewBusy ? (
              <PreviewLoading label={g.loadingPlain} />
            ) : previewError ? (
              <EmptyState title={g.previewFailedTitle} body={previewError} />
            ) : !preview ? (
              <EmptyState title={g.noPreviewTitle} body={g.noPreviewBody} />
            ) : !selectedRole ? (
              <EmptyState title={g.noRoleTitle} body={g.noRoleBody} />
            ) : selectedRole.config.visible ? (
              /*
               * Kéo thả chỉ đổi state cục bộ và bật cờ bẩn. Không gọi API ở đây:
               * mỗi lần chuột nhích là một toạ độ mới, còn mỗi `PUT …/signers`
               * lại xoá sạch rồi ghi lại toàn bộ vai ký của bản này.
               */
              <PdfPositionPicker
                t={t}
                fill
                file={preview.file}
                position={selectedRole.config.position}
                others={ghosts}
                onChange={(position) =>
                  onPatch(updateRoleConfig(draft, selectedRole.id, { position }))
                }
              />
            ) : (
              <EmptyState title={g.invisibleTitle} body={g.invisibleBody} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SignatureRoleCard({
  t,
  role,
  selected,
  onSelect,
  onPatch,
  onPatchConfig,
  onRemove,
}: {
  t: Dictionary;
  role: TemplateRole;
  selected: boolean;
  onSelect: () => void;
  onPatch: (patch: Partial<Omit<TemplateRole, "id">>) => void;
  onPatchConfig: (patch: Partial<TemplateRole["config"]>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(selected);
  const g = t.signRequest.config;
  const r = t.signRequest.template.builder.signatures;

  useEffect(() => {
    if (selected) setExpanded(true);
  }, [selected]);

  return (
    <div
      className={`rounded-md border bg-surface transition-colors ${
        selected ? "border-accent shadow-sm" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
      >
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
            role.config.visible
              ? "bg-success-subtle text-success"
              : "bg-warning-subtle text-warning"
          }`}
        >
          {role.config.visible ? <MapPinSvg /> : <AlertTriangleIcon size={13} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold text-fg">
            {role.name.trim() || r.unnamedRole}
          </span>
          <span className="mt-0.5 flex flex-wrap gap-1">
            <Chip>{role.code || r.noCode}</Chip>
            <Chip>{g.baseline[role.config.baselineLevel].label.split(" ")[0]}</Chip>
            <Chip>
              {role.config.visible ? r.pageChip(role.config.position.page) : r.noBox}
            </Chip>
          </span>
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              setExpanded((value) => !value);
            }
          }}
          className="flex size-7 items-center justify-center rounded-md text-fg-muted hover:bg-inset"
        >
          <ChevronDownIcon size={13} className={expanded ? "rotate-180" : ""} />
        </span>
      </button>

      {expanded ? (
        <div className="flex flex-col gap-3 border-t border-border-muted p-2.5">
          <div className="flex gap-2">
            <input
              value={role.name}
              onFocus={onSelect}
              onChange={(event) => onPatch({ name: event.target.value })}
              placeholder={r.roleNamePlaceholder}
              className={`${smallInput} flex-1 font-semibold`}
            />
            <button
              type="button"
              onClick={onRemove}
              aria-label={r.deleteRole}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg-subtle hover:bg-danger-subtle hover:text-danger"
            >
              <TrashIcon size={13} />
            </button>
          </div>

          <Field label={r.roleCodeLabel} hint={r.roleCodeHint}>
            <input
              value={role.code}
              onFocus={onSelect}
              onChange={(event) => onPatch({ code: normalizeRoleCode(event.target.value) })}
              placeholder={r.roleCodePlaceholder}
              className={`${smallInput} font-mono uppercase`}
            />
          </Field>

          <Field label={r.suggestedSigner}>
            <select
              value={role.suggestedUserId ?? ""}
              onChange={(event) => onPatch({ suggestedUserId: event.target.value || undefined })}
              className={smallInput}
            >
              <option value="">{r.noSuggestion}</option>
              {DIRECTORY.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </Field>

          {/*
            * Phương thức ký và thuật toán không còn chọn ở đây: mẫu chỉ chốt
            * CHỖ ký và ai ký, còn cách ký là chuyện của lúc ký thật. Giá trị
            * mặc định trong `config` vẫn được gửi lên nguyên vẹn.
            */}
          <Field label={r.baselineLabel}>
            <select
              value={role.config.baselineLevel}
              onChange={(event) =>
                onPatchConfig({
                  baselineLevel: event.target.value as TemplateRole["config"]["baselineLevel"],
                })
              }
              className={smallInput}
            >
              {BASELINE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {g.baseline[level].label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={r.locationLabel}>
              <input
                value={role.config.location}
                onChange={(event) => onPatchConfig({ location: event.target.value })}
                className={smallInput}
              />
            </Field>
            <Field label={r.reasonLabel}>
              <input
                value={role.config.reason}
                onChange={(event) => onPatchConfig({ reason: event.target.value })}
                className={smallInput}
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-md bg-surface-2 p-2.5">
            <input
              type="checkbox"
              checked={role.config.visible}
              onChange={(event) => onPatchConfig({ visible: event.target.checked })}
              className="mt-0.5 size-4 accent-accent"
            />
            <span>
              <span className="block text-[11.5px] font-semibold text-fg">{r.visibleLabel}</span>
              <span className="block text-[10.5px] text-fg-muted">{r.visibleHint}</span>
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}

/* ========================================================================== */
/* Step 4 — Review                                                           */
/* ========================================================================== */

function ReviewStep({
  t,
  draft,
  code,
  status,
  detectedVariables,
  blockers,
  issues,
  preview,
  previewBusy,
  previewError,
  reviewPage,
  onReviewPageChange,
  onOpenPreview,
}: {
  t: Dictionary;
  draft?: SignTemplate;
  code: string;
  status: TemplateStatus;
  detectedVariables: CreatedTemplateField[];
  blockers: string[];
  issues: TemplateIssue[];
  preview?: PreviewDocument;
  previewBusy: boolean;
  previewError?: string;
  reviewPage: number;
  onReviewPageChange: (page: number) => void;
  onOpenPreview: () => void;
}) {
  const b = t.signRequest.template.builder;
  const v = b.review;
  if (!draft) return <EmptyState title={v.emptyTitle} body={v.emptyBody} />;

  const overlays = signatureOverlays(draft, b.signatures.unnamedRole);

  return (
    /*
     * Hai cột: PDF bên phải, mọi thứ còn lại bên trái.
     *
     * Trước đây tất cả xếp dọc trong một cột cuộn chung, và khung PDF bị đóng
     * cứng ở `h-130` trong khi picker bên trong lại tự cao theo `max-h-[64vh]`
     * — phần thừa ra bị `overflow-hidden` của section cắt cụt, nên đáy trang PDF
     * không bao giờ nhìn thấy được. Giờ mỗi cột tự cuộn phần của mình, còn card
     * PDF cao đúng bằng khung và chỉ vùng trang cuộn.
     */
    <div className="h-full overflow-y-auto px-5 py-5 lg:overflow-hidden">
      <div className="mx-auto grid max-w-400 gap-4 lg:h-full lg:min-h-0 lg:grid-cols-2">
        <div className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard
              label={v.summaryTemplate}
              value={draft.name || "—"}
              sub={code || v.summaryNoCode}
            />
            <SummaryCard
              label={v.summaryFields}
              value={String(detectedVariables.length)}
              sub={v.summaryFieldsSub}
            />
            <SummaryCard
              label={v.summarySteps}
              value={String(draft.steps.length)}
              sub={v.summaryStepsSub(draft.roles.length)}
            />
            <SummaryCard
              label={v.summaryStatus}
              value={b.status[status]}
              sub={v.summaryStatusSub}
            />
          </div>

          <section className="rounded-lg border border-border bg-surface shadow-sm">
            <SectionHeader
              eyebrow={v.publishEyebrow}
              title={v.publishTitle}
              description={v.publishDescription}
              action={
                <button
                  type="button"
                  onClick={onOpenPreview}
                  disabled={previewBusy}
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-3.5 text-[12px] font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50"
                >
                  {previewBusy ? <SpinnerIcon size={13} className="animate-spin" /> : <EyeSvg />}
                  {b.openFullscreen}
                </button>
              }
            />

            {/* Cột trái giờ chỉ rộng một nửa — hai danh sách này xếp dọc. */}
            <div className="grid gap-4 p-4">
              <div>
                <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
                  {v.blockersTitle}
                </p>
                {blockers.length === 0 ? (
                  <div className="flex items-start gap-2 rounded-md border border-success bg-success-subtle p-3 text-[11.5px] text-success">
                    <CheckIcon size={14} className="mt-0.5 shrink-0" />
                    <span className="font-semibold">{v.noBlockers}</span>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {blockers.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 rounded-md border border-danger bg-danger-subtle p-3 text-[11.5px] text-danger"
                      >
                        <AlertTriangleIcon size={13} className="mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
                  {v.warningsTitle}
                </p>
                {issues.length === 0 ? (
                  <Notice>{v.noWarnings}</Notice>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {issues.map((issue, index) => (
                      <li
                        key={`${issue.code}-${issue.roleId ?? issue.variableKey ?? issue.stepIndex ?? index}`}
                        className="flex items-start gap-2 rounded-md border border-warning bg-warning-subtle p-3 text-[11.5px] text-warning"
                      >
                        <AlertTriangleIcon size={13} className="mt-0.5 shrink-0" />
                        {describeTemplateIssue(t, issue)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface shadow-sm">
            <SectionHeader
              eyebrow={v.workflowEyebrow}
              title={v.workflowTitle}
              description={v.workflowDescription}
            />
            <div className="p-4">
              <div className="flex flex-col gap-3">
                {draft.steps.map((step, stepIndex) => (
                  <div key={stepIndex} className="flex gap-3">
                    <div className="flex w-8 shrink-0 flex-col items-center">
                      <span className="flex size-7 items-center justify-center rounded-full border border-accent bg-accent-subtle font-mono text-[10.5px] font-semibold text-accent">
                        {stepIndex + 1}
                      </span>
                      {stepIndex < draft.steps.length - 1 ? (
                        <span className="mt-1 h-full min-h-6 w-px bg-border" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12.5px] font-semibold text-fg">{step.name || v.stepFallback(stepIndex + 1)}</p>
                        <Chip>{v.orderChip(stepIndex + 1)}</Chip>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rolesInStep(draft, stepIndex).map((role) => (
                          <span
                            key={role.id}
                            className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-[11px] text-fg"
                          >
                            <strong>{role.name || v.unnamedRole}</strong>
                            <span className="ml-1.5 font-mono text-fg-subtle">{role.code}</span>
                            <span className="ml-1.5 text-fg-muted">
                              ·{" "}
                              {role.config.visible
                                ? b.signatures.pageChip(role.config.position.page)
                                : b.signatures.noBox}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ---------------- Cột phải: preview PDF ---------------- */}
        <section className="flex h-130 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:h-auto lg:min-h-0">
          <SectionHeader
            eyebrow={v.finalEyebrow}
            title={v.finalTitle}
            description={v.finalDescription}
          />
          <div className="flex min-h-0 flex-1 flex-col p-3">
            {previewBusy ? (
              <PreviewLoading label={v.loadingHighlight} />
            ) : previewError ? (
              <EmptyState title={v.previewFailedTitle} body={previewError} />
            ) : !preview ? (
              <EmptyState title={v.noPreviewTitle} body={v.noPreviewBody} />
            ) : (
              <PdfPositionPicker
                t={t}
                fill
                file={preview.file}
                position={draft.roles[0]?.config.position ?? { page: 1, xPct: 0, yPct: 0, widthPct: 0, heightPct: 0 }}
                others={overlays}
                readOnly
                hidePrimaryBox
                viewPage={reviewPage}
                onViewPageChange={onReviewPageChange}
                onChange={() => undefined}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Preview viewer                                                            */
/* ========================================================================== */

function PreviewPanel({
  t,
  title,
  subtitle,
  preview,
  busy,
  error,
  onRefresh,
  onFullscreen,
}: {
  t: Dictionary;
  title: string;
  subtitle: string;
  preview?: PreviewDocument;
  busy: boolean;
  error?: string;
  onRefresh: () => void;
  onFullscreen: () => void;
}) {
  const p = t.signRequest.template.builder.previewPanel;
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-muted px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-fg">{title}</p>
          <p className="text-[10.5px] text-fg-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[11.5px] font-semibold text-fg hover:bg-inset disabled:opacity-50"
        >
          {busy ? <SpinnerIcon size={13} className="animate-spin" /> : <RefreshSvg />}
          {p.refresh}
        </button>
        <button
          type="button"
          onClick={onFullscreen}
          disabled={!preview}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[11.5px] font-semibold text-fg hover:bg-inset disabled:opacity-50"
        >
          <ExpandSvg />
          {p.fullscreen}
        </button>
      </div>

      <div className="min-h-0 flex-1 bg-surface-2 p-3">
        {busy ? (
          <PreviewLoading label={p.loading} />
        ) : error ? (
          <EmptyState title={p.errorTitle} body={error} />
        ) : preview ? (
          <PdfReadOnlyViewer t={t} preview={preview} />
        ) : (
          <EmptyState title={p.emptyTitle} body={p.emptyBody} />
        )}
      </div>
    </div>
  );
}

/**
 * Khung chữ ký của mọi vai, vẽ ở frontend chứ không nhờ backend nướng vào PDF:
 * chúng chưa tồn tại ở đâu ngoài bản nháp này, và một biến thể preview thứ ba
 * chỉ để xem một lần là thừa.
 */
function signatureOverlays(draft: SignTemplate | undefined, unnamed: string): GhostBox[] {
  if (!draft) return [];
  return orderedRoles(draft)
    .filter((role) => role.config.visible)
    .map((role, index) => ({
      id: role.id,
      label: `${index + 1}. ${role.name.trim() || unnamed}`,
      position: role.config.position,
    }));
}

function FullscreenPreview({
  t,
  preview,
  title,
  overlays,
  onClose,
}: {
  t: Dictionary;
  preview: PreviewDocument;
  title: string;
  overlays: GhostBox[];
  onClose: () => void;
}) {
  const f = t.signRequest.template.builder.fullscreen;
  const [page, setPage] = useState(1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={f.label(title)}
      className="fixed inset-0 z-100 flex flex-col bg-canvas"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3 shadow-sm">
        <span className="flex size-8 items-center justify-center rounded-md bg-accent-subtle text-accent">
          <FileTextIcon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-fg">{title}</p>
          <p className="text-[10.5px] text-fg-muted">{f.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12px] font-semibold text-fg hover:bg-inset"
        >
          <XIcon size={14} />
          {f.close}
        </button>
      </header>
      <div className="min-h-0 flex-1 bg-surface-2 p-3">
        {/*
          * Canvas pdf.js chứ không phải trình xem PDF của trình duyệt: khung chữ
          * ký là phần tử React vẽ đè theo toạ độ chuẩn hoá, mà một `<object>`
          * nhúng thì không cho vẽ đè lên. Đánh đổi là mất chọn/tìm văn bản —
          * chấp nhận được, vì đây đúng là màn để NHÌN chỗ ký trước khi publish.
          */}
        <PdfPositionPicker
          t={t}
          fill
          file={preview.file}
          position={{ page, xPct: 0, yPct: 0, widthPct: 0, heightPct: 0 }}
          others={overlays}
          readOnly
          hidePrimaryBox
          viewPage={page}
          onViewPageChange={setPage}
          onChange={() => undefined}
        />
      </div>
    </div>
  );
}

function PdfReadOnlyViewer({
  t,
  preview,
  fullscreen,
}: {
  t: Dictionary;
  preview: PreviewDocument;
  fullscreen?: boolean;
}) {
  const w = t.signRequest.template.builder.viewer;
  const objectUrl = useObjectUrl(preview.file);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [fitWidth, setFitWidth] = useState(true);
  const pageCount = Math.max(1, preview.pageCount || 1);

  useEffect(() => {
    setPage((current) => clamp(current, 1, pageCount));
  }, [pageCount]);

  const src = objectUrl
    ? `${objectUrl}#toolbar=0&navpanes=0&scrollbar=1&page=${page}&zoom=${fitWidth ? "page-width" : zoom}`
    : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-inset">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-2.5 py-2">
        <div className="flex items-center gap-1">
          <ToolbarButton
            label={w.previousPage}
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ChevronLeftSvg />
          </ToolbarButton>
          <div className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-canvas px-2 text-[11.5px] text-fg">
            <input
              value={page}
              inputMode="numeric"
              aria-label={w.currentPage}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value)) setPage(clamp(value, 1, pageCount));
              }}
              className="w-8 bg-transparent text-center font-mono outline-none"
            />
            <span className="text-fg-subtle">/</span>
            <span className="font-mono text-fg-muted">{pageCount}</span>
          </div>
          <ToolbarButton
            label={w.nextPage}
            disabled={page >= pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            <ChevronRightSvg />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1">
          <ToolbarButton
            label={w.zoomOut}
            disabled={fitWidth || zoom <= 50}
            onClick={() => setZoom((value) => Math.max(50, value - 10))}
          >
            <MinusSvg />
          </ToolbarButton>
          <button
            type="button"
            onClick={() => setFitWidth(false)}
            className={`h-8 min-w-14 rounded-md border px-2 font-mono text-[10.5px] font-semibold ${
              !fitWidth
                ? "border-accent bg-accent-subtle text-accent"
                : "border-border bg-surface text-fg-muted hover:bg-inset"
            }`}
          >
            {zoom}%
          </button>
          <ToolbarButton
            label={w.zoomIn}
            disabled={fitWidth || zoom >= 200}
            onClick={() => setZoom((value) => Math.min(200, value + 10))}
          >
            <PlusSvg />
          </ToolbarButton>
          <button
            type="button"
            onClick={() => setFitWidth(true)}
            className={`h-8 rounded-md border px-2.5 text-[10.5px] font-semibold ${
              fitWidth
                ? "border-accent bg-accent-subtle text-accent"
                : "border-border bg-surface text-fg-muted hover:bg-inset"
            }`}
          >
            {w.fitWidth}
          </button>
          {fullscreen ? (
            <span className="ml-1 hidden font-mono text-[10px] text-fg-subtle sm:inline">
              {w.pages(pageCount)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-inset p-2">
        {src ? (
          <iframe
            title={w.frameTitle}
            src={src}
            className="h-full w-full rounded-sm border-0 bg-white"
          />
        ) : (
          <PreviewLoading label={w.preparing} />
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Shared UI                                                                 */
/* ========================================================================== */

function BuilderStepper({
  t,
  active,
  onChange,
}: {
  t: Dictionary;
  active: BuilderStep;
  onChange: (step: BuilderStep) => void;
}) {
  const s = t.signRequest.template.builder.stepper;
  const steps: Array<{ id: BuilderStep; label: string; caption: string }> = [
    { id: "DOCUMENT", ...s.document },
    { id: "VARIABLES", ...s.variables },
    { id: "SIGNATURES", ...s.signatures },
    { id: "REVIEW", ...s.review },
  ];
  const activeIndex = steps.findIndex((step) => step.id === active);

  return (
    <nav className="shrink-0 border-b border-border-muted bg-surface px-5" aria-label={s.navLabel}>
      <ol className="mx-auto flex max-w-245 items-stretch overflow-x-auto">
        {steps.map((step, index) => {
          const current = step.id === active;
          const completed = index < activeIndex;
          return (
            <li key={step.id} className="min-w-42.5 flex-1">
              <button
                type="button"
                onClick={() => onChange(step.id)}
                className={`flex w-full items-center gap-2 border-b-2 px-3 py-2.5 text-left transition-colors ${
                  current
                    ? "border-accent text-accent"
                    : "border-transparent text-fg-muted hover:border-border hover:text-fg"
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-semibold ${
                    current
                      ? "border-accent bg-accent-subtle text-accent"
                      : completed
                        ? "border-success bg-success-subtle text-success"
                        : "border-border bg-surface-2 text-fg-subtle"
                  }`}
                >
                  {completed ? <CheckIcon size={11} /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-semibold">{step.label}</span>
                  <span className="block truncate text-[9.5px] font-normal opacity-75">{step.caption}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function AnalysisStatus({
  t,
  creating,
  server,
}: {
  t: Dictionary;
  creating: boolean;
  server?: ServerDraft;
}) {
  const d = t.signRequest.template.builder.document;
  if (creating) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-accent bg-accent-subtle px-3 py-2.5 text-[11.5px] text-accent">
        <SpinnerIcon size={13} className="animate-spin" />
        <span>
          <strong>{d.analysisBusyStrong}</strong> {d.analysisBusy}
        </span>
      </div>
    );
  }
  if (server) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-success bg-success-subtle px-3 py-2.5 text-[11.5px] text-success">
        <CheckIcon size={13} />
        <span>
          <strong>{d.analysisDoneStrong}</strong> {d.analysisDone(server.fields.length)}
        </span>
      </div>
    );
  }
  return <Notice>{d.analysisPending}</Notice>;
}

/**
 * Nhánh sửa một mẫu đã tồn tại.
 *
 * Ít ỏi vì backend chỉ còn chừng đó: bản đã publish bất biến, không có API tạo
 * bản mới, và `PATCH` metadata cũng chỉ chạy khi template còn DRAFT.
 */
function MetadataOnlyStep({
  t,
  name,
  description,
  code,
  status,
  locked,
  apiError,
  onNameChange,
  onDescriptionChange,
}: {
  t: Dictionary;
  name: string;
  description: string;
  code: string;
  status: TemplateStatus;
  locked: boolean;
  apiError?: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}) {
  const m = t.signRequest.template.builder.metadataOnly;
  return (
    <div className="h-full overflow-y-auto px-5 py-5">
      <div className="mx-auto flex max-w-180 flex-col gap-4">
        <section className="rounded-lg border border-border bg-surface shadow-sm">
          <SectionHeader
            eyebrow={m.eyebrow}
            title={m.title}
            description={m.description}
          />
          <div className="grid gap-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={m.codeLabel}>
                <input value={code} disabled className={`${inputClass} font-mono opacity-60`} />
              </Field>
              <Field label={m.statusLabel}>
                <div className="flex h-8.5 items-center">
                  <StatusChip status={status} />
                </div>
              </Field>
            </div>

            <Field label={m.nameLabel}>
              <input
                value={name}
                disabled={locked}
                onChange={(event) => onNameChange(event.target.value)}
                className={`${inputClass} disabled:opacity-60`}
              />
            </Field>

            <Field label={m.descriptionLabel}>
              <textarea
                value={description}
                rows={3}
                disabled={locked}
                onChange={(event) => onDescriptionChange(event.target.value)}
                className={`${inputClass} h-auto resize-y py-2 disabled:opacity-60`}
              />
            </Field>

            {locked ? (
              <Notice tone="warning">{m.lockedNote}</Notice>
            ) : (
              <Notice>{m.editableNote}</Notice>
            )}

            {apiError ? <Notice tone="danger">{apiError}</Notice> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start gap-3 border-b border-border-muted px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[9.5px] font-semibold uppercase tracking-widest text-accent">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-[13.5px] font-semibold text-fg">{title}</h3>
        {description ? (
          <p className="mt-0.5 max-w-[70ch] text-[11px] leading-relaxed text-fg-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-fg">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[10.5px] text-fg-muted">{hint}</span> : null}
    </label>
  );
}

function Notice({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warning" | "danger";
}) {
  const cls =
    tone === "warning"
      ? "border-warning bg-warning-subtle text-warning"
      : tone === "danger"
        ? "border-danger bg-danger-subtle text-danger"
        : "border-border bg-surface-2 text-fg-muted";
  return <div className={`mt-2 rounded-md border px-3 py-2.5 text-[11px] leading-relaxed ${cls}`}>{children}</div>;
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border-muted bg-surface-2 px-2.5 py-2">
      <p className="text-[9.5px] uppercase tracking-[0.06em] text-fg-subtle">{label}</p>
      <p className={`mt-1 truncate text-[12px] font-semibold text-fg ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3.5 shadow-sm">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
      <p className="mt-1.5 truncate text-[17px] font-semibold text-fg">{value}</p>
      <p className="mt-0.5 truncate text-[10.5px] text-fg-muted">{sub}</p>
    </div>
  );
}

function StatusChip({ status }: { status: TemplateStatus }) {
  const cls =
    status === "ACTIVE"
      ? "bg-success-subtle text-success"
      : status === "INACTIVE"
        ? "bg-warning-subtle text-warning"
        : status === "ARCHIVED"
          ? "bg-inset text-fg-muted"
          : "bg-accent-subtle text-accent";
  return (
    <span className={`rounded-sm px-1.5 py-0.5 font-mono text-[9.5px] font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm bg-inset px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-fg-muted">
      {children}
    </span>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full min-h-52 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface px-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-inset text-fg-muted">
        <FileTextIcon size={18} />
      </span>
      <p className="text-[12.5px] font-semibold text-fg">{title}</p>
      <p className="max-w-[52ch] text-[11px] leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}

function PreviewLoading({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-52 items-center justify-center rounded-md border border-dashed border-border bg-surface">
      <div className="flex items-center gap-2 text-[11.5px] text-fg-muted">
        <SpinnerIcon size={14} className="animate-spin" />
        {label}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex size-7 items-center justify-center rounded-md border border-border bg-surface text-fg-muted disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "hover:bg-danger-subtle hover:text-danger" : "hover:bg-inset hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-md border border-border bg-surface text-fg-muted hover:bg-inset hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/* ========================================================================== */
/* Model helpers                                                             */
/* ========================================================================== */

/**
 * Danh sách biến của bản nháp = danh sách của MÁY CHỦ, giữ lại cấu hình cũ nếu
 * cùng khoá.
 *
 * Trả về đúng tập của máy chủ chứ không hợp nhất hai bên: một biến chỉ có ở
 * frontend là biến không tồn tại trong tệp, và gửi nó lên chỉ dẫn tới 400.
 */
function reconcileDetectedVariables(
  current: TemplateVariable[],
  detected: CreatedTemplateField[],
): TemplateVariable[] {
  const previous = new Map(current.map((variable) => [variable.key, variable]));
  return detected.map((field) => previous.get(field.code) ?? createVariable(field.code));
}

function describeTemplateIssue(t: Dictionary, issue: TemplateIssue): string {
  const messages = t.signRequest.template.editor.issue;
  switch (issue.code) {
    case "NO_NAME":
      return messages.NO_NAME;
    case "NO_FILE":
      return messages.NO_FILE;
    case "NO_ROLE":
      return messages.NO_ROLE;
    case "ROLE_WITHOUT_NAME":
      return messages.ROLE_WITHOUT_NAME;
    case "EMPTY_STEP":
      return messages.EMPTY_STEP((issue.stepIndex ?? 0) + 1);
    case "DUPLICATE_VARIABLE_KEY":
      return messages.DUPLICATE_VARIABLE_KEY(issue.variableKey ?? "");
    case "SELECT_WITHOUT_OPTIONS":
      return messages.SELECT_WITHOUT_OPTIONS(issue.variableKey ?? "");
    case "UNDECLARED_VARIABLE":
      return messages.UNDECLARED_VARIABLE(issue.variableKey ?? "");
  }
}

function footerHint(
  t: Dictionary,
  step: BuilderStep,
  metadataOnly: boolean,
  metadataLocked: boolean,
  server?: ServerDraft,
  draft?: SignTemplate,
  dirty?: boolean,
): string {
  const h = t.signRequest.template.builder.hint;
  if (metadataOnly) {
    return metadataLocked ? h.metadataLocked : h.metadataEditable;
  }

  switch (step) {
    case "DOCUMENT":
      return server
        ? h.documentReady(server.fields.length, server.pageCount)
        : h.documentPending;
    case "VARIABLES":
      return h.variables(draft?.variables.length ?? 0);
    case "SIGNATURES":
      return h.signatures(draft?.roles.length ?? 0, draft?.steps.length ?? 0);
    case "REVIEW":
      return dirty ? h.reviewDirty : h.reviewClean;
  }
}

/**
 * Điều kiện tối thiểu để đi tiếp. Rào chặt hơn ở `authoringBlockers` — đây chỉ
 * chặn những thứ khiến chính lời gọi của bước này không dựng nổi.
 */
function canContinue(
  step: BuilderStep,
  draft?: SignTemplate,
  pendingFile?: File,
  server?: ServerDraft,
  code?: string,
): boolean {
  if (step === "DOCUMENT") {
    if (server) return true;
    return Boolean(pendingFile && draft?.name.trim() && code?.trim());
  }
  if (step === "VARIABLES") return Boolean(server);
  if (step === "SIGNATURES") return Boolean(server && draft?.roles.length);
  return true;
}

const STEP_ORDER: BuilderStep[] = ["DOCUMENT", "VARIABLES", "SIGNATURES", "REVIEW"];

function nextStep(step: BuilderStep): BuilderStep {
  return STEP_ORDER[Math.min(STEP_ORDER.indexOf(step) + 1, STEP_ORDER.length - 1)];
}

function previousStep(step: BuilderStep): BuilderStep {
  return STEP_ORDER[Math.max(STEP_ORDER.indexOf(step) - 1, 0)];
}

/** Đoán định dạng từ đuôi tệp — chỉ để hiện nhãn, không dùng để quyết định gì. */
function formatOf(fileName: string): SignTemplate["file"]["format"] {
  const extension = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
  if (extension === "docx") return "WORD";
  if (extension === "xlsx") return "EXCEL";
  return undefined;
}

function shortId(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 7)}…${value.slice(-5)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function useObjectUrl(file?: File): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!file) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

/**
 * Đọc thân lỗi của một lời gọi trả TỆP.
 *
 * Lớp proxy đổi lỗi của backend từ nhị phân sang problem+json, nên nhánh lỗi
 * của một request `Accept: application/pdf` vẫn đọc được bằng đúng đường như
 * mọi lời gọi JSON khác.
 */
function readPreviewProblem(response: Response): Promise<Error> {
  return readProblem(response);
}

/**
 * Câu hiển thị cho một lỗi của các lời gọi soạn mẫu.
 *
 * `ActorRequiredError` được tách riêng vì nó KHÔNG phải lỗi của máy chủ — lời
 * gọi còn chưa rời trình duyệt. Nuốt nó vào câu mặc định ("không lưu được…") sẽ
 * đẩy người dùng đi tìm lỗi ở backend, trong khi thứ họ cần làm là chọn danh
 * tính. `errorMessage` lo phần còn lại: mã nghiệp vụ của backend
 * (`TEMPLATE_CODE_ALREADY_EXISTS`, `SIGNATURE_SLOT_OUT_OF_BOUNDS`…) được giữ
 * nguyên kèm `detail`, không bị gộp thành một câu chung.
 */
function authoringError(t: Dictionary, error: unknown, fallback: string): string {
  if (error instanceof ActorRequiredError) return t.signRequest.actor.required;
  return errorMessage(error, fallback);
}

/* ========================================================================== */
/* Tiny SVG icons — local để không bắt project bổ sung icon exports mới      */
/* ========================================================================== */

function Svg({ children, size = 14 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function UploadSvg() {
  return <Svg size={21}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></Svg>;
}
function EyeSvg() {
  return <Svg><path d="M2.06 12.35a1 1 0 0 1 0-.7C3.69 7.49 7.7 5 12 5c4.3 0 8.31 2.49 9.94 6.65a1 1 0 0 1 0 .7C20.31 16.51 16.3 19 12 19c-4.3 0-8.31-2.49-9.94-6.65Z"/><circle cx="12" cy="12" r="3"/></Svg>;
}
function RefreshSvg() {
  return <Svg><path d="M20 6v6h-6"/><path d="M20 12a8 8 0 1 0-2.34 5.66L20 15"/></Svg>;
}
function ExpandSvg() {
  return <Svg><path d="M15 3h6v6"/><path d="m21 3-7 7"/><path d="M9 21H3v-6"/><path d="m3 21 7-7"/></Svg>;
}
function LockSvg() {
  return <Svg size={13}><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Svg>;
}
function MapPinSvg() {
  return <Svg size={13}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></Svg>;
}
function ArrowLeftSvg() {
  return <Svg><path d="m15 18-6-6 6-6"/></Svg>;
}
function ArrowRightSvg() {
  return <Svg><path d="m9 18 6-6-6-6"/></Svg>;
}
function ChevronLeftSvg() {
  return <Svg><path d="m15 18-6-6 6-6"/></Svg>;
}
function ChevronRightSvg() {
  return <Svg><path d="m9 18 6-6-6-6"/></Svg>;
}
function MinusSvg() {
  return <Svg><path d="M5 12h14"/></Svg>;
}
function PlusSvg() {
  return <Svg><path d="M5 12h14"/><path d="M12 5v14"/></Svg>;
}

const inputClass =
  "h-9 w-full rounded-md border border-border bg-canvas px-2.5 text-[12.5px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-muted";

const smallInput =
  "h-8 w-full rounded-md border border-border bg-canvas px-2 text-[11.5px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none";