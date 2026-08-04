"use client";

import { useEffect, useState } from "react";
import { AlertTriangleIcon } from "@/components/ui/icons";
import { describeSigningError, SigningApiClientError } from "../api";

/** Mảnh dùng chung cho các hộp thoại của luồng ký. */

export interface SignFlowError {
  message: string;
  code?: string;
  correlationId?: string;
}

/** Lỗi ném từ client API → khối lỗi hiển thị được, giữ `code` để rẽ nhánh tiếp. */
export function toFlowError(cause: unknown, fallback: string): SignFlowError {
  if (cause instanceof SigningApiClientError) {
    return {
      message: describeSigningError(cause.code, cause.detail),
      code: cause.code,
      correlationId: cause.correlationId,
    };
  }
  return { message: fallback };
}

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-8 animate-spin rounded-full border-2 border-accent border-t-transparent"
    />
  );
}

export function PendingBlock({ title, body }: { title: string; body?: string }) {
  return (
    <div className="py-4 text-center">
      <Spinner />
      <p className="mt-3 text-[13px] font-semibold text-fg">{title}</p>
      {body ? (
        <p className="mx-auto mt-1.5 max-w-90 text-[11.5px] leading-relaxed text-fg-muted">{body}</p>
      ) : null}
    </div>
  );
}

export function ErrorBlock({
  error,
  correlationLabel,
  note,
}: {
  error?: SignFlowError;
  correlationLabel: (id: string) => string;
  note?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-danger bg-danger-subtle p-3">
        <p className="text-[12.5px] text-danger">{error?.message ?? "—"}</p>
        {error?.code ? (
          <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-wider text-danger">
            {error.code}
          </p>
        ) : null}
        {error?.correlationId ? (
          <p className="mt-1 font-mono text-[10.5px] text-danger">
            {correlationLabel(error.correlationId)}
          </p>
        ) : null}
      </div>

      {note ? <WarningBlock>{note}</WarningBlock> : null}
    </div>
  );
}

/** Cảnh báo có hậu quả tiền bạc (lượt ký bị trừ) — cố ý nổi bật hơn ghi chú thường. */
export function WarningBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-md border border-warning bg-warning-subtle p-3">
      <AlertTriangleIcon size={14} className="mt-0.5 shrink-0 text-warning" />
      <p className="text-[11.5px] leading-relaxed text-warning">{children}</p>
    </div>
  );
}

export function dialogButtonClass(primary: boolean): string {
  return `flex h-8.5 items-center gap-1.5 rounded-md border px-4 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-55 ${
    primary ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-fg"
  }`;
}

/** Đếm ngược tới `expiresAt`; `undefined` khi backend không trả hạn. */
export function useCountdown(expiresAt?: string | null): number | undefined {
  const target = expiresAt ? new Date(expiresAt).getTime() : undefined;
  const [now, setNow] = useState(() => Date.now());

  // Effect chỉ chạy đồng hồ; setState nằm trong callback của interval nên không
  // phải setState đồng bộ trong thân effect.
  useEffect(() => {
    if (target === undefined) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  return target === undefined ? undefined : target - now;
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
