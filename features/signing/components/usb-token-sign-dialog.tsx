"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { CheckIcon } from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import type { SignResponse, UsbTokenJob, UsbTokenJobRequest } from "@/lib/types/signing";
import { completeUsbTokenJob, createUsbTokenJob } from "../sign-api";
import {
  certificateLabel,
  FptAgentError,
  FptAgentUnreachableError,
  FPT_AGENT_CODE,
  getAgentToken,
  listAgentCertificates,
  signHash,
  type FptCertificate,
} from "../usb-token-agent";
import {
  dialogButtonClass,
  ErrorBlock,
  formatCountdown,
  PendingBlock,
  toFlowError,
  useCountdown,
  WarningBlock,
  type SignFlowError,
} from "./sign-dialog-parts";

/**
 * Luồng ký bằng FPT USB Token, chạy trọn trong hộp thoại này.
 *
 * Năm chặng, và chặng nào cũng có thể là chặng cuối nếu hỏng:
 *
 * 1. `PREPARING` — nộp PDF, backend trả `jobId` + digest. Job sống 15 phút.
 * 2. `CONNECTING_AGENT` — `/GetToken` rồi `/GetListCertificate` tới
 *    `localhost:14211`. Đây là chặng hay hỏng nhất: agent chưa chạy.
 * 3. `SELECTING_CERTIFICATE` — người ký chọn danh tính. KHÔNG tự ký kể cả khi
 *    chỉ có một chứng thư: chọn nhầm là ký nhầm một danh tính pháp lý.
 * 4. `WAITING_FOR_PIN` — `/SignHash`. Cửa sổ PIN của FPT-CA bật ra Ở NGOÀI trình
 *    duyệt; lời gọi treo tới khi người ký xong việc ở đó.
 * 5. `COMPLETING` — nộp chữ ký + chứng thư, backend dựng CMS và verify lại PDF.
 *
 * Hộp thoại KHÔNG tự chạy lại bất cứ chặng nào. Job dùng một lần, nên "thử lại"
 * luôn là làm lại từ đầu: job mới, và một lần nhập PIN nữa.
 */

type UsbTokenPhase =
  | "PREPARING"
  | "CONNECTING_AGENT"
  | "SELECTING_CERTIFICATE"
  | "WAITING_FOR_PIN"
  | "COMPLETING";

interface UsbTokenSignDialogProps {
  t: Dictionary;
  fileName?: string;
  sourceName: string;
  file: File;
  request: UsbTokenJobRequest;
  onCompleted: (response: SignResponse) => void;
  onClose: () => void;
}

export function UsbTokenSignDialog({
  t,
  fileName,
  sourceName,
  file,
  request,
  onCompleted,
  onClose,
}: UsbTokenSignDialogProps) {
  const u = t.sign.usbToken;
  const s = t.sign.session;

  const [phase, setPhase] = useState<UsbTokenPhase>("PREPARING");
  const [job, setJob] = useState<UsbTokenJob>();
  const [certificates, setCertificates] = useState<FptCertificate[]>([]);
  const [selected, setSelected] = useState<string>();
  const [error, setError] = useState<SignFlowError>();
  /** Tăng lên mỗi lần bấm "thử lại" — khoá chạy lại toàn bộ luồng. */
  const [attempt, setAttempt] = useState(0);

  /**
   * Token của agent và digest chỉ sống trong lần ký này. Giữ ở ref chứ không ở
   * state: chúng không vẽ ra gì, và không được lọt vào chỗ nào bền hơn.
   */
  const agentTokenRef = useRef<string>(undefined);

  /** Lỗi từ agent / backend → khối lỗi hiển thị được, có chỗ cho mã lỗi. */
  const describe = useCallback(
    (cause: unknown): SignFlowError => {
      if (cause instanceof FptAgentUnreachableError) {
        return { message: u.errorUnreachable, code: "FPT_AGENT_UNREACHABLE" };
      }
      if (cause instanceof FptAgentError) {
        const known =
          cause.code === FPT_AGENT_CODE.certificateNotSelected
            ? u.errorCancelled
            : cause.code === FPT_AGENT_CODE.tokenInvalid ||
                cause.code === FPT_AGENT_CODE.tokenNotInitialized
              ? u.errorAgentToken
              : undefined;
        return {
          message: known ?? cause.message,
          code: `FPT_AGENT_${cause.code}`,
        };
      }
      return toFlowError(cause, u.errorGeneric);
    },
    [u],
  );

  /* Chặng 1 + 2 chạy liền nhau khi mở hộp thoại (và mỗi lần bấm thử lại). */
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function prepare() {
      setError(undefined);
      setCertificates([]);
      setSelected(undefined);
      setJob(undefined);
      agentTokenRef.current = undefined;
      setPhase("PREPARING");

      try {
        const prepared = await createUsbTokenJob(file, request, controller.signal);
        if (cancelled) return;
        setJob(prepared);

        setPhase("CONNECTING_AGENT");
        const agentToken = await getAgentToken(controller.signal);
        if (cancelled) return;
        agentTokenRef.current = agentToken;

        const list = await listAgentCertificates(agentToken, controller.signal);
        if (cancelled) return;

        setCertificates(list);
        // Có đúng một chứng thư thì chọn sẵn cho đỡ một cú click — nhưng vẫn
        // phải bấm nút ký, vì đó là lúc người ký xác nhận danh tính.
        setSelected(list.length === 1 ? list[0].thumbprint : undefined);
        setPhase("SELECTING_CERTIFICATE");
      } catch (cause) {
        if (cancelled || (cause instanceof DOMException && cause.name === "AbortError")) return;
        setError(describe(cause));
      }
    }

    void prepare();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // `request` được dựng lại mỗi lần render của cha nên KHÔNG đưa vào deps —
    // nó sẽ tạo job mới vô hạn. Cha chốt payload lúc mở hộp thoại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, file, describe]);

  /* Chặng 3 → 5: chỉ chạy khi người ký bấm. */
  async function signWithCertificate() {
    const agentToken = agentTokenRef.current;
    const certificate = certificates.find((item) => item.thumbprint === selected);
    if (!job || !agentToken || !certificate) return;

    setError(undefined);
    setPhase("WAITING_FOR_PIN");
    try {
      const signature = await signHash({
        token: agentToken,
        digestBase64: job.digestBase64,
        digestAlgorithm: job.digestAlgorithm,
        // Nguyên văn serial agent trả về — chuẩn hoá là agent không tìm ra khoá.
        serialNumber: certificate.serialNumber,
      });

      setPhase("COMPLETING");
      const response = await completeUsbTokenJob(job.jobId, {
        signatureBase64: signature,
        certificateBase64: certificate.base64Encode,
      });
      onCompleted(response);
    } catch (cause) {
      setError(describe(cause));
      // Quay lại danh sách chứng thư: job vẫn còn hạn nếu lỗi ở phía agent, và
      // người ký thường chỉ cần bấm ký lại sau khi mở khoá token.
      setPhase("SELECTING_CERTIFICATE");
    }
  }

  const remaining = useCountdown(job?.expiresAt);
  const busy =
    phase === "PREPARING" ||
    phase === "CONNECTING_AGENT" ||
    phase === "WAITING_FOR_PIN" ||
    phase === "COMPLETING";

  return (
    <Dialog open onClose={onClose} label={u.dialogTitle} className="max-w-125">
      <div className="border-b border-border-muted px-5 py-4">
        <h2 className="text-[16px] font-semibold text-fg">{u.dialogTitle}</h2>
        <p className="mt-1 truncate text-[12.5px] text-fg-muted">
          {fileName ? s.subtitleWithFile(sourceName, fileName) : sourceName}
        </p>
      </div>

      <div className="space-y-3 px-5 py-4">
        {error ? <ErrorBlock error={error} correlationLabel={s.correlationId} /> : null}

        {busy ? (
          <PendingBlock title={u.phase[phase]} body={u.phaseBody[phase]} />
        ) : null}

        {phase === "WAITING_FOR_PIN" ? <WarningBlock>{u.pinNote}</WarningBlock> : null}

        {phase === "SELECTING_CERTIFICATE" ? (
          certificates.length === 0 ? (
            <div className="rounded-md border border-warning bg-warning-subtle p-3">
              <p className="text-[11.5px] leading-relaxed text-warning">{u.noCertificates}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-fg-muted">{u.chooseCertificate}</p>
              {certificates.map((certificate) => (
                <button
                  key={certificate.thumbprint}
                  type="button"
                  aria-pressed={selected === certificate.thumbprint}
                  onClick={() => setSelected(certificate.thumbprint)}
                  className={`w-full rounded-md border p-2.5 text-left ${
                    selected === certificate.thumbprint
                      ? "border-accent bg-accent-subtle"
                      : "border-border bg-surface"
                  }`}
                >
                  <p className="text-[12.5px] font-semibold text-fg">
                    {certificateLabel(certificate)}
                  </p>
                  <p className="mt-0.5 truncate text-[10.5px] text-fg-muted">
                    {u.certificateIssuer(certificate.issuer)}
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-fg-muted">
                    {u.certificateValidity(certificate.notBefore, certificate.notAfter)}
                  </p>
                </button>
              ))}
              <p className="text-[10.5px] leading-relaxed text-fg-muted">{u.certificateNote}</p>
            </div>
          )
        ) : null}

        {remaining !== undefined && !error ? (
          <p className="text-center text-[11px] text-fg-muted">
            {remaining > 0 ? u.jobExpiresIn(formatCountdown(remaining)) : u.jobExpired}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border-muted px-5 py-3">
        <button type="button" onClick={onClose} className={dialogButtonClass(false)}>
          {s.close}
        </button>

        {!busy && (error || certificates.length === 0) ? (
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className={dialogButtonClass(false)}
          >
            {u.retry}
          </button>
        ) : null}

        {phase === "SELECTING_CERTIFICATE" && certificates.length > 0 ? (
          <button
            type="button"
            disabled={!selected}
            onClick={signWithCertificate}
            className={dialogButtonClass(true)}
          >
            <CheckIcon size={14} />
            {u.signWithCertificate}
          </button>
        ) : null}
      </div>
    </Dialog>
  );
}
