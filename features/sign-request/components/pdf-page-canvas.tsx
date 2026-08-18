"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Một trang PDF, dựng bằng pdf.js vào canvas.
 *
 * Vì sao không dùng `<object data="…pdf">` cho gọn: ứng dụng đặt
 * `X-Frame-Options: DENY` cho mọi phản hồi, và Chrome coi việc nhúng PDF vào
 * `<object>`/`<embed>` là một lần tải kiểu khung — nên trình duyệt chặn thẳng
 * (`ERR_BLOCKED_BY_RESPONSE`). Hạ header đó xuống để xem được một bản xem trước
 * là đổi một hàng rào chống clickjacking của cả ứng dụng lấy một tiện nghi; dựng
 * bằng canvas không phải đánh đổi gì cả.
 *
 * `children` được xếp chồng lên trang theo toạ độ phần trăm — đó là chỗ bản xem
 * trước vẽ giá trị đã điền lên đúng chỗ trống.
 */
export function PdfPageCanvas({
  file,
  page,
  onPageCount,
  onError,
  children,
  className = "",
}: {
  file: File;
  /** Đánh số từ 1. Vượt quá số trang thì tự lùi về trang cuối. */
  page: number;
  onPageCount?: (count: number) => void;
  onError?: (message: string) => void;
  children?: ReactNode;
  className?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  /*
   * Hai callback trong ref chứ không trong mảng phụ thuộc: người gọi hay truyền
   * hàm inline, và một hàm mới mỗi lần render sẽ khiến effect dựng lại cả trang
   * PDF sau mỗi phím gõ ở form bên cạnh.
   */
  const handlers = useRef({ onPageCount, onError });
  useEffect(() => {
    handlers.current = { onPageCount, onError };
  }, [onPageCount, onError]);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      if (cancelled) return;
      handlers.current.onPageCount?.(pdf.numPages);

      const target = await pdf.getPage(Math.min(page, pdf.numPages));
      // Nhân theo devicePixelRatio rồi ép lại bề rộng CSS: thiếu bước này thì
      // chữ trong PDF nhoè trên màn hình HiDPI, đúng chỗ người dùng đang soi.
      const dpr = window.devicePixelRatio || 1;
      const native = target.getViewport({ scale: 1 });
      const width = Math.max(1, (wrapperRef.current?.clientWidth ?? 360) - 8);
      const viewport = target.getViewport({ scale: (width / native.width) * dpr });

      const canvas = window.document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${width}px`;
      canvas.style.height = "auto";
      canvas.style.display = "block";

      const context = canvas.getContext("2d");
      if (!context) return;
      await target.render({ canvasContext: context, viewport, canvas }).promise;
      if (!cancelled && hostRef.current) hostRef.current.replaceChildren(canvas);
    }

    render().catch((error) => {
      if (!cancelled) handlers.current.onError?.(String(error));
    });

    return () => {
      cancelled = true;
    };
  }, [file, page]);

  return (
    <div ref={wrapperRef} className={`overflow-auto rounded-md bg-inset p-1 ${className}`}>
      <div className="relative mx-auto w-fit">
        <div ref={hostRef} className="rounded-sm border border-border shadow-sm" />
        {children}
      </div>
    </div>
  );
}
