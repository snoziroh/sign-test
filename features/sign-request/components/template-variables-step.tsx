"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { InfoIcon, RotateCcwIcon } from "@/components/ui/icons";
import type { PlaceholderBox } from "../template-document";
import type { TemplateVariable } from "../template-model";
import { PdfPageCanvas } from "./pdf-page-canvas";

/**
 * Bước "điền vào chỗ trống" — lý do tồn tại của cả tính năng mẫu.
 *
 * Bên trái là form, bên phải là chính tài liệu với giá trị vừa gõ hiện lên đúng
 * chỗ nó sẽ nằm. Hai thứ này phải đứng cạnh nhau: một ô nhập tên là
 * `pham_vi_dich_vu` không nói được cho ai biết đoạn văn đó rơi vào Điều mấy, và
 * người điền sai một số hợp đồng thì chỉ phát hiện ra khi ba người đã ký xong.
 *
 * Cả `variables` lẫn `boxes` đều đến từ MÁY CHỦ (`GET /api/templates/{id}` →
 * `fields[]` và `fields[].boxes`). Bản dựng trước tự quét `{{bien}}` trên trình
 * duyệt; giờ không cần nữa, và điều đó sửa luôn một giới hạn thật: token bị cắt
 * qua nhiều text item trong PDF thì client không tìm ra khung bao, còn máy chủ
 * thì có.
 */
export function TemplateVariablesStep({
  t,
  variables,
  boxes,
  document,
  values,
  onChange,
  onReset,
}: {
  t: Dictionary;
  variables: TemplateVariable[];
  /** Chỗ đứng của từng ô trên PDF preview, toạ độ chuẩn hoá 0..1. */
  boxes: PlaceholderBox[];
  /** PDF preview của mẫu, đã tải về thành `File`. */
  document?: File;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}) {
  const v = t.signRequest.template.variables;
  const total = variables.length;
  const filled = variables.filter((variable) => (values[variable.key] ?? "").trim()).length;
  const missingRequired = variables.filter(
    (variable) => variable.required && !(values[variable.key] ?? "").trim(),
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ---------------- Form ---------------- */}
      <section
        aria-label={v.title}
        className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
      >
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[13.5px] font-semibold text-fg">{v.title}</h3>
            <p className="mt-0.5 text-[11.5px] text-fg-muted">
              {v.progress(filled, total)}
              {missingRequired.length > 0 ? ` · ${v.stillRequired(missingRequired.length)}` : ""}
            </p>
          </div>
          {total > 0 ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[12px] font-semibold text-fg-muted hover:bg-inset"
            >
              <RotateCcwIcon size={13} />
              {v.reset}
            </button>
          ) : null}
        </header>

        {total === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[12px] text-fg-muted">
            {v.noVariables}
          </p>
        ) : (
          <div className="flex max-h-136 flex-col gap-3.5 overflow-y-auto pr-1">
            {variables.map((variable) => (
              <VariableField
                key={variable.key}
                t={t}
                variable={variable}
                value={values[variable.key] ?? ""}
                onChange={(value) => onChange(variable.key, value)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---------------- Xem trước ---------------- */}
      <section
        aria-label={v.previewTitle}
        className="flex min-h-80 flex-col rounded-lg border border-border bg-surface shadow-sm"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border-muted px-4 py-2.5">
          <h3 className="font-mono text-[10.5px] uppercase tracking-widest text-fg-subtle">
            {v.previewTitle}
          </h3>
          <span className="font-mono text-[10.5px] text-fg-subtle">PDF</span>
        </header>

        <div className="min-h-0 flex-1 overflow-auto bg-surface-2 p-3">
          {!document ? (
            <p className="py-8 text-center text-[12px] text-fg-muted">{v.previewEmpty}</p>
          ) : (
            <PdfVariablePreview t={t} file={document} boxes={boxes} values={values} />
          )}
        </div>

        <footer className="flex items-start gap-2 border-t border-border-muted px-4 py-2.5">
          <InfoIcon size={13} className="mt-0.5 shrink-0 text-fg-subtle" />
          <p className="text-[11px] leading-relaxed text-fg-muted">{v.serverRenderNote}</p>
        </footer>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Một ô nhập
 * ------------------------------------------------------------------ */

function VariableField({
  t,
  variable,
  value,
  onChange,
}: {
  t: Dictionary;
  variable: TemplateVariable;
  value: string;
  onChange: (value: string) => void;
}) {
  const v = t.signRequest.template.variables;
  const empty = !value.trim();
  const invalid = variable.required && empty;

  const shared = `w-full rounded-md border bg-canvas px-2.5 text-[13px] text-fg placeholder:text-fg-subtle focus:outline-none ${
    invalid ? "border-warning focus:border-warning" : "border-border focus:border-accent"
  }`;

  return (
    <label className="block">
      <span className="mb-1 flex flex-wrap items-baseline gap-1.5">
        <span className="text-[12px] font-semibold text-fg">
          {variable.label || variable.key}
        </span>
        {variable.required ? (
          <span className="text-[12px] font-bold text-danger" title={v.required}>
            *
          </span>
        ) : (
          <span className="font-mono text-[10px] text-fg-subtle">{v.optional}</span>
        )}
        <span className="ml-auto font-mono text-[10px] text-fg-subtle">
          {`{{${variable.key}}}`}
        </span>
      </span>

      {variable.type === "multiline" ? (
        <textarea
          value={value}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
          className={`${shared} resize-y py-2`}
        />
      ) : variable.type === "select" ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${shared} h-9`}
        >
          <option value="">{v.selectPlaceholder}</option>
          {variable.options
            .filter((option) => option.trim())
            .map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
        </select>
      ) : (
        <input
          type={variable.type === "date" ? "date" : variable.type === "number" ? "number" : "text"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${shared} h-9`}
        />
      )}

      {variable.hint ? (
        <span className="mt-1 block text-[11px] text-fg-muted">{variable.hint}</span>
      ) : null}
    </label>
  );
}

/* ------------------------------------------------------------------ *
 * Xem trước: PDF
 * ------------------------------------------------------------------ */

/**
 * Trang PDF preview của mẫu, kèm giá trị đã điền vẽ CHỒNG lên chỗ trống.
 *
 * Lớp phủ chứ không phải tệp đã ghi lại: tài liệu thật chỉ được dựng khi bấm tạo
 * yêu cầu (`POST /api/templates/{id}/previews`), và dựng lại cả tệp cho mỗi phím
 * gõ vừa chậm vừa tốn một lời gọi mạng cho một kết quả không ai nhìn tới giữa
 * chừng. Người xem vẫn thấy đúng chỗ giá trị sẽ nằm, còn dòng chú thích dưới
 * khung nói rõ ai mới là bên ghi nó vào tệp.
 */
function PdfVariablePreview({
  t,
  file,
  boxes,
  values,
}: {
  t: Dictionary;
  file: File;
  boxes: PlaceholderBox[];
  values: Record<string, string>;
}) {
  const v = t.signRequest.template.variables;
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string>();

  if (error) {
    return <p className="text-[12px] text-danger">{t.signRequest.config.renderFailed(error)}</p>;
  }

  const onPage = boxes.filter((box) => box.page === page);

  return (
    <div className="flex flex-col gap-2">
      <PdfPageCanvas
        file={file}
        page={page}
        onPageCount={setPageCount}
        onError={setError}
      >
        {onPage.map((box, index) => {
            const value = (values[box.key] ?? "").trim();
            return (
              <span
                key={`${box.key}-${index}`}
                title={`{{${box.key}}}`}
                style={{
                  position: "absolute",
                  left: `${box.xPct * 100}%`,
                  top: `${box.yPct * 100}%`,
                  minWidth: `${box.widthPct * 100}%`,
                  height: `${box.heightPct * 100}%`,
                }}
                className={`flex items-center overflow-hidden whitespace-nowrap rounded-sm px-0.5 text-[10px] font-semibold ${
                  value
                    ? "bg-success-subtle text-success outline-1 outline-success"
                    : "bg-warning-subtle text-warning outline-1 outline-dashed outline-warning"
                }`}
              >
              {value || v.unfilled}
            </span>
          );
        })}
      </PdfPageCanvas>

      <div className="flex items-center justify-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((current) => current - 1)}
          className="h-7 rounded border border-border bg-surface px-2 text-[11px] font-semibold text-fg disabled:opacity-40"
        >
          {t.signRequest.config.previousPage}
        </button>
        <span className="font-mono text-[11px] text-fg-muted">
          {t.signRequest.config.pageOf(page, pageCount || 1)}
        </span>
        <button
          type="button"
          disabled={pageCount === 0 || page >= pageCount}
          onClick={() => setPage((current) => current + 1)}
          className="h-7 rounded border border-border bg-surface px-2 text-[11px] font-semibold text-fg disabled:opacity-40"
        >
          {t.signRequest.config.nextPage}
        </button>
      </div>
    </div>
  );
}

/** Dùng ở màn xác nhận: các giá trị đã điền, kèm nhãn người đọc hiểu được. */
export function summarizeValues(
  variables: TemplateVariable[],
  values: Record<string, string>,
): { key: string; label: string; value: string; filled: boolean }[] {
  return variables.map((variable) => {
    const value = (values[variable.key] ?? "").trim();
    return {
      key: variable.key,
      label: variable.label || variable.key,
      value,
      filled: Boolean(value),
    };
  });
}
