"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckIcon,
  InfoIcon,
  XIcon,
} from "@/components/ui/icons";
import { useLocale } from "@/components/i18n/locale-provider";

export type ToastVariant = "success" | "danger" | "warning" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. Defaults: 5s, danger 8s. */
  duration?: number;
}

interface ToastEntry extends Required<Pick<ToastOptions, "title" | "variant" | "duration">> {
  id: number;
  description?: string;
}

export interface ToastApi {
  show: (options: ToastOptions) => void;
  success: (title: string, description?: string) => void;
  danger: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

interface ToastContextValue {
  toast: ToastApi;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 5;
let nextToastId = 0;

const VARIANT_STYLE: Record<
  ToastVariant,
  { chip: string; icon: ReactNode }
> = {
  success: { chip: "bg-success-subtle text-success", icon: <CheckIcon size={16} /> },
  danger: { chip: "bg-danger-subtle text-danger", icon: <AlertCircleIcon size={16} /> },
  warning: { chip: "bg-warning-subtle text-warning", icon: <AlertTriangleIcon size={16} /> },
  info: { chip: "bg-accent-subtle text-accent", icon: <InfoIcon size={16} /> },
};

/**
 * Shared toast layer (Design System §Status — semantic roles only).
 * Mount once near the root; fire notifications via `useToast()`:
 *
 *   const { toast } = useToast();
 *   toast.success("Tải tài liệu thành công");
 *   toast.show({ variant: "danger", title: "Không thể tải file đã ký." });
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const { t } = useLocale();

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((options: ToastOptions) => {
    const variant = options.variant ?? "info";
    const entry: ToastEntry = {
      id: nextToastId++,
      title: options.title,
      description: options.description,
      variant,
      duration: options.duration ?? (variant === "danger" ? 8000 : 5000),
    };
    setToasts((current) => [...current, entry].slice(-MAX_VISIBLE));
  }, []);

  const toast = useMemo<ToastApi>(
    () => ({
      show: push,
      success: (title, description) => push({ variant: "success", title, description }),
      danger: (title, description) => push({ variant: "danger", title, description }),
      warning: (title, description) => push({ variant: "warning", title, description }),
      info: (title, description) => push({ variant: "info", title, description }),
    }),
    [push],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-label={t.shell.toast.regionLabel}
        className="pointer-events-none fixed right-4 bottom-4 z-60 flex w-[min(92vw,360px)] flex-col gap-2"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} toast={item} onDismiss={() => dismiss(item.id)} closeLabel={t.shell.toast.close} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
  closeLabel,
}: {
  toast: ToastEntry;
  onDismiss: () => void;
  closeLabel: string;
}) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(onDismiss, toast.duration);
    return () => window.clearTimeout(timer);
  }, [paused, toast.duration, onDismiss]);

  const { chip, icon } = VARIANT_STYLE[toast.variant];

  return (
    <div
      role={toast.variant === "danger" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-surface p-3.5 shadow-md animate-[toast-in_180ms_ease-out] motion-reduce:animate-none"
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${chip}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[13px] font-semibold text-fg">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-[12px] leading-relaxed break-words text-fg-muted">
            {toast.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onDismiss}
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-fg-subtle hover:bg-inset hover:text-fg"
      >
        <XIcon size={14} />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
