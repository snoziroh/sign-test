"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { SignaturePosition } from "@/features/signing/components/sign-document-preview";

/**
 * Đặt khung chữ ký lên trang PDF.
 *
 * Khác bản trong màn ký một chỗ quan trọng: ở đây một tài liệu có NHIỀU người
 * ký, nên khung của những người khác được vẽ mờ cùng lúc. Không thấy chúng thì
 * người soạn xếp hai chữ ký chồng lên nhau và chỉ phát hiện ra ở tệp PDF cuối
 * cùng — lúc đó cả hai người đã ký xong, sửa nghĩa là làm lại từ đầu.
 *
 * Toạ độ lưu theo TỈ LỆ trang chứ không theo pixel: khung phải nằm đúng chỗ bất
 * kể zoom, DPI hay kích thước màn hình của người soạn.
 */

export interface GhostBox {
  id: string;
  label: string;
  position: SignaturePosition;
}

export function PdfPositionPicker({
  t,
  file,
  position,
  onChange,
  others,
  readOnly = false,
}: {
  t: Dictionary;
  file: File;
  position: SignaturePosition;
  onChange: (position: SignaturePosition) => void;
  others: GhostBox[];
  readOnly?: boolean;
}) {
  const g = t.signRequest.config;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string>();
  const [interaction, setInteraction] = useState<"drag" | "resize">();
  const interactionRef = useRef<
    { type: "drag" | "resize"; startX: number; startY: number; initial: SignaturePosition } | undefined
  >(undefined);

  const currentPage = position.page;

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

      const page = await pdf.getPage(Math.min(currentPage, pdf.numPages));
      const dpr = window.devicePixelRatio || 1;
      const native = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(1, (wrapperRef.current?.clientWidth ?? 380) - 16);
      const viewport = page.getViewport({ scale: (availableWidth / native.width) * dpr });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${availableWidth}px`;
      canvas.style.height = "auto";
      canvas.style.display = "block";

      const context = canvas.getContext("2d");
      if (!context) return;
      await page.render({ canvasContext: context, viewport, canvas }).promise;

      if (!cancelled && canvasHostRef.current) canvasHostRef.current.replaceChildren(canvas);
    }

    render().catch((err) => setError(String(err)));
    return () => {
      cancelled = true;
    };
  }, [file, currentPage]);

  function begin(event: React.PointerEvent<HTMLElement>, type: "drag" | "resize") {
    if (readOnly) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = { type, startX: event.clientX, startY: event.clientY, initial: position };
    setInteraction(type);
  }

  function move(event: React.PointerEvent<HTMLElement>) {
    const active = interactionRef.current;
    if (!active || !pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const dx = (event.clientX - active.startX) / rect.width;
    const dy = (event.clientY - active.startY) / rect.height;
    const minWidth = Math.min(1, 80 / rect.width);
    const minHeight = Math.min(1, 28 / rect.height);

    if (active.type === "drag") {
      onChange({
        ...active.initial,
        xPct: clamp(active.initial.xPct + dx, 0, 1 - active.initial.widthPct),
        yPct: clamp(active.initial.yPct + dy, 0, 1 - active.initial.heightPct),
      });
      return;
    }

    onChange({
      ...active.initial,
      widthPct: clamp(active.initial.widthPct + dx, minWidth, 1 - active.initial.xPct),
      heightPct: clamp(active.initial.heightPct + dy, minHeight, 1 - active.initial.yPct),
    });
  }

  function end(event: React.PointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    interactionRef.current = undefined;
    setInteraction(undefined);
  }

  if (error) return <p className="text-[12px] text-danger">{g.renderFailed(error)}</p>;

  const ghosts = others.filter((box) => box.position.page === currentPage);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={wrapperRef}
        className="max-h-100 overflow-auto rounded-md border border-border bg-inset p-2"
      >
        <div ref={pageRef} className="relative mx-auto">
          <div ref={canvasHostRef} className="rounded-sm border border-border shadow-sm" />

          {ghosts.map((box) => (
            <div
              key={box.id}
              aria-hidden="true"
              style={boxStyle(box.position)}
              className="pointer-events-none overflow-hidden rounded border border-dashed border-fg-subtle bg-inset/60 px-1.5 py-1"
            >
              <span className="block truncate font-mono text-[9px] font-semibold text-fg-muted">
                {box.label}
              </span>
            </div>
          ))}

          <div
            onPointerDown={(event) => begin(event, "drag")}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            style={{ ...boxStyle(position), touchAction: "none" }}
            className={`min-h-7 select-none overflow-hidden rounded-md border-2 border-accent bg-accent-subtle px-1.5 py-1 shadow-md ${
              readOnly ? "" : "cursor-move"
            } ${interaction ? "ring-2 ring-accent" : ""}`}
          >
            <span className="block truncate font-mono text-[9.5px] font-semibold text-accent">
              {g.title}
            </span>
            {!readOnly ? (
              <button
                type="button"
                aria-label={g.positionTitle}
                onPointerDown={(event) => begin(event, "resize")}
                className="absolute bottom-0 right-0 size-3.5 cursor-se-resize rounded-tl bg-accent"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onChange({ ...position, page: currentPage - 1 })}
            className="h-7 rounded border border-border bg-surface px-2 text-[11px] font-semibold text-fg disabled:opacity-40"
          >
            {g.previousPage}
          </button>
          <span className="font-mono text-[11px] text-fg-muted">
            {g.pageOf(currentPage, pageCount || 1)}
          </span>
          <button
            type="button"
            disabled={pageCount === 0 || currentPage >= pageCount}
            onClick={() => onChange({ ...position, page: currentPage + 1 })}
            className="h-7 rounded border border-border bg-surface px-2 text-[11px] font-semibold text-fg disabled:opacity-40"
          >
            {g.nextPage}
          </button>
        </div>

        {!readOnly ? (
          <button
            type="button"
            onClick={() =>
              onChange({ page: currentPage, xPct: 0.62, yPct: 0.78, widthPct: 0.3, heightPct: 0.12 })
            }
            className="h-7 rounded border border-border bg-surface px-2.5 text-[11px] font-semibold text-fg-muted hover:bg-inset"
          >
            {g.resetPosition}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function boxStyle(position: SignaturePosition): React.CSSProperties {
  return {
    position: "absolute",
    left: `${position.xPct * 100}%`,
    top: `${position.yPct * 100}%`,
    width: `${position.widthPct * 100}%`,
    height: `${position.heightPct * 100}%`,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
