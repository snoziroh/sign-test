"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  StepProgress,
  type StepProgressItem,
} from "@/components/ui/step-progress";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  FileTextIcon,
  InfoIcon,
  LockIcon,
  PenLineIcon,
  SpinnerIcon,
  UsersIcon,
} from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import type { PublicSigningContext } from "@/lib/types/external-signing";
import { isSessionFatal } from "@/lib/types/external-signing";
import type {
  MpkiCredential,
  SignedDocument,
  SignResponse,
  SignatureSource,
  UsbTokenJobRequest,
} from "@/lib/types/signing";
import { errorMessage } from "@/features/signing/api";
import { listMpkiCredentials } from "@/features/signing/sign-api";
import { SignSessionDialog } from "@/features/signing/components/sign-session-dialog";
import { UsbTokenSignDialog } from "@/features/signing/components/usb-token-sign-dialog";
import { documentUsbTokenTransport } from "@/features/signing/usb-token-transport";
import {
  detectDocumentFormat,
  formatBytes,
} from "@/features/signing/document-format";
import {
  buildStartRequest,
  buildUsbTokenJobRequest,
  findSource,
  hasCredentialStep,
  isMpki,
  isPkcs12,
  isSignCloud,
  isUsbToken,
  resolveFormState,
  sourceLabel,
  validateSignForm,
  type AgreementStage,
  type SignFormState,
} from "@/features/signing/sign-configuration";
import {
  clearSessionRecord,
  loadSessionRecord,
  saveSessionRecord,
  type SignSessionRecord,
} from "@/features/signing/sign-record-store";
import { isLeaseLocked, isLeaseLost } from "@/features/signing/signing-lease";
import { useSigningLease } from "@/features/signing/use-signing-lease";
import { SigningLeasePanel } from "@/features/signing/components/signing-lease-panel";
import { ExternalSigningError } from "../api";
import { describeExternalSigningError, isDocumentChanged } from "../errors";
import {
  toPublicContinueRequest,
  toPublicSignRequest,
  toSignResponse,
} from "../method-model";
import { EXTERNAL_SIGN_SOURCES } from "../sign-sources";
import { useExternalSigningDocument } from "../use-external-signing-document";
import { useExternalSigningSession } from "../use-external-signing-session";
import { ExternalSigningChrome } from "./external-signing-chrome";
import { ExternalSigningDocumentView } from "./external-signing-document";
import {
  ExternalSigningCredentialStep,
  ExternalSigningMethodPicker,
} from "./external-signing-method";
import {
  ExternalSigningCompleted,
  ExternalSigningLoading,
  ExternalSigningUnavailable,
  SessionExpiredNotice,
} from "./external-signing-states";

/**
 * Trang ký dành cho người ngoài hệ thống.
 *
 * Bố cục: thanh tiến trình chiếm trọn một hàng trên cùng — nó nói về cả màn hình
 * chứ không riêng khối cấu hình — rồi tới hai cột. Cột trái là "bạn đang ký cái
 * gì": tóm tắt tài liệu, rồi chính tài liệu. Cột phải là "bạn phải làm gì": khối
 * cấu hình chữ ký, đi từng bước một. Tài liệu KHÔNG bao giờ bị thay thế bởi bước
 * đang làm — người ký phải đọc lại được điều khoản trong lúc điền thông tin chứng
 * thư, và một wizard toàn màn hình che tài liệu đi ở bước giữa là cách chắc chắn
 * để có một chữ ký đặt vào một văn bản không ai đọc lại.
 *
 * Bốn bước, và thứ tự của chúng là thứ tự nghĩa vụ: đọc → chọn cách ký → điền
 * thông tin của cách ký đó → ký. Ô đồng ý nằm ở bước một, trước cả khi phương
 * thức ký được hỏi, vì đồng ý với NỘI DUNG là việc độc lập với việc có chứng thư
 * loại nào. Chọn cách ký và điền thông tin là HAI bước chứ không phải một, đúng
 * như màn `/sign` tách `source` khỏi `credential` — xem `external-signing-method.tsx`.
 *
 * Vòng đời ký (chọn nguồn → điền thông tin chứng thư → START → chờ xác nhận/OTP →
 * COMPLETED) dùng CHUNG logic với màn `/sign` nội bộ — `SignFormState`,
 * `resolveFormState`, `validateSignForm`, `buildStartRequest` từ
 * `features/signing/sign-configuration.ts`, và hộp thoại `SignSessionDialog`. Chỉ
 * khác đúng một điều: tài liệu đã có sẵn từ workflow (`useExternalSigningDocument`),
 * nên không có bước chọn/tải tệp lên, và request ký gửi lên
 * `/api/public/signing-session/sign` không kèm file — xem `../method-model.ts` cho
 * lớp chuyển đổi giữa `SignRequestPayload` (đầy đủ) và `PublicSignRequest` (hẹp
 * hơn, backend tự lấy tài liệu từ phiên).
 *
 * NGOẠI LỆ DUY NHẤT là FPT USB Token: nó không đi qua `/sign` mà qua cặp endpoint
 * `/usb-token/signing-jobs` → `.../complete`, cộng ba lời gọi thẳng từ trình duyệt
 * tới FPT-CA Signing Agent trên máy người ký. Toàn bộ luồng đó nằm trong
 * `UsbTokenSignDialog` — dùng lại NGUYÊN hộp thoại của màn `/sign`; ở đây chỉ có
 * nhánh mở hộp thoại với tệp đã tải sẵn của phiên.
 */

type StepId = "review" | "method" | "credential" | "sign";

const STEP_ORDER: StepId[] = ["review", "method", "credential", "sign"];

/**
 * Nhãn thân thiện của nguồn ký, đọc từ copy dành cho người ký ngoài hệ thống —
 * `sourceLabel()` của `sign-configuration.ts` rơi về `vendor`/`materialMode` thô
 * (`"FPT_SIGN_CLOUD"`) vì nguồn thật do backend đặt `label`; các nguồn tĩnh của
 * `EXTERNAL_SIGN_SOURCES` không có trường đó.
 */
function methodLabel(t: Dictionary, source?: SignatureSource): string {
  if (!source) return "—";
  const m = t.externalSign.method;
  if (isPkcs12(source)) return m.pkcs12.label;
  if (isMpki(source)) return m.mpki.label;
  if (isSignCloud(source)) return m.signCloud.label;
  if (isUsbToken(source)) return m.usbToken.label;
  return sourceLabel(source);
}

/**
 * Các bước THỰC SỰ hiện ra với nguồn đang chọn, kèm trạng thái của từng bước.
 *
 * Bước "thông tin" biến mất với nguồn không có phần khai riêng nào
 * (`hasCredentialStep`) — cả bốn nguồn hiện tại đều có, nhưng đọc lại hàm dùng
 * chung với màn `/sign` vẫn đúng hơn là khẳng định điều đó ở đây.
 *
 * `reachable` cộng dồn theo chiều đi tới: gặp bước đầu tiên chưa xong là khoá hết
 * phần còn lại. Đây là lý do không cần effect nào để kéo người ký lùi lại khi họ
 * sửa ngược một bước phía trên.
 */
function buildStepViews(
  t: Dictionary,
  source: SignatureSource | undefined,
  complete: Record<StepId, boolean>,
): (StepProgressItem & { id: StepId })[] {
  const s = t.externalSign.steps;
  let open = true;
  return STEP_ORDER.filter(
    (id) => id !== "credential" || hasCredentialStep(source),
  ).map((id) => {
    const view = {
      id,
      label: s[id].label,
      complete: complete[id],
      reachable: open,
    };
    if (!complete[id]) open = false;
    return view;
  });
}

/**
 * `stale` là nhánh của KÝ SONG SONG, và cố ý tách khỏi `failed`.
 *
 * Hai người cùng một cấp ký gần như đồng thời: chữ ký được áp vào tài liệu tuần
 * tự, nên người nộp sau nhận `SIGNING_DOCUMENT_CHANGED` (409). Đó là diễn biến
 * BÌNH THƯỜNG của một cấp song song chứ không phải hỏng hóc — gộp nó vào `failed`
 * là hiện một hộp đỏ "ký thất bại" cho một người vẫn ký được ngay sau đó.
 */
interface FlowState {
  phase:
    | "idle"
    | "signing"
    | "completed"
    | "failed"
    | "stale"
    /** `SIGNING_LEASE_LOCKED` — người ký khác giành được lượt ký trước. */
    | "locked"
    /** `SIGNING_LEASE_LOST` — lượt ký đang dở đã hết hạn/bị chuyển đi. */
    | "lost"
    /** `SIGNING_ALREADY_STARTED` — chính phiên này đã có một lượt ký đang mở. */
    | "resume";
  error?: ExternalSigningError;
}

interface DialogState {
  source: SignatureSource;
  begin: () => Promise<SignResponse>;
}

/**
 * Phiên ký đã mở nhưng chưa xong, của CHÍNH lần tải trang này — người ký đóng
 * hộp thoại trước khi nhập OTP xong. Khác `SignSessionRecord` (localStorage,
 * dành cho lần tải trang sau): ở đây giữ nguyên cả `SignResponse` cuối cùng,
 * nên mở lại hộp thoại không tốn thêm lời gọi nào.
 */
interface OpenSessionState {
  source: SignatureSource;
  response: SignResponse;
}

/** Phản hồi còn dùng được không — hết hạn thì chỉ còn đường ký lại từ đầu. */
function isLive(response: SignResponse): boolean {
  if (!response.expiresAt) return true;
  const deadline = Date.parse(response.expiresAt);
  return Number.isNaN(deadline) || deadline > Date.now();
}

/**
 * Payload được CHỐT lúc bấm ký — dựng lại mỗi render sẽ tạo job mới liên tục.
 *
 * Thiếu `signerDisplayName`: tên người ký là CN của chứng thư trong token, chỉ
 * đọc được sau khi người ký chọn chứng thư trong hộp thoại — xem `UsbTokenSignDialog`.
 */
interface UsbTokenDialogState {
  source: SignatureSource;
  file: File;
  request: Omit<UsbTokenJobRequest, "signerDisplayName">;
}

export function ExternalSigningWorkspace() {
  const { t } = useLocale();
  const session = useExternalSigningSession();

  const document = useExternalSigningDocument(
    session.transport,
    session.phase === "ready",
    session.context?.documentName,
  );

  const [expired, setExpired] = useState(false);
  const onSessionExpired = useCallback(() => setExpired(true), []);

  const [form, setForm] = useState<SignFormState>(() =>
    resolveFormState(EXTERNAL_SIGN_SOURCES[0], undefined, undefined),
  );
  const [p12File, setP12File] = useState<File>();
  const [consent, setConsent] = useState(false);
  /**
   * Bước người ký ĐANG YÊU CẦU xem, không nhất thiết là bước đang hiện: nó còn bị
   * kẹp lại theo bước xa nhất đã mở mỗi lần render. Nhờ vậy sửa ngược một ô ở
   * bước trước lập tức kéo màn hình lùi lại, không cần effect nào.
   */
  const [requestedStep, setRequestedStep] = useState<StepId>("review");

  /**
   * Danh sách credential MPKI của người ký — sống ở đây chứ không trong khối
   * MPKI, vì `validateSignForm` cần SỐ LƯỢNG của nó: bỏ trống `credentialId` chỉ
   * hợp lệ khi người ký có đúng một credential.
   */
  const [credentials, setCredentials] = useState<MpkiCredential[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string>();
  /**
   * Hồ sơ eSign Cloud đã qua bước xác nhận danh tính chưa — chỉ biết được TRONG
   * phiên làm việc này, và CỐ Ý không persist: biết chắc đòi một lời gọi status
   * có tính phí. Cùng ngữ nghĩa với màn `/sign`, xem `AgreementStage`.
   */
  const [agreementStage, setAgreementStage] = useState<AgreementStage>("UNKNOWN");

  const [flow, setFlow] = useState<FlowState>({ phase: "idle" });
  const [dialog, setDialog] = useState<DialogState>();
  const [usbDialog, setUsbDialog] = useState<UsbTokenDialogState>();
  const [signed, setSigned] = useState<SignedDocument | null>();
  const [resume, setResume] = useState<SignSessionRecord | null>(null);
  const [openSession, setOpenSession] = useState<OpenSessionState>();

  /* ---------------------------------------------------------------- *
   * Quyền ký độc quyền
   * ---------------------------------------------------------------- */

  /**
   * MỘT máy trạng thái lease cho cả màn hình, dùng chung hook với màn ký nội bộ
   * (`features/signing/use-signing-lease.ts`). Lease thuộc về YÊU CẦU KÝ chứ
   * không thuộc về cách ký: bốn phương thức ở đây tranh nhau đúng một quyền.
   *
   * Đi qua `session.transport` chứ không gọi thẳng API: nhờ vậy chế độ mô phỏng
   * (`#demo=1`) cũng có lease, và cả nhánh chờ lẫn nút huỷ xem được trước khi
   * nhóm endpoint công khai lên thật.
   */
  const leaseTransport = useMemo(
    () => ({
      get: (signal?: AbortSignal) => session.transport.getLease(signal),
      cancel: (signal?: AbortSignal) => session.transport.cancelLease(signal),
    }),
    [session.transport],
  );

  const lease = useSigningLease({
    transport: leaseTransport,
    // Phiên chưa sẵn sàng thì lời gọi chắc chắn 401; phiên đã hết hạn hoặc đã
    // ký xong thì không còn gì để tranh.
    enabled: session.phase === "ready" && Boolean(session.context) && !expired,
    leaseKey: session.context?.signerId ?? "pending",
  });
  const { refreshLease } = lease;

  // Phiên eSign Cloud còn sống sau khi tải lại trang: đề nghị nối lại thay vì
  // ký lại từ đầu — bước START đã gửi hồ sơ đăng ký/OTP thật rồi.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ từ localStorage khi mount
    setResume(loadSessionRecord("external-sign"));
  }, []);

  const source = findSource(EXTERNAL_SIGN_SOURCES, form.sourceId);
  const documentFormat = document.file
    ? detectDocumentFormat(document.file)
    : undefined;

  const validation = validateSignForm({
    source,
    form,
    file: document.file,
    format: documentFormat,
    p12File,
    credentialCount: credentials.length,
    agreementStage,
    formatBytes,
    messages: t.sign.validation,
  });
  /*
   * Hai bước, hai điều kiện — và cả hai TÍNH LẠI mỗi render từ chính `validation`
   * đang điều khiển nút ký, không có cờ "đã xong" nào được nhớ riêng. `methodReady`
   * (dùng cho câu chặn dưới nút ký) là hợp của cả hai.
   */
  const sourceReady =
    Boolean(form.sourceId) && (validation.byStep.source?.length ?? 0) === 0;
  const credentialReady = (validation.byStep.credential?.length ?? 0) === 0;
  const methodReady = sourceReady && credentialReady;

  const updateForm = useCallback(
    <K extends keyof SignFormState>(key: K, value: SignFormState[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  function changeSource(sourceId: string) {
    const next = findSource(EXTERNAL_SIGN_SOURCES, sourceId);
    if (!next) return;
    setForm((current) => resolveFormState(next, current, documentFormat));
    setFlow({ phase: "idle" });
  }

  /**
   * Danh sách credential MPKI, đọc từ chính tên đăng nhập người ký vừa gõ. Chỉ
   * chọn sẵn khi có ĐÚNG một — nhiều hơn thì để trống, vì chọn nhầm là ký nhầm
   * một danh tính pháp lý. Cùng quy tắc với màn `/sign`.
   */
  async function loadCredentials() {
    const username = form.mpkiUsername.trim();
    if (!username) return;
    setCredentialsLoading(true);
    setCredentialsError(undefined);
    try {
      const list = await listMpkiCredentials(username);
      setCredentials(list);
      updateForm("mpkiCredentialId", list.length === 1 ? list[0].credentialId : "");
      if (list.length === 0) setCredentialsError(t.externalSign.mpki.empty);
    } catch (cause) {
      setCredentials([]);
      setCredentialsError(errorMessage(cause, t.externalSign.mpki.loadFailed));
    } finally {
      setCredentialsLoading(false);
    }
  }

  /**
   * Bỏ account MPKI hiện tại để người dùng có thể nhập username khác.
   *
   * `MpkiFields` tự reset `mpkiUsername` và `mpkiCredentialId`; workspace chỉ
   * sở hữu danh sách credential và trạng thái tải/lỗi nên reset đúng phần này.
   */
  const resetMpkiCredentials = useCallback(() => {
    setCredentials([]);
    setCredentialsError(undefined);
    setCredentialsLoading(false);
  }, []);

  const steps = buildStepViews(t, source, {
    review: consent,
    method: sourceReady,
    credential: credentialReady,
    // Bước cuối không có ràng buộc riêng nào, và "xong" của nó là đã ký thật —
    // lúc đó màn hình đã chuyển sang `ExternalSigningCompleted`.
    sign: false,
  });

  const chrome = (children: React.ReactNode) => (
    <ExternalSigningChrome
      t={t}
      demo={session.demo}
      sessionExpiresAt={session.expiresAt}
      onSessionExpired={onSessionExpired}
    >
      {children}
    </ExternalSigningChrome>
  );

  if (session.phase === "initializing")
    return chrome(<ExternalSigningLoading t={t} />);

  if (session.phase === "unavailable" || !session.context) {
    return chrome(
      <ExternalSigningUnavailable
        t={t}
        error={session.error}
        message={describeExternalSigningError(t, session.error)}
        onRetry={() => window.location.reload()}
      />,
    );
  }

  if (flow.phase === "completed") {
    return chrome(
      <ExternalSigningCompleted
        t={t}
        documentName={session.context.documentName}
        signerLabel={session.context.signerLabel}
        signed={signed}
      />,
    );
  }

  const context = session.context;
  /*
   * Bước đang hiện = bước được yêu cầu, kẹp lại theo bước xa nhất đang mở. Yêu
   * cầu một bước đã bị khoá lại (hoặc một bước vừa biến mất khỏi danh sách) rơi
   * về bước xa nhất thay vì dựng một panel rỗng.
   */
  const furthest = steps.reduce(
    (last, view, index) => (view.reachable ? index : last),
    0,
  );
  const requestedIndex = steps.findIndex((view) => view.id === requestedStep);
  const stepIndex = Math.min(requestedIndex < 0 ? furthest : requestedIndex, furthest);
  const step = steps[stepIndex].id;
  const activeStep = t.externalSign.steps[step];

  /*
   * Chỉ những gì đang chặn BƯỚC NÀY. Hai bước có nhãn khác tên bước của
   * `validateSignForm` ("method" ở đây là "source" bên kia); bước đọc tài liệu
   * không có ràng buộc nào của form nên không đọc gì cả.
   */
  const blockers =
    step === "method"
      ? validation.byStep.source
      : step === "credential"
        ? validation.byStep.credential
        : [];

  /*
   * Lý do khoá nút ký, xếp theo thứ tự người ký xử lý được: thiếu thao tác của
   * chính họ trước, rồi tới hai trạng thái họ chỉ có thể mở lại liên kết. Thông báo
   * cụ thể nhất đọc thẳng từ `validateSignForm` khi có — chung logic với màn `/sign`.
   *
   * USB Token có thêm một điều kiện KHÔNG nguồn nào khác có: tệp phải nằm sẵn
   * trong trình duyệt. Ba nguồn kia gửi lệnh ký rồi backend tự lấy tài liệu từ
   * phiên, còn job USB Token được dựng từ chính tệp này.
   */
  /*
   * `document.loading` khoá nút trong lúc bản mới đang về sau
   * `SIGNING_DOCUMENT_CHANGED`: ký ngay lúc đó là ký lên đúng bản vừa bị từ
   * chối. Nút tự mở lại khi tải xong, người ký không phải thao tác gì thêm.
   */
  /**
   * Quyền ký độc quyền, dịch sang một câu người ký làm được gì với nó.
   *
   * `undefined` (chưa đọc xong lượt đầu) và lỗi mạng đều CHẶN: mặc định
   * `AVAILABLE` khi chưa biết là đúng thứ mà lease sinh ra để loại bỏ.
   */
  const leaseBlockedReason = lease.leaseError
    ? t.signingLease.action.unavailable
    : lease.isLeaseLoading
      ? t.signingLease.action.checking
      : lease.lease?.state === "LOCKED"
        ? t.signingLease.action.locked
        : lease.lease?.state === "HELD_BY_YOU"
          ? t.signingLease.action.held
          : undefined;

  const blockedReason = expired
    ? t.externalSign.action.expired
    : session.csrfMissing
      ? t.externalSign.action.cannotSign
      : document.loading
        ? t.externalSign.action.reloadingDocument
        : !consent
          ? t.externalSign.action.needConsent
          : !form.sourceId
            ? t.externalSign.action.needMethod
            : !methodReady
              ? (validation.byStep.credential[0] ??
                validation.byStep.source[0] ??
                t.externalSign.action.needFields)
              : isUsbToken(source) && !document.file
                ? t.externalSign.viewer.errorTitle
                : leaseBlockedReason;

  const busy =
    flow.phase === "signing" ||
    Boolean(dialog) ||
    Boolean(usbDialog) ||
    lease.isLeaseCancelling;

  /*
   * NGOẠI LỆ của `lease.canStartSigning`: mở lại một phiên eSign Cloud còn dở
   * của chính lần tải trang này (xem nhánh `openSession` trong `startSigning`)
   * KHÔNG gửi lệnh nào cả — nó chỉ vẽ lại hộp thoại từ phản hồi đã giữ. Lúc đó
   * lease là `HELD_BY_YOU`, và khoá nút ở đây là nhốt người ký ra ngoài chính
   * giao dịch mà họ đã trả tiền.
   */
  const reopenable =
    openSession !== undefined &&
    openSession.source.id === source?.id &&
    isLive(openSession.response) &&
    lease.lease?.state === "HELD_BY_YOU";

  const canSign =
    !busy && (reopenable ? !expired && !session.csrfMissing : !blockedReason && lease.canStartSigning);

  /* ---------------------------------------------------------------- *
   * Ký
   * ---------------------------------------------------------------- */

  const applyCompleted = (response: SignResponse) => {
    clearSessionRecord("external-sign");
    setResume(null);
    setOpenSession(undefined);
    setDialog(undefined);
    setUsbDialog(undefined);
    setSigned(response.document ?? null);
    setFlow({ phase: "completed" });
    /*
     * Đọc lại lease TRƯỚC khi bỏ thông tin phiên: ký xong là backend giải phóng
     * quyền ký, và người cùng cấp đang chờ ở màn của họ phải thấy `AVAILABLE`
     * ngay. Lời gọi này chỉ cần cookie nên nó không phụ thuộc vào CSRF vừa bị
     * xoá, nhưng gọi trước vẫn là thứ tự đúng để đọc.
     */
    void refreshLease();
    session.forgetCredentials();
  };

  /**
   * Tài liệu đã đổi dưới chân người ký — tải lại rồi mời ký lại, không báo hỏng.
   *
   * Ba thứ phải bỏ đi cùng lúc với tài liệu cũ: hộp thoại đang mở, phiên ký còn
   * dở của nhà cung cấp chứng thư (`openSession` + bản ghi khôi phục) và mọi lời
   * đề nghị nối lại. Chúng đều gắn với BẢN TÀI LIỆU CŨ; nối lại một giao dịch mở
   * trên bản cũ chỉ nhận đúng lỗi này lần nữa, nên lần ký lại phải là một START
   * mới trên bản vừa tải về.
   *
   * KHÔNG exchange lại link token: token dùng một lần và đã bị xoá khỏi URL ngay
   * sau lần đổi đầu tiên (`clearExternalSigningToken`), nên phiên hiện tại là thứ
   * duy nhất còn ký được — và nó vẫn sống, vì 409 không phải lỗi phiên. Phiên
   * chết thật thì đã rơi vào nhánh 401/403/410 phía trên.
   */
  function recoverFromStaleDocument(cause: ExternalSigningError) {
    setDialog(undefined);
    setUsbDialog(undefined);
    setOpenSession(undefined);
    clearSessionRecord("external-sign");
    setResume(null);
    document.reload();
    setFlow({ phase: "stale", error: cause });
  }

  /**
   * Bỏ MỌI thứ client còn giữ của lượt ký đang dở.
   *
   * `jobId` cùng digest của USB Token sống trong state của chính
   * `UsbTokenSignDialog`, nên chúng chết theo lần unmount này — không có bản sao
   * nào ở ngoài, và đừng tạo ra, vì lúc đó sẽ có hai chỗ phải nhớ xoá.
   */
  function forgetAttempt() {
    setDialog(undefined);
    setUsbDialog(undefined);
    setOpenSession(undefined);
  }

  /**
   * Bốn xung đột 409, mỗi cái một đường ra — và TẤT CẢ đều đọc lại lease sau đó.
   *
   * Mỗi mã này đều nói rằng thứ client đang tin về quyền ký của mình đã lệch với
   * backend; cái duy nhất sửa được chỗ lệch đó là hỏi lại. KHÔNG có nhánh nào
   * gửi lại lệnh vừa hỏng: với eSign Cloud mỗi lần START là một lượt ký bị trừ.
   *
   * Trả `true` khi đã nhận diện được, để nơi gọi không rơi tiếp xuống nhánh
   * "ký thất bại".
   */
  function applyConflict(cause: unknown): boolean {
    if (!(cause instanceof ExternalSigningError)) return false;

    if (isLeaseLocked(cause)) {
      // Thua cuộc đua ngay tại lệnh ký: `GET → AVAILABLE` không bao giờ là một
      // lời hứa, và đây chính là cửa sổ mà nó không bịt được.
      forgetAttempt();
      setFlow({ phase: "locked", error: cause });
      void refreshLease();
      return true;
    }

    if (isLeaseLost(cause)) {
      /*
       * Lượt ký đang dở không còn hợp lệ. Bỏ hết TRƯỚC khi hiện gì lên màn hình:
       * phiên engine của eSign Cloud (cả bản ghi khôi phục trong `localStorage`),
       * `jobId` + digest của USB Token, hộp thoại OTP đang mở — tất cả đều gắn
       * với một lease đã chết.
       */
      forgetAttempt();
      clearSessionRecord("external-sign");
      setResume(null);
      setFlow({ phase: "lost", error: cause });
      void refreshLease();
      return true;
    }

    if (isDocumentChanged(cause)) {
      recoverFromStaleDocument(cause);
      void refreshLease();
      return true;
    }

    if (cause.code === "SIGNING_ALREADY_STARTED") {
      // Chính phiên này đã có một lượt ký đang mở (hai tab, hoặc F5 giữa lúc
      // chờ OTP). Lease sẽ trả `HELD_BY_YOU`; đường ra là nối lại lượt cũ, hoặc
      // huỷ nó đi — KHÔNG phải START thêm lần nữa.
      setDialog(undefined);
      setUsbDialog(undefined);
      setFlow({ phase: "resume", error: cause });
      void refreshLease();
      return true;
    }

    return false;
  }

  /**
   * Huỷ lượt ký đang mở rồi đọc lại trạng thái.
   *
   * Bỏ trạng thái cục bộ TRƯỚC khi gọi DELETE: gọi trước rồi mới dọn là để lại
   * một cửa sổ mà hộp thoại cũ vẫn mở trên một lượt ký backend đã đóng.
   *
   * Không tự START lại sau khi huỷ — `cancelLease` đọc lại lease, và chỉ khi nó
   * về `AVAILABLE` thì nút Ký mới mở lại, do chính người ký bấm.
   */
  async function cancelAttempt() {
    forgetAttempt();
    clearSessionRecord("external-sign");
    setResume(null);
    setFlow({ phase: "idle" });
    await lease.cancelLease();
  }

  /**
   * Bọc một lượt ký đi qua hộp thoại. Hộp thoại tự nuốt lỗi vào khối lỗi của nó,
   * nên các xung đột có đường ra riêng phải được chặn TRƯỚC khi tới đó — vẫn ném
   * tiếp để hộp thoại dừng máy trạng thái của mình lại.
   */
  function guardStale<T>(run: () => Promise<T>): Promise<T> {
    return run().catch((cause: unknown) => {
      applyConflict(cause);
      throw cause;
    });
  }

  async function runInline(
    active: SignatureSource,
    begin: () => Promise<SignResponse>,
  ) {
    setFlow({ phase: "signing" });
    try {
      const response = await begin();
      if (response.status === "COMPLETED") {
        applyCompleted(response);
        return;
      }
      // Nguồn khai `NONE` nhưng vẫn mở phiên: tin phản hồi, không tin khai báo.
      setDialog({ source: active, begin: async () => response });
      setFlow({ phase: "idle" });
    } catch (cause) {
      const failure =
        cause instanceof ExternalSigningError
          ? cause
          : new ExternalSigningError(0, "EXTERNAL_SIGNING_UNKNOWN_ERROR");
      if (isSessionFatal(failure.status)) {
        session.invalidate(failure);
        return;
      }
      if (applyConflict(failure)) return;
      setFlow({ phase: "failed", error: failure });
    }
  }

  function startSigning() {
    if (!canSign || !source) return;

    /*
      Phiên còn dở của chính lần này (đóng hộp thoại trước khi nhập xong OTP):
      MỞ LẠI nó thay vì START mới. START thứ hai trên một phiên đang sống là thứ
      backend từ chối — người ký bấm "Ký tài liệu" lần nữa và chỉ nhận được câu
      "bước ký chưa hoàn tất", trong khi giao dịch họ đã trả tiền vẫn đang chờ
      đúng một mã OTP.

      Không lời gọi nào chạy ở đây: phản hồi đã giữ còn nguyên url trang OTP của
      giao dịch chưa dùng, nên hộp thoại mở lên là hiện thẳng nút mở trang đó.
    */
    if (openSession && openSession.source.id === source.id && isLive(openSession.response)) {
      const reopened = openSession.response;
      setFlow({ phase: "idle" });
      setDialog({ source, begin: async () => reopened });
      return;
    }

    /*
      USB Token không có bước START trên `/sign`: hộp thoại tự tạo job từ chính
      tệp của phiên, gọi agent trên máy người ký, rồi nộp chữ ký ở bước complete.
      Không có `SignFormState` nào phải cắt xuống `PublicSignRequest` ở nhánh này.
    */
    if (isUsbToken(source)) {
      if (!document.file) return;
      setFlow({ phase: "idle" });
      setUsbDialog({
        source,
        file: document.file,
        // Không `geometry`: vị trí chữ ký do signature plan của workflow quyết
        // định, không phải một khung người ký kéo được trên trang này.
        request: buildUsbTokenJobRequest({ form }),
      });
      return;
    }

    const payload = buildStartRequest({ source, form });
    const publicPayload = toPublicSignRequest(payload);
    const begin = () =>
      session.transport.sign(publicPayload, p12File).then(toSignResponse);

    if (source.interactionModel === "NONE") {
      void runInline(source, begin);
      return;
    }
    setFlow({ phase: "idle" });
    setDialog({ source, begin });
  }

  /** Nối lại một phiên đã mở: CONTINUE, KHÔNG phải START — START lại là một giao dịch mới. */
  function resumeSession() {
    const record = resume;
    if (!record) return;
    const active = EXTERNAL_SIGN_SOURCES.find(
      (item) =>
        item.materialMode === record.materialMode &&
        item.vendor === record.vendor,
    );
    if (!active) return;

    setResume(null);
    setDialog({
      source: active,
      begin: () =>
        session.transport
          .sign(
            toPublicContinueRequest(record.materialMode, record.vendor),
            undefined,
          )
          .then(toSignResponse),
    });
  }

  function dismissResume() {
    setResume(null);
    clearSessionRecord("external-sign");
  }

  const startSigningFromForm = () => {
    if (!canSign) return;
    startSigning();
  };

  return chrome(
    /*
      Ba tầng, và mỗi tầng trả lời đúng một câu hỏi: "còn bao nhiêu việc" (thanh
      tiến trình, trọn một hàng vì nó nói về cả màn hình), "tôi đang ký cái gì"
      (cột trái), "tôi phải làm gì bây giờ" (cột phải).

      Màn hẹp: một cột, thứ tự DOM giữ nguyên — tóm tắt và tài liệu lên trước khối
      cấu hình, vì bước đầu tiên là ĐỌC. Từ `lg`: hai cột, cột trái ăn hết phần
      còn lại của chiều ngang (trang PDF càng to càng dễ đọc), cột phải cố định
      23.5rem và dính theo màn hình để nút ký không bao giờ trôi khỏi tầm mắt.
    */
    <div className="space-y-4">
      {resume ? (
        <ResumeBanner t={t} onResume={resumeSession} onDismiss={dismissResume} />
      ) : null}

      <StepProgress
        steps={steps}
        activeIndex={stepIndex}
        onSelect={(id) => setRequestedStep(id as StepId)}
        navLabel={t.externalSign.steps.navLabel}
        stepOfLabel={t.externalSign.steps.stepOf}
        lockedHint={t.externalSign.steps.lockedHint}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_23.5rem]">
        <div className="flex min-w-0 flex-col gap-3">
          <DocumentSummary t={t} context={context} />

          <ExternalSigningDocumentView
            t={t}
            file={document.file}
            slots={document.plan?.signatures ?? []}
            loading={document.loading}
            errorTitle={
              document.error
                ? describeExternalSigningError(t, document.error).body
                : undefined
            }
            onRetry={document.reload}
          />
        </div>

        <aside className="min-w-0 lg:sticky lg:top-19">
          <section className="rounded-lg border border-border bg-surface shadow-sm">
            <header className="border-b border-border-muted px-4 py-3">
              <h2 className="text-[13.5px] font-semibold text-fg">
                {activeStep.title}
              </h2>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-muted">
                {activeStep.description}
              </p>
            </header>

            <div className="space-y-3 px-4 py-3.5">
              {/*
                Trạng thái lượt ký đứng TRƯỚC nội dung của bước, và ở MỌI bước:
                biết "đang có người khác ký" từ lúc còn đang đọc tài liệu thì
                người ký không phải điền hết một form dài rồi mới gặp nút tắt.

                `showHolder` TẮT ở đây, và đó là một ranh giới riêng tư chứ không
                phải một tuỳ chọn giao diện: người ký ngoài hệ thống chỉ được
                biết "có một người ký khác". `holderLabel`, `holderUserId` và
                `holderSignerId` là danh tính của người khác trong một tổ chức mà
                họ không thuộc về — xem `SigningLeasePanel`.
              */}
              <SigningLeasePanel
                copy={t.signingLease}
                lease={lease.lease}
                loading={lease.isLeaseLoading}
                error={lease.leaseError}
                cancelling={lease.isLeaseCancelling}
                showHolder={false}
                onRetry={() => void refreshLease()}
                onCancel={
                  // Huỷ là một lệnh GHI: thiếu CSRF thì nó chắc chắn 403, và một
                  // cái nút chắc chắn hỏng tệ hơn là không có nút.
                  busy || session.csrfMissing ? undefined : () => void cancelAttempt()
                }
                /*
                  Nối lại = MỞ LẠI hộp thoại từ phản hồi đã giữ của chính lần tải
                  trang này. Không lời gọi nào chạy, và đặc biệt KHÔNG có START
                  thứ hai — giao dịch bên nhà cung cấp chứng thư vẫn đang chờ
                  đúng một mã OTP. Mất phản hồi đó (F5) thì `reopenable` tắt và
                  chỉ còn đường huỷ.
                */
                onResume={reopenable && !busy ? startSigningFromForm : undefined}
                resumeLabel={t.externalSign.resume.resume}
              />

              {step === "review" ? (
                <ConsentCard
                  t={t}
                  consent={consent}
                  onChange={setConsent}
                  disabled={expired}
                />
              ) : null}

              {step === "method" ? (
                <ExternalSigningMethodPicker
                  t={t}
                  form={form}
                  documentFormat={documentFormat}
                  disabled={expired || busy}
                  onSelectSource={changeSource}
                />
              ) : null}

              {step === "credential" ? (
                <ExternalSigningCredentialStep
                  t={t}
                  source={source}
                  form={form}
                  p12File={p12File}
                  disabled={expired || busy}
                  credentials={credentials}
                  credentialsLoading={credentialsLoading}
                  credentialsError={credentialsError}
                  onLoadCredentials={loadCredentials}
                  onResetCredentials={resetMpkiCredentials}
                  agreementStage={agreementStage}
                  onAgreementStageChange={setAgreementStage}
                  onP12FileChange={setP12File}
                  onUpdate={updateForm}
                />
              ) : null}

              {step === "sign" ? (
                <SignPanel
                  t={t}
                  source={source}
                  context={context}
                  flow={flow}
                  expired={expired}
                  csrfMissing={session.csrfMissing}
                  cancelling={lease.isLeaseCancelling}
                  canCancel={!busy && !session.csrfMissing}
                  showResumeNotice={
                    flow.phase === "resume" && lease.lease?.state !== "HELD_BY_YOU"
                  }
                  onCancelAttempt={() => void cancelAttempt()}
                />
              ) : null}

              {/*
                Vì sao nút "Tiếp tục" đang tắt — đọc thẳng từ `validateSignForm`,
                lọc xuống đúng bước đang đứng. Không có khối này thì người ký điền
                xong một form dài và gặp một cái nút chết không giải thích gì; đó
                là thứ bước "thông tin" của eSign Cloud rơi vào thường xuyên nhất,
                vì điền đủ ô CHƯA phải là có chứng thư. Bước cuối không cần: câu
                chặn của nó đã nằm ngay dưới nút ký.
              */}
              {blockers.length > 0 && step !== "sign" ? (
                <div
                  role="status"
                  className="rounded-lg border border-warning bg-warning-subtle p-3"
                >
                  <div className="flex gap-2">
                    <InfoIcon size={14} className="mt-0.5 shrink-0 text-warning" />
                    <ul className="space-y-1 text-[11px] leading-relaxed text-warning">
                      {blockers.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>

            <footer className="flex flex-wrap items-center gap-2 border-t border-border-muted px-4 py-3">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => setRequestedStep(steps[stepIndex - 1].id)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12.5px] font-semibold text-fg"
                >
                  <ArrowLeftIcon size={14} />
                  {t.common.back}
                </button>
              ) : null}

              {step === "sign" ? (
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={!canSign}
                    onClick={startSigningFromForm}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent bg-accent text-[14px] font-bold text-accent-fg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? (
                      <SpinnerIcon size={16} className="animate-spin" />
                    ) : (
                      <PenLineIcon size={16} />
                    )}
                    {busy
                      ? t.externalSign.action.signing
                      : t.externalSign.action.signButton}
                  </button>
                  {/* {blockedReason ? (
                    <p className="mt-1.5 text-center text-[11px] text-warning">
                      {blockedReason}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-center text-[10.5px] leading-relaxed text-fg-muted">
                      {t.externalSign.action.declineNote}
                    </p>
                  )} */}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!steps[stepIndex + 1]?.reachable}
                  title={
                    steps[stepIndex + 1]?.reachable
                      ? undefined
                      : t.externalSign.steps.lockedHint
                  }
                  onClick={() => setRequestedStep(steps[stepIndex + 1].id)}
                  className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.common.continueLabel}
                  <ArrowRightIcon size={14} />
                </button>
              )}
            </footer>
          </section>
        </aside>
      </div>

      {/*
        Màn chờ là hộp thoại, không phải một khối trong panel: lúc này người ký
        không còn gì để sửa, và một giao dịch đang mở bên nhà cung cấp chứng thư thì
        mọi ô trên trang phải nằm ngoài tầm tay. Dùng lại NGUYÊN `SignSessionDialog`
        của màn `/sign` — cùng cơ chế mở popup xác nhận danh tính/OTP, cùng cơ chế
        tự tiếp tục đúng một lần khi popup đóng lại.
      */}
      {dialog ? (
        <SignSessionDialog
          t={t}
          fileName={context.documentName}
          sourceName={methodLabel(t, dialog.source)}
          interactionModel={dialog.source.interactionModel}
          timeoutSeconds={dialog.source.expectedWaitSeconds}
          begin={() => guardStale(dialog.begin)}
          continueSession={() =>
            guardStale(() =>
              session.transport
                .sign(
                  toPublicContinueRequest(
                    dialog.source.materialMode,
                    dialog.source.vendor ?? undefined,
                  ),
                  undefined,
                )
                .then(toSignResponse),
            )
          }
          onPending={(response) => {
            // Giữ lại để bấm "Ký tài liệu" lần nữa mở lại đúng stage này, kể cả
            // khi hộp thoại bị đóng giữa chừng — xem `startSigning`.
            setOpenSession({ source: dialog.source, response });
            saveSessionRecord(
              {
                materialMode: dialog.source.materialMode,
                vendor: dialog.source.vendor ?? undefined,
                status: response.status,
                fileName: context.documentName,
                expiresAt: response.expiresAt,
                createdAt: Date.now(),
              },
              "external-sign",
            );
            setResume(null);
          }}
          onCompleted={applyCompleted}
          onClose={() => setDialog(undefined)}
        />
      ) : null}

      {/*
        USB Token: hộp thoại NGUYÊN BẢN của màn `/sign`. Nó tự chạy cả năm chặng —
        kết nối agent, chọn chứng thư, tạo job, chờ PIN, nộp chữ ký — nên ở đây
        không có gì để nối vào ngoài tệp và phần request đã chốt lúc bấm ký.
      */}
      {usbDialog ? (
        <UsbTokenSignDialog
          t={t}
          fileName={context.documentName}
          sourceName={methodLabel(t, usbDialog.source)}
          transport={documentUsbTokenTransport(usbDialog.file, usbDialog.request)}
          onCompleted={applyCompleted}
          onClose={() => setUsbDialog(undefined)}
        />
      ) : null}
    </div>,
  );
}

function ResumeBanner({
  t,
  onResume,
  onDismiss,
}: {
  t: Dictionary;
  onResume: () => void;
  onDismiss: () => void;
}) {
  const r = t.externalSign.resume;
  return (
    <div className="mb-1 flex flex-wrap items-center gap-3 rounded-lg border border-accent bg-accent-subtle px-4 py-3">
      <InfoIcon size={16} className="shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-fg">{r.title}</p>
        <p className="mt-0.5 text-[11.5px] text-fg-muted">{r.description}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="h-8 rounded-md border border-border bg-surface px-3 text-[12px] font-semibold text-fg"
        >
          {r.dismiss}
        </button>
        <button
          type="button"
          onClick={onResume}
          className="h-8 rounded-md border border-accent bg-accent px-3 text-[12px] font-semibold text-accent-fg"
        >
          {r.resume}
        </button>
      </div>
    </div>
  );
}

/**
 * "Bạn đang ký cái gì" — đứng đầu cột trái, ngay trên chính tài liệu, và không
 * đổi theo bước nào cả.
 *
 * Mã kiểm tra tài liệu (sha256) có mặt cùng một câu giải thích ngắn: người ký cẩn
 * thận đối chiếu được nó với mã người gửi đọc cho họ, và đó là cách duy nhất từ
 * phía họ để biết tệp trên màn hình đúng là tệp đã hẹn.
 */
function DocumentSummary({
  t,
  context,
}: {
  t: Dictionary;
  context: PublicSigningContext;
}) {
  const s = t.externalSign.summary;
  const status =
    context.signerStatus === "SIGNED"
      ? s.statusSigned
      : context.signerStatus === "DECLINED"
        ? s.statusDeclined
        : s.statusPending;

  return (
    <section className="rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
          {s.title}
        </h2>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
            context.signerStatus === "SIGNED"
              ? "bg-success-subtle text-success"
              : "bg-warning-subtle text-warning"
          }`}
        >
          {status}
        </span>
      </div>

      <p className="mt-1.5 text-[13.5px] font-semibold text-fg">
        {context.title}
      </p>

      <dl className="mt-2.5 space-y-1.5">
        <SummaryRow icon={<FileTextIcon size={12} />} label={s.documentLabel}>
          <span className="truncate" title={context.documentName}>
            {context.documentName}
          </span>
        </SummaryRow>

        <SummaryRow icon={<UsersIcon size={12} />} label={s.signerLabel}>
          <span className="truncate" title={context.signerLabel ?? undefined}>
            {context.signerLabel ?? s.order(context.signingOrder)}
          </span>
        </SummaryRow>

        <SummaryRow icon={<PenLineIcon size={12} />} label={s.orderLabel}>
          {s.order(context.signingOrder)}
        </SummaryRow>
      </dl>

      {context.documentSha256 ? (
        <details className="mt-2.5 border-t border-border-muted pt-2">
          <summary className="cursor-pointer text-[10.5px] text-fg-muted">
            {s.checksumLabel}
          </summary>
          <p className="mt-1.5 break-all font-mono text-[10px] leading-relaxed text-fg">
            {context.documentSha256}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">
            {s.checksumHint}
          </p>
        </details>
      ) : null}
    </section>
  );
}

function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[92px_1fr] items-center gap-2 text-[11.5px]">
      <dt className="flex items-center gap-1.5 text-fg-muted">
        <span className="shrink-0 text-fg-subtle">{icon}</span>
        {label}
      </dt>
      <dd className="min-w-0 text-right font-semibold text-fg">{children}</dd>
    </div>
  );
}

/**
 * Ô đồng ý.
 *
 * Nó là một checkbox thật (`<input type="checkbox">`) chứ không phải một nút giả
 * lập: đây là mảnh giao diện mang ý nghĩa pháp lý trên cả trang, và nó phải hoạt
 * động với bàn phím, với trình đọc màn hình và với mọi thứ trình duyệt đã biết làm.
 */
function ConsentCard({
  t,
  consent,
  onChange,
  disabled,
}: {
  t: Dictionary;
  consent: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  const c = t.externalSign.consent;
  return (
    <div className="space-y-2.5">
      <p className="flex gap-1.5 text-[11.5px] leading-relaxed text-fg-muted">
        <PenLineIcon size={13} className="mt-0.5 shrink-0 text-fg-subtle" />
        {c.scrollNote}
      </p>

      <label
        className={`flex cursor-pointer gap-2.5 rounded-lg border p-3 transition-colors ${
          consent
            ? "border-success bg-success-subtle"
            : "border-border bg-surface-2"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <input
          type="checkbox"
          checked={consent}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-success"
        />
        <span>
          <span className="block text-[12.5px] font-semibold text-fg">
            {c.checkbox}
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-fg-muted">
            {c.hint}
          </span>
        </span>
      </label>
    </div>
  );
}

/** Bước cuối: nhắc lại đúng những gì sắp được gửi đi, rồi tới nút ký. */
function SignPanel({
  t,
  source,
  context,
  flow,
  expired,
  csrfMissing,
  cancelling,
  canCancel,
  showResumeNotice,
  onCancelAttempt,
}: {
  t: Dictionary;
  source?: SignatureSource;
  context: PublicSigningContext;
  flow: FlowState;
  expired: boolean;
  csrfMissing: boolean;
  cancelling: boolean;
  canCancel: boolean;
  /**
   * Khối "lượt ký chưa xong" chỉ hiện khi lease CHƯA nói điều đó — khi lease đã
   * trả `HELD_BY_YOU`, khối trạng thái lượt ký phía trên đã mang đúng nút này.
   */
  showResumeNotice: boolean;
  onCancelAttempt: () => void;
}) {
  /*
   * Chỉ `failed` mới là lỗi. `stale` (ký song song, tài liệu vừa đổi) có khối
   * riêng màu cảnh báo ngay dưới đây: người ký không phải sửa gì, chỉ ký lại.
   */
  const message =
    flow.phase === "failed" && flow.error
      ? describeExternalSigningError(t, flow.error)
      : undefined;
  const staleCopy = t.externalSign.stale;
  const csrfCopy = t.externalSign.errors.EXTERNAL_SIGNING_CSRF_MISSING;
  const isMultiStage = source?.interactionModel === "REDIRECT_OTP";

  return (
    <div className="space-y-3">
      {expired ? <SessionExpiredNotice t={t} /> : null}

      {flow.phase === "stale" ? (
        <div
          role="status"
          className="flex gap-2 rounded-md border border-warning bg-warning-subtle p-3"
        >
          <InfoIcon size={14} className="mt-0.5 shrink-0 text-warning" />
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold text-warning">{staleCopy.title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-warning">
              {staleCopy.body}
            </p>
          </div>
        </div>
      ) : null}

      {/*
        Thua cuộc đua ngay tại lệnh ký. Khối này nói một điều mà khối trạng thái
        lượt ký phía trên KHÔNG nói được: cú bấm vừa rồi không gửi đi được gì cả.
      */}
      {flow.phase === "locked" ? (
        <LeaseNotice
          title={t.signingLease.lockedNowTitle}
          body={t.signingLease.lockedNowBody}
        />
      ) : null}

      {/*
        Lease của lượt ký đang dở đã mất. Mọi thứ của lượt đó đã bị bỏ trước khi
        khối này hiện ra (xem `applyConflict`), nên KHÔNG có nút "tiếp tục" —
        nối lại một lượt ký không còn tồn tại chỉ nhận về đúng lỗi này.
      */}
      {flow.phase === "lost" ? (
        <LeaseNotice title={t.signingLease.lostTitle} body={t.signingLease.lostBody} />
      ) : null}

      {/*
        Chính phiên này đã có một lượt ký đang mở. Nút "Ký tài liệu" phía dưới
        vẫn mở lại được lượt đó khi phản hồi cũ còn sống (xem `reopenable`); nút
        ở đây là đường ra còn lại — bỏ hẳn lượt cũ rồi bắt đầu lại.
      */}
      {showResumeNotice ? (
        <LeaseNotice
          title={t.signingLease.heldTitle}
          body={t.signingLease.heldBody}
          action={
            canCancel ? (
              <button
                type="button"
                onClick={onCancelAttempt}
                disabled={cancelling}
                className="h-8 shrink-0 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-fg hover:bg-inset disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelling ? t.signingLease.cancelling : t.signingLease.cancel}
              </button>
            ) : undefined
          }
        />
      ) : null}

      {csrfMissing && !expired ? (
        <div className="flex gap-2 rounded-md border border-warning bg-warning-subtle p-3">
          <LockIcon size={14} className="mt-0.5 shrink-0 text-warning" />
          <div>
            <p className="text-[11.5px] font-semibold text-warning">
              {csrfCopy.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-warning">
              {csrfCopy.body}
            </p>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="flex gap-2 rounded-md border border-danger bg-danger-subtle p-3">
          <AlertTriangleIcon
            size={14}
            className="mt-0.5 shrink-0 text-danger"
          />
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold text-danger">
              {message.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-danger">
              {message.body}
            </p>
            {message.code ? (
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-danger">
                {message.code}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <dl className="divide-y divide-border-muted rounded-md border border-border-muted bg-surface-2 px-3">
        <ReviewRow
          label={t.externalSign.summary.documentLabel}
          value={context.documentName}
        />
        <ReviewRow
          label={t.externalSign.steps.method.label}
          value={methodLabel(t, source)}
        />
      </dl>

      {/* Luồng ba pha: nói trước rằng còn hai bước nữa, để không ai bấm ký rồi bỏ đi. */}
      {isMultiStage ? (
        <p className="flex gap-1.5 rounded-md bg-accent-subtle px-2.5 py-2 text-[11px] leading-relaxed text-fg">
          <CheckIcon size={12} className="mt-0.5 shrink-0 text-accent" />
          {t.externalSign.pending.identityBody}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Khối cảnh báo của ba nhánh lease trong bước ký. Cùng hình dạng với khối
 * `stale` ngay trên nó — chúng cùng một loại tin: không phải hỏng hóc, chỉ là
 * một việc phải làm trước khi ký lại.
 */
function LeaseNotice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex gap-2 rounded-md border border-warning bg-warning-subtle p-3"
    >
      <InfoIcon size={14} className="mt-0.5 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-semibold text-warning">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-warning">{body}</p>
      </div>
      {action}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3 py-2.5 text-[11.5px]">
      <dt className="text-fg-muted">{label}</dt>
      <dd
        className="min-w-0 truncate text-right font-semibold text-fg"
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}