"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

import { XIcon } from "@/components/ui/icons";

type AppDialogProps = {
  open: boolean;
  onClose: () => void;

  title: string;
  description?: string;

  children: ReactNode;
};

export function AppDialog({
  open,
  onClose,
  title,
  description,
  children,
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleCancel(event: React.SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className="
        app-dialog
        m-auto
        w-[calc(100%-2rem)]
        max-w-105
        overflow-hidden
        rounded-xl
        border
        border-border
        bg-surface
        p-0
        text-fg
        shadow-md
      "
    >
      <div className="flex items-start gap-3 px-5 pt-4.5">
        <div className="min-w-0 flex-1">
          <h2
            id={titleId}
            className="text-[16px] font-semibold leading-5 text-fg"
          >
            {title}
          </h2>

          {description ? (
            <p
              id={descriptionId}
              className="mt-1.5 text-[13px] leading-[1.55] text-fg-muted"
            >
              {description}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="
            inline-flex
            size-8.5
            shrink-0
            items-center
            justify-center
            rounded-md
            border
            border-border
            bg-surface
            text-fg-muted
            transition-colors
            hover:bg-surface-2
            hover:text-fg
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-accent
            focus-visible:ring-offset-2
            focus-visible:ring-offset-surface
          "
        >
          <XIcon size={16} />
        </button>
      </div>

      <div className="px-5 pb-5 pt-4">{children}</div>
    </dialog>
  );
}
