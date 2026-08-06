"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { DocumentFormat } from "@/lib/types/signing";
import { FileTextIcon, InfoIcon, LockIcon, XIcon } from "@/components/ui/icons";
import { ACCEPTED_EXTENSIONS, fileExtension, formatBytes } from "@/features/signing/document-format";

/**
 * Bước 1 — chọn tài liệu.
 *
 * Một yêu cầu ký chỉ có MỘT tài liệu, và mọi người trong luồng ký lên đúng bản
 * đó. Vì thế đổi tệp sau khi đã xếp luồng vẫn giữ nguyên luồng: người ký không
 * đổi, chỉ tờ giấy đổi. Cái duy nhất phải xem lại là vị trí khung chữ ký, và
 * hộp thoại cấu hình nói điều đó khi số trang không còn khớp.
 */
export function RequestDocumentStep({
  t,
  file,
  format,
  onSelect,
  onRemove,
}: {
  t: Dictionary;
  file?: File;
  format?: DocumentFormat;
  onSelect: (file?: File) => void;
  onRemove: () => void;
}) {
  const d = t.signRequest.document;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-label={d.title} className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="sr-only"
          onChange={(event) => onSelect(event.target.files?.[0])}
        />

        {!file ? (
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              onSelect(event.dataTransfer.files[0]);
            }}
            className={`flex flex-col items-center gap-2.5 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging ? "border-accent bg-accent-subtle" : "border-border bg-surface"
            }`}
          >
            <span
              aria-hidden="true"
              className="flex size-11 items-center justify-center rounded-lg bg-accent-subtle text-accent"
            >
              <FileTextIcon size={22} />
            </span>
            <p className="text-[14px] font-semibold text-fg">{d.dropHere}</p>
            <p className="text-[12px] text-fg-muted">{d.acceptedTypes}</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-2 h-8.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg hover:opacity-90"
            >
              {d.choose}
            </button>
            <p className="mt-1 max-w-[46ch] text-[10.5px] text-fg-subtle">{d.note}</p>
          </div>
        ) : (
          <article className="rounded-lg border border-border bg-surface shadow-sm">
            <div className="flex items-start gap-3 border-b border-border-muted p-4">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-subtle font-mono text-[10px] font-bold uppercase text-accent"
              >
                {fileExtension(file.name) || "FILE"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-fg">{file.name}</p>
                <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
                  {d.detectedFormat}: {format ?? d.unknownFormat} · {d.size}: {formatBytes(file.size)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="h-7.5 rounded-md border border-border bg-surface px-2.5 text-[11.5px] font-semibold text-fg-muted hover:bg-inset"
                >
                  {d.replace}
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  aria-label={d.remove(file.name)}
                  className="flex size-7.5 items-center justify-center rounded-md text-fg-muted hover:bg-danger-subtle hover:text-danger"
                >
                  <XIcon size={15} />
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-4">
              <span aria-hidden="true" className="mt-0.5 text-fg-subtle">
                <LockIcon size={15} />
              </span>
              <div>
                <p className="text-[12.5px] font-semibold text-fg">{d.boundaryTitle}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">{d.boundaryText}</p>
              </div>
            </div>
          </article>
        )}
      </section>

      <section
        aria-label={d.previewTitle}
        className="flex min-h-64 flex-col rounded-lg border border-border bg-surface p-3 shadow-sm"
      >
        <h3 className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-subtle">
          {d.previewTitle}
        </h3>

        {!file ? (
          <p className="flex flex-1 items-center justify-center text-center text-[12px] text-fg-muted">
            {d.previewEmpty}
          </p>
        ) : format === "PDF" ? (
          <PdfFirstPage t={t} file={file} />
        ) : (
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="flex items-start gap-2 text-[11.5px] text-fg-muted">
              <InfoIcon size={14} className="mt-0.5 shrink-0 text-fg-subtle" />
              {d.pdfOnlyPreview}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

/** Trang đầu của PDF — đủ để xác nhận "đúng tệp này" mà không dựng cả bộ đọc. */
function PdfFirstPage({ t, file }: { t: Dictionary; file: File }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(0);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setError(undefined);
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      if (cancelled) return;
      setPages(pdf.numPages);

      const page = await pdf.getPage(1);
      const dpr = window.devicePixelRatio || 1;
      const native = page.getViewport({ scale: 1 });
      const width = Math.max(1, (wrapperRef.current?.clientWidth ?? 320) - 8);
      const viewport = page.getViewport({ scale: (width / native.width) * dpr });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${width}px`;
      canvas.style.height = "auto";
      canvas.style.display = "block";

      const context = canvas.getContext("2d");
      if (!context) return;
      await page.render({ canvasContext: context, viewport, canvas }).promise;
      if (!cancelled && hostRef.current) hostRef.current.replaceChildren(canvas);
    }

    render().catch((err) => setError(String(err)));
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (error) {
    return <p className="text-[12px] text-danger">{t.signRequest.config.renderFailed(error)}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={wrapperRef} className="max-h-96 overflow-auto rounded-md bg-inset p-1">
        <div ref={hostRef} className="mx-auto rounded-sm border border-border shadow-sm" />
      </div>
      {pages > 0 ? (
        <p className="text-center font-mono text-[10.5px] text-fg-subtle">
          {t.signRequest.config.pageOf(1, pages)}
        </p>
      ) : null}
    </div>
  );
}
