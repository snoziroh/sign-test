"use client";

import type { RefObject } from "react";
import type { SignatureSource } from "@/lib/types/signing";
import type { DocumentFormat } from "@/lib/types/signing";
import { formatBytes } from "../document-format";
import type { SignFormState } from "../sign-configuration";

/**
 * Mảnh dùng chung giữa màn `/sign` (nội bộ) và `/external-sign` (công khai) —
 * chỉ những gì thật sự GIỐNG HỆT ở cả hai nơi mới nằm ở đây.
 *
 * `MpkiCard`/`SignCloudCard` CỐ Ý không nằm ở đây dù trông tương tự: nội bộ có
 * `GET /remote-ca/mpki/credentials` (nội bộ) để liệt kê credential và một bước
 * đăng ký eSign Cloud RIÊNG trước khi ký (`POST /enrollments` → giữ
 * `agreementUuid` để dùng lại nhiều lần) — cả hai đều là quyền hạn/luồng mà
 * người ký công khai không có. `features/external-signing` giữ bản riêng của
 * hai khối đó, dùng chung Ở MỨC DỮ LIỆU (`EnrollmentFormState`,
 * `enrollmentComplete`, `enrollmentImagePayload` từ `sign-configuration.ts`)
 * chứ không ở mức component.
 */

export interface Pkcs12FieldsCopy {
  title: string;
  fileLabel: string;
  chooseFile: string;
  /** Rơi về `chooseFile` khi không có — màn `/sign` không phân biệt hai nhãn. */
  replaceFile?: string;
  noFile: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  aliasLabel: string;
  aliasPlaceholder: string;
  aliasHint: string;
}

/**
 * Khoá riêng không bao giờ rời khỏi máy chủ ký: file .p12 đi thẳng từ trình
 * duyệt qua proxy tới service, và mật khẩu chỉ nằm trong part `request` của
 * đúng lần gọi đó — không lưu, không autofill.
 */
export function Pkcs12Card({
  copy,
  form,
  p12File,
  p12InputRef,
  onP12FileChange,
  onUpdate,
}: {
  copy: Pkcs12FieldsCopy;
  form: Pick<SignFormState, "p12Password" | "p12Alias">;
  p12File?: File;
  p12InputRef: RefObject<HTMLInputElement | null>;
  onP12FileChange: (file?: File) => void;
  onUpdate: <K extends "p12Password" | "p12Alias">(key: K, value: string) => void;
}) {
  return (
    <ConfigCard title={copy.title}>
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-fg-muted">
            {copy.fileLabel}
          </label>
          <input
            ref={p12InputRef}
            type="file"
            accept=".p12,.pfx"
            className="sr-only"
            onChange={(event) => onP12FileChange(event.target.files?.[0])}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => p12InputRef.current?.click()}
              className="h-8.5 shrink-0 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-fg"
            >
              {p12File ? (copy.replaceFile ?? copy.chooseFile) : copy.chooseFile}
            </button>
            <span className="min-w-0 truncate text-[11px] text-fg-muted">
              {p12File ? `${p12File.name} · ${formatBytes(p12File.size)}` : copy.noFile}
            </span>
          </div>
        </div>

        <Field label={copy.passwordLabel} htmlFor="p12-password">
          <input
            id="p12-password"
            type="password"
            value={form.p12Password}
            autoComplete="new-password"
            placeholder={copy.passwordPlaceholder}
            onChange={(event) => onUpdate("p12Password", event.target.value)}
            className="h-9 w-full rounded-md border border-border bg-surface px-2 text-[12px] text-fg"
          />
        </Field>

        <Field label={copy.aliasLabel} htmlFor="p12-alias">
          <input
            id="p12-alias"
            value={form.p12Alias}
            placeholder={copy.aliasPlaceholder}
            onChange={(event) => onUpdate("p12Alias", event.target.value)}
            className="h-9 w-full rounded-md border border-border bg-surface px-2 text-[12px] text-fg"
          />
          <p className="mt-1.5 text-[10.5px] text-fg-muted">{copy.aliasHint}</p>
        </Field>
      </div>
    </ConfigCard>
  );
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold text-fg-muted" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function ConfigCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <h3 className="mb-3 text-[13px] font-semibold text-fg">{title}</h3>
      {children}
    </article>
  );
}

export interface SourcePickerCopy {
  unsupportedForFormat: (format: string) => string;
}

/**
 * Nguồn không ký được định dạng đang chọn vẫn hiện ra, chỉ bị khoá kèm lý do —
 * ẩn hẳn thì người dùng không phân biệt được "nguồn không tồn tại" với "nguồn
 * không hợp với file này".
 */
export function SourcePicker({
  copy,
  sources,
  selectedId,
  documentFormat,
  sourceLabel,
  supportsFormat,
  onChange,
}: {
  copy: SourcePickerCopy;
  sources: SignatureSource[];
  selectedId?: string;
  documentFormat?: DocumentFormat;
  sourceLabel: (source: SignatureSource) => string;
  supportsFormat: (source: SignatureSource, format?: DocumentFormat) => boolean;
  onChange: (sourceId: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {sources.map((source) => {
        const usable = !documentFormat || supportsFormat(source, documentFormat);
        const selected = source.id === selectedId;
        return (
          <button
            key={source.id}
            type="button"
            onClick={() => onChange(source.id)}
            aria-pressed={selected}
            className={`w-full rounded-md border p-2.5 text-left ${
              selected ? "border-accent bg-accent-subtle" : "border-border bg-surface"
            } ${usable ? "" : "opacity-60"}`}
          >
            <p className="text-[12.5px] font-semibold text-fg">{sourceLabel(source)}</p>
            <p className="mt-0.5 text-[10.5px] text-fg-muted">
              {source.documentFormats.join(" · ")}
            </p>
            {!usable && documentFormat ? (
              <p className="mt-1 text-[10.5px] text-warning">
                {copy.unsupportedForFormat(documentFormat)}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
