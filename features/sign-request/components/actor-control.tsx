"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/components/i18n/locale-provider";
import { UserPlusIcon } from "@/components/ui/icons";
import { dialogButtonClass } from "@/features/signing/components/sign-dialog-parts";
import { ACTOR_SUGGESTIONS, MAX_ACTOR_LENGTH, normalizeActor, useActor } from "../actor";

/**
 * Ai đang thao tác — giá trị gửi trong `X-Username`.
 *
 * Đứng cạnh ô địa chỉ dịch vụ trên header vì cùng một lý do: cả hai quyết định
 * lời gọi tiếp theo đi đâu và đi dưới danh nghĩa ai, và cả hai đều là thứ người
 * test đổi vài lần trong một buổi. Chưa chọn thì nút hiện trạng thái cảnh báo
 * chứ không im lặng — mọi endpoint của quy trình ký sẽ từ chối cho tới lúc có.
 */
export function ActorControl() {
  const { t } = useLocale();
  const { actor } = useActor();
  const [open, setOpen] = useState(false);
  const a = t.signRequest.actor;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={a.buttonTitle}
        className={`flex h-8.5 max-w-60 items-center gap-2 rounded-md border px-3 text-[12px] font-semibold hover:bg-inset ${
          actor
            ? "border-border bg-surface text-fg"
            : "border-warning bg-warning-subtle text-warning"
        }`}
      >
        <UserPlusIcon size={14} className="shrink-0" />
        <span className="truncate font-mono text-[11px] font-normal">
          {actor ?? a.unset}
        </span>
      </button>

      {open ? <ActorDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ActorDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const { actor, setActor } = useActor();
  const a = t.signRequest.actor;

  const [value, setValue] = useState(actor ?? "");

  // Đổi ở tab khác trong lúc hộp thoại đang mở: đồng bộ lại ô nhập.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ từ store ngoài React
    setValue(actor ?? "");
  }, [actor]);

  function save() {
    const next = normalizeActor(value) ?? null;
    setActor(next);
    toast.success(a.savedTitle, next ?? a.unset);
    onClose();
  }

  return (
    <Dialog open onClose={onClose} label={a.title} className="max-w-125">
      <div className="border-b border-border-muted px-5 py-4">
        <h2 className="text-[16px] font-semibold text-fg">{a.title}</h2>
        <p className="mt-1 text-[12.5px] text-fg-muted">{a.description}</p>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div>
          <label
            htmlFor="workflow-actor"
            className="mb-1.5 block text-[11px] font-semibold text-fg-muted"
          >
            {a.label}
          </label>
          <input
            id="workflow-actor"
            value={value}
            maxLength={MAX_ACTOR_LENGTH}
            onChange={(event) => setValue(event.target.value)}
            placeholder={a.placeholder}
            spellCheck={false}
            autoComplete="off"
            className="h-9 w-full rounded-md border border-border bg-surface px-2.5 font-mono text-[12px] text-fg"
          />
          <p className="mt-1.5 text-[10.5px] text-fg-muted">{a.hint}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ACTOR_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setValue(suggestion)}
              className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[10.5px] text-fg-muted hover:bg-inset"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <p className="rounded-md bg-inset p-2.5 text-[10.5px] leading-relaxed text-fg-muted">
          {a.accessNote}
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border-muted px-5 py-3">
        <button type="button" onClick={onClose} className={dialogButtonClass(false)}>
          {t.common.cancel}
        </button>
        <button type="button" onClick={save} className={dialogButtonClass(true)}>
          {a.save}
        </button>
      </div>
    </Dialog>
  );
}
