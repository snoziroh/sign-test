"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
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
import { algorithmLabel, type AlgorithmCatalog } from "../signature-algorithm";
import { agentCanSign } from "../usb-token-source";

/**
 * Luồng ký bằng FPT USB Token, chạy trọn trong hộp thoại này.
 *
 * Năm chặng, và chặng nào cũng có thể là chặng cuối nếu hỏng:
 *
 * 1. `CONNECTING_AGENT` — `/GetToken` rồi `/GetListCertificate` tới
 *    `localhost:14211`. Đây là chặng hay hỏng nhất: agent chưa chạy.
 * 2. `SELECTING_CERTIFICATE` — người ký chọn danh tính. KHÔNG tự ký kể cả khi
 *    chỉ có một chứng thư: chọn nhầm là ký nhầm một danh tính pháp lý.
 * 3. `PREPARING` — nộp PDF, backend trả `jobId` + digest. Job sống 15 phút.
 * 4. `WAITING_FOR_PIN` — `/SignHash`. Cửa sổ PIN của FPT-CA bật ra Ở NGOÀI trình
 *    duyệt; lời gọi treo tới khi người ký xong việc ở đó.
 * 5. `COMPLETING` — nộp chữ ký + chứng thư, backend dựng CMS và verify lại PDF.
 *
 * Vì sao chọn chứng thư đứng TRƯỚC lúc tạo job — thứ tự này không phải tuỳ ý:
 * tên hiện trên chữ ký phải là tên đã được CA chứng nhận, tức CN của chứng thư
 * đang cắm trong token, chứ không phải một chuỗi người dùng tự gõ. Mà khung chữ
 * ký được vẽ vào PDF ngay lúc tạo job (digest tính trên PDF đã có khung đó), nên
 * cái tên phải biết TRƯỚC lời gọi ấy — chỉ có một cách: chọn chứng thư trước.
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
  /**
   * Thiếu `signerDisplayName` — CỐ Ý. Hộp thoại điền nó bằng CN của chứng thư
   * người ký vừa chọn; màn hình cấu hình không có ô nào cho tên người ký nữa.
   */
  request: Omit<UsbTokenJobRequest, "signerDisplayName">;
  /** Nhãn thuật toán của backend — xem `signature-algorithm.ts`. */
  catalog?: AlgorithmCatalog;
  onCompleted: (response: SignResponse) => void;
  onClose: () => void;
}

export function UsbTokenSignDialog({
  t,
  fileName,
  sourceName,
  file,
  request,
  catalog,
  onCompleted,
  onClose,
}: UsbTokenSignDialogProps) {
  const u = t.sign.usbToken;
  const s = t.sign.session;

  const [phase, setPhase] = useState<UsbTokenPhase>("CONNECTING_AGENT");
  /**
   * Job đã tạo, kèm thumbprint của chứng thư nó được dựng cho.
   *
   * Cặp đôi chứ không phải mình cái job: khung chữ ký trong PDF mang tên của
   * đúng chứng thư đó. Ký hỏng rồi đổi sang chứng thư khác mà dùng lại job cũ là
   * ký một tài liệu ghi tên người khác — nên job chỉ được dùng lại khi thumbprint
   * còn khớp.
   */
  const [job, setJob] = useState<{ value: UsbTokenJob; thumbprint: string }>();
  const [certificates, setCertificates] = useState<FptCertificate[]>([]);
  /**
   * Chứng thư ĐANG HIỆN trong băng chuyền — và cũng chính là chứng thư sẽ được
   * ký. Trước đây danh sách bày hết ra cùng lúc, nên lựa chọn phải giữ riêng
   * bằng thumbprint; giờ mỗi lần chỉ nhìn thấy một, nên tách hai thứ đó ra chỉ
   * mở đường cho một ca hỏng: cuộn tới chứng thư khác rồi bấm ký, và ký nhầm
   * cái đang không nằm trên màn hình.
   */
  const [certificateIndex, setCertificateIndex] = useState(0);
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
              : // Agent từ chối chính `algDigest` vừa gửi — token hoặc driver
                // không làm được SHA-384/SHA-512. Chọn lại SHA-256 là xong.
                cause.code === FPT_AGENT_CODE.algorithmNotSupported
                ? u.errorDigestUnsupported
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

    async function connect() {
      setError(undefined);
      setCertificates([]);
      setCertificateIndex(0);
      setJob(undefined);
      agentTokenRef.current = undefined;
      setPhase("CONNECTING_AGENT");

      try {
        const agentToken = await getAgentToken(controller.signal);
        if (cancelled) return;
        agentTokenRef.current = agentToken;

        const list = await listAgentCertificates(agentToken, controller.signal);
        if (cancelled) return;

        setCertificates(list);
        setCertificateIndex(0);
        setPhase("SELECTING_CERTIFICATE");
      } catch (cause) {
        if (cancelled || (cause instanceof DOMException && cause.name === "AbortError")) return;
        setError(describe(cause));
      }
    }

    void connect();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [attempt, describe]);

  /* Chặng 3 → 5: chỉ chạy khi người ký bấm. */
  async function signWithCertificate() {
    const agentToken = agentTokenRef.current;
    const certificate = certificates[certificateIndex];
    if (!agentToken || !certificate) return;

    setError(undefined);
    try {
      /*
        Tên người ký lấy THẲNG từ chứng thư: CN, và chỉ khi CN rỗng mới rơi về
        subject DN. Không có đường nào khác đưa tên vào đây — màn hình cấu hình
        không còn ô nhập, nên chữ ký không thể mang một tên không được CA chứng
        nhận.
      */
      let prepared = job?.thumbprint === certificate.thumbprint ? job.value : undefined;

      if (!prepared) {
        setPhase("PREPARING");
        prepared = await createUsbTokenJob(file, {
          ...request,
          signerDisplayName: certificate.commonName?.trim() || certificate.subjectDN,
        });
        setJob({ value: prepared, thumbprint: certificate.thumbprint });

        /*
          Backend đã CHỐT thuật toán cho job này. Nếu nó không phải PKCS#1 thì
          agent 1.3.1 ký ra một chữ ký khác scheme với cái backend khai trong
          CMS, và bước complete sẽ trả `422 USB_TOKEN_SIGNATURE_INVALID` — sau
          khi đã bắt người ký nhập PIN. Dừng ngay ở đây: rẻ hơn một lần nhập PIN
          và nói được đúng nguyên nhân.

          `signatureAlgorithm` vắng mặt nghĩa là backend đời cũ, khi đó nó chỉ
          ký PKCS#1/SHA-256 — không có gì để chặn.
        */
        const chosen = prepared.signatureAlgorithm;
        if (chosen && !agentCanSign(chosen, catalog)) {
          setError({
            message: u.errorSchemeUnsupported(algorithmLabel(chosen, catalog)),
            code: "USB_TOKEN_AGENT_SCHEME_UNSUPPORTED",
          });
          setPhase("SELECTING_CERTIFICATE");
          return;
        }
      }

      setPhase("WAITING_FOR_PIN");
      const signature = await signHash({
        token: agentToken,
        digestBase64: prepared.digestBase64,
        // Đúng chuỗi backend trả về (SHA256 / SHA384 / SHA512) — không còn giả
        // định SHA-256, và không suy lại từ độ dài digest.
        digestAlgorithm: prepared.digestAlgorithm,
        // Nguyên văn serial agent trả về — chuẩn hoá là agent không tìm ra khoá.
        serialNumber: certificate.serialNumber,
        // Agent 1.3.1 chưa có chỗ nhận — xem `signHash()`.
        jcaSignatureAlgorithm: prepared.jcaSignatureAlgorithm,
      });

      setPhase("COMPLETING");
      const response = await completeUsbTokenJob(prepared.jobId, {
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

  const remaining = useCountdown(job?.value.expiresAt);
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
            <CertificateCarousel
              t={t}
              certificates={certificates}
              index={certificateIndex}
              onIndexChange={setCertificateIndex}
            />
          )
        ) : null}

        {/*
          Thuật toán backend đã chốt cho job. Hiện ra vì nó KHÔNG nhất thiết
          bằng cái người dùng chọn ở form: bỏ trống `algorithm` là backend tự
          lấy mặc định của nó, và mặc định đó nay là PSS chứ không phải PKCS#1.
        */}
        {job?.value.signatureAlgorithm ? (
          <p className="text-center text-[10.5px] text-fg-muted">
            {u.jobAlgorithm(algorithmLabel(job.value.signatureAlgorithm, catalog))}
          </p>
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
            disabled={!certificates[certificateIndex]}
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

/**
 * Băng chuyền chứng thư: mỗi lần một cái.
 *
 * Trước đây danh sách đổ thẳng ra hộp thoại, mà `Dialog` bị chặn ở `max-h-[80vh]`
 * và `overflow-hidden` — token có bốn, năm chứng thư là hai nút "Đóng" / "Ký với
 * chứng thư này" ở chân hộp thoại bị CẮT MẤT, không cuộn tới được. Băng chuyền
 * làm khối này cao cố định, nên số chứng thư trong token không còn ảnh hưởng gì
 * tới chiều cao hộp thoại nữa.
 *
 * Thẻ có chiều cao CỐ ĐỊNH — không phải `min-h` — để trượt qua lại không giật:
 * tên chủ thể của chứng thư doanh nghiệp dài gấp ba tên người, và nó bị kẹp hai
 * dòng thay vì đẩy thẻ (và cả hộp thoại) cao lên.
 */
function CertificateCarousel({
  t,
  certificates,
  index,
  onIndexChange,
}: {
  t: Dictionary;
  certificates: FptCertificate[];
  index: number;
  onIndexChange: (index: number) => void;
}) {
  const u = t.sign.usbToken;
  const total = certificates.length;
  const certificate = certificates[index];
  if (!certificate) return null;

  // Chạy vòng: ở cái cuối bấm tiếp là quay về cái đầu. Với ba, bốn phần tử thì
  // đó là thứ đỡ bực nhất — không có nút nào chết cứng ở hai đầu.
  const step = (delta: number) => onIndexChange((index + delta + total) % total);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold text-fg-muted">{u.chooseCertificate}</p>
        <p
          aria-live="polite"
          className="shrink-0 font-mono text-[10.5px] tracking-[0.04em] text-fg-subtle"
        >
          {u.certificateCounter(index + 1, total)}
        </p>
      </div>

      <div className="flex items-stretch gap-2">
        {total > 1 ? (
          <CarouselArrow label={u.previousCertificate} onClick={() => step(-1)}>
            <ChevronLeftIcon size={16} />
          </CarouselArrow>
        ) : null}

        {/*
          `key` là thumbprint chứ không phải chỉ số: đổi phần tử thì React dựng
          lại thẻ, và hiệu ứng hiện dần chạy lại — nếu không thì trượt qua lại
          chỉ thấy chữ đổi tại chỗ, không thấy là mình vừa đi sang cái khác.
        */}
        <div
          key={certificate.thumbprint}
          className="flex h-31 min-w-0 flex-1 animate-[toast-in_.18s_ease-out] flex-col justify-center overflow-hidden rounded-md border border-accent bg-accent-subtle p-3"
        >
          <p className="line-clamp-2 text-[12.5px] font-semibold text-fg">
            {certificateLabel(certificate)}
          </p>
          <p className="mt-1 truncate text-[10.5px] text-fg-muted">
            {u.certificateIssuer(certificate.issuer)}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10.5px] text-fg-muted">
            {u.certificateSerial(certificate.serialNumber)}
          </p>
          <p className="mt-0.5 font-mono text-[10.5px] text-fg-muted">
            {u.certificateValidity(certificate.notBefore, certificate.notAfter)}
          </p>
        </div>

        {total > 1 ? (
          <CarouselArrow label={u.nextCertificate} onClick={() => step(1)}>
            <ChevronRightIcon size={16} />
          </CarouselArrow>
        ) : null}
      </div>

      {/* `flex-wrap`: token nhiều chứng thư thì hàng chấm xuống dòng, không đẩy ngang hộp thoại. */}
      {total > 1 ? (
        <div className="flex flex-wrap justify-center gap-1.5 pt-0.5">
          {certificates.map((item, position) => (
            <button
              key={item.thumbprint}
              type="button"
              aria-label={u.goToCertificate(position + 1)}
              aria-current={position === index ? "true" : undefined}
              onClick={() => onIndexChange(position)}
              className={`h-1.5 rounded-full transition-all ${
                position === index ? "w-5 bg-accent" : "w-1.5 bg-border hover:bg-fg-subtle"
              }`}
            />
          ))}
        </div>
      ) : null}

      <p className="text-[10.5px] leading-relaxed text-fg-muted">{u.certificateNote}</p>
    </div>
  );
}

function CarouselArrow({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex w-8.5 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-fg-muted hover:bg-inset hover:text-fg"
    >
      {children}
    </button>
  );
}
