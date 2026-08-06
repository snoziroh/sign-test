"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/components/i18n/locale-provider";
import { CheckIcon, InfoIcon } from "@/components/ui/icons";
import { validateBaseUrl } from "@/features/signing/api-base-url";
import { dialogButtonClass } from "@/features/signing/components/sign-dialog-parts";
import {
  useVerifyBaseUrl,
  VERIFY_BASE_URL_SUGGESTIONS,
} from "@/features/verification/verify-base-url";
import { describeVerifyError, probeVerifyService, VerifyApiClientError } from "../api";

/**
 * Đổi địa chỉ dịch vụ verify ngay trên giao diện — bản song sinh của
 * `ApiBaseUrlControl` bên ký, nhưng trỏ tới một service khác (`:8082`).
 *
 * Nút *Kiểm tra kết nối* thăm dò bằng `GET` vào đường verify chứ không gửi file:
 * xác nhận được endpoint có tồn tại mà không tốn một lượt thẩm định nào.
 */
export function VerifyBaseUrlControl() {
  const { t } = useLocale();
  const { baseUrl } = useVerifyBaseUrl();
  const [open, setOpen] = useState(false);
  const a = t.verify.apiBaseUrl;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={a.buttonTitle}
        className="flex h-8.5 max-w-70 items-center gap-2 rounded-md border border-border bg-surface px-3 text-[12px] font-semibold text-fg hover:bg-inset"
      >
        <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
        <span className="truncate font-mono text-[11px] font-normal">
          {baseUrl ?? a.serverDefault}
        </span>
      </button>

      {open ? <VerifyBaseUrlDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function VerifyBaseUrlDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const { baseUrl, setBaseUrl } = useVerifyBaseUrl();
  const a = t.verify.apiBaseUrl;

  const [value, setValue] = useState(baseUrl ?? "");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string }>();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ từ store ngoài React
    setValue(baseUrl ?? "");
  }, [baseUrl]);

  const validation = validateBaseUrl(value);
  const invalidReason =
    value.trim() && !validation.valid
      ? validation.reason === "scheme"
        ? a.errorScheme
        : a.errorMalformed
      : undefined;

  /** Thử địa chỉ ĐANG GÕ, chưa lưu — như bên ký, để một lần gõ nhầm không kịp thành mặc định. */
  async function testConnection() {
    setTesting(true);
    setResult(undefined);
    try {
      const probe = await probeVerifyService(validation.normalized);
      setResult({ ok: true, message: a.testOk(probe.baseUrl) });
    } catch (error) {
      setResult({
        ok: false,
        message:
          error instanceof VerifyApiClientError
            ? describeVerifyError(error.code, error.detail)
            : a.testFailed,
      });
    } finally {
      setTesting(false);
    }
  }

  function save() {
    if (value.trim() && !validation.valid) return;
    setBaseUrl(value.trim() ? (validation.normalized ?? null) : null);
    toast.success(a.savedTitle, value.trim() ? validation.normalized : a.serverDefault);
    onClose();
  }

  return (
    <Dialog open onClose={onClose} label={a.title} className="max-w-135">
      <div className="border-b border-border-muted px-5 py-4">
        <h2 className="text-[16px] font-semibold text-fg">{a.title}</h2>
        <p className="mt-1 text-[12.5px] text-fg-muted">{a.description}</p>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div>
          <label
            htmlFor="verify-api-base-url"
            className="mb-1.5 block text-[11px] font-semibold text-fg-muted"
          >
            {a.label}
          </label>
          <input
            id="verify-api-base-url"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setResult(undefined);
            }}
            placeholder={a.placeholder}
            spellCheck={false}
            autoComplete="off"
            className="h-9 w-full rounded-md border border-border bg-surface px-2.5 font-mono text-[12px] text-fg"
          />
          <p className="mt-1.5 text-[10.5px] text-fg-muted">{a.emptyHint}</p>
          {invalidReason ? (
            <p className="mt-1.5 text-[11px] text-danger">{invalidReason}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {VERIFY_BASE_URL_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setValue(suggestion);
                setResult(undefined);
              }}
              className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[10.5px] text-fg-muted hover:bg-inset"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {result ? (
          <div
            role="status"
            className={`flex gap-2 rounded-md border p-3 text-[11.5px] ${
              result.ok
                ? "border-success bg-success-subtle text-success"
                : "border-danger bg-danger-subtle text-danger"
            }`}
          >
            {result.ok ? (
              <CheckIcon size={14} className="mt-0.5 shrink-0" />
            ) : (
              <InfoIcon size={14} className="mt-0.5 shrink-0" />
            )}
            <span>{result.message}</span>
          </div>
        ) : null}

        <p className="rounded-md bg-inset p-2.5 text-[10.5px] leading-relaxed text-fg-muted">
          {a.proxyNote}
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border-muted px-5 py-3">
        <button type="button" onClick={onClose} className={dialogButtonClass(false)}>
          {a.cancel}
        </button>
        <button
          type="button"
          onClick={testConnection}
          disabled={testing || Boolean(invalidReason)}
          className={dialogButtonClass(false)}
        >
          {testing ? a.testing : a.test}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={Boolean(invalidReason)}
          className={dialogButtonClass(true)}
        >
          {a.save}
        </button>
      </div>
    </Dialog>
  );
}
