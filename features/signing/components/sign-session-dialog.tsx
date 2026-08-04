"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import type { InteractionModel, SignResponse } from "@/lib/types/signing";
import { continueIsBillable } from "@/lib/types/signing";
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
 * Màn chờ cho hai luồng ký không kết thúc ngay trong một request.
 *
 * `APP_CONFIRMATION` (FPT MPKI App) — request bị GIỮ tới khi người ký bấm xác
 * nhận trên điện thoại. Không có phiên, không có bước tiếp: hộp thoại chỉ đếm
 * ngược và chờ đúng một promise.
 *
 * `REDIRECT_OTP` (FPT eSign Cloud) — ba pha, và chính người dùng bấm để đi tiếp.
 * Vì sao KHÔNG tự động chạy tiếp từ `PENDING_IDENTITY`: bước đó là API tạo giao
 * dịch bên FPT — mỗi lần gọi thêm một billCode và trừ một lượt ký. Lưu ý stage
 * đó KHÔNG luôn có nghĩa "chưa xác nhận danh tính": một agreement đã READY vẫn
 * bắt đầu ở đây, nên `agreementReady` quyết định hộp thoại nói gì.
 *
 * Từ `PENDING_OTP` cũng KHÔNG tự chạy tiếp, dù lấy chữ ký là thao tác chỉ đọc:
 * mỗi lần chạy thay `pending` bằng phản hồi mới, mà phản hồi chờ-OTP không mang
 * lại `nextUrl` — một nhịp tự thăm dò là nút mở trang OTP biến mất trước khi
 * người ký kịp bấm. Nhịp duy nhất ở đây do người dùng bấm.
 */

export type SessionStep = () => Promise<SignResponse>;

/** Cửa sổ phụ cho trang của CA — cùng khuôn với trang xác nhận danh tính. */
const STAGE_WINDOW_FEATURES = "popup,width=520,height=780";

interface SignSessionDialogProps {
  t: Dictionary;
  fileName?: string;
  sourceName: string;
  interactionModel: InteractionModel;
  /** Hạn chờ xác nhận trên App, để đếm ngược. */
  timeoutSeconds?: number | null;
  /**
   * Agreement của eSign Cloud đã READY chưa. START vẫn trả `PENDING_IDENTITY`
   * cho một agreement đã xác nhận xong — ở đó nó chỉ có nghĩa "phiên đã mở, chưa
   * tạo giao dịch OTP", nên đừng bắt người ký xác nhận danh tính lần nữa.
   */
  agreementReady?: boolean;
  /** Bước đầu tiên: START mới, hoặc CONTINUE khi khôi phục một phiên còn sống. */
  begin: SessionStep;
  continueSession: (sessionId: string) => Promise<SignResponse>;
  /** Gọi sau MỌI phản hồi còn dở dang — nơi lưu `sessionId` để khôi phục được. */
  onPending: (response: SignResponse) => void;
  onCompleted: (response: SignResponse) => void;
  onClose: () => void;
}

export function SignSessionDialog({
  t,
  fileName,
  sourceName,
  interactionModel,
  timeoutSeconds,
  agreementReady = false,
  begin,
  continueSession,
  onPending,
  onCompleted,
  onClose,
}: SignSessionDialogProps) {
  const s = t.sign.session;
  const [busy, setBusy] = useState(true);
  const [pending, setPending] = useState<SignResponse>();
  const [error, setError] = useState<SignFlowError>();
  /**
   * `nextUrl` của bước OTP, giữ lại riêng: chỉ phản hồi đầu tiên của
   * `PENDING_OTP` mang nó, những lần lấy chữ ký sau đó trả về rỗng — bám theo
   * `pending.nextUrl` thì nút mở trang OTP mất sau cú bấm đầu tiên.
   */
  const [otpUrl, setOtpUrl] = useState<string>();
  /** Người ký đã mở trang OTP chưa — trước đó thì chưa có gì để chờ. */
  const [otpOpened, setOtpOpened] = useState(false);
  /** Trình duyệt chặn cửa sổ phụ: rơi về liên kết mở tay. */
  const [popupBlocked, setPopupBlocked] = useState(false);
  /** Trang OTP đang mở ở cửa sổ khác — chờ nó đóng để lấy chữ ký đúng một lần. */
  const [awaitingOtpWindow, setAwaitingOtpWindow] = useState(false);
  /** Đóng trang OTP rồi mà chữ ký vẫn chưa có: OTP chưa xong, phải làm lại. */
  const [otpIncomplete, setOtpIncomplete] = useState(false);
  const otpWindowRef = useRef<Window | null>(null);

  // Chặn gọi hai lần: StrictMode chạy effect setup → cleanup → setup trên cùng
  // một instance, và một lần START thừa của eSign Cloud là một lượt ký bị trừ.
  const startedRef = useRef(false);

  /**
   * Hạn chờ xác nhận trên App. Chốt MỘT LẦN lúc mở hộp thoại thay vì tính lại
   * mỗi lần render — tính trong thân component thì đồng hồ tự lùi về đủ mỗi khi
   * có re-render và không bao giờ đếm hết.
   */
  const [appDeadline] = useState(() =>
    interactionModel === "APP_CONFIRMATION" && timeoutSeconds
      ? new Date(Date.now() + timeoutSeconds * 1000).toISOString()
      : undefined,
  );

  const apply = useCallback(
    (response: SignResponse) => {
      if (response.status === "COMPLETED") {
        onCompleted(response);
        return;
      }
      onPending(response);
      setPending(response);
      if (response.status === "PENDING_OTP" && response.nextUrl) setOtpUrl(response.nextUrl);
    },
    [onCompleted, onPending],
  );

  /**
   * Mở trang của CA ở cửa sổ riêng thay vì tab mới: người ký thấy ngay nó là
   * một bước phụ và hộp thoại này vẫn nằm nguyên phía sau để quay lại bấm tiếp.
   * Cùng tên cửa sổ nên bấm lại chỉ đưa cửa sổ cũ lên trước, không mở thêm.
   *
   * CỐ Ý không dùng `noopener` cho bước OTP: mất handle là mất tín hiệu "trang
   * đã đóng", mà đó là lúc duy nhất đáng gọi lấy chữ ký. Trang bên kia là của
   * FPT và cross-origin chỉ chạm được tới `location` của trang này.
   */
  const openStageUrl = useCallback((url: string, stage: "identity" | "otp") => {
    const popup = window.open(url, `esign-cloud-${stage}`, STAGE_WINDOW_FEATURES);
    if (!popup) {
      setPopupBlocked(true);
      return;
    }
    popup.focus();
    setPopupBlocked(false);
    if (stage !== "otp") return;
    otpWindowRef.current = popup;
    setOtpOpened(true);
    setOtpIncomplete(false);
    setAwaitingOtpWindow(true);
  }, []);

  /**
   * Popup bị chặn nên người ký mở bằng liên kết — vẫn coi là đã mở trang OTP,
   * nhưng không có handle nên không tự lấy chữ ký được: họ bấm nút bên dưới.
   */
  const markOtpOpened = useCallback(() => {
    setOtpOpened(true);
    setOtpIncomplete(false);
  }, []);

  const run = useCallback(
    async (step: SessionStep) => {
      setBusy(true);
      setError(undefined);
      try {
        const response = await step();
        apply(response);
        return response;
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return undefined;
        setError(toFlowError(cause, s.genericError));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [apply, s.genericError],
  );

  /**
   * Bước đầu, rồi đi thẳng tới OTP nếu agreement đã READY.
   *
   * 💸 CONTINUE từ `PENDING_IDENTITY` TẠO GIAO DỊCH: thêm billCode, trừ một lượt
   * ký. Chỉ tự chạy khi danh tính đã xác nhận xong từ trước — khi đó stage này
   * không còn là một quyết định, người ký chẳng có gì để làm ở đó, và cú bấm
   * "đi tiếp" chỉ là một lần chạm thừa giữa "Ký tài liệu" và trang OTP. Còn
   * `UNKNOWN` (uuid dán tay, uuid khôi phục) thì KHÔNG: danh tính có thể chưa
   * xác nhận thật, và giao dịch mở ra lúc đó là một lượt ký ném đi.
   *
   * Chuỗi ngay trong bước đầu chứ không tách effect: `startedRef` đã chặn chạy
   * hai lần dưới StrictMode, và không có khoảng hở nào để hộp thoại kịp vẽ một
   * stage mà người dùng không cần thấy.
   */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void run(begin).then((response) => {
      if (!agreementReady) return;
      if (response?.status !== "PENDING_IDENTITY") return;
      const openedSession = response.sessionId;
      if (!openedSession) return;
      void run(() => continueSession(openedSession));
    });
  }, [begin, run, agreementReady, continueSession]);

  const sessionId = pending?.sessionId;
  const billable = pending ? continueIsBillable(pending.status) : false;

  /**
   * Trang OTP đóng lại là tín hiệu duy nhất đọc được từ bên đó (cross-origin),
   * và cũng là lúc hợp lý duy nhất để tự đi tiếp. Vòng lặp này chỉ theo dõi cửa
   * sổ, KHÔNG gọi mạng; lấy chữ ký chạy đúng một lần, sau khi cửa sổ đã đóng.
   * An toàn về chi phí: từ `PENDING_OTP` bước tiếp chỉ đọc, không tạo giao dịch.
   *
   * Chưa xong thì phản hồi vẫn là `PENDING_OTP` — nghĩa là người ký đóng trang
   * trước khi OTP được chấp nhận, và họ cần mở lại để làm lại.
   */
  useEffect(() => {
    if (!awaitingOtpWindow || !sessionId) return;
    const id = window.setInterval(() => {
      if (otpWindowRef.current && !otpWindowRef.current.closed) return;
      window.clearInterval(id);
      otpWindowRef.current = null;
      setAwaitingOtpWindow(false);
      void run(() => continueSession(sessionId)).then((response) => {
        if (response && response.status !== "COMPLETED") setOtpIncomplete(true);
      });
    }, 700);
    return () => window.clearInterval(id);
  }, [awaitingOtpWindow, sessionId, run, continueSession]);

  const remaining = useCountdown(pending?.expiresAt ?? appDeadline);

  const title =
    interactionModel === "APP_CONFIRMATION" ? s.appTitle : s.otpTitle;

  return (
    <Dialog open onClose={onClose} label={title} className="max-w-125">
      <div className="border-b border-border-muted px-5 py-4">
        <h2 className="text-[16px] font-semibold text-fg">{title}</h2>
        <p className="mt-1 truncate text-[12.5px] text-fg-muted">
          {fileName ? s.subtitleWithFile(sourceName, fileName) : sourceName}
        </p>
      </div>

      <div className="space-y-3 px-5 py-4">
        {error ? (
          <ErrorBlock
            error={error}
            correlationLabel={s.correlationId}
            note={error.code === "SIGN_SESSION_NOT_FOUND" ? s.sessionLostNote : undefined}
          />
        ) : busy ? (
          <PendingBlock
            title={
              interactionModel === "APP_CONFIRMATION" ? s.appWaiting : s.working
            }
            body={
              interactionModel === "APP_CONFIRMATION" ? s.appWaitingBody : undefined
            }
          />
        ) : pending ? (
          <PendingStage
            s={s}
            response={pending}
            billable={billable}
            agreementReady={agreementReady}
            otpUrl={otpUrl}
            otpOpened={otpOpened}
            otpIncomplete={otpIncomplete}
            popupBlocked={popupBlocked}
            onOpen={openStageUrl}
            onOpenedManually={markOtpOpened}
          />
        ) : null}

        {remaining !== undefined && !error ? (
          <p className="text-center text-[11px] text-fg-muted">
            {remaining > 0 ? s.expiresIn(formatCountdown(remaining)) : s.expired}
          </p>
        ) : null}

        {pending ? (
          <dl className="rounded-md bg-inset px-3 py-2 text-[10.5px] text-fg-muted">
            <div className="flex justify-between gap-3">
              <dt>{s.sessionIdLabel}</dt>
              <dd className="truncate font-mono">{pending.sessionId ?? "—"}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border-muted px-5 py-3">
        <button type="button" onClick={onClose} className={dialogButtonClass(false)}>
          {s.close}
        </button>
        {sessionId && !busy ? (
          <button
            type="button"
            onClick={() => run(() => continueSession(sessionId))}
            className={dialogButtonClass(true)}
          >
            {billable ? s.continueBillable : s.continueFree}
            <ArrowRightIcon size={14} />
          </button>
        ) : null}
      </div>
    </Dialog>
  );
}

/**
 * Trạng thái chờ người ký thao tác ngoài trình duyệt. Url của CA mở ở cửa sổ
 * riêng và KHÔNG được hiển thị dưới dạng văn bản sao chép được: nó mang token
 * giao dịch dùng một lần. Ngoại lệ duy nhất là khi popup bị chặn — lúc đó liên
 * kết là đường ra duy nhất, nhưng nhãn vẫn thay cho địa chỉ.
 */
function PendingStage({
  s,
  response,
  billable,
  agreementReady,
  otpUrl,
  otpOpened,
  otpIncomplete,
  popupBlocked,
  onOpen,
  onOpenedManually,
}: {
  s: Dictionary["sign"]["session"];
  response: SignResponse;
  billable: boolean;
  agreementReady: boolean;
  otpUrl?: string;
  otpOpened: boolean;
  otpIncomplete: boolean;
  popupBlocked: boolean;
  onOpen: (url: string, stage: "identity" | "otp") => void;
  onOpenedManually: () => void;
}) {
  const isIdentity = response.status === "PENDING_IDENTITY";
  /**
   * Agreement đã READY: danh tính xác nhận xong từ khối cấu hình rồi, stage này
   * chỉ còn là "bấm để mở giao dịch OTP". Bảo họ đi xác nhận lần nữa — và mở lại
   * trang SIC — là sai. Chỉ khi chưa biết chắc (uuid dán tay, uuid khôi phục từ
   * lần trước) mới giữ lối xác nhận danh tính.
   */
  const needsIdentity = isIdentity && !agreementReady;
  // Chưa mở trang OTP, hoặc mở rồi mà chưa xong: việc cần làm vẫn là mở trang.
  const waitingForOtp = otpOpened && !otpIncomplete;
  /**
   * Nút mở trang chỉ xuất hiện khi thật sự còn trang để mở: trang SIC khi danh
   * tính chưa xác nhận, trang OTP ở stage sau. Bước OTP dùng url đã giữ lại vì
   * phản hồi hiện tại có thể không còn mang nó.
   */
  const url = isIdentity
    ? (needsIdentity ? response.nextUrl : undefined)
    : (response.nextUrl ?? otpUrl);

  const [title, body] = needsIdentity
    ? [s.identityTitle, response.message ?? s.identityBody]
    : isIdentity
      ? [s.identityDoneTitle, s.identityDoneBody]
      : waitingForOtp
        ? [s.otpStageTitle, response.message ?? s.otpStageBody]
        : [s.otpReadyTitle, s.otpReadyBody];

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-accent bg-accent-subtle p-3">
        <p className="text-[12.5px] font-semibold text-fg">{title}</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">{body}</p>
      </div>

      {otpIncomplete ? <WarningBlock>{s.otpIncomplete}</WarningBlock> : null}

      {url ? (
        <button
          type="button"
          onClick={() => onOpen(url, isIdentity ? "identity" : "otp")}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-accent bg-accent text-[12.5px] font-semibold text-accent-fg"
        >
          {isIdentity ? s.openIdentityUrl : s.openOtpUrl}
        </button>
      ) : null}

      {url && popupBlocked ? (
        <div className="space-y-1.5">
          <p className="text-[10.5px] leading-relaxed text-warning">{s.popupBlocked}</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            onClick={isIdentity ? undefined : onOpenedManually}
            className="flex h-8 w-full items-center justify-center rounded-md border border-border bg-surface text-[11px] font-semibold text-fg"
          >
            {isIdentity ? s.openIdentityUrl : s.openOtpUrl}
          </a>
        </div>
      ) : null}

      {billable ? <WarningBlock>{s.billableWarning}</WarningBlock> : null}
    </div>
  );
}
