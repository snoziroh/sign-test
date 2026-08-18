"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { CreatedExternalSigningLink } from "@/lib/types/workflow";
import { useToast } from "@/components/ui/toast";
import {
  CheckIcon,
  CopyIcon,
  EyeOffIcon,
  LinkIcon,
} from "@/components/ui/icons";
import { buildExternalSigningUrl } from "./external-signing-url";

export type ShareableExternalSigningLink = CreatedExternalSigningLink & {
  url: string;
};

export function CreatedExternalLinksPanel({
  t,
  links,
  onDismiss,
}: {
  t: Dictionary;
  links: ShareableExternalSigningLink[];
  onDismiss: () => void;
}) {
  const { toast } = useToast();
  const l = t.signRequest.workflows.detail.links;
  const [copiedLinkId, setCopiedLinkId] = useState<string>();

  async function copy(link: ShareableExternalSigningLink) {
    try {
      await navigator.clipboard.writeText(buildExternalSigningUrl(link.url));

      setCopiedLinkId(link.linkId);

      window.setTimeout(() => {
        setCopiedLinkId((current) =>
          current === link.linkId ? undefined : current,
        );
      }, 2_000);
    } catch {
      toast.warning(l.copyFailed, l.copyFailedHint);
    }
  }

  if (links.length === 0) return null;

  return (
    <section className="rounded-lg border border-warning bg-warning-subtle shadow-sm">
      <h3 className="flex items-center gap-2 border-b border-warning px-4 py-2.5 text-[12px] font-semibold text-fg">
        <LinkIcon size={14} />
        {l.freshTitle}
      </h3>

      <p className="px-4 pt-3 text-[11px] leading-relaxed text-fg-muted">
        {l.freshHint}
      </p>

      <ul className="flex flex-col gap-3 p-4">
        {links.map((link, index) => {
          const fullUrl = buildExternalSigningUrl(link.url);

          return (
            <li
              key={link.linkId}
              className="rounded-md border border-border bg-surface p-3"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11.5px] font-semibold text-fg">
                  {l.order(index + 1)}
                </span>

                <span className="font-mono text-[9.5px] text-fg-subtle">
                  {link.signerId}
                </span>
              </div>

              <input
                type="text"
                readOnly
                value={fullUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="h-8 w-full rounded-md border border-border bg-inset px-2 font-mono text-[10.5px] text-fg"
              />

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10.5px] text-fg-muted">
                  {l.expiresAt(
                    new Date(link.expiresAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => void copy(link)}
                  className="inline-flex h-7.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-2.5 text-[11px] font-semibold text-accent-fg"
                >
                  {copiedLinkId === link.linkId ? (
                    <CheckIcon size={12} />
                  ) : (
                    <CopyIcon size={12} />
                  )}

                  {copiedLinkId === link.linkId ? t.common.copied : l.copy}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-end border-t border-warning px-4 py-2.5">
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-7.5 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[11px] font-semibold text-fg"
        >
          <EyeOffIcon size={12} />
          {l.hideUrl}
        </button>
      </div>
    </section>
  );
}
