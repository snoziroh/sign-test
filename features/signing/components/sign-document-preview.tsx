"use client";

import { useEffect, useRef, useState } from "react";
import { detectOoxmlKind, type ContentType } from "@/lib/types/domain";
import type { DocumentFormat } from "@/lib/types/signing";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import { ACCEPTED_EXTENSIONS, fileExtension, formatBytes } from "@/features/signing/document-format";

/**
 * Panel tài liệu và khung xem trước. Tách khỏi `sign-document-workspace.tsx` vì
 * phần này thuần trình bày và không đổi khi contract ký thay đổi — workspace giờ
 * chỉ còn logic của Unified Signing API.
 */

/** Vị trí khung ký, lưu theo tỉ lệ trang để không phụ thuộc zoom hay DPI. */
export interface SignaturePosition {
  page: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export const DEFAULT_SIGNATURE_POSITION: SignaturePosition = {
  page: 1,
  xPct: 0.62,
  yPct: 0.78,
  widthPct: 0.32,
  heightPct: 0.12,
};

/** Kích thước trang PDF thật (points) — cần để quy đổi khung ký sang toạ độ PDF. */
export interface PdfPageMetrics {
  page: number;
  widthPt: number;
  heightPt: number;
}

type DetectedFormat = ContentType | undefined;

export function DocumentPanel({
  t,
  file,
  format,
  documentFormat,
  dragging,
  inputRef,
  onDraggingChange,
  onSelectFile,
  onRemoveFile,
}: {
  t: Dictionary;
  file?: File;
  format?: DetectedFormat;
  /** Tên định dạng theo backend (`documentFormats` của capability). */
  documentFormat?: DocumentFormat;
  dragging: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDraggingChange: (dragging: boolean) => void;
  onSelectFile: (file?: File) => void;
  onRemoveFile: () => void;
}) {
  return (
    <section aria-labelledby="document-heading" className="space-y-3">
      <h2 id="document-heading" className="sr-only">
        {t.sign.document.sectionTitle}
      </h2>

      {!file ? (
        <div
          className={`rounded-lg border-2 border-dashed bg-surface p-6 text-center transition-colors ${
            dragging ? "border-accent bg-accent-subtle" : "border-border"
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            onDraggingChange(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) onDraggingChange(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            onDraggingChange(false);
            onSelectFile(event.dataTransfer.files[0]);
          }}
        >
          <p className="text-[13px] font-semibold text-fg">{t.sign.document.dropHere}</p>
          <p className="mt-1 text-[11.5px] text-fg-muted">{t.sign.document.acceptedTypes}</p>

          <input
            ref={inputRef}
            id="sign-document-input"
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            className="sr-only"
            onChange={(event) => onSelectFile(event.target.files?.[0])}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 h-8.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg"
          >
            {t.sign.document.chooseDocument}
          </button>

          <p className="mt-3 text-[10.5px] text-fg-subtle">
            {t.sign.document.backendNote}
          </p>
        </div>
      ) : (
        <article className="rounded-lg border border-border bg-surface shadow-sm">
          <div className="flex items-start gap-3 border-b border-border-muted p-4">
            <div
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-subtle font-mono text-[10px] font-bold uppercase text-accent"
            >
              {fileExtension(file.name) || "FILE"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-fg">{file.name}</p>
              <p className="mt-0.5 text-[11.5px] text-fg-muted">{formatBytes(file.size)}</p>
            </div>

            <button
              type="button"
              aria-label={t.sign.document.remove(file.name)}
              onClick={onRemoveFile}
              className="rounded-md p-1 text-fg-muted hover:bg-inset hover:text-fg"
            >
              <XIcon size={15} />
            </button>
          </div>

          <dl className="divide-y divide-border-muted px-4">
            <AnalysisRow
              label={t.sign.document.detectedType}
              value={format ? t.sign.contentLabel[format] : t.sign.document.unknownType}
            />
            <AnalysisRow
              label={t.sign.document.backendFormat}
              value={documentFormat ?? t.sign.document.unknownType}
            />
          </dl>
        </article>
      )}

      {/* <article className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border-muted px-4 py-2.5 text-[13px] font-semibold text-fg">
          {t.sign.document.boundaryTitle}
        </div>
        <div className="p-4 text-[11.5px] leading-relaxed text-fg-muted">
          {t.sign.document.boundaryText}
        </div>
      </article> */}
    </section>
  );
}

function AnalysisRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-[11.5px]">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-right font-semibold text-fg">{value}</dd>
    </div>
  );
}

export function DocumentPreview({
  t,
  file,
  format,
  signed = false,
  visibleSignature,
  signaturePosition,
  onSignaturePositionChange,
  onPageMetrics,
}: {
  t: Dictionary;
  file?: File;
  format?: DetectedFormat;
  /**
   * `file` là TỆP ĐÃ KÝ chứ không phải bản gốc. Chỉ đổi phần nhãn ở đầu khung —
   * hai tệp trông giống hệt nhau nên không nói ra thì không phân biệt được.
   */
  signed?: boolean;
  visibleSignature: boolean;
  signaturePosition: SignaturePosition;
  onSignaturePositionChange: (position: SignaturePosition) => void;
  onPageMetrics: (metrics?: PdfPageMetrics) => void;
}) {
  return (
    <section
      aria-labelledby="preview-heading"
      className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border-muted px-4 py-2.5">
        <h2 id="preview-heading" className="text-[13px] font-semibold text-fg">
          {signed ? t.sign.preview.signedTitle : t.sign.preview.title}
        </h2>
        {file ? (
          <div className="flex min-w-0 items-center gap-2">
            {signed ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-success-subtle px-2 py-0.5 text-[10.5px] font-semibold text-success">
                <CheckIcon size={11} />
                {t.sign.preview.signedBadge}
              </span>
            ) : null}
            <span className="truncate rounded-full bg-inset px-2 py-0.5 font-mono text-[10.5px] text-fg-muted">
              {format ? t.sign.contentLabel[format] : t.sign.preview.unknownType}
            </span>
          </div>
        ) : null}
      </header>

      {!file ? (
        <div className="flex min-h-135 items-center justify-center p-8 text-center">
          <div>
            <p className="text-[13px] font-semibold text-fg">{t.sign.preview.emptyTitle}</p>
            <p className="mt-1 text-[12px] text-fg-muted">{t.sign.preview.emptyDescription}</p>
          </div>
        </div>
      ) : (
        <div className="min-h-135 bg-surface-2 p-5">
          {format === "pdf" ? (
            <PdfPreview
              t={t}
              file={file}
              visibleSignature={visibleSignature}
              position={signaturePosition}
              onPositionChange={onSignaturePositionChange}
              onPageMetrics={onPageMetrics}
            />
          ) : null}

          {format === "xml" ? <XmlPreview t={t} file={file} /> : null}

          {format === "ooxml"
            ? (() => {
                const kind = detectOoxmlKind(file.name);
                if (kind === "docx") return <DocxPreview t={t} file={file} />;
                if (kind === "xlsx") return <XlsxPreview t={t} file={file} />;
                if (kind === "pptx") return <PptxPreview t={t} file={file} />;
                return null;
              })()
            : null}

          {format === "raw" || format === "large-file" ? (
            <UnsupportedFormatNotice t={t} fileName={file.name} />
          ) : null}
        </div>
      )}
    </section>
  );
}

function UnsupportedFormatNotice({ t, fileName }: { t: Dictionary; fileName: string }) {
  return (
    <div className="rounded-lg border border-warning bg-warning-subtle p-6">
      <p className="font-mono text-[11px] uppercase tracking-wider text-warning">
        {t.sign.preview.unsupportedTitle}
      </p>
      <p className="mt-3 text-[13px] text-fg">
        {t.sign.preview.unsupportedBody(fileName)}
      </p>
    </div>
  );
}

const ZOOM_MIN = 25;
const ZOOM_MAX = 300;
const ZOOM_STEP = 25;

function useZoom(initial = 100) {
  const [zoom, setZoom] = useState(initial);
  return {
    zoom,
    zoomIn: () => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP)),
    zoomOut: () => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP)),
    reset: (value: number) => setZoom(value),
  };
}

function ZoomToolbar({
  t,
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  t: Dictionary;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onZoomOut}
        aria-label={t.sign.preview.zoomOut}
        className="flex size-6.5 items-center justify-center rounded border border-border bg-surface text-[13px] font-semibold text-fg-muted hover:bg-inset"
      >
        −
      </button>
      <button
        type="button"
        onClick={onFit}
        title={t.sign.preview.zoomFit}
        className="w-12 rounded border border-border bg-surface py-1 text-center text-[10.5px] font-semibold text-fg-muted hover:bg-inset"
      >
        {zoom}%
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        aria-label={t.sign.preview.zoomIn}
        className="flex size-6.5 items-center justify-center rounded border border-border bg-surface text-[13px] font-semibold text-fg-muted hover:bg-inset"
      >
        +
      </button>
    </div>
  );
}

function PdfPreview({
  t,
  file,
  visibleSignature,
  position,
  onPositionChange,
  onPageMetrics,
}: {
  t: Dictionary;
  file: File;
  visibleSignature: boolean;
  position: SignaturePosition;
  onPositionChange: (position: SignaturePosition) => void;
  onPageMetrics: (metrics?: PdfPageMetrics) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string>();
  const [interactionType, setInteractionType] = useState<"drag" | "resize">();
  const interactionRef = useRef<{
    type: "drag" | "resize";
    startX: number;
    startY: number;
    initial: SignaturePosition;
  } | undefined>(undefined);
  const { zoom, zoomIn, zoomOut, reset } = useZoom(100);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setError(undefined);
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const buffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      if (cancelled) return;
      setPageCount(pdf.numPages);

      const pageNumber = Math.min(currentPage, pdf.numPages);
      const page = await pdf.getPage(pageNumber);
      const dpr = window.devicePixelRatio || 1;

      const nativeViewport = page.getViewport({ scale: 1 });
      onPageMetrics({ page: pageNumber, widthPt: nativeViewport.width, heightPt: nativeViewport.height });

      const availableWidth = Math.max(
        1,
        (wrapperRef.current?.clientWidth ?? nativeViewport.width + 16) - 16,
      );
      const baseScale = availableWidth / nativeViewport.width;
      const renderViewport = page.getViewport({ scale: baseScale * dpr * (ZOOM_MAX / 100) });

      const canvas = document.createElement("canvas");
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      canvas.style.width = `${availableWidth}px`;
      canvas.style.height = "auto";
      canvas.style.display = "block";

      const context = canvas.getContext("2d");
      if (!context) return;

      await page.render({ canvasContext: context, viewport: renderViewport, canvas }).promise;

      if (!cancelled && containerRef.current) {
        containerRef.current.replaceChildren(canvas);
      }
    }

    render().catch((err) => setError(String(err)));
    return () => {
      cancelled = true;
    };
  }, [currentPage, file, onPageMetrics]);

  function beginInteraction(event: React.PointerEvent<HTMLElement>, type: "drag" | "resize") {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      type,
      startX: event.clientX,
      startY: event.clientY,
      initial: position,
    };
    setInteractionType(type);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const interaction = interactionRef.current;
    if (!interaction || !pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const deltaX = (event.clientX - interaction.startX) / rect.width;
    const deltaY = (event.clientY - interaction.startY) / rect.height;
    const minimumWidth = Math.min(1, 80 / rect.width);
    const minimumHeight = Math.min(1, 30 / rect.height);

    if (interaction.type === "drag") {
      onPositionChange({
        ...interaction.initial,
        page: currentPage,
        xPct: Math.min(Math.max(interaction.initial.xPct + deltaX, 0), 1 - interaction.initial.widthPct),
        yPct: Math.min(Math.max(interaction.initial.yPct + deltaY, 0), 1 - interaction.initial.heightPct),
      });
      return;
    }

    onPositionChange({
      ...interaction.initial,
      page: currentPage,
      widthPct: Math.min(Math.max(interaction.initial.widthPct + deltaX, minimumWidth), 1 - interaction.initial.xPct),
      heightPct: Math.min(Math.max(interaction.initial.heightPct + deltaY, minimumHeight), 1 - interaction.initial.yPct),
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    interactionRef.current = undefined;
    setInteractionType(undefined);
  }

  function showPage(page: number) {
    const nextPage = Math.min(Math.max(page, 1), pageCount || 1);
    onPageMetrics(undefined);
    setCurrentPage(nextPage);
    onPositionChange({ ...position, page: nextPage });
  }

  if (error) {
    return <p className="text-[12.5px] text-danger">{t.sign.preview.cannotRenderPdf(error)}</p>;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        {visibleSignature ? (
          <button
            type="button"
            onClick={() => onPositionChange({ ...DEFAULT_SIGNATURE_POSITION, page: currentPage })}
            className="rounded border border-border bg-surface px-2 py-1 text-[10.5px] font-semibold text-fg-muted hover:bg-inset"
          >
            {t.sign.preview.resetPosition}
          </button>
        ) : (
          <span />
        )}
        <ZoomToolbar t={t} zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={() => reset(100)} />
      </div>

      <div ref={wrapperRef} className="mx-auto h-135 max-w-145 overflow-auto rounded-md bg-inset p-2">
        <div className="origin-top-left" style={{ zoom: zoom / 100 }}>
          <div ref={pageRef} className="relative mx-auto">
            <div ref={containerRef} className="rounded-sm border border-border shadow-md" />

            {visibleSignature ? (
              <div
                onPointerDown={(event) => beginInteraction(event, "drag")}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  position: "absolute",
                  left: `${position.xPct * 100}%`,
                  top: `${position.yPct * 100}%`,
                  width: `${position.widthPct * 100}%`,
                  height: `${position.heightPct * 100}%`,
                  touchAction: "none",
                }}
                className={`min-h-7.5 cursor-move select-none overflow-hidden rounded-md border-2 border-accent bg-blue-50/90 p-2 text-[10.5px] text-slate-700 shadow-lg ${
                  interactionType ? "ring-2 ring-accent" : ""
                }`}
              >
                <p className="truncate font-semibold text-blue-700">{t.sign.preview.signatureAreaLabel(currentPage)}</p>
                <p className="mt-1 truncate">{t.sign.preview.digitallySignedBy}</p>
                <button
                  type="button"
                  aria-label={t.sign.preview.resizeHandle}
                  title={t.sign.preview.resizeHint}
                  onPointerDown={(event) => beginInteraction(event, "resize")}
                  className="absolute bottom-0 right-0 size-4 cursor-se-resize rounded-tl bg-accent"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {pageCount > 1 ? (
        <nav aria-label={t.sign.preview.pdfNavAriaLabel} className="mt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => showPage(currentPage - 1)}
            className="h-7 rounded border border-border bg-surface px-2 text-[11px] font-semibold text-fg disabled:opacity-40"
          >
            {t.sign.preview.previousPage}
          </button>
          <label className="text-[11px] text-fg-muted">
            {t.sign.preview.pageLabel}{" "}
            <select
              value={currentPage}
              onChange={(event) => showPage(Number(event.target.value))}
              className="h-7 rounded border border-border bg-surface px-1.5 font-semibold text-fg"
            >
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                <option key={page} value={page}>{page}</option>
              ))}
            </select>{" "}
            / {pageCount}
          </label>
          <button
            type="button"
            disabled={currentPage >= pageCount}
            onClick={() => showPage(currentPage + 1)}
            className="h-7 rounded border border-border bg-surface px-2 text-[11px] font-semibold text-fg disabled:opacity-40"
          >
            {t.sign.preview.nextPage}
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function XmlPreview({ t, file }: { t: Dictionary; file: File }) {
  const [content, setContent] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    file.text().then((text) => {
      if (!cancelled) setContent(text);
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (content === undefined) {
    return <p className="text-[11.5px] text-fg-muted">{t.sign.preview.readingContent}</p>;
  }

  return (
    <pre className="max-h-135 overflow-auto rounded-lg bg-[#0d1117] p-5 font-mono text-[11.5px] leading-6 text-[#e6edf3]">
      <code>{content}</code>
    </pre>
  );
}

function DocxPreview({ t, file }: { t: Dictionary; file: File }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const [fitZoom, setFitZoom] = useState(100);
  const { zoom, zoomIn, zoomOut, reset } = useZoom(100);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const { renderAsync } = await import("docx-preview");
      const buffer = await file.arrayBuffer();
      if (cancelled || !containerRef.current) return;

      containerRef.current.replaceChildren();
      await renderAsync(buffer, containerRef.current, undefined, { inWrapper: true });
      if (cancelled) return;

      const page = containerRef.current.firstElementChild as HTMLElement | null;
      const availableWidth = outerRef.current?.clientWidth ?? 0;

      if (page && availableWidth > 0 && page.offsetWidth > 0) {
        const fit = Math.min(100, Math.max(25, Math.round((availableWidth / page.offsetWidth) * 100)));
        setFitZoom(fit);
        reset(fit);
      }
    }

    render().catch((err) => setError(String(err)));
    return () => {
      cancelled = true;
    };
  }, [file, reset]);

  if (error) {
    return <p className="text-[12.5px] text-danger">{t.sign.preview.cannotRenderWord(error)}</p>;
  }

  return (
    <div>
      <ZoomToolbar t={t} zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={() => reset(fitZoom)} />
      <div ref={outerRef} className="max-h-135 overflow-auto rounded-lg border border-border bg-white p-4">
        <div ref={containerRef} className="text-slate-800" style={{ zoom: zoom / 100 }} />
      </div>
    </div>
  );
}

function XlsxPreview({ t, file }: { t: Dictionary; file: File }) {
  const [sheets, setSheets] = useState<{ name: string; rows: string[][] }[]>();
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      if (cancelled) return;

      setSheets(
        workbook.SheetNames.map((name) => ({
          name,
          rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], {
            header: 1,
            blankrows: false,
          }) as string[][],
        })),
      );
    }

    render().catch((err) => setError(String(err)));
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (error) {
    return <p className="text-[12.5px] text-danger">{t.sign.preview.cannotRenderExcel(error)}</p>;
  }

  if (!sheets) {
    return <p className="text-[11.5px] text-fg-muted">{t.sign.preview.readingSpreadsheet}</p>;
  }

  const sheet = sheets[active];

  return (
    <div className="rounded-lg border border-border bg-white text-slate-800">
      <div className="flex gap-1 border-b border-border-muted bg-slate-50 p-1.5">
        {sheets.map((s, i) => (
          <button
            key={s.name}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded px-2.5 py-1 text-[11.5px] ${
              i === active ? "bg-white font-semibold shadow-sm" : "text-slate-500"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="max-h-125 overflow-auto">
        <table className="w-full border-collapse text-[11.5px]">
          <tbody>
            {sheet.rows.slice(0, 200).map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className="whitespace-nowrap border border-slate-200 px-2 py-1">
                    {cell ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PptxPreview({ t, file }: { t: Dictionary; file: File }) {
  const [slides, setSlides] = useState<string[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const JSZip = (await import("jszip")).default;
      const buffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);

      const slideFiles = Object.keys(zip.files)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));

      const texts = await Promise.all(
        slideFiles.map(async (name) => {
          const xml = await zip.file(name)!.async("text");
          const matches = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)];
          return matches.map((m) => m[1]).join(" ");
        }),
      );

      if (!cancelled) setSlides(texts);
    }

    render().catch((err) => setError(String(err)));
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (error) {
    return <p className="text-[12.5px] text-danger">{t.sign.preview.cannotRenderPowerPoint(error)}</p>;
  }

  if (!slides) {
    return <p className="text-[11.5px] text-fg-muted">{t.sign.preview.readingSlides}</p>;
  }

  return (
    <div className="max-h-135 space-y-2 overflow-auto">
      {slides.map((text, i) => (
        <div key={i} className="rounded-lg border border-border bg-white p-4 text-slate-800 shadow-sm">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">{t.sign.preview.slideLabel(i + 1)}</p>
          <p className="mt-2 whitespace-pre-wrap text-[12.5px]">{text || t.sign.preview.noTextInSlide}</p>
        </div>
      ))}
    </div>
  );
}
