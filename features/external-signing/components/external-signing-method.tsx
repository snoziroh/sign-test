"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  CheckIcon,
  ImageUpIcon,
  InfoIcon,
  LockIcon,
  PasskeyIcon,
  ShieldCheckIcon,
  TrashIcon,
  UsbIcon,
} from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import type {
  DocumentFormat,
  MpkiCredential,
  SignatureSource,
} from "@/lib/types/signing";
import { Pkcs12Card } from "@/features/signing/components/credential-cards";
import { errorMessage } from "@/features/signing/api";
import { checkFptEnrollmentStatus, createFptEnrollment } from "@/features/signing/sign-api";
import {
  enrollmentImageDataUrl,
  readEnrollmentImage,
  type EnrollmentImage,
} from "@/features/signing/enrollment-image";
import {
  enrollmentComplete,
  enrollmentImagePayload,
  isMpki,
  isPkcs12,
  isSignCloud,
  isUsbToken,
  supportsFormat,
  REQUIRED_ENROLLMENT_IMAGE_KEYS,
  type AgreementStage,
  type EnrollmentFormState,
  type EnrollmentImageKey,
  type SignFormState,
} from "@/features/signing/sign-configuration";
import {
  FptAgentUnreachableError,
  getAgentToken,
  listAgentCertificates,
} from "@/features/signing/usb-token-agent";
import { EXTERNAL_SIGN_SOURCES } from "../sign-sources";

/**
 * Chọn nguồn chữ ký, và — ở một BƯỚC KHÁC — điền thứ nguồn đó cần.
 *
 * Hai việc, hai component, đúng như màn `/sign` tách `source` khỏi `credential`:
 * chọn cách ký là một quyết định đọc bốn thẻ rồi bấm một cái, còn điền thông tin
 * chứng thư là một form dài (hồ sơ eSign Cloud có sáu ô chữ và ba ảnh giấy tờ).
 * Gộp chúng vào một bước thì thẻ nguồn bị đẩy lên trên một form đang mở, và
 * người ký cuộn qua nó mỗi lần muốn đổi ý.
 *
 * Nguyên tắc dẫn dắt của bước chọn: **nói trước cần gì, rồi mới hỏi.** Mỗi thẻ
 * nguồn có một dòng "bạn cần có" ngay trên bề mặt, trước khi người ký bấm vào —
 * người ký ngoài hệ thống thường chỉ có đúng một trong bốn thứ này.
 *
 * `form` dùng chung KIỂU với màn `/sign` (`SignFormState` của
 * `sign-configuration.ts`) nên phần PKCS#12 tái dùng thẳng `Pkcs12Card`. MPKI và
 * eSign Cloud giữ bản riêng: MPKI không liệt kê được credential
 * (`GET /remote-ca/mpki/credentials` là nội bộ), và eSign Cloud gửi hồ sơ đăng
 * ký NGAY TRONG bước START thay vì đăng ký trước rồi giữ `agreementUuid` để ký
 * nhiều lần như màn `/sign` — người ký ngoài hệ thống không có phiên để giữ lại
 * gì giữa hai lượt ký.
 *
 * Ô nào cũng chỉ sống trong state của trang: không autofill, không lưu, không
 * `localStorage`. Mật khẩu P12 và ảnh giấy tờ đi đúng một lần, trong lệnh ký.
 */

const SOURCE_ICONS: Record<string, ReactNode> = {
  PKCS12: <LockIcon size={17} />,
  "REMOTE_CA:FPT_MPKI_APP": <PasskeyIcon size={17} />,
  "REMOTE_CA:FPT_SIGN_CLOUD": <ShieldCheckIcon size={17} />,
  USB_TOKEN: <UsbIcon size={17} />,
};

function methodCopyKey(
  source: SignatureSource,
): "pkcs12" | "mpki" | "signCloud" | "usbToken" {
  if (isPkcs12(source)) return "pkcs12";
  if (isMpki(source)) return "mpki";
  if (isUsbToken(source)) return "usbToken";
  return "signCloud";
}

/**
 * Bước "cách ký" — bốn thẻ và không gì khác.
 *
 * Thẻ nào định dạng tài liệu không chở được vẫn HIỆN, kèm nhãn nói rõ lý do, chứ
 * không bị ẩn: USB Token chỉ ký PDF, và một lựa chọn biến mất không giải thích là
 * thứ người ký sẽ đi hỏi người gửi. Bấm vào vẫn được — `validateSignForm` chặn ở
 * bước sau với đúng câu của nó.
 *
 * `sources`/`note` mở ra cho luồng ký NỘI BỘ trong quy trình
 * (`features/sign-request/components/workflow-sign-workspace.tsx`) dùng lại: ở đó
 * danh sách nguồn đến từ `GET /capabilities` thật chứ không phải hằng số của
 * trang công khai, và câu ghi chú nói về người tạo quy trình chứ không phải
 * "người gửi". Bỏ trống cả hai thì đúng bằng bản cũ.
 */
export function ExternalSigningMethodPicker({
  t,
  form,
  sources = EXTERNAL_SIGN_SOURCES,
  note,
  documentFormat,
  disabled,
  onSelectSource,
}: {
  t: Dictionary;
  form: SignFormState;
  sources?: SignatureSource[];
  note?: string;
  /** `undefined` khi tài liệu chưa tải xong — lúc đó không kết luận gì cả. */
  documentFormat?: DocumentFormat;
  /** Phiên hết hạn hoặc đang ký: mọi ô khoá lại, không có ô nào sửa được nữa. */
  disabled: boolean;
  onSelectSource: (sourceId: string) => void;
}) {
  const m = t.externalSign.method;

  return (
    <div className="space-y-3">
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="sr-only">{m.title}</legend>
        {sources.map((candidate) => {
          const copy = m[methodCopyKey(candidate)];
          const selected = candidate.id === form.sourceId;
          const unsupported = Boolean(documentFormat) && !supportsFormat(candidate, documentFormat);
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onSelectSource(candidate.id)}
              aria-pressed={selected}
              className={`flex w-full gap-3 rounded-lg border p-3 text-left transition-colors ${
                selected
                  ? "border-accent bg-accent-subtle"
                  : "border-border bg-surface hover:border-accent"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border ${
                  selected
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border-muted bg-surface-2 text-fg-muted"
                }`}
              >
                {selected ? <CheckIcon size={16} /> : SOURCE_ICONS[candidate.id]}
              </span>

              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[13px] font-semibold text-fg">{copy.label}</span>
                  {unsupported ? (
                    <span className="rounded-full bg-warning-subtle px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                      {m.unsupportedForFormat}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-fg-muted">
                  {copy.description}
                </span>
                <span className="mt-1.5 block text-[11px] leading-relaxed text-fg-subtle">
                  <span className="font-mono uppercase tracking-wider">
                    {m.requirementLabel}:
                  </span>{" "}
                  {copy.requirement}
                </span>
              </span>
            </button>
          );
        })}
      </fieldset>

      <p className="flex gap-1.5 text-[10.5px] leading-relaxed text-fg-subtle">
        <InfoIcon size={12} className="mt-0.5 shrink-0" />
        {note ?? m.note}
      </p>
    </div>
  );
}

/**
 * Bước "thông tin" — chỉ phần riêng của nguồn ĐANG chọn.
 *
 * Ba nguồn có dữ liệu sống ngoài form (danh sách credential MPKI, trạng thái hồ
 * sơ eSign Cloud) và cả hai thứ đó nằm ở `ExternalSigningWorkspace` chứ không ở
 * đây: `validateSignForm` cần chúng để quyết định bước này đã xong chưa, và một
 * state nằm trong component con thì thanh tiến trình không đọc được.
 */
export function ExternalSigningCredentialStep({
  t,
  source,
  form,
  p12File,
  disabled,
  credentials,
  credentialsLoading,
  credentialsError,
  onLoadCredentials,
  onResetCredentials,
  agreementStage,
  onAgreementStageChange,
  onP12FileChange,
  onUpdate,
}: {
  t: Dictionary;
  source?: SignatureSource;
  form: SignFormState;
  p12File?: File;
  disabled: boolean;
  credentials: MpkiCredential[];
  credentialsLoading: boolean;
  credentialsError?: string;
  onLoadCredentials: () => void;
  onResetCredentials: () => void;
  agreementStage: AgreementStage;
  onAgreementStageChange: (stage: AgreementStage) => void;
  onP12FileChange: (file?: File) => void;
  onUpdate: <K extends keyof SignFormState>(key: K, value: SignFormState[K]) => void;
}) {
  const p12InputRef = useRef<HTMLInputElement>(null);
  if (!source) return null;

  return (
    <div className="space-y-3">
      {isPkcs12(source) ? (
        <fieldset disabled={disabled} className="space-y-2 disabled:opacity-60">
          <Pkcs12Card
            copy={t.externalSign.pkcs12}
            form={form}
            p12File={p12File}
            p12InputRef={p12InputRef}
            onP12FileChange={onP12FileChange}
            onUpdate={onUpdate}
          />
          <SecurityNote>{t.externalSign.pkcs12.privacyNote}</SecurityNote>
        </fieldset>
      ) : null}
      {isMpki(source) ? (
        <MpkiFields
          t={t}
          form={form}
          disabled={disabled}
          credentials={credentials}
          credentialsLoading={credentialsLoading}
          credentialsError={credentialsError}
          onLoadCredentials={onLoadCredentials}
          onResetCredentials={onResetCredentials}
          onUpdate={onUpdate}
        />
      ) : null}
      {isSignCloud(source) ? (
        <SignCloudFields
          t={t}
          form={form}
          disabled={disabled}
          agreementStage={agreementStage}
          onAgreementStageChange={onAgreementStageChange}
          onUpdate={onUpdate}
        />
      ) : null}
      {isUsbToken(source) ? <UsbTokenFields t={t} disabled={disabled} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * FPT USB Token
 * ------------------------------------------------------------------ */

/**
 * USB Token không có gì để điền: chứng thư nằm trong thiết bị và chỉ đọc được
 * lúc bấm ký — kể cả tên người ký, vốn là CN của chứng thư được chọn trong hộp
 * thoại ký. Bước này vì thế chỉ còn một nút thử kết nối, để tách "agent chưa
 * chạy" ra khỏi "ký hỏng" TRƯỚC khi người ký đi tiếp.
 *
 * Cùng cách làm với `UsbTokenCard` của màn `/sign`, và cùng một lý do để nó là
 * hai component chứ không phải một: bên kia đọc `t.sign.usbToken` (câu chữ cho
 * người trong hệ thống, có cả ghi chú về thuật toán), bên này đọc
 * `t.externalSign.usbToken` — người ký ngoài hệ thống không chọn thuật toán.
 */
function UsbTokenFields({ t, disabled }: { t: Dictionary; disabled: boolean }) {
  const u = t.externalSign.usbToken;
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string }>();

  /**
   * Chỉ `/GetToken` + `/GetListCertificate` — hai lời gọi chỉ đọc, không chạm
   * tới khoá riêng nên không bật cửa sổ PIN và không tạo job nào.
   */
  async function checkAgent() {
    setChecking(true);
    setResult(undefined);
    try {
      const token = await getAgentToken();
      const certificates = await listAgentCertificates(token);
      setResult({
        ok: certificates.length > 0,
        message: certificates.length ? u.agentReady(certificates.length) : u.noCertificates,
      });
    } catch (cause) {
      setResult({
        ok: false,
        message:
          cause instanceof FptAgentUnreachableError
            ? u.errorUnreachable
            : errorMessage(cause, u.errorGeneric),
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <FieldGroup disabled={disabled}>
      <div>
        <button
          type="button"
          onClick={checkAgent}
          disabled={checking}
          className="h-9 w-full rounded-md border border-border bg-surface text-[12px] font-semibold text-fg disabled:opacity-50"
        >
          {checking ? u.agentChecking : u.checkAgent}
        </button>
        {result ? (
          <p
            className={`mt-1.5 rounded-md p-2.5 text-[11px] leading-relaxed ${
              result.ok ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"
            }`}
          >
            {result.message}
          </p>
        ) : null}
      </div>

      {/* Trả lời trước câu hỏi "tên tôi điền ở đâu" — không có ô nào cho nó cả. */}
      <p className="text-[10.5px] leading-relaxed text-fg-muted">{u.signerNameNote}</p>
      <SecurityNote>{u.note}</SecurityNote>
      <SecurityNote>{u.pinNote}</SecurityNote>
    </FieldGroup>
  );
}

/* ------------------------------------------------------------------ *
 * FPT MPKI App
 * ------------------------------------------------------------------ */

/**
 * Luồng MPKI: nhập username → tìm credentials → khóa account → chọn certificate.
 *
 * Khi đã tải được ít nhất một credential, username bị khóa để certificate đang
 * chọn luôn thuộc đúng account vừa tra cứu. Nút "Change account" là đường duy
 * nhất quay lại: xóa username, credential đang chọn và danh sách credentials để
 * người dùng bắt đầu lại với một tài khoản khác. Không còn nhập Certificate ID
 * thủ công; certificate chỉ được chọn từ danh sách backend trả về.
 */
function MpkiFields({
  t,
  form,
  disabled,
  credentials,
  credentialsLoading,
  credentialsError,
  onLoadCredentials,
  onResetCredentials,
  onUpdate,
}: {
  t: Dictionary;
  form: SignFormState;
  disabled: boolean;
  credentials: MpkiCredential[];
  credentialsLoading: boolean;
  credentialsError?: string;
  onLoadCredentials: () => void;
  onResetCredentials: () => void;
  onUpdate: <K extends keyof SignFormState>(key: K, value: SignFormState[K]) => void;
}) {
  const m = t.externalSign.mpki;
  const accountLocked = credentials.length > 0;

  function changeAccount() {
    onUpdate("mpkiUsername", "");
    onUpdate("mpkiCredentialId", "");
    onResetCredentials();
  }

  return (
    <FieldGroup disabled={disabled}>
      <Field
        label={m.usernameLabel}
        htmlFor="external-mpki-username"
        required
        requiredLabel={t.externalSign.signCloud.required}
      >
        <div className="flex gap-2">
          <input
            id="external-mpki-username"
            value={form.mpkiUsername}
            autoComplete="off"
            placeholder={m.usernamePlaceholder}
            disabled={accountLocked}
            onChange={(event) => onUpdate("mpkiUsername", event.target.value)}
            className={`${inputClass} min-w-0 flex-1 disabled:cursor-not-allowed disabled:bg-inset disabled:text-fg-muted`}
          />
          <button
            type="button"
            onClick={accountLocked ? changeAccount : onLoadCredentials}
            disabled={credentialsLoading || (!accountLocked && !form.mpkiUsername.trim())}
            className="h-9 shrink-0 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-fg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {accountLocked
              ? m.changeAccount
              : credentialsLoading
                ? m.loading
                : m.loadCredentials}
          </button>
        </div>
      </Field>

      {credentialsError ? (
        <p className="rounded-md bg-danger-subtle p-2.5 text-[11px] leading-relaxed text-danger">
          {credentialsError}
        </p>
      ) : null}

      {accountLocked ? (
        <Field label={m.credentialSelectLabel} htmlFor="external-mpki-credential">
          <select
            id="external-mpki-credential"
            value={form.mpkiCredentialId}
            onChange={(event) => onUpdate("mpkiCredentialId", event.target.value)}
            className={inputClass}
          >
            <option value="">{m.chooseCredential}</option>
            {credentials.map((credential) => (
              <option key={credential.credentialId} value={credential.credentialId}>
                {credentialOptionLabel(credential)}
              </option>
            ))}
          </select>
          {credentials.length > 1 ? (
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-warning">
              {m.multipleWarning}
            </p>
          ) : null}
        </Field>
      ) : null}

      <SecurityNote>{m.note}</SecurityNote>
    </FieldGroup>
  );
}

/** Tên chủ thể (CN) là thứ người ký nhận ra; mã chứng thư thô thì không. */
function credentialOptionLabel(credential: MpkiCredential): string {
  const name = credential.subjectDn
    ? credential.subjectDn.match(/(?:^|,)\s*CN=([^,]+)/i)?.[1]?.trim() || credential.subjectDn
    : credential.credentialId;
  const parts = [name];
  if (credential.status) parts.push(credential.status);
  if (credential.validTo) parts.push(new Date(credential.validTo).toLocaleDateString());
  return parts.join(" · ");
}

/* ------------------------------------------------------------------ *
 * FPT eSign Cloud
 * ------------------------------------------------------------------ */

function SignCloudFields({
  t,
  form,
  disabled,
  agreementStage,
  onAgreementStageChange,
  onUpdate,
}: {
  t: Dictionary;
  form: SignFormState;
  disabled: boolean;
  agreementStage: AgreementStage;
  onAgreementStageChange: (stage: AgreementStage) => void;
  onUpdate: <K extends keyof SignFormState>(key: K, value: SignFormState[K]) => void;
}) {
  const e = t.externalSign.signCloud;
  const enrollment = form.enrollment;
  /**
   * Chỉ là state HIỂN THỊ — khối nào đang mở. `SignFormState` không có trường
   * này: `buildStartRequest`/`validateSignForm` (dùng chung với màn `/sign`)
   * quyết định nhánh gửi đi bằng SỰ CÓ MẶT của `agreementUuid`, không bằng cờ
   * này. Vì thế bấm sang "cần cấp chứng thư" phải xoá `agreementUuid` cũ —
   * không xoá thì hai nơi lệch nhau: form hiện khối đăng ký, nhưng payload vẫn
   * mang uuid cũ vì nó chưa bị xoá.
   */
  const [needsEnrollment, setNeedsEnrollment] = useState(false);

  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string>();
  /** Trang xác nhận danh tính của CA — chỉ có sau khi đăng ký thành công. */
  const [sicUrl, setSicUrl] = useState<string>();
  const [statusChecking, setStatusChecking] = useState(false);
  const [statusResult, setStatusResult] = useState<string>();
  /** Trang SIC đang mở ở cửa sổ khác — chờ nó đóng để kiểm tra đúng một lần. */
  const [awaitingSic, setAwaitingSic] = useState(false);
  /** Trình duyệt chặn popup: không có handle thì không biết lúc nào trang đóng. */
  const [sicBlocked, setSicBlocked] = useState(false);
  const sicWindowRef = useRef<Window | null>(null);

  const setEnrollment = (patch: Partial<EnrollmentFormState>) =>
    onUpdate("enrollment", { ...enrollment, ...patch });

  const complete = enrollmentComplete(enrollment);
  const ready = agreementStage === "READY";

  /**
   * Đường DUY NHẤT lấy được `agreementUuid`. Ký thẳng khi chưa có uuid vẫn chạy
   * (dịch vụ tự đăng ký) nhưng uuid không quay về màn hình, nên lần ký sau lại
   * đăng ký lại — và mỗi lần đăng ký là một hồ sơ CCCD mới gửi đi.
   */
  async function enroll() {
    setEnrolling(true);
    setEnrollError(undefined);
    try {
      const result = await createFptEnrollment({
        mobileNo: enrollment.mobileNo.trim(),
        email: enrollment.email.trim(),
        agreementDetails: {
          citizenID: enrollment.citizenID.trim(),
          personalName: enrollment.personalName.trim(),
          country: enrollment.country.trim() || "VN",
          location: enrollment.location.trim(),
          stateOrProvince: enrollment.stateOrProvince.trim(),
          // Luôn gửi đủ ba khoá ảnh, rỗng khi người ký không nộp ảnh nào.
          ...enrollmentImagePayload(enrollment),
        },
      });
      onUpdate("agreementUuid", result.agreementUuid);
      setSicUrl(result.sicUrl ?? undefined);
      setStatusResult(undefined);
      setSicBlocked(false);
      // Chứng thư chưa tồn tại tới khi người ký xác nhận xong trên trang SIC —
      // từ đây nút ký bị chặn cho tới khi status trả READY.
      onAgreementStageChange("AWAITING_CONFIRMATION");
    } catch (cause) {
      setEnrollError(errorMessage(cause, e.enrollFailed));
    } finally {
      setEnrolling(false);
    }
  }

  /**
   * 💸 Mỗi lần gọi là một giao dịch bên CA. Không có API chỉ-đọc thay thế, nên
   * hàm này chỉ chạy từ một thao tác cố ý của người ký: nút kiểm tra, và đúng
   * MỘT lần khi trang xác nhận danh tính do chính họ mở đã đóng lại. Không poll.
   */
  const checkStatus = useCallback(async () => {
    const agreementUuid = form.agreementUuid.trim();
    if (!agreementUuid) return;
    setStatusChecking(true);
    setStatusResult(undefined);
    try {
      const result = await checkFptEnrollmentStatus(agreementUuid);
      if (result.status === "READY") {
        onAgreementStageChange("READY");
        setStatusResult(undefined);
        return;
      }
      setStatusResult(e.notReadyYet);
    } catch (cause) {
      setStatusResult(errorMessage(cause, e.statusFailed));
    } finally {
      setStatusChecking(false);
    }
  }, [form.agreementUuid, e.notReadyYet, e.statusFailed, onAgreementStageChange]);

  /**
   * Mở trang xác nhận danh tính ở cửa sổ riêng và giữ lại handle của nó.
   *
   * CỐ Ý không dùng `noopener`: mất handle là mất tín hiệu "trang đã đóng", mà
   * đó chính là lúc duy nhất đáng gọi status.
   */
  function openSic() {
    if (!sicUrl) return;
    const popup = window.open(sicUrl, "fpt-sic-confirm", "popup,width=520,height=780");
    if (!popup) {
      setSicBlocked(true);
      return;
    }
    sicWindowRef.current = popup;
    setStatusResult(undefined);
    setAwaitingSic(true);
  }

  /**
   * Trang SIC tự đóng sau khi người ký xác nhận. Không đọc được gì bên trong nó
   * (cross-origin), chỉ đọc được `closed` — nên đây là tín hiệu duy nhất có.
   * Vòng lặp này chỉ theo dõi cửa sổ, KHÔNG gọi mạng.
   */
  useEffect(() => {
    if (!awaitingSic) return;
    const id = window.setInterval(() => {
      if (sicWindowRef.current && !sicWindowRef.current.closed) return;
      window.clearInterval(id);
      sicWindowRef.current = null;
      setAwaitingSic(false);
      void checkStatus();
    }, 700);
    return () => window.clearInterval(id);
  }, [awaitingSic, checkStatus]);

  /** Về lại form đăng ký: bỏ uuid và mọi dấu vết của lần xác nhận trước. */
  function restartEnrollment() {
    onUpdate("agreementUuid", "");
    onAgreementStageChange("UNKNOWN");
    setSicUrl(undefined);
    setStatusResult(undefined);
    setEnrollError(undefined);
    setSicBlocked(false);
    setAwaitingSic(false);
    sicWindowRef.current = null;
  }

  return (
    <FieldGroup disabled={disabled}>
      {/*
        Hai đường vào loại trừ nhau, và mặc định là "đã có chứng thư": người ký lần
        thứ hai chỉ cần dán một mã, còn hồ sơ đăng ký là một form dài với hai ảnh
        giấy tờ. Mở sẵn form dài cho mọi người là bắt đa số trả giá cho thiểu số.
      */}
      <div className="flex rounded-md border border-border bg-inset p-0.5">
        <ToggleOption
          active={!needsEnrollment}
          onClick={() => {
            setNeedsEnrollment(false);
            // Một mã gõ tay không mang trạng thái xác nhận nào của phiên này.
            onAgreementStageChange("UNKNOWN");
          }}
        >
          {e.haveCertificate}
        </ToggleOption>
        <ToggleOption
          active={needsEnrollment}
          onClick={() => {
            setNeedsEnrollment(true);
            if (form.agreementUuid) restartEnrollment();
          }}
        >
          {e.needCertificate}
        </ToggleOption>
      </div>

      {!needsEnrollment ? (
        <Field
          label={e.agreementLabel}
          htmlFor="external-agreement-uuid"
          hint={e.agreementHint}
          required
          requiredLabel={e.required}
        >
          <input
            id="external-agreement-uuid"
            value={form.agreementUuid}
            autoComplete="off"
            placeholder={e.agreementPlaceholder}
            onChange={(event) => onUpdate("agreementUuid", event.target.value)}
            className={`${inputClass} font-mono`}
          />
        </Field>
      ) : form.agreementUuid ? (
        /*
          Đăng ký xong. Từ đây `agreementUuid` là CHỈ ĐỌC: nó là định danh CA cấp
          về, gõ tay một chuỗi khác vào đây là trỏ sang hồ sơ của người khác.
          Đường duy nhất để có giá trị khác là làm lại từ đầu.
        */
        <EnrollmentResult
          t={t}
          agreementUuid={form.agreementUuid}
          ready={ready}
          sicUrl={sicUrl}
          awaitingSic={awaitingSic}
          sicBlocked={sicBlocked}
          statusChecking={statusChecking}
          statusResult={statusResult}
          onOpenSic={openSic}
          onCheckStatus={() => void checkStatus()}
          onRestart={restartEnrollment}
        />
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-[12px] font-semibold text-fg">{e.enrollmentTitle}</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-fg-muted">
              {e.enrollmentHint}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={e.personalNameLabel}
              htmlFor="external-enroll-name"
              required
              requiredLabel={e.required}
            >
              <input
                id="external-enroll-name"
                value={enrollment.personalName}
                autoComplete="off"
                onChange={(event) => setEnrollment({ personalName: event.target.value })}
                className={inputClass}
              />
            </Field>

            <Field
              label={e.citizenIdLabel}
              htmlFor="external-enroll-citizen"
              required
              requiredLabel={e.required}
            >
              <input
                id="external-enroll-citizen"
                value={enrollment.citizenID}
                inputMode="numeric"
                autoComplete="off"
                onChange={(event) => setEnrollment({ citizenID: event.target.value })}
                className={`${inputClass} font-mono`}
              />
            </Field>

            <Field
              label={e.mobileLabel}
              htmlFor="external-enroll-mobile"
              required
              requiredLabel={e.required}
            >
              <input
                id="external-enroll-mobile"
                value={enrollment.mobileNo}
                inputMode="tel"
                autoComplete="off"
                onChange={(event) => setEnrollment({ mobileNo: event.target.value })}
                className={`${inputClass} font-mono`}
              />
            </Field>

            <Field
              label={e.emailLabel}
              htmlFor="external-enroll-email"
              required
              requiredLabel={e.required}
            >
              <input
                id="external-enroll-email"
                type="email"
                value={enrollment.email}
                autoComplete="off"
                onChange={(event) => setEnrollment({ email: event.target.value })}
                className={inputClass}
              />
            </Field>

            <Field label={e.locationLabel} htmlFor="external-enroll-location">
              <input
                id="external-enroll-location"
                value={enrollment.location}
                autoComplete="off"
                onChange={(event) => setEnrollment({ location: event.target.value })}
                className={inputClass}
              />
            </Field>

            <Field label={e.provinceLabel} htmlFor="external-enroll-province">
              <input
                id="external-enroll-province"
                value={enrollment.stateOrProvince}
                autoComplete="off"
                onChange={(event) => setEnrollment({ stateOrProvince: event.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

          <div>
            <p className="text-[12px] font-semibold text-fg">{e.imagesTitle}</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-fg-muted">{e.imagesHint}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <ImageField
              t={t}
              label={e.frontLabel}
              field="photoFrontSideIDCard"
              image={enrollment.photoFrontSideIDCard}
              onChange={(image) => setEnrollment({ photoFrontSideIDCard: image })}
            />
            <ImageField
              t={t}
              label={e.backLabel}
              field="photoBackSideIDCard"
              image={enrollment.photoBackSideIDCard}
              onChange={(image) => setEnrollment({ photoBackSideIDCard: image })}
            />
            <ImageField
              t={t}
              label={e.faceLabel}
              field="faceImage"
              image={enrollment.faceImage}
              onChange={(image) => setEnrollment({ faceImage: image })}
            />
          </div>

          {/* Dấu * xuất hiện ở cả hai khối trên, nên chú thích đứng sau cả hai. */}
          <p className="text-[10.5px] text-fg-muted">
            <span className="text-danger">*</span> {e.requiredLegend}
          </p>

          {enrollError ? (
            <p className="rounded-md bg-danger-subtle p-2.5 text-[11px] leading-relaxed text-danger">
              {enrollError}
            </p>
          ) : null}

          {/*
            Hành động chính của khối này. Nó KHÔNG phải nút ký: nó chỉ xin CA cấp
            chứng thư, và người ký còn một bước xác nhận danh tính nữa mới ký được.
          */}
          <button
            type="button"
            onClick={enroll}
            disabled={enrolling || !complete}
            className="h-9 w-full rounded-md border border-accent bg-accent text-[12px] font-bold text-accent-fg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enrolling ? e.enrolling : e.enroll}
          </button>
          {!complete ? (
            <p className="text-[10.5px] leading-relaxed text-warning">{e.requiredMissing}</p>
          ) : null}
          <p className="text-[10.5px] leading-relaxed text-fg-muted">{e.enrollHint}</p>
        </div>
      )}
    </FieldGroup>
  );
}

/**
 * Sau khi đăng ký: mã chứng thư đã có, còn một bước xác nhận danh tính nữa.
 *
 * Trang SIC mở ở cửa sổ riêng, và khi nó đóng lại thì trạng thái được kiểm tra
 * đúng MỘT lần (xem `checkStatus`). Nhánh popup bị chặn có đường đi bộ đầy đủ:
 * một liên kết mở tay và một nút kiểm tra — thiếu nó thì người ký bị kẹt hẳn ở
 * đây mà không hiểu vì sao.
 */
function EnrollmentResult({
  t,
  agreementUuid,
  ready,
  sicUrl,
  awaitingSic,
  sicBlocked,
  statusChecking,
  statusResult,
  onOpenSic,
  onCheckStatus,
  onRestart,
}: {
  t: Dictionary;
  agreementUuid: string;
  ready: boolean;
  sicUrl?: string;
  awaitingSic: boolean;
  sicBlocked: boolean;
  statusChecking: boolean;
  statusResult?: string;
  onOpenSic: () => void;
  onCheckStatus: () => void;
  onRestart: () => void;
}) {
  const e = t.externalSign.signCloud;

  return (
    <div className="space-y-3">
      <div
        className={`rounded-md border p-2.5 ${
          ready ? "border-success bg-success-subtle" : "border-border bg-inset"
        }`}
      >
        <p
          className={`flex items-center gap-1.5 text-[11.5px] font-semibold ${
            ready ? "text-success" : "text-fg-muted"
          }`}
        >
          {ready ? <CheckIcon size={13} className="shrink-0" /> : null}
          {ready ? e.agreementReadyTitle : e.agreementIssued}
        </p>
        <p className="mt-1.5 break-all font-mono text-[10.5px] leading-relaxed text-fg">
          {agreementUuid}
        </p>
      </div>

      {!ready ? (
        <div className="space-y-2 rounded-md border border-accent bg-accent-subtle p-3">
          <p className="text-[11.5px] font-semibold text-fg">{e.confirmTitle}</p>
          <p className="text-[10.5px] leading-relaxed text-fg-muted">{e.confirmBody}</p>

          {sicUrl ? (
            <button
              type="button"
              onClick={onOpenSic}
              disabled={awaitingSic || statusChecking}
              className="h-9 w-full rounded-md border border-accent bg-accent text-[11.5px] font-semibold text-accent-fg disabled:opacity-60"
            >
              {awaitingSic ? e.sicWaiting : statusChecking ? e.checking : e.openSic}
            </button>
          ) : null}

          {sicBlocked && sicUrl ? (
            <div className="space-y-1.5">
              <p className="text-[10.5px] leading-relaxed text-warning">{e.sicBlocked}</p>
              <a
                href={sicUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-8 w-full items-center justify-center rounded-md border border-border bg-surface text-[11px] font-semibold text-fg"
              >
                {e.sicOpenManually}
              </a>
            </div>
          ) : null}

          {statusResult ? (
            <p className="rounded-md bg-surface p-2.5 text-[11px] leading-relaxed text-fg">
              {statusResult}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onCheckStatus}
            disabled={statusChecking || awaitingSic}
            className="h-8 w-full rounded-md border border-border bg-surface text-[11px] font-semibold text-fg disabled:opacity-50"
          >
            {statusChecking ? e.checking : statusResult ? e.checkAgain : e.checkStatus}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onRestart}
        className="h-8 w-full rounded-md border border-border bg-surface text-[11px] font-semibold text-fg"
      >
        {e.agreementRestart}
      </button>
    </div>
  );
}

/**
 * Một ô ảnh giấy tờ.
 *
 * Ảnh được thu nhỏ TẠI TRÌNH DUYỆT trước khi mã hoá (xem `enrollment-image.ts`):
 * ảnh CCCD chụp bằng điện thoại thường 3–8 MB và base64 còn phình thêm một phần
 * ba, nên gửi nguyên bản là một request vài chục MB trên đúng đường mạng tệ nhất —
 * 4G của người đang đứng ngoài đường.
 */
function ImageField({
  t,
  label,
  field,
  image,
  onChange,
}: {
  t: Dictionary;
  label: string;
  field: EnrollmentImageKey;
  image: EnrollmentImage | null;
  onChange: (image: EnrollmentImage | null) => void;
}) {
  const e = t.externalSign.signCloud;
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<string>();

  const required = (REQUIRED_ENROLLMENT_IMAGE_KEYS as readonly string[]).includes(field);

  async function pick(file?: File) {
    if (!file) return;
    setReading(true);
    setProblem(undefined);

    const result = await readEnrollmentImage(file);
    setReading(false);

    if (!result.ok) {
      setProblem(
        result.problem === "TOO_LARGE"
          ? e.imageTooLarge
          : result.problem === "NOT_IMAGE"
            ? e.imageNotImage
            : e.imageUnreadable,
      );
      return;
    }
    onChange(result.image);
  }

  return (
    <div className="min-w-0">
      {/*
        Nhãn một dòng, và dấu bắt buộc là một dấu `*` chứ không phải chữ "BẮT
        BUỘC": ba ô này nằm cạnh nhau trong một cột hẹp, và một nhãn xuống dòng
        đẩy riêng ô đó thấp xuống — ba khung ảnh khi đó không còn thẳng hàng.
        `truncate` là chốt chặn cuối cho ngôn ngữ có từ dài hơn.
      */}
      <p
        title={label}
        className="mb-1.5 truncate text-[11px] font-semibold text-fg-muted"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        ) : null}
      </p>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => void pick(event.target.files?.[0])}
      />

      {image ? (
        <div className="overflow-hidden rounded-md border border-border bg-inset">
          {/*
            `<img>` thuần chứ không `next/image`: nguồn là data URL của một ảnh chỉ
            sống trong bộ nhớ tab này — không có gì cho optimizer của Next xử lý,
            và đưa ảnh giấy tờ qua một lớp tối ưu là thêm một chỗ nó có thể nằm lại.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollmentImageDataUrl(image)}
            alt={label}
            className="h-20 w-full object-cover"
          />
          {/*
            Chỉ icon: "Đổi ảnh" / "Change photo" không nằm vừa một cột rộng chừng
            110px, và nó xuống dòng thì thẻ ảnh cao hơn hai thẻ bên cạnh. Tên đọc
            được vẫn còn nguyên ở `aria-label`, và `title` cho chuột.
          */}
          <div className="flex items-center gap-1 border-t border-border-muted px-1.5 py-1">
            <button
              type="button"
              aria-label={e.replaceImage}
              title={e.replaceImage}
              onClick={() => input.current?.click()}
              className="flex h-6 flex-1 items-center justify-center rounded-sm text-fg-muted hover:bg-surface hover:text-accent"
            >
              <ImageUpIcon size={13} />
            </button>
            <button
              type="button"
              aria-label={e.removeImage}
              title={e.removeImage}
              onClick={() => onChange(null)}
              className="flex h-6 w-7 items-center justify-center rounded-sm text-fg-subtle hover:bg-surface hover:text-danger"
            >
              <TrashIcon size={13} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-surface-2 text-[10.5px] font-semibold text-fg-muted hover:border-accent hover:text-accent"
        >
          <ImageUpIcon size={16} />
          {reading ? t.common.loading : e.chooseImage}
        </button>
      )}

      {problem ? <p className="mt-1 text-[10.5px] text-danger">{problem}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Mảnh dùng chung
 * ------------------------------------------------------------------ */

const inputClass =
  "h-9 w-full rounded-md border border-border bg-canvas px-2.5 text-[12.5px] text-fg placeholder:text-fg-subtle";

function FieldGroup({ disabled, children }: { disabled: boolean; children: ReactNode }) {
  return (
    <fieldset
      disabled={disabled}
      className="space-y-3 rounded-lg border border-border-muted bg-surface-2 p-3 disabled:opacity-60"
    >
      {children}
    </fieldset>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  requiredLabel,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  requiredLabel?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-baseline gap-1.5 text-[11px] font-semibold text-fg-muted"
      >
        {label}
        {required ? (
          <span className="font-mono text-[9.5px] font-normal uppercase text-danger">
            {requiredLabel}
          </span>
        ) : null}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-[10.5px] leading-relaxed text-fg-muted">{hint}</p> : null}
    </div>
  );
}

function ToggleOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 rounded-sm px-2 py-1.5 text-[11.5px] font-semibold transition-colors ${
        active ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

/** Câu trả lời cho "dữ liệu tôi vừa nhập đi đâu" — đặt cạnh chính ô đã hỏi nó. */
function SecurityNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-1.5 rounded-md bg-inset px-2.5 py-2 text-[10.5px] leading-relaxed text-fg-muted">
      <LockIcon size={12} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}