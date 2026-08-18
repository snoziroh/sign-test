"use client";

import { useMemo, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { DocumentFormat } from "@/lib/types/signing";
import { Dialog } from "@/components/ui/dialog";
import {
  CheckIcon,
  LinkIcon,
  SearchIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "@/components/ui/icons";
import type { SignaturePosition } from "@/features/signing/components/sign-document-preview";
import { avatarTone, initialsOf, searchDirectory } from "../directory";
import {
  BASELINE_LEVELS,
  LINK_SIGN_METHODS,
  type FlowStep,
  type SignatureSlot,
  type SlotSigner,
} from "../model";
import { PdfPositionPicker, type GhostBox } from "./pdf-position-picker";

/**
 * Cấu hình của MỘT ô chữ ký: ai ký, ký ra chữ ký như thế nào, và nếu là PDF thì
 * khung chữ ký nằm ở đâu trên trang.
 *
 * Hộp thoại chứ không phải một khối mở rộng tại chỗ: sơ đồ luồng là thứ người
 * dùng cần nhìn tổng thể, và một ô phình ra giữa hàng sẽ đẩy mọi ô khác đi chỗ
 * khác đúng lúc họ đang so sánh chúng với nhau.
 *
 * Ở màn tiến trình, cùng hộp thoại này mở ở chế độ chỉ đọc — người xem thấy đúng
 * cấu hình đã chốt, không phải một cách trình bày khác của cùng dữ liệu.
 */
export function SlotConfigDialog({
  t,
  open,
  onClose,
  slot,
  stepIndex,
  steps,
  document,
  documentFormat,
  readOnly = false,
  lockPlacement = false,
  onPatch,
  onMoveToStep,
  onRemove,
}: {
  t: Dictionary;
  open: boolean;
  onClose: () => void;
  slot: SignatureSlot;
  stepIndex: number;
  steps: FlowStep[];
  document?: File;
  documentFormat?: DocumentFormat;
  readOnly?: boolean;
  /**
   * Ô đến từ một mẫu đã publish: đổi được NGƯỜI ký, không đổi được CHỖ ký hay
   * bước.
   *
   * Khác `readOnly` (khoá tất cả, dùng cho màn tiến trình) ở đúng chỗ đó. Lý do
   * là ràng buộc của backend: yêu cầu ký từ mẫu chép toạ độ và thứ tự từ bản đã
   * publish và từ chối nếu client gửi kèm. Cho kéo khung chữ ký rồi vứt kết quả
   * đi là hứa một điều không giữ được.
   */
  lockPlacement?: boolean;
  onPatch: (patch: Partial<Omit<SignatureSlot, "id">>) => void;
  onMoveToStep: (stepId: string) => void;
  onRemove: () => void;
}) {
  /** Khoá mọi thứ thuộc về CẤU TRÚC: bước, vị trí khung, và nút xoá ô. */
  const placementLocked = readOnly || lockPlacement;
  const g = t.signRequest.config;
  const signer = slot.signer;
  const [mode, setMode] = useState<"system" | "link">(signer?.kind === "link" ? "link" : "system");
  const [query, setQuery] = useState("");
  const users = useMemo(() => searchDirectory(query), [query]);

  const isPdf = documentFormat === "PDF";

  /** Khung của những người ký khác — vẽ mờ để không ai đặt chồng lên ai. */
  const ghosts: GhostBox[] = steps.flatMap((step) =>
    step.slots
      .filter((other) => other.id !== slot.id && other.config.visible)
      .map((other) => ({
        id: other.id,
        label: other.signer?.name || other.signer?.email || g.title,
        position: other.config.position,
      })),
  );

  function patchConfig(patch: Partial<SignatureSlot["config"]>) {
    onPatch({ config: { ...slot.config, ...patch } });
  }

  function chooseSystem(user: (typeof users)[number]) {
    const next: SlotSigner = {
      kind: "system",
      userId: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
    };
    onPatch({ signer: next });
  }

  function patchLink(patch: { name?: string; email?: string }) {
    const base: SlotSigner =
      signer?.kind === "link" ? signer : { kind: "link", name: "", email: "" };
    onPatch({ signer: { ...base, ...patch } });
  }

  function switchMode(next: "system" | "link") {
    setMode(next);
    if (next === "link") {
      // Nguồn khoá cục bộ không đi qua link được — sửa ngay chứ không để người
      // dùng chốt một cấu hình mà người nhận link không thể thực hiện.
      if (!LINK_SIGN_METHODS.includes(slot.config.method)) patchConfig({ method: "ESIGN_OTP" });
      if (signer?.kind !== "link") onPatch({ signer: { kind: "link", name: "", email: "" } });
      return;
    }
    if (signer?.kind === "link") onPatch({ signer: undefined });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      label={readOnly ? g.titleReadonly : g.title}
      className="max-w-5xl!"
    >
      <header className="flex items-start gap-3 border-b border-border-muted px-5 py-3.5">
        <div className="flex-1">
          <h2 className="text-[15px] font-semibold text-fg">
            {readOnly ? g.titleReadonly : g.title}
          </h2>
          <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
            {g.inStep(stepIndex + 1)}
            {/* Người ký qua link vừa tạo chưa có tên lẫn email — đừng để lại
                dấu chấm giữa lơ lửng. Ô đến từ mẫu thì tên vai đã đủ để biết
                mình đang cấu hình chỗ ký nào. */}
            {signerLabel(signer) || slot.roleName
              ? ` · ${signerLabel(signer) || slot.roleName}`
              : ""}
          </p>
        </div>

        {!placementLocked && steps.length > 1 ? (
          <label className="flex items-center gap-2 text-[11.5px] font-semibold text-fg-muted">
            {g.stepFieldLabel}
            <select
              value={steps[stepIndex]?.id}
              onChange={(event) => onMoveToStep(event.target.value)}
              title={g.stepFieldHint}
              className="h-8 rounded-md border border-border bg-canvas px-2 text-[12.5px] font-medium text-fg focus:border-accent focus:outline-none"
            >
              {steps.map((step, index) => (
                <option key={step.id} value={step.id}>
                  {step.name.trim() || g.inStep(index + 1)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="flex size-7.5 items-center justify-center rounded-md text-fg-muted hover:bg-inset hover:text-fg"
        >
          <XIcon size={16} />
        </button>
      </header>

      <div className="grid max-h-[62vh] gap-5 overflow-y-auto px-5 py-4 lg:grid-cols-2">
        {/* ---------------- Cột trái: ai ký + chữ ký ---------------- */}
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-2.5">
            <SectionTitle>{g.signerSection}</SectionTitle>

            {!readOnly ? (
              <div role="group" className="inline-flex gap-0.5 self-start rounded-lg bg-inset p-0.75">
                {(["system", "link"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => switchMode(value)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-semibold transition-colors ${
                      mode === value ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
                    }`}
                  >
                    {value === "system" ? <UsersIcon size={13} /> : <LinkIcon size={13} />}
                    {value === "system" ? g.signerSystem : g.signerLink}
                  </button>
                ))}
              </div>
            ) : null}

            {mode === "system" ? (
              readOnly ? (
                <ReadonlySigner t={t} slot={slot} />
              ) : (
                <>
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
                      placeholder={g.searchPlaceholder}
                      aria-label={g.searchPlaceholder}
                      className="h-8.5 w-full rounded-md border border-border bg-canvas pl-8 pr-2.5 text-[12.5px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
                    />
                  </div>

                  {users.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-[11.5px] text-fg-muted">
                      {g.noResults}
                    </p>
                  ) : (
                    <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-0.5">
                      {users.map((user) => {
                        const active = signer?.kind === "system" && signer.userId === user.id;
                        return (
                          <li key={user.id}>
                            <button
                              type="button"
                              onClick={() => chooseSystem(user)}
                              aria-pressed={active}
                              className={`flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors ${
                                active
                                  ? "border-accent bg-accent-subtle"
                                  : "border-border bg-surface hover:border-accent"
                              }`}
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
                                <span className="block truncate font-mono text-[10.5px] text-fg-subtle">
                                  {user.credential}
                                </span>
                              </span>
                              {active ? <CheckIcon size={15} className="text-accent" /> : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )
            ) : (
              <div className="flex flex-col gap-3">
                <Field label={g.linkEmailLabel}>
                  <input
                    type="email"
                    disabled={readOnly}
                    value={signer?.kind === "link" ? signer.email : ""}
                    onChange={(event) => patchLink({ email: event.target.value })}
                    placeholder={g.linkEmailPlaceholder}
                    className={inputClass}
                  />
                </Field>
                <Field label={g.linkNameLabel} hint={g.linkNote}>
                  <input
                    disabled={readOnly}
                    value={signer?.kind === "link" ? signer.name : ""}
                    onChange={(event) => patchLink({ name: event.target.value })}
                    placeholder={g.linkNamePlaceholder}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}

            {mode === "link" && !readOnly ? (
              <p className="text-[11px] text-fg-muted">{g.signerSwitchHint}</p>
            ) : null}
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle>{g.signatureSection}</SectionTitle>

            {/* Cách xác thực không còn chọn tay: người ký tự chọn nguồn khoá
                ngay trên trang ký, nên mặc định trong `config` (theo hệ thống
                hay theo link) là lựa chọn duy nhất giữ được lời hứa. Giá trị đó
                vẫn gửi lên nguyên vẹn. */}

            {/* Thuật toán không còn chọn tay: danh sách thật đến từ
                /capabilities của dịch vụ ký và bị lọc theo định dạng tài liệu,
                nên mặc định trong `config` là lựa chọn duy nhất giữ được lời
                hứa. Giá trị đó vẫn gửi lên nguyên vẹn. */}
            <Field label={g.baselineLabel} hint={g.baseline[slot.config.baselineLevel].hint}>
              <select
                disabled={readOnly}
                value={slot.config.baselineLevel}
                onChange={(event) =>
                  patchConfig({ baselineLevel: event.target.value as typeof slot.config.baselineLevel })
                }
                className={inputClass}
              >
                {BASELINE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {g.baseline[level].label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={g.reasonLabel}>
                <input
                  disabled={readOnly}
                  value={slot.config.reason}
                  onChange={(event) => patchConfig({ reason: event.target.value })}
                  placeholder={g.reasonPlaceholder}
                  className={inputClass}
                />
              </Field>
              <Field label={g.locationLabel}>
                <input
                  disabled={readOnly}
                  value={slot.config.location}
                  onChange={(event) => patchConfig({ location: event.target.value })}
                  placeholder={g.locationPlaceholder}
                  className={inputClass}
                />
              </Field>
            </div>
          </section>
        </div>

        {/* ---------------- Cột phải: hiển thị + vị trí ---------------- */}
        <section className="flex flex-col gap-3">
          <SectionTitle>{g.appearanceSection}</SectionTitle>

          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              disabled={placementLocked}
              checked={slot.config.visible}
              onChange={(event) => patchConfig({ visible: event.target.checked })}
              className="mt-0.5 size-4 accent-accent"
            />
            <span>
              <span className="block text-[12.5px] font-semibold text-fg">{g.visibleLabel}</span>
              <span className="block text-[11px] text-fg-muted">{g.visibleHint}</span>
            </span>
          </label>

          {slot.config.visible ? (
            !document ? (
              <Notice>{g.positionNoDocument}</Notice>
            ) : !isPdf ? (
              <Notice>{g.positionUnavailable(documentFormat ?? "—")}</Notice>
            ) : (
              <div className="flex flex-col gap-2">
                <div>
                  <p className="text-[12px] font-semibold text-fg">{g.positionTitle}</p>
                  <p className="text-[11px] text-fg-muted">{g.positionHint}</p>
                </div>
                <PdfPositionPicker
                  t={t}
                  file={document}
                  position={slot.config.position}
                  onChange={(position: SignaturePosition) => patchConfig({ position })}
                  others={ghosts}
                  readOnly={placementLocked}
                />
              </div>
            )
          ) : null}
        </section>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-border-muted bg-surface-2 px-5 py-3">
        {!placementLocked ? (
          <button
            type="button"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-transparent px-2.5 text-[12.5px] font-semibold text-danger hover:bg-danger-subtle"
          >
            <TrashIcon size={14} />
            {g.removeSlot}
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={onClose}
          className="h-8.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg hover:opacity-90"
        >
          {readOnly ? t.common.close : g.close}
        </button>
      </footer>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ *
 * Mảnh nhỏ
 * ------------------------------------------------------------------ */

const inputClass =
  "h-9 w-full rounded-md border border-border bg-canvas px-2.5 text-[12.5px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-muted";

function signerLabel(signer?: SlotSigner): string {
  return signer ? signer.name.trim() || signer.email.trim() : "";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10.5px] uppercase tracking-widest text-fg-subtle">
      {children}
    </h3>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-fg">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-fg-muted">{hint}</span> : null}
    </label>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-border bg-surface-2 px-3 py-2.5 text-[11.5px] text-fg-muted">
      {children}
    </p>
  );
}

function ReadonlySigner({ t, slot }: { t: Dictionary; slot: SignatureSlot }) {
  const signer = slot.signer;
  if (!signer) return <Notice>{t.signRequest.flow.slot.unassigned}</Notice>;

  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border bg-surface-2 px-3 py-2.5">
      <span
        aria-hidden="true"
        className={`flex size-9 shrink-0 items-center justify-center rounded-md font-mono text-[12px] font-bold ${avatarTone(
          signer.email || signer.name,
        )}`}
      >
        {initialsOf(signer.name || signer.email)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold text-fg">
          {signer.name || signer.email}
        </span>
        <span className="block truncate font-mono text-[11px] text-fg-subtle">{signer.email}</span>
      </span>
    </div>
  );
}
