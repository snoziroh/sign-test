"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { SignaturePosition } from "@/features/signing/components/sign-document-preview";

/**
 * PDF canvas dùng chung cho:
 * - đặt một signature slot;
 * - xem các slot khác dưới dạng ghost;
 * - review read-only tất cả slots bằng `hidePrimaryBox + viewPage`.
 *
 * Tọa độ frontend luôn NORMALIZED_TOP_LEFT:
 * page 1-based, x/y/width/height 0..1.
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
  viewPage,
  onViewPageChange,
  hidePrimaryBox = false,
  primaryLabel,
  fill = false,
}: {
  t: Dictionary;
  file: File;
  position: SignaturePosition;
  onChange: (position: SignaturePosition) => void;
  others: GhostBox[];
  readOnly?: boolean;

  /**
   * Khi truyền viewPage, pagination chỉ đổi trang đang xem và KHÔNG mutate
   * `position.page`. Dùng cho final preview có nhiều boxes.
   */
  viewPage?: number;
  onViewPageChange?: (page: number) => void;

  /** Dùng final preview: mọi signature đều nằm trong `others`. */
  hidePrimaryBox?: boolean;
  primaryLabel?: string;

  /**
   * Lấp đầy chiều cao của khung cha thay vì tự cao tới `max-h-[64vh]`.
   *
   * Dùng khi picker nằm trong một card đã có chiều cao cố định: khi đó card
   * KHÔNG được cuộn, chỉ vùng trang PDF cuộn. Hai thanh cuộn lồng nhau là hệ
   * quả của việc để cả hai bên cùng tự quyết chiều cao.
   */
  fill?: boolean;
}) {
  const g = t.signRequest.config;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);

  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string>();
  const [interaction, setInteraction] = useState<"drag" | "resize">();
  const [zoomPct, setZoomPct] = useState(100);
  const [layoutVersion, setLayoutVersion] = useState(0);

  const interactionRef = useRef<
    | {
        type: "drag" | "resize";
        startX: number;
        startY: number;
        initial: SignaturePosition;
      }
    | undefined
  >(undefined);

  const currentPage = Math.max(1, viewPage ?? position.page);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      setLayoutVersion((value) => value + 1);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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

      const safePage = clamp(currentPage, 1, Math.max(1, pdf.numPages));
      if (safePage !== currentPage) {
        changePage(safePage);
        return;
      }

      const page = await pdf.getPage(safePage);
      const dpr = window.devicePixelRatio || 1;
      const native = page.getViewport({ scale: 1 });

      const wrapperWidth = Math.max(
        1,
        (wrapperRef.current?.clientWidth ?? 420) - 18,
      );
      // "Vừa chiều rộng" = vừa khung, nhưng có trần. Không có trần thì trên
      // màn rộng một trang A4 render ra gần 2000px và cao gấp rưỡi thế —
      // đọc thì to quá mà kéo khung ký thì mất kiểm soát. Muốn to hơn thì zoom.
      const fitWidth = Math.min(wrapperWidth, MAX_FIT_WIDTH);
      const displayWidth = Math.max(240, fitWidth * (zoomPct / 100));

      const viewport = page.getViewport({
        scale: (displayWidth / native.width) * dpr,
      });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = "auto";
      canvas.style.display = "block";

      const context = canvas.getContext("2d");
      if (!context) return;

      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      }).promise;

      if (!cancelled && canvasHostRef.current) {
        canvasHostRef.current.replaceChildren(canvas);
      }
    }

    render().catch((cause) => {
      if (!cancelled) setError(String(cause));
    });

    return () => {
      cancelled = true;
    };
    // layoutVersion intentionally re-renders after container resize.
  }, [file, currentPage, zoomPct, layoutVersion]);

  function changePage(next: number) {
    const max = Math.max(1, pageCount || 1);
    const safe = clamp(next, 1, max);

    if (onViewPageChange) {
      onViewPageChange(safe);
      return;
    }

    onChange({ ...position, page: safe });
  }

  function begin(
    event: React.PointerEvent<HTMLElement>,
    type: "drag" | "resize",
  ) {
    if (readOnly || hidePrimaryBox) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    interactionRef.current = {
      type,
      startX: event.clientX,
      startY: event.clientY,
      initial: position,
    };

    setInteraction(type);
  }

  function move(event: React.PointerEvent<HTMLElement>) {
    const active = interactionRef.current;
    if (!active || !pageRef.current || readOnly || hidePrimaryBox) return;

    const rect = pageRef.current.getBoundingClientRect();
    const dx = (event.clientX - active.startX) / rect.width;
    const dy = (event.clientY - active.startY) / rect.height;

    const minWidth = Math.min(1, 80 / rect.width);
    const minHeight = Math.min(1, 28 / rect.height);

    if (active.type === "drag") {
      onChange({
        ...active.initial,
        xPct: clamp(
          active.initial.xPct + dx,
          0,
          1 - active.initial.widthPct,
        ),
        yPct: clamp(
          active.initial.yPct + dy,
          0,
          1 - active.initial.heightPct,
        ),
      });
      return;
    }

    onChange({
      ...active.initial,
      widthPct: clamp(
        active.initial.widthPct + dx,
        minWidth,
        1 - active.initial.xPct,
      ),
      heightPct: clamp(
        active.initial.heightPct + dy,
        minHeight,
        1 - active.initial.yPct,
      ),
    });
  }

  function end(event: React.PointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    interactionRef.current = undefined;
    setInteraction(undefined);
  }

  if (error) {
    return (
      <p className="text-[12px] text-danger">
        {g.renderFailed(error)}
      </p>
    );
  }

  const ghosts = others.filter(
    (box) => box.position.page === currentPage,
  );

  const showPrimary =
    !hidePrimaryBox && position.page === currentPage;

  return (
    <div className={`flex flex-col gap-2 ${fill ? "h-full min-h-0" : ""}`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => changePage(currentPage - 1)}
            className="h-7 rounded border border-border bg-surface px-2 text-[11px] font-semibold text-fg disabled:opacity-40"
          >
            {g.previousPage}
          </button>

          <div className="flex h-7 items-center gap-1 rounded border border-border bg-canvas px-2">
            <input
              aria-label={g.currentPage}
              inputMode="numeric"
              value={currentPage}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next)) changePage(next);
              }}
              className="w-8 bg-transparent text-center font-mono text-[11px] text-fg outline-none"
            />
            <span className="text-[10px] text-fg-subtle">/</span>
            <span className="font-mono text-[11px] text-fg-muted">
              {pageCount || 1}
            </span>
          </div>

          <button
            type="button"
            disabled={pageCount === 0 || currentPage >= pageCount}
            onClick={() => changePage(currentPage + 1)}
            className="h-7 rounded border border-border bg-surface px-2 text-[11px] font-semibold text-fg disabled:opacity-40"
          >
            {g.nextPage}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={zoomPct <= 50}
            onClick={() => setZoomPct((value) => Math.max(50, value - 10))}
            className="size-7 rounded border border-border bg-surface text-[13px] font-semibold text-fg-muted disabled:opacity-40"
            aria-label={g.zoomOut}
          >
            −
          </button>

          <span className="min-w-12 text-center font-mono text-[10.5px] text-fg-muted">
            {zoomPct}%
          </span>

          <button
            type="button"
            disabled={zoomPct >= 200}
            onClick={() => setZoomPct((value) => Math.min(200, value + 10))}
            className="size-7 rounded border border-border bg-surface text-[13px] font-semibold text-fg-muted disabled:opacity-40"
            aria-label={g.zoomIn}
          >
            +
          </button>

          <button
            type="button"
            onClick={() => setZoomPct(100)}
            className="h-7 rounded border border-border bg-surface px-2.5 text-[10.5px] font-semibold text-fg-muted hover:bg-inset"
          >
            {g.fitWidth}
          </button>
        </div>
      </div>

      <div
        ref={wrapperRef}
        className={`overflow-auto rounded-md border border-border bg-inset p-2 ${
          fill ? "min-h-0 flex-1" : "max-h-[64vh]"
        }`}
      >
        <div
          ref={pageRef}
          className="relative mx-auto w-fit"
        >
          <div
            ref={canvasHostRef}
            className="rounded-sm border border-border bg-white shadow-sm"
          />

          {ghosts.map((box) => (
            <div
              key={box.id}
              aria-hidden="true"
              style={boxStyle(box.position)}
              className="pointer-events-none overflow-hidden rounded border border-dashed border-fg-subtle bg-inset/70 px-1.5 py-1"
            >
              <span className="block truncate font-mono text-[9px] font-semibold text-fg-muted">
                {box.label}
              </span>
            </div>
          ))}

          {showPrimary ? (
            <div
              onPointerDown={(event) => begin(event, "drag")}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              style={{
                ...boxStyle(position),
                touchAction: "none",
              }}
              className={`min-h-7 select-none overflow-hidden rounded-md border-2 border-accent bg-accent-subtle px-1.5 py-1 shadow-md ${
                readOnly ? "" : "cursor-move"
              } ${interaction ? "ring-2 ring-accent" : ""}`}
            >
              <span className="block truncate font-mono text-[9.5px] font-semibold text-accent">
                {primaryLabel ?? g.title}
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
          ) : null}
        </div>
      </div>

      {!readOnly && !hidePrimaryBox ? (
        <div className="flex shrink-0 justify-end">
          <button
            type="button"
            onClick={() =>
              onChange({
                page: currentPage,
                xPct: 0.62,
                yPct: 0.78,
                widthPct: 0.3,
                heightPct: 0.12,
              })
            }
            className="h-7 rounded border border-border bg-surface px-2.5 text-[11px] font-semibold text-fg-muted hover:bg-inset"
          >
            {g.resetPosition}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Trần chiều rộng của một trang PDF ở mức zoom 100%, tính bằng px CSS. */
const MAX_FIT_WIDTH = 760;

function boxStyle(
  position: SignaturePosition,
): React.CSSProperties {
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