"use client";

import { useMemo, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { Dialog } from "@/components/ui/dialog";
import {
  AlertTriangleIcon,
  CopyIcon,
  LayersIcon,
  PenLineIcon,
  PlusIcon,
  SearchIcon,
  SlidersIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons";
import { formatBytes } from "@/features/signing/document-format";
import { templateSignatureCount, type SignTemplate } from "../template-model";

/**
 * Quản lý mẫu: xem, sửa, nhân bản, xoá.
 *
 * Hộp thoại riêng chứ không phải một màn hình riêng, vì quản lý mẫu gần như luôn
 * xảy ra GIỮA CHỪng việc tạo một yêu cầu ký — "mẫu này gần đúng, sửa một dòng
 * rồi dùng". Bắt người dùng rời trang là bắt họ vứt bản nháp đang soạn dở.
 *
 * Xoá hỏi lại ngay tại dòng đó chứ không mở thêm một hộp thoại nữa: mẫu là thứ
 * người ta bỏ công soạn, nhưng chồng hai lớp modal lên nhau thì cái nào cũng bị
 * bấm qua theo phản xạ.
 */
export function TemplateManagerDialog({
  t,
  open,
  templates,
  onClose,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
  onUse,
}: {
  t: Dictionary;
  open: boolean;
  templates: SignTemplate[];
  onClose: () => void;
  onCreate: () => void;
  onEdit: (template: SignTemplate) => void;
  onDuplicate: (template: SignTemplate) => void;
  onDelete: (template: SignTemplate) => void;
  onUse: (template: SignTemplate) => void;
}) {
  const m = t.signRequest.template.manager;
  const p = t.signRequest.template;
  const [query, setQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState<string>();

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return templates;
    return templates.filter((template) =>
      `${template.name} ${template.description} ${template.file.name}`
        .toLowerCase()
        .includes(needle),
    );
  }, [templates, query]);

  return (
    <Dialog open={open} onClose={onClose} label={m.title} className="max-w-4xl!">
      <header className="flex items-start gap-3 border-b border-border-muted px-5 py-3.5">
        <div className="flex-1">
          <h2 className="text-[15px] font-semibold text-fg">{m.title}</h2>
          <p className="mt-0.5 text-[11.5px] text-fg-muted">{m.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="flex size-7.5 items-center justify-center rounded-md text-fg-muted hover:bg-inset hover:text-fg"
        >
          <XIcon size={16} />
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-border-muted px-5 py-3">
        <div className="relative min-w-48 flex-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
          >
            <SearchIcon size={14} />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={m.searchPlaceholder}
            placeholder={m.searchPlaceholder}
            className="h-8.5 w-full rounded-md border border-border bg-canvas pl-8 pr-2.5 text-[12.5px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-3.5 text-[12.5px] font-semibold text-accent-fg hover:opacity-90"
        >
          <PlusIcon size={14} />
          {m.create}
        </button>
      </div>

      <div className="max-h-[54vh] overflow-y-auto px-5 py-3.5">
        {templates.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[12px] text-fg-muted">
            {p.picker.empty}
          </p>
        ) : matches.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[12px] text-fg-muted">
            {p.picker.noResults}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {matches.map((template) => (
              <li
                key={template.id}
                className="rounded-lg border border-border bg-surface px-3 py-2.5"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-subtle font-mono text-[9.5px] font-bold uppercase text-accent"
                  >
                    {template.file.format ?? "—"}
                  </span>

                  <div className="min-w-40 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13.5px] font-semibold text-fg">
                        {template.name || p.picker.untitled}
                      </span>
                      {template.builtIn ? (
                        <span className="rounded-sm bg-inset px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase text-fg-muted">
                          {p.picker.builtIn}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-fg-muted">
                      {template.description || p.picker.noDescription}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-fg-subtle">
                      <span className="inline-flex items-center gap-1">
                        <PenLineIcon size={10} />
                        {p.signatureCount(templateSignatureCount(template))}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <LayersIcon size={10} />
                        {p.stepCount(template.steps.length)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <SlidersIcon size={10} />
                        {p.variableCount(template.variables.length)}
                      </span>
                      <span className="truncate">
                        {template.file.name} · {formatBytes(template.file.size)}
                      </span>
                      <span>{m.updatedAt(formatStamp(template.updatedAt))}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUse(template)}
                      className="h-8 rounded-md border border-accent bg-accent px-3 text-[12px] font-semibold text-accent-fg hover:opacity-90"
                    >
                      {m.use}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(template)}
                      className="h-8 rounded-md border border-border bg-surface px-3 text-[12px] font-semibold text-fg hover:bg-inset"
                    >
                      {m.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicate(template)}
                      aria-label={`${m.duplicate} — ${template.name}`}
                      title={m.duplicate}
                      className="flex size-8 items-center justify-center rounded-md border border-border bg-surface text-fg-muted hover:bg-inset hover:text-fg"
                    >
                      <CopyIcon size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(template.id)}
                      aria-label={`${m.delete} — ${template.name}`}
                      title={m.delete}
                      className="flex size-8 items-center justify-center rounded-md border border-border bg-surface text-fg-muted hover:bg-danger-subtle hover:text-danger"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>

                {confirmingId === template.id ? (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-md border border-danger bg-danger-subtle px-3 py-2">
                    <AlertTriangleIcon size={14} className="shrink-0 text-danger" />
                    <span className="flex-1 text-[11.5px] font-semibold text-fg">
                      {m.confirmDelete(template.name || p.picker.untitled)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(template);
                        setConfirmingId(undefined);
                      }}
                      className="h-7.5 rounded-md border border-danger bg-danger px-3 text-[11.5px] font-semibold text-accent-fg hover:opacity-90"
                    >
                      {m.delete}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(undefined)}
                      className="h-7.5 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-fg"
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-border-muted bg-surface-2 px-5 py-3">
        <p className="max-w-[62ch] text-[11px] leading-relaxed text-fg-muted">{m.storageNote}</p>
        <button
          type="button"
          onClick={onClose}
          className="h-8.5 shrink-0 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg hover:opacity-90"
        >
          {t.common.close}
        </button>
      </footer>
    </Dialog>
  );
}

function formatStamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}
