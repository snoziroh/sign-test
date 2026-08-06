"use client";

import { useMemo, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { LinkIcon, PlusIcon, SearchIcon, UsersIcon } from "@/components/ui/icons";
import { avatarTone, initialsOf, searchDirectory } from "../directory";
import type { DirectoryUser } from "../model";
import type { FlowDrag } from "./flow-canvas";

/**
 * Danh bạ người ký, đứng cạnh sơ đồ luồng — nguồn của mọi thao tác kéo.
 *
 * Mỗi thẻ có HAI đường vào cùng một hành động: kéo thả (nhanh, nhưng không dùng
 * được bằng bàn phím và không có trên cảm ứng) và nút "+" (thả vào bước đang
 * chọn). Nút "+" nói rõ nó thả vào bước nào — một nút "thêm" không nói đích đến
 * là một nút người dùng phải bấm thử mới biết nó làm gì.
 */
export function SignerPalette({
  t,
  selectedStepNumber,
  onDrag,
  onAddUser,
  onAddLink,
}: {
  t: Dictionary;
  /** Bước sẽ nhận người ký khi bấm "+", đánh số từ 1. */
  selectedStepNumber: number;
  onDrag: (drag?: FlowDrag) => void;
  onAddUser: (user: DirectoryUser) => void;
  onAddLink: () => void;
}) {
  const p = t.signRequest.flow.palette;
  const c = t.signRequest.flow.canvas;
  const [query, setQuery] = useState("");
  const users = useMemo(() => searchDirectory(query), [query]);
  const stepLabel = c.stepLabel(selectedStepNumber);

  return (
    <aside
      aria-label={p.title}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm"
    >
      <div>
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-fg">
          <UsersIcon size={15} className="text-fg-muted" />
          {p.title}
        </h3>
        <p className="mt-1 text-[11.5px] text-fg-muted">{p.hint}</p>
      </div>

      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
        >
          <SearchIcon size={14} />
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={p.searchLabel}
          placeholder={p.searchPlaceholder}
          className="h-8.5 w-full rounded-md border border-border bg-canvas pl-8 pr-2.5 text-[12.5px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        />
      </div>

      <section className="flex flex-col gap-1.5">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-subtle">
          {p.systemGroup}
        </h4>

        {users.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-[11.5px] text-fg-muted">
            {p.empty}
          </p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto pr-0.5">
            {users.map((user) => (
              <li key={user.id}>
                <div
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "copy";
                    event.dataTransfer.setData("text/plain", user.name);
                    onDrag({ kind: "user", user });
                  }}
                  onDragEnd={() => onDrag(undefined)}
                  title={p.dragHandle(user.name)}
                  className="group flex cursor-grab items-center gap-2.5 rounded-md border border-border bg-surface px-2.5 py-2 transition-colors hover:border-accent hover:bg-accent-subtle active:cursor-grabbing"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-7.5 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold ${avatarTone(
                      user.email,
                    )}`}
                  >
                    {initialsOf(user.name)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-fg">
                      {user.name}
                    </span>
                    <span className="block truncate text-[11px] text-fg-muted">
                      {user.department}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onAddUser(user)}
                    aria-label={`${c.addSigner} — ${user.name} → ${stepLabel}`}
                    title={`${c.addSigner} → ${stepLabel}`}
                    className="flex size-6.5 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-fg-subtle transition-colors hover:border-accent hover:text-accent group-hover:text-fg-muted"
                  >
                    <PlusIcon size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-1.5">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-subtle">
          {p.linkGroup}
        </h4>

        <div
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "copy";
            event.dataTransfer.setData("text/plain", p.linkTitle);
            onDrag({ kind: "link" });
          }}
          onDragEnd={() => onDrag(undefined)}
          title={p.dragHandle(p.linkTitle)}
          className="group flex cursor-grab items-start gap-2.5 rounded-md border border-dashed border-border bg-surface-2 px-2.5 py-2 transition-colors hover:border-accent hover:bg-accent-subtle active:cursor-grabbing"
        >
          <span
            aria-hidden="true"
            className="flex size-7.5 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent"
          >
            <LinkIcon size={15} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-semibold text-fg">{p.linkTitle}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-fg-muted">
              {p.linkDescription}
            </span>
          </span>

          <button
            type="button"
            onClick={onAddLink}
            aria-label={`${c.addSigner} — ${p.linkTitle} → ${stepLabel}`}
            title={`${c.addSigner} → ${stepLabel}`}
            className="flex size-6.5 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-fg-subtle transition-colors hover:border-accent hover:text-accent group-hover:text-fg-muted"
          >
            <PlusIcon size={14} />
          </button>
        </div>
      </section>
    </aside>
  );
}
