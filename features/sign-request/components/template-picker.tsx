"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { TemplateDetail, TemplateListItem } from "@/lib/types/workflow";
import {
  AlertTriangleIcon,
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  LayersIcon,
  LockIcon,
  PenLineIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersIcon,
  SpinnerIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { fillableFields, groupRolesByStep } from "../server-template";
import { PdfPageCanvas } from "./pdf-page-canvas";

/**
 * Chọn mẫu — cửa vào của cả tính năng.
 *
 * Thẻ mẫu nói ba con số trước khi nói bất cứ điều gì khác: bao nhiêu chữ ký, bao
 * nhiêu bước, bao nhiêu ô phải điền. Đó đúng là ba câu hỏi quyết định "mẫu này
 * có phải cái mình cần không", và trả lời chúng bằng cách bắt người dùng mở từng
 * mẫu ra xem là cách chắc chắn nhất để họ quay về tự tải tệp lên.
 *
 * Danh sách đến từ `GET /api/templates?status=ACTIVE`. Việc soạn nội dung một
 * mẫu (cấu hình ô → cấu hình vai ký → publish một phiên bản) vẫn thuộc về dịch
 * vụ; những gì sửa được ngay tại đây chỉ là phần KHAI BÁO của mẫu, cộng hai thao
 * tác vòng đời là nhân bản và xoá. Bản đã publish mà các yêu cầu đang chạy dùng
 * thì không đụng tới.
 */
export function TemplatePicker({
  t,
  templates,
  loading,
  error,
  onRetry,
  search,
  onSearch,
  selectedId,
  detail,
  detailLoading,
  previewFile,
  onSelect,
  onCreate,
  onDuplicate,
  onDelete,
}: {
  t: Dictionary;
  templates: TemplateListItem[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
  search: string;
  onSearch: (value: string) => void;
  selectedId?: string;
  /** Chi tiết của mẫu đang chọn — tải riêng vì danh sách không chở nổi. */
  detail?: TemplateDetail;
  detailLoading: boolean;
  /** PDF preview của mẫu đang chọn, đã tải sẵn cho bước điền biến. */
  previewFile?: File;
  onSelect: (template: TemplateListItem) => void;
  onCreate: () => void;
  onDuplicate: (template: TemplateListItem) => void;
  onDelete: (template: TemplateListItem) => void;
}) {
  const p = t.signRequest.template;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-label={p.picker.title} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
            >
              <SearchIcon size={14} />
            </span>
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              aria-label={p.picker.searchPlaceholder}
              placeholder={p.picker.searchPlaceholder}
              className="h-8.5 w-full rounded-md border border-border bg-canvas pl-8 pr-2.5 text-[12.5px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={onRetry}
            disabled={loading}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12.5px] font-semibold text-fg hover:bg-inset disabled:opacity-50"
          >
            {loading ? (
              <SpinnerIcon size={14} className="animate-spin" />
            ) : (
              <RotateCcwIcon size={14} />
            )}
            {p.picker.refresh}
          </button>

          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-3.5 text-[12.5px] font-semibold text-accent-fg hover:opacity-90"
          >
            <PlusIcon size={14} />
            {p.picker.create}
          </button>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-danger bg-danger-subtle px-3.5 py-3">
            <AlertTriangleIcon size={15} className="mt-0.5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-danger">{p.picker.loadFailed}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-muted">{error}</p>
            </div>
          </div>
        ) : null}

        {loading && templates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] text-fg-muted">
            {t.common.loading}
          </p>
        ) : templates.length === 0 && !error ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface px-6 py-10 text-center">
            <span
              aria-hidden="true"
              className="flex size-11 items-center justify-center rounded-lg bg-accent-subtle text-accent"
            >
              <LayersIcon size={22} />
            </span>
            <p className="text-[14px] font-semibold text-fg">
              {search.trim() ? p.picker.noResults : p.picker.empty}
            </p>
            <p className="max-w-[52ch] text-[11.5px] leading-relaxed text-fg-muted">
              {p.picker.emptyHint}
            </p>
          </div>
        ) : (
          <ul className="flex max-h-128 flex-col gap-2 overflow-y-auto pr-0.5">
            {templates.map((template) => (
              <li key={template.templateId}>
                <TemplateCard
                  t={t}
                  template={template}
                  active={template.templateId === selectedId}
                  onSelect={() => onSelect(template)}
                  onDuplicate={() => onDuplicate(template)}
                  onDelete={() => onDelete(template)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-label={p.picker.detailTitle}
        className="flex min-h-64 flex-col rounded-lg border border-border bg-surface shadow-sm"
      >
        {detailLoading ? (
          <p className="flex flex-1 items-center justify-center px-6 text-center text-[12px] text-fg-muted">
            {t.common.loading}
          </p>
        ) : !detail ? (
          <p className="flex flex-1 items-center justify-center px-6 text-center text-[12px] text-fg-muted">
            {p.picker.detailEmpty}
          </p>
        ) : (
          <TemplateDetailPanel t={t} detail={detail} previewFile={previewFile} />
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Thẻ mẫu
 * ------------------------------------------------------------------ */

function TemplateCard({
  t,
  template,
  active,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  t: Dictionary;
  template: TemplateListItem;
  active: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const p = t.signRequest.template;
  const name = template.name || p.picker.untitled;
  /*
   * Xoá hỏi lại NGAY TRONG thẻ chứ không mở thêm một hộp thoại: mẫu là thứ người
   * ta bỏ công soạn, nhưng một modal chồng lên modal thì cái nào cũng bị bấm qua
   * theo phản xạ. Câu hỏi nằm cạnh đúng cái tên sắp mất.
   */
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      className={`rounded-lg border transition-colors ${
        active ? "border-accent bg-accent-subtle" : "border-border bg-surface hover:border-accent"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="w-full rounded-t-lg p-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <span className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-subtle font-mono text-[9.5px] font-bold uppercase text-accent"
          >
            <LayersIcon size={17} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-[13.5px] font-semibold text-fg">{name}</span>
              {/* Số phiên bản là thứ phân biệt hai lần publish của cùng một mẫu —
                  và là thứ duy nhất trả lời được "vì sao mẫu hôm nay khác hôm qua". */}
              {template.versionNo !== null ? (
                <span className="rounded-sm bg-inset px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase text-fg-muted">
                  {p.picker.version(template.versionNo)}
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 block line-clamp-2 text-[11.5px] leading-snug text-fg-muted">
              {template.description || p.picker.noDescription}
            </span>
          </span>

          {active ? <CheckIcon size={16} className="mt-0.5 shrink-0 text-accent" /> : null}
        </span>

        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <Chip icon={<PenLineIcon size={10} />}>{p.signatureCount(template.signerRoleCount)}</Chip>
          <Chip icon={<SlidersIcon size={10} />}>{p.variableCount(template.fieldCount)}</Chip>
          <span className="truncate font-mono text-[10px] text-fg-subtle">{template.code}</span>
        </span>
      </button>

      <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-border-muted px-2.5 py-1.5">
        <button
          type="button"
          onClick={onDuplicate}
          disabled
          aria-label={`${p.picker.duplicate} — ${name}`}
          title={p.picker.duplicate}
          className="flex size-7.5 items-center justify-center rounded-md border border-border bg-surface text-fg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CopyIcon size={14} />
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`${p.picker.delete} — ${name}`}
          title={p.picker.delete}
          className="flex size-7.5 items-center justify-center rounded-md border border-border bg-surface text-fg-muted hover:bg-danger-subtle hover:text-danger"
        >
          <TrashIcon size={14} />
        </button>
      </div>

      {confirming ? (
        <div className="m-2.5 mt-0 flex flex-wrap items-center gap-2 rounded-md border border-danger bg-danger-subtle px-2.5 py-2">
          <AlertTriangleIcon size={14} className="shrink-0 text-danger" />
          <span className="flex-1 text-[11.5px] font-semibold text-fg">
            {p.picker.confirmDelete(name)}
          </span>
          <button
            type="button"
            onClick={() => {
              onDelete();
              setConfirming(false);
            }}
            className="h-7.5 rounded-md border border-danger bg-danger px-3 text-[11.5px] font-semibold text-accent-fg hover:opacity-90"
          >
            {p.picker.delete}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="h-7.5 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-fg hover:bg-inset"
          >
            {t.common.cancel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Chi tiết mẫu
 * ------------------------------------------------------------------ */

function TemplateDetailPanel({
  t,
  detail,
  previewFile,
}: {
  t: Dictionary;
  detail: TemplateDetail;
  previewFile?: File;
}) {
  const p = t.signRequest.template;
  const c = t.signRequest.flow.canvas;
  const steps = groupRolesByStep(detail);
  const fields = fillableFields(detail);

  return (
    <div className="flex flex-col">
      <header className="border-b border-border-muted px-4 py-3">
        <h3 className="text-[14px] font-semibold text-fg">
          {detail.template.name || p.picker.untitled}
        </h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-fg-subtle">
          <span className="inline-flex items-center gap-1.5">
            <FileTextIcon size={12} />
            {detail.version.sourceFileName}
          </span>
          <span>{p.picker.version(detail.version.versionNo)}</span>
        </p>
      </header>

      <div className="flex flex-col gap-4 overflow-y-auto px-4 py-3.5">
        {/* `key` để trạng thái "không dựng được" không dính sang mẫu kế tiếp. */}
        <TemplatePreviewThumb key={detail.template.id} t={t} file={previewFile} />

        <section>
          <SectionTitle>{p.picker.flowSection}</SectionTitle>
          <ol className="mt-2 flex flex-col gap-1.5">
            {steps.map((roles, index) => (
              <li
                key={index}
                className="flex items-start gap-2.5 rounded-md border border-border-muted bg-surface-2 px-2.5 py-2"
              >
                <span
                  aria-hidden="true"
                  className="flex size-5.5 shrink-0 items-center justify-center rounded-full border border-accent bg-accent-subtle font-mono text-[10px] font-semibold text-accent"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-fg">
                    {c.stepLabel(index + 1)}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {roles.map((role) => (
                      <span
                        key={role.roleId}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5"
                      >
                        <span className="text-[11px] font-semibold text-fg">
                          {role.label?.trim() || role.code}
                        </span>
                        {!role.required ? (
                          <span className="font-mono text-[9.5px] text-fg-subtle">
                            {t.signRequest.template.variables.optional}
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <SectionTitle>{p.picker.variablesSection}</SectionTitle>
          {fields.length === 0 ? (
            <p className="mt-2 text-[11.5px] text-fg-muted">{p.picker.noVariables}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {fields.map((field) => (
                <li
                  key={field.fieldId}
                  title={field.description ?? undefined}
                  className="rounded-md border border-border bg-surface-2 px-2 py-1"
                >
                  <span className="text-[11.5px] font-semibold text-fg">
                    {field.label || field.code}
                  </span>
                  {field.required ? (
                    <span className="ml-1 text-[11.5px] font-bold text-danger">*</span>
                  ) : null}
                  <span className="ml-1.5 font-mono text-[10px] text-fg-subtle">{field.code}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="flex items-start gap-2 rounded-md bg-inset p-2.5 text-[10.5px] leading-relaxed text-fg-muted">
          <LockIcon size={13} className="mt-0.5 shrink-0" />
          {p.picker.publishedNote}
        </p>
      </div>
    </div>
  );
}

/**
 * Trang đầu của PDF preview — ảnh nhận diện "đúng tờ giấy này chưa".
 *
 * Dùng chính tệp mà bước điền biến đã tải về, chứ không tải lần thứ hai: cùng
 * một `previewFile` đi xuống từ workspace. Chưa tải xong (hoặc mẫu chưa dựng
 * được preview) thì chỗ này chỉ nói ra điều đó — không có gì để dựng thì đừng
 * dựng một khung rỗng.
 */
function TemplatePreviewThumb({ t, file }: { t: Dictionary; file?: File }) {
  const [error, setError] = useState<string>();

  if (!file || error) {
    return (
      <p className="rounded-md border border-dashed border-border bg-surface-2 px-4 py-6 text-center text-[11.5px] text-fg-muted">
        {file ? t.signRequest.config.renderFailed(error!) : t.signRequest.template.picker.previewUnavailable}
      </p>
    );
  }

  return (
    <PdfPageCanvas
      file={file}
      page={1}
      onError={setError}
      className="max-h-72"
    />
  );
}

/* ------------------------------------------------------------------ *
 * Mảnh nhỏ
 * ------------------------------------------------------------------ */

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-inset px-1.5 py-0.5 font-mono text-[10px] font-semibold text-fg-muted">
      {icon}
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-mono text-[10.5px] uppercase tracking-widest text-fg-subtle">
      {children}
    </h4>
  );
}
