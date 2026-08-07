import type { RefObject } from "react";
import type { VerificationSignature } from "@/lib/types/verification";
import { ChevronRightIcon, XIcon } from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import type { Phase } from "./verification-config";
import {
  VerdictIcon,
  verdictMeta,
  formatDateTimeCompact,
  fileExtension,
  formatBytes,
} from "./verification-ui";

export function ArtifactUpload({
  t,
  artifact,
  dragging,
  inputRef,
  phase,
  onDraggingChange,
  onSelect,
  onClear,
}: {
  t: Dictionary;
  artifact?: File;
  dragging: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  phase: Phase;
  onDraggingChange: (value: boolean) => void;
  onSelect: (file?: File) => void;
  onClear: () => void;
}) {
  if (artifact) {
    const statusText =
      phase === "verifying"
        ? t.verify.upload.verifying
        : phase === "error"
          ? t.verify.upload.failed
          : t.verify.upload.completed;

    return (
      <section className="rounded-lg border border-border bg-surface shadow-sm">
        <header className="border-b border-border-muted px-4 py-2.5 text-[13px] font-semibold text-fg">
          {t.verify.upload.sectionTitle}
        </header>

        <div className="flex items-start gap-3 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-subtle font-mono text-[9px] font-bold uppercase text-accent">
            {fileExtension(artifact.name) || "FILE"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-fg">
              {artifact.name}
            </p>
            <p className="mt-0.5 text-[11px] text-fg-muted">
              {formatBytes(artifact.size)}
            </p>
            <p
              className={`mt-1 text-[10.5px] ${
                phase === "error" ? "text-danger" : "text-fg-subtle"
              }`}
            >
              {statusText}
            </p>
          </div>

          <button
            type="button"
            onClick={onClear}
            aria-label={t.verify.upload.remove(artifact.name)}
            className="rounded-md p-1 text-fg-muted hover:bg-inset hover:text-fg"
          >
            <XIcon size={15} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-lg border-2 border-dashed bg-surface p-6 text-center transition-colors ${
        dragging
          ? "border-accent bg-accent-subtle"
          : "border-border"
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        onDraggingChange(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          onDraggingChange(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDraggingChange(false);
        onSelect(event.dataTransfer.files[0]);
      }}
    >
      <p className="text-[13px] font-semibold text-fg">
        {t.verify.upload.dropHere}
      </p>
      <p className="mt-1 text-[11.5px] text-fg-muted">
        {t.verify.upload.acceptedTypes}
      </p>

      <input
        ref={inputRef}
        id="verification-artifact"
        type="file"
        className="sr-only"
        accept=".pdf,.xml,.docx,.xlsx,.pptx"
        onChange={(event) =>
          onSelect(event.target.files?.[0])
        }
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 h-8.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg"
      >
        {t.verify.upload.chooseFile}
      </button>
    </section>
  );
}

export function SignatureList({
  t,
  signatures,
  selectedIndex,
  onSelect,
}: {
  t: Dictionary;
  signatures: VerificationSignature[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <header className="flex items-center justify-between border-b border-border-muted px-4 py-2.5">
        <span className="text-[13px] font-semibold text-fg">{t.verify.signatureList.title}</span>
        <span className="rounded-full bg-inset px-2 py-0.5 text-[10.5px] font-semibold text-fg-muted">
          {signatures.length}
        </span>
      </header>

      {signatures.length === 0 ? (
        <p className="px-4 py-3 text-[11.5px] text-fg-muted">{t.verify.signatureList.empty}</p>
      ) : (
        <div>
          {signatures.map((signature, position) => {
            const selected = position === selectedIndex;
            const meta = verdictMeta(t, signature.status);

            return (
              <button
                key={signature.signatureId}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(position)}
                className={`flex w-full items-center gap-3 border-b border-border-muted px-4 py-3 text-left last:border-b-0 ${
                  selected
                    ? "border-l-3 border-l-accent bg-accent-subtle"
                    : "border-l-3 border-l-transparent hover:bg-inset"
                }`}
              >
                <span className={meta.color}>
                  <VerdictIcon status={signature.status} size={16} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-fg">
                    {signature.signer?.commonName ?? t.verify.banner2.unknownSigner}
                  </span>
                  <span className="mt-0.5 block truncate text-[10.5px] text-fg-muted">
                    {formatDateTimeCompact(signature.signingTime)} · {meta.title}
                  </span>
                </span>

                <ChevronRightIcon size={14} className="shrink-0 text-fg-subtle" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}