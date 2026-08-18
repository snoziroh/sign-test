"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  MinusIcon,
  PenLineIcon,
  PlusIcon,
  RotateCcwIcon,
} from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import type { PublicSignatureSlot } from "@/lib/types/external-signing";
import { Spinner } from "@/features/signing/components/sign-dialog-parts";

/**
 * Bản xem tài liệu của trang ký công khai.
 *
 * Vì sao là một component riêng chứ không dùng lại `PdfPositionPicker`: bên đó
 * làm việc trên toạ độ ĐÃ CHUẨN HOÁ 0..1 gốc trên-trái, còn signature plan trả về
 * PDF points gốc DƯỚI-TRÁI. Muốn quy đổi thì phải biết khổ trang thật, tức là phải
 * đọc `getViewport({ scale: 1 })` — một thứ mà component kia không báo ra ngoài.
 * Ngoài ra ở đây không có kéo/thả gì cả: người ký ngoài hệ thống KHÔNG được đổi vị
 * trí chữ ký, và một khung kéo được là một lời hứa sai (backend đọc lại plan và ghi
 * đè mọi toạ độ client gửi).
 *
 * Dựng bằng canvas thay vì `<object data="…pdf">` vì ứng dụng đặt
 * `X-Frame-Options: DENY`, và Chrome coi nhúng PDF là một lần tải kiểu khung nên
 * chặn thẳng.
 */

const ZOOM_STEPS = [80, 100, 130, 160, 200] as const;
const DEFAULT_ZOOM_INDEX = 1;

interface NativeSize {
  width: number;
  height: number;
}

export function ExternalSigningDocumentView({
  t,
  file,
  slots,
  loading,
  errorTitle,
  onRetry,
}: {
  t: Dictionary;
  file?: File;
  slots: PublicSignatureSlot[];
  loading: boolean;
  /** Câu lỗi đã dịch; `undefined` khi không có lỗi. */
  errorTitle?: string;
  onRetry: () => void;
}) {
  const v = t.externalSign.viewer;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoomIndex, setZoomIndex] = useState<number>(DEFAULT_ZOOM_INDEX);
  const [nativeSize, setNativeSize] = useState<NativeSize>();
  const [renderError, setRenderError] = useState<string>();
  const [layoutVersion, setLayoutVersion] = useState(0);
  /** Nhấp nháy khung chữ ký sau khi người ký bấm "đến vị trí ký". */
  const [highlight, setHighlight] = useState(false);

  const signaturePages = useMemo(
    () => [...new Set(slots.map((slot) => slot.page))].sort((a, b) => a - b),
    [slots],
  );
  const firstSignaturePage = signaturePages[0];
  const slotsOnPage = useMemo(
    () => slots.filter((slot) => slot.page === page),
    [slots, page],
  );

  /**
   * Trang có ô chữ ký được mở SẴN thay vì trang 1.
   *
   * Việc người ký cần làm nằm ở đó, và bắt họ tự tìm qua nhiều trang là cách chắc
   * chắn nhất để có một chữ ký đặt vào tài liệu mà người ký chưa thấy chỗ nào có
   * chữ ký của mình. Trang 1 vẫn cách một cú bấm.
   */
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || !firstSignaturePage) return;
    jumped.current = true;
    setPage(firstSignaturePage);
  }, [firstSignaturePage]);

  // Đổi khổ khung (mở/đóng panel, quay ngang điện thoại) thì phải dựng lại canvas:
  // canvas là ảnh bitmap, giãn bằng CSS là chữ trong tài liệu bị nhoè.
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setLayoutVersion((value) => value + 1));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!file) return;
    const source = file;
    let cancelled = false;

    async function render() {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      // Xoá lỗi cũ SAU await đầu tiên, không ở đầu effect: một `setState` chạy đồng
      // bộ trong thân effect là một lượt render xếp tầng, và ở đây nó chẳng mua được
      // gì — lỗi cũ chỉ cần biến mất trước khi trang mới được vẽ.
      if (cancelled) return;
      setRenderError(undefined);

      const pdf = await pdfjs.getDocument({ data: await source.arrayBuffer() }).promise;
      if (cancelled) return;
      setPageCount(pdf.numPages);

      const target = await pdf.getPage(Math.min(Math.max(1, page), pdf.numPages));
      if (cancelled) return;

      /*
       * `scale: 1` là khổ trang tính bằng PDF points — chính hệ toạ độ mà
       * signature plan dùng. Overlay quy đổi qua phần trăm của khổ này, nên nó
       * đúng ở mọi mức thu phóng và mọi bề rộng màn hình.
       */
      const native = target.getViewport({ scale: 1 });
      setNativeSize({ width: native.width, height: native.height });

      const dpr = window.devicePixelRatio || 1;
      const available = Math.max(1, (wrapperRef.current?.clientWidth ?? 480) - 24);
      const displayWidth = Math.max(240, available * (ZOOM_STEPS[zoomIndex] / 100));
      const viewport = target.getViewport({ scale: (displayWidth / native.width) * dpr });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = "auto";
      canvas.style.display = "block";

      const context = canvas.getContext("2d");
      if (!context) return;
      await target.render({ canvasContext: context, viewport, canvas }).promise;

      if (!cancelled && canvasHostRef.current) canvasHostRef.current.replaceChildren(canvas);
    }

    render().catch((cause) => {
      if (!cancelled) setRenderError(String(cause));
    });

    return () => {
      cancelled = true;
    };
  }, [file, page, zoomIndex, layoutVersion]);

  const goToSignature = useCallback(() => {
    if (!firstSignaturePage) return;
    setPage(firstSignaturePage);
    setHighlight(true);
    // Cuộn sau khi trang mới đã vẽ; khung chưa tồn tại ở tick này.
    window.setTimeout(
      () => slotRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      120,
    );
    window.setTimeout(() => setHighlight(false), 2_400);
  }, [firstSignaturePage]);

  const message = errorTitle ?? renderError;

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <header className="flex flex-wrap items-center gap-2 border-b border-border-muted px-3 py-2.5 sm:px-4">
        <FileTextIcon size={15} className="shrink-0 text-fg-muted" />
        <h2 className="mr-auto text-[13px] font-semibold text-fg">{v.title}</h2>

        {firstSignaturePage ? (
          <button
            type="button"
            onClick={goToSignature}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-accent bg-accent-subtle px-2.5 text-[11.5px] font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-fg"
          >
            <PenLineIcon size={13} />
            {v.goToSignature}
          </button>
        ) : null}

        <div className="flex items-center gap-1 rounded-md border border-border bg-surface-2 p-0.5">
          <IconButton
            label={v.zoomOut}
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
          >
            <MinusIcon size={13} />
          </IconButton>
          <span className="w-10 text-center font-mono text-[10.5px] text-fg-muted">
            {ZOOM_STEPS[zoomIndex]}%
          </span>
          <IconButton
            label={v.zoomIn}
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            onClick={() => setZoomIndex((index) => Math.min(ZOOM_STEPS.length - 1, index + 1))}
          >
            <PlusIcon size={13} />
          </IconButton>
        </div>
      </header>

      {firstSignaturePage ? (
        <p className="flex items-center gap-1.5 border-b border-border-muted bg-accent-subtle px-3 py-2 text-[11.5px] text-fg sm:px-4">
          <PenLineIcon size={12} className="shrink-0 text-accent" />
          {v.signatureOnPage(firstSignaturePage)}
          {slots.length > 1 ? <span className="text-fg-muted">· {v.extraSlots(slots.length)}</span> : null}
        </p>
      ) : null}

      {/*
        Chiều cao bị chặn thay vì để trôi theo nội dung: một tài liệu dài đẩy nút ký
        xuống dưới hai màn hình trên điện thoại, và người ký không tìm ra việc mình
        phải làm. Cuộn nằm TRONG khung tài liệu, trang ngoài giữ nguyên chỗ.
      */}
      <div
        ref={wrapperRef}
        className="min-h-75 max-h-[62vh] flex-1 overflow-auto bg-inset p-3 lg:max-h-[calc(100vh-16rem)]"
      >
        {loading && !file ? (
          <div className="py-12 text-center">
            <Spinner />
            <p className="mt-3 text-[12.5px] text-fg-muted">{v.loading}</p>
          </div>
        ) : message ? (
          <div className="mx-auto max-w-100 rounded-lg border border-danger bg-danger-subtle p-4 text-center">
            <AlertTriangleIcon size={18} className="mx-auto text-danger" />
            <p className="mt-2 text-[12.5px] font-semibold text-danger">{v.errorTitle}</p>
            <p className="mt-1 break-words font-mono text-[10.5px] text-danger">{message}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-fg"
            >
              <RotateCcwIcon size={13} />
              {v.retry}
            </button>
          </div>
        ) : (
          <div className="relative mx-auto w-fit">
            <div ref={canvasHostRef} className="rounded-sm border border-border shadow-sm" />

            {nativeSize
              ? slotsOnPage.map((slot, index) => (
                  <SlotOverlay
                    key={`${slot.slotCode}-${index}`}
                    ref={index === 0 ? slotRef : undefined}
                    label={slot.title || t.externalSign.viewer.signatureBadge}
                    slot={slot}
                    native={nativeSize}
                    highlight={highlight}
                  />
                ))
              : null}
          </div>
        )}
      </div>

      {pageCount > 1 ? (
        <footer className="flex items-center justify-center gap-2 border-t border-border-muted px-3 py-2">
          <IconButton
            label={v.previous}
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeftIcon size={15} />
          </IconButton>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => {
              const hasSignature = signaturePages.includes(number);
              const active = number === page;
              return (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  aria-current={active ? "page" : undefined}
                  title={hasSignature ? v.pageHasSignature : undefined}
                  className={`relative flex size-7 items-center justify-center rounded-md border font-mono text-[11px] font-semibold transition-colors ${
                    active
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface text-fg-muted hover:bg-surface-2"
                  }`}
                >
                  {number}
                  {/* Dấu hiệu duy nhất cho biết việc cần làm nằm ở trang nào. */}
                  {hasSignature && !active ? (
                    <span
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-accent"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <IconButton
            label={v.next}
            disabled={page >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          >
            <ChevronRightIcon size={15} />
          </IconButton>

          <span className="ml-1 font-mono text-[10.5px] text-fg-subtle">
            {v.page(page, pageCount)}
          </span>
        </footer>
      ) : null}
    </section>
  );
}

/**
 * Khung chữ ký vẽ trên trang.
 *
 * Quy đổi points → phần trăm: plan dùng gốc DƯỚI-TRÁI, CSS dùng gốc TRÊN-TRÁI, nên
 * `top` phải lật lại qua chiều cao trang. Nhầm bước này là khung nằm đối xứng qua
 * giữa trang — sai một cách trông vẫn "hợp lý", và chỉ lộ ra ở tệp cuối cùng.
 */
function SlotOverlay({
  ref,
  label,
  slot,
  native,
  highlight,
}: {
  ref?: React.Ref<HTMLDivElement>;
  label: string;
  slot: PublicSignatureSlot;
  native: NativeSize;
  highlight: boolean;
}) {
  const style = {
    left: `${(slot.x / native.width) * 100}%`,
    top: `${((native.height - (slot.y + slot.height)) / native.height) * 100}%`,
    width: `${(slot.width / native.width) * 100}%`,
    height: `${(slot.height / native.height) * 100}%`,
  };

  return (
    <div
      ref={ref}
      style={style}
      className={`pointer-events-none absolute flex items-center justify-center rounded-sm border-2 border-accent bg-accent/12 transition-shadow ${
        highlight ? "shadow-[0_0_0_6px_var(--accent-subtle)]" : ""
      }`}
    >
      <span className="max-w-full truncate rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-fg">
        {label}
      </span>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-surface text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  );
}
