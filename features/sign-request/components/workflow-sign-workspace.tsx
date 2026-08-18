"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useToast } from "@/components/ui/toast";
import { StepProgress, type StepProgressItem } from "@/components/ui/step-progress";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockIcon,
  FileTextIcon,
  InfoIcon,
  PenLineIcon,
  SpinnerIcon,
  UsersIcon,
} from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import type {
  SigningRequestDetail,
  SigningRequestSignaturePlan,
  SigningRequestSigner,
} from "@/lib/types/workflow";
import type {
  DocumentFormat,
  MpkiCredential,
  SignatureSource,
  SignResponse,
} from "@/lib/types/signing";
import { errorMessage } from "@/features/signing/api";
import { getCapabilities, listMpkiCredentials } from "@/features/signing/sign-api";
import { documentFormatFromName, formatBytes } from "@/features/signing/document-format";
import { SignSessionDialog } from "@/features/signing/components/sign-session-dialog";
import { UsbTokenSignDialog } from "@/features/signing/components/usb-token-sign-dialog";
import {
  algorithmLabel,
  buildAlgorithmCatalog,
  type AlgorithmCatalog,
} from "@/features/signing/signature-algorithm";
import type { UsbTokenTransport } from "@/features/signing/usb-token-transport";
import { isLeaseLocked, isLeaseLost, isLeaseRequired } from "@/features/signing/signing-lease";
import { useSigningLease } from "@/features/signing/use-signing-lease";
import { SigningLeasePanel } from "@/features/signing/components/signing-lease-panel";
import {
  buildStartRequest,
  findSource,
  hasCredentialStep,
  isUsbToken,
  resolveFormState,
  sourceLabel,
  validateSignForm,
  type AgreementStage,
  type SignFormState,
} from "@/features/signing/sign-configuration";
import { ExternalSigningDocumentView } from "@/features/external-signing/components/external-signing-document";
import {
  ExternalSigningCredentialStep,
  ExternalSigningMethodPicker,
} from "@/features/external-signing/components/external-signing-method";
import { ActorRequiredError, useActor } from "../actor";
import { findSlot } from "../model";
import {
  myAssignments,
  recordFromDetail,
  signBlockReason,
  signerDisplayName,
  type SignBlockReason,
} from "../server-request";
import {
  adaptWorkflowSources,
  initialWorkflowSignForm,
  isAlreadyStarted,
  isDocumentChanged,
  sourceIdForMethod,
  toSignResponse,
  toWorkflowContinueRequest,
  toWorkflowSignRequest,
} from "../workflow-signing";
import { workflowUsbTokenTransport } from "../workflow-usb-token";
import { clearLeaseToken, readLeaseToken } from "../signing-lease-token";
import {
  cancelInternalSigningLease,
  fetchPdfAsFile,
  getInternalSigningLease,
  getSignaturePlan,
  getSigningRequest,
  signingRequestDocumentUrl,
  submitWorkflowSignStep,
} from "../workflow-api";

/**
 * KÝ MỘT Ô CỦA QUY TRÌNH — trang riêng, thay cho hộp thoại nhỏ trước đây.
 *
 * Vì sao là một trang chứ không phải hộp thoại: việc ký là một quyết định pháp
 * lý đọc trên một tài liệu, và một hộp thoại 640px không đủ chỗ cho chính tài
 * liệu đó. Bản cũ chỉ nói "bạn sắp ký 1 ô ở trang 3" bằng chữ — người ký phải
 * tin vào câu đó. Ở đây họ NHÌN thấy trang 3 và cái khung chữ ký nằm trên nó.
 *
 * Bố cục lấy nguyên khuôn của trang ký công khai
 * (`features/external-signing/components/external-signing-workspace.tsx`) và với
 * cùng những lý do đã ghi ở đó, nên đọc chú thích đầu file bên ấy trước:
 *
 * - Thanh tiến trình chiếm TRỌN hàng trên: nó nói về cả màn hình, không riêng
 *   khối cấu hình.
 * - Hai cột. Trái là "tôi đang ký cái gì" (tóm tắt + chính tài liệu), phải là
 *   "tôi phải làm gì" (khối cấu hình, dính theo màn hình để nút ký không trôi
 *   khỏi tầm mắt).
 * - Tài liệu KHÔNG bao giờ bị thay thế bởi bước đang làm. Người ký phải đọc lại
 *   được văn bản trong lúc điền mật khẩu chứng thư; một wizard toàn màn hình che
 *   tài liệu đi ở bước giữa là cách chắc chắn để có một chữ ký đặt vào một văn
 *   bản không ai đọc lại.
 * - Chọn nguồn và khai chứng thư là HAI bước, đúng như màn `/sign` tách `source`
 *   khỏi `credential`.
 *
 * Khác trang công khai ở ba điểm, và cả ba thuộc về QUY TRÌNH chứ không thuộc về
 * việc ký:
 *
 * 1. Danh tính là `X-Username` ở `localStorage`, không phải cookie phiên — nên
 *    mọi lời gọi chạy ở client và trang server chỉ dựng khung.
 * 2. Không có bước chọn tệp: tài liệu là bản đang nằm trong yêu cầu ký, và
 *    backend tự đọc nó ở bước START.
 * 3. Không có `sessionId`: session của engine sống ở registry phía máy chủ,
 *    khoá theo (yêu cầu, người ký). Đó cũng là lý do có nhánh "tiếp tục lượt
 *    ký" — phiên SỐNG SÓT qua một lần tải lại trang, nên sau F5 giữa lúc chờ
 *    OTP thì START chỉ nhận về 409 `SIGNING_ALREADY_STARTED`, và đường ra duy
 *    nhất là CONTINUE.
 *
 * Toàn bộ lớp chuyển đổi payload và ba nhánh 409 dùng lại NGUYÊN
 * `../workflow-signing.ts` — chúng đã chạy thật end-to-end và không có lý do gì
 * để viết lại ở đây.
 */

type StepId = "review" | "method" | "credential" | "sign";

const STEP_ORDER: StepId[] = ["review", "method", "credential", "sign"];

/**
 * Các bước THỰC SỰ hiện ra với nguồn đang chọn.
 *
 * `reachable` cộng dồn theo chiều đi tới: gặp bước đầu tiên chưa xong là khoá
 * hết phần còn lại. Nhờ vậy sửa ngược một ô ở bước trước lập tức kéo màn hình
 * lùi lại mà không cần effect nào.
 */
function buildStepViews(
  c: Dictionary["signRequest"]["workflows"]["sign"],
  source: SignatureSource | undefined,
  complete: Record<StepId, boolean>,
): (StepProgressItem & { id: StepId })[] {
  let open = true;
  return STEP_ORDER.filter(
    (id) => id !== "credential" || hasCredentialStep(source),
  ).map((id) => {
    const view = {
      id,
      label: c.steps[id].label,
      complete: complete[id],
      reachable: open,
    };
    if (!complete[id]) open = false;
    return view;
  });
}

/**
 * `stale` là nhánh của KÝ SONG SONG và cố ý tách khỏi `failed`: người cùng cấp
 * vừa ký xong nên tài liệu đổi, người này chỉ cần ký lại. `resume` là nhánh của
 * phiên còn dở — cũng không phải hỏng hóc.
 *
 * Hai nhánh của QUYỀN KÝ ĐỘC QUYỀN cũng vậy, và cũng phải tách riêng:
 *
 * - `locked` — thua cuộc đua ngay tại lệnh ký (`SIGNING_LEASE_LOCKED`). Không
 *   có gì của người này được gửi đi; đường ra là chờ, và màn hình tự mở lại.
 * - `lost` — lease của lượt ký ĐANG DỞ đã mất (`SIGNING_LEASE_LOST`). Đường ra
 *   là bắt đầu lại, và mọi thứ client còn giữ của lượt cũ phải bị bỏ trước đó.
 */
interface FlowState {
  phase: "idle" | "signing" | "failed" | "stale" | "resume" | "locked" | "lost";
  error?: unknown;
}

interface SessionState {
  source: SignatureSource;
  begin: () => Promise<SignResponse>;
}

/**
 * Lượt ký bằng USB Token đang mở.
 *
 * Giữ `algorithm` đã CHỐT lúc bấm ký chứ không đọc lại `form` trong lúc hộp
 * thoại chạy: người ký vẫn bấm được ra sau (bước "Cách ký" không bị khoá), và
 * một job đã dựng cho PKCS#1/SHA-256 thì phải ký đúng bằng thuật toán đó.
 */
interface UsbSessionState {
  source: SignatureSource;
  algorithm: string;
}

export function WorkflowSignWorkspace({
  signingRequestId,
  signerId,
}: {
  signingRequestId: string;
  /** `undefined` khi query string thiếu `signerId` — xem màn chặn `SIGNER_MISSING`. */
  signerId?: string;
}) {
  const { t } = useLocale();
  const { actor } = useActor();
  const { toast } = useToast();
  const router = useRouter();
  const c = t.signRequest.workflows.sign;

  const backHref = `/sign-request/workflows/${encodeURIComponent(signingRequestId)}`;

  const [detail, setDetail] = useState<SigningRequestDetail>();
  const [loadError, setLoadError] = useState<string>();

  const [plan, setPlan] = useState<SigningRequestSignaturePlan>();
  const [planError, setPlanError] = useState<string>();

  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState<string>();
  const [fileLoading, setFileLoading] = useState(true);
  /** Tăng lên để buộc tải lại tài liệu sau `SIGNING_DOCUMENT_CHANGED`. */
  const [documentVersion, setDocumentVersion] = useState(0);

  const [sources, setSources] = useState<SignatureSource[]>();
  const [sourcesError, setSourcesError] = useState<string>();
  const [maxUploadBytes, setMaxUploadBytes] = useState<number | null>(null);
  /** Nhãn thuật toán của backend — hộp thoại USB Token đọc lại để gọi tên job. */
  const [catalog, setCatalog] = useState<AlgorithmCatalog>();

  /** Chỉ những gì NGƯỜI DÙNG đã sửa — xem `initialForm` ngay dưới. */
  const [formEdits, setFormEdits] = useState<SignFormState>();
  const [p12File, setP12File] = useState<File>();
  const [consent, setConsent] = useState(false);
  /**
   * Bước người ký ĐANG YÊU CẦU xem, không nhất thiết là bước đang hiện: nó còn
   * bị kẹp lại theo bước xa nhất đã mở mỗi lần render.
   */
  const [requestedStep, setRequestedStep] = useState<StepId>("review");

  /**
   * Danh sách credential MPKI — sống ở đây chứ không trong khối MPKI, vì
   * `validateSignForm` cần SỐ LƯỢNG của nó: bỏ trống `credentialId` chỉ hợp lệ
   * khi người ký có đúng một credential.
   */
  const [credentials, setCredentials] = useState<MpkiCredential[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string>();
  const [agreementStage, setAgreementStage] = useState<AgreementStage>("UNKNOWN");

  const [flow, setFlow] = useState<FlowState>({ phase: "idle" });
  const [session, setSession] = useState<SessionState>();
  const [usbSession, setUsbSession] = useState<UsbSessionState>();

  /**
   * Token của lượt ký đã giành ở "Ký ngay" (Workflow Detail), đọc từ
   * `sessionStorage` — xem `signing-lease-token.ts`. Trang này KHÔNG tự giành
   * (không gọi `acquireInternalSigningLease`): thiếu token nghĩa là phiên không
   * hợp lệ, và màn chặn `LEASE_TOKEN_MISSING` phía dưới xử lý ca đó.
   */
  const [leaseToken, setLeaseToken] = useState(() => readLeaseToken(signingRequestId));

  /* ---------------------------------------------------------------- *
   * Tải dữ liệu
   * ---------------------------------------------------------------- */

  /*
   * Yêu cầu ký. Đọc lại khi `actor` đổi: quyền ký gắn với `X-Username`, nên đổi
   * danh tính có thể biến một lượt ký hợp lệ thành 403 — và ngược lại.
   */
  useEffect(() => {
    const controller = new AbortController();

    getSigningRequest(signingRequestId, controller.signal)
      .then((result) => {
        setDetail(result);
        setLoadError(undefined);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setDetail(undefined);
        setLoadError(
          error instanceof ActorRequiredError
            ? t.signRequest.actor.requiredHint
            : errorMessage(error, c.loadFailed),
        );
      });

    return () => controller.abort();
  }, [signingRequestId, actor, c.loadFailed, t.signRequest.actor.requiredHint]);

  const signer = useMemo(
    () => detail?.signers.find((item) => item.signerId === signerId),
    [detail, signerId],
  );

  /*
   * Khung chữ ký của chính người này.
   *
   * Không đặt state nào TRƯỚC lời gọi (kể cả xoá lỗi cũ): hàm này chạy thẳng
   * trong thân effect, và một setState đồng bộ ở đó là một vòng render thừa.
   */
  const loadPlan = useCallback(
    (signal?: AbortSignal) => {
      if (!signerId) return;
      getSignaturePlan(signingRequestId, signerId, signal)
        .then((result) => {
          setPlan(result);
          setPlanError(undefined);
        })
        .catch((error) => {
          if (signal?.aborted) return;
          setPlanError(
            error instanceof ActorRequiredError
              ? t.signRequest.actor.requiredHint
              : errorMessage(error, c.planFailed),
          );
        });
    },
    [signingRequestId, signerId, c.planFailed, t.signRequest.actor.requiredHint],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadPlan(controller.signal);
    return () => controller.abort();
  }, [loadPlan, documentVersion]);

  /*
   * Chính tài liệu, tải thành `File` để `ExternalSigningDocumentView` vẽ được.
   *
   * Endpoint đòi `X-Username` nên không trỏ thẳng `<embed src>` vào được — phải
   * fetch kèm header rồi dựng blob (xem `fetchPdfAsFile`).
   */
  useEffect(() => {
    if (!detail) return;
    const controller = new AbortController();
    const name = detail.document.fileName;

    fetchPdfAsFile(
      signingRequestDocumentUrl(signingRequestId),
      name,
      true,
      controller.signal,
    )
      .then((result) => {
        setFile(result);
        setFileError(undefined);
        setFileLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setFileError(errorMessage(error, c.loadFailed));
        setFileLoading(false);
      });

    return () => controller.abort();
  }, [detail, signingRequestId, documentVersion, c.loadFailed]);

  const documentFormat: DocumentFormat | undefined = detail
    ? documentFormatFromName(detail.document.fileName)
    : undefined;

  /*
   * Nguồn chữ ký. Chốt theo lần MỞ TRANG: chọn sẵn cần `slotConfig`, mà object
   * đó được dựng lại mỗi lần `detail` thay đổi — đưa nó vào deps là reset form
   * của người đang điền dở mỗi lần đọc lại yêu cầu.
   */
  const slotConfig = useMemo(() => {
    if (!detail || !signerId) return undefined;
    const record = recordFromDetail(detail);
    return findSlot(record.steps, signerId)?.slot.config;
  }, [detail, signerId]);

  /* Nguồn chữ ký — xem `adaptWorkflowSources` cho phần bị cắt và phần thêm vào. */
  useEffect(() => {
    const controller = new AbortController();

    getCapabilities({ signal: controller.signal })
      .then((capabilities) => {
        setSources(adaptWorkflowSources(capabilities));
        setCatalog(buildAlgorithmCatalog(capabilities));
        setMaxUploadBytes(capabilities.maxUploadBytes ?? null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setSourcesError(errorMessage(error, c.capabilitiesFailed));
      });

    return () => controller.abort();
  }, [c.capabilitiesFailed]);

  /**
   * Trạng thái form BAN ĐẦU, tính ra chứ không đặt vào state.
   *
   * Vì sao không `setForm(...)` ngay khi capabilities về: form phụ thuộc vào ba
   * thứ đến từ ba lời gọi khác nhau (nguồn, cấu hình ô của người soạn, định dạng
   * tài liệu), và đồng bộ chúng vào state bằng effect là cách chắc chắn để có
   * một vòng render thừa cộng một cuộc đua — ai về sau thì ghi đè người về
   * trước. Tính ra ở đây thì mỗi lần render chỉ có MỘT câu trả lời đúng.
   *
   * Phương thức người soạn ghi vào ô chỉ để CHỌN SẴN, không để khoá: người soạn
   * đoán phương thức của người khác, còn người ký mới biết mình cầm chứng thư
   * loại nào. Nguồn đó không có trong danh sách thì lấy nguồn đầu tiên.
   */
  const initialForm = useMemo(() => {
    if (!sources) return undefined;
    const preferred =
      sources.find(
        (item) => item.id === (slotConfig ? sourceIdForMethod(slotConfig.method) : undefined),
      ) ?? sources[0];
    return preferred
      ? initialWorkflowSignForm(preferred, slotConfig, documentFormat)
      : undefined;
  }, [sources, slotConfig, documentFormat]);

  /*
   * Bản của người dùng thắng bản tính ra. `formEdits` chỉ có giá trị sau thao
   * tác ĐẦU TIÊN của họ, nên trước đó màn hình luôn khớp với dữ liệu vừa về, và
   * sau đó không lời gọi nào ghi đè được thứ họ đã gõ.
   */
  const form = formEdits ?? initialForm;

  /* ---------------------------------------------------------------- *
   * Form
   * ---------------------------------------------------------------- */

  const source = sources && form ? findSource(sources, form.sourceId) : undefined;

  const updateForm = useCallback(
    <K extends keyof SignFormState>(key: K, value: SignFormState[K]) => {
      setFormEdits((current) => {
        const base = current ?? initialForm;
        return base ? { ...base, [key]: value } : base;
      });
    },
    [initialForm],
  );

  function changeSource(sourceId: string) {
    const next = sources ? findSource(sources, sourceId) : undefined;
    if (!next) return;
    setFormEdits((current) =>
      resolveFormState(next, current ?? initialForm, documentFormat),
    );
    setFlow({ phase: "idle" });
  }

  /**
   * Credential MPKI của người ký. Chỉ chọn sẵn khi có ĐÚNG một — nhiều hơn thì
   * để trống, vì chọn nhầm là ký nhầm một danh tính pháp lý.
   */
  async function loadCredentials() {
    const username = form?.mpkiUsername.trim();
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

  const resetMpkiCredentials = useCallback(() => {
    setCredentials([]);
    setCredentialsError(undefined);
    setCredentialsLoading(false);
  }, []);

  /*
   * Cùng bộ kiểm với màn `/sign`, trừ bước "tài liệu": ở đây không có tệp nào
   * để chọn, nên `byStep.document` bị bỏ qua.
   */
  const validation = validateSignForm({
    source,
    form,
    // Định dạng vẫn truyền vào: nó quyết định danh sách thuật toán hợp lệ, và
    // một nguồn không ký được định dạng này phải bị chặn TRƯỚC khi bấm ký.
    format: documentFormat,
    p12File,
    maxUploadBytes,
    credentialCount: credentials.length,
    agreementStage,
    formatBytes,
    messages: t.sign.validation,
  });

  const sourceReady =
    Boolean(form?.sourceId) && (validation.byStep.source?.length ?? 0) === 0;
  const credentialReady = (validation.byStep.credential?.length ?? 0) === 0;

  /* ---------------------------------------------------------------- *
   * Màn chặn
   * ---------------------------------------------------------------- */

  /**
   * Vì sao KHÔNG ký được — tính trước khi dựng bất cứ thứ gì của form.
   *
   * Chặn ở đây thay vì để người dùng điền xong mật khẩu chứng thư rồi mới ăn
   * 403: mỗi lý do có một câu trả lời khác nhau, và câu trả lời đó là thứ duy
   * nhất giúp họ biết phải làm gì tiếp.
   */
  const blocked:
    | SignBlockReason
    | "SIGNER_MISSING"
    | "SIGNER_NOT_FOUND"
    | "NOT_A_SIGNER"
    | "LEASE_TOKEN_MISSING"
    | undefined =
    !signerId
      ? "SIGNER_MISSING"
      : !detail
        ? undefined
        : !signer
          ? // Người ký có tồn tại trong yêu cầu không, và có phải LÀ MÌNH không
            // — hai câu hỏi khác nhau, hai câu trả lời khác nhau.
            myAssignments(detail, actor).length === 0
            ? "NOT_A_SIGNER"
            : "SIGNER_NOT_FOUND"
          : signer.userId !== actor
            ? "NOT_A_SIGNER"
            : /*
               * Trang này KHÔNG tự giành lease (xem khai báo `leaseToken` phía
               * trên) — chỉ đọc token đã giành ở "Ký ngay". Thiếu token mà
               * không vướng lý do nào khác ở trên nghĩa là phiên này không hợp
               * lệ: mở thẳng URL, token đã bị xoá (hết hạn/mất chủ), hoặc
               * `sessionStorage` của tab này chưa từng có nó.
               */
              (signBlockReason(detail, signer) ??
                (leaseToken ? undefined : "LEASE_TOKEN_MISSING"));

  /* ---------------------------------------------------------------- *
   * Quyền ký độc quyền
   * ---------------------------------------------------------------- */

  /**
   * MỘT máy trạng thái lease cho cả trang — không phải một cái cho mỗi phương
   * thức ký. Lease thuộc về YÊU CẦU KÝ chứ không thuộc về cách ký: PKCS#12,
   * MPKI, eSign Cloud và USB Token cùng tranh nhau đúng một quyền. Xem
   * `features/signing/use-signing-lease.ts`.
   *
   * `actor` nằm trong deps vì `actorHeaders()` đọc `X-Username` từ
   * `localStorage` ngay lúc gọi: đổi danh tính là đổi hẳn câu trả lời —
   * `HELD_BY_YOU` của người này là `LOCKED` của người kia.
   */
  const leaseTransport = useMemo(
    () => ({
      get: (signal?: AbortSignal) => getInternalSigningLease(signingRequestId, signal),
      cancel: (signal?: AbortSignal) =>
        cancelInternalSigningLease(signingRequestId, leaseToken, signal),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `actor` đổi thì phải đọc lại lease dưới danh tính mới
    [signingRequestId, actor, leaseToken],
  );

  /*
   * Tắt ở mọi màn chặn: chưa tới lượt, đã ký, không phải người ký, yêu cầu đã
   * huỷ. Ở những màn đó không có nút Ký nào để mở, và lời gọi lease chỉ là một
   * lời gọi chắc chắn bị từ chối.
   */
  const lease = useSigningLease({
    transport: leaseTransport,
    enabled: Boolean(detail && signer) && !blocked,
    leaseKey: `${signingRequestId}:${signerId ?? ""}:${actor}`,
  });

  const { refreshLease } = lease;

  /* ---------------------------------------------------------------- *
   * Ký
   * ---------------------------------------------------------------- */

  /**
   * Bỏ MỌI thứ client còn giữ của lượt ký đang dở.
   *
   * Đóng hộp thoại là đủ, và đó là điều đáng nói: `jobId` cùng digest của USB
   * Token sống trong state của chính `UsbTokenSignDialog`, nên chúng chết theo
   * lần unmount này. Không có bản sao nào ở ngoài — và cũng đừng tạo ra, vì lúc
   * đó sẽ có hai chỗ phải nhớ xoá.
   */
  const forgetAttempt = useCallback(() => {
    setSession(undefined);
    setUsbSession(undefined);
  }, []);

  /**
   * Ký xong thì VỀ MÀN QUY TRÌNH, không ở lại một màn "hoàn tất" riêng.
   *
   * Lý do: sau chữ ký, câu hỏi của người ký đổi hẳn — từ "tôi ký thế nào" sang
   * "giờ tới ai, bao giờ xong". Màn quy trình trả lời đúng câu đó và tự đọc lại
   * trạng thái mới, trong khi trang này sau khi ký chỉ còn là một màn chặn
   * "bạn đã ký phần này rồi". Bản đã ký cũng không mất gì: backend đã ghi nó
   * vào kho tài liệu của yêu cầu (`replaceDocument`), nên nó tải về được từ
   * chính màn quy trình — `response.document` chỉ là một bản tiện tay.
   */
  const applyCompleted = useCallback(() => {
    setSession(undefined);
    setUsbSession(undefined);
    /*
     * Backend tự giải phóng lease khi hoàn tất — frontend chỉ cần xoá bản cục
     * bộ, không gọi thêm `DELETE` nào: gọi thừa ở đây là chạy đúng vào cửa sổ
     * mà lease đã được backend trao cho lượt ký KẾ TIẾP.
     */
    clearLeaseToken(signingRequestId);
    setLeaseToken(undefined);
    /*
     * Đọc lại lease ngay: ký xong là backend giải phóng nó, và người cùng cấp
     * đang chờ ở tab của họ phải thấy `AVAILABLE` chứ không phải chờ hết một
     * nhịp poll. Màn quy trình (nơi trang này điều hướng tới) tự đọc lại yêu
     * cầu, tài liệu và trạng thái người ký, nên ở đây chỉ còn lease.
     */
    void refreshLease();
    toast.success(c.signedTitle, c.signedBody);
    router.push(backHref);
  }, [toast, c.signedTitle, c.signedBody, router, backHref, refreshLease, signingRequestId]);

  /**
   * Bọc một lượt ký đi qua hộp thoại: cả `SignSessionDialog` lẫn
   * `UsbTokenSignDialog` đều tự nuốt lỗi vào khối lỗi của mình, nên hai xung đột
   * có đường ra riêng phải được chặn TRƯỚC khi tới đó. Vẫn ném tiếp để hộp thoại
   * dừng máy trạng thái của nó lại.
   *
   * Hộp thoại bị ĐÓNG ở cả hai nhánh: câu trả lời cho chúng (tải lại tài liệu
   * rồi ký lại / nối lại lượt đang mở) nằm trên trang chứ không nằm trong hộp
   * thoại, và để nó mở kèm một lỗi đỏ chỉ che mất chính câu trả lời đó.
   */
  function guardConflicts<T>(run: () => Promise<T>): Promise<T> {
    return run().catch((cause: unknown) => {
      applyConflict(cause);
      throw cause;
    });
  }

  /**
   * Bốn xung đột 409, mỗi cái một đường ra — và TẤT CẢ đều đọc lại lease sau đó.
   *
   * Vì sao đọc lại ở cả bốn: mỗi mã này đều nói rằng thứ client đang tin về
   * quyền ký của mình đã lệch với backend. Cái duy nhất sửa được chỗ lệch đó là
   * hỏi lại, và hỏi ngay thì người ký không phải chờ hết một nhịp poll để màn
   * hình nói đúng.
   *
   * KHÔNG có nhánh nào gửi lại lệnh vừa hỏng. Với eSign Cloud mỗi lần START là
   * một lượt ký bị trừ, nên quyết định thử lại luôn thuộc về người dùng.
   *
   * Trả về `true` khi đã nhận diện được — nơi gọi dùng nó để không rơi tiếp
   * xuống nhánh "ký thất bại".
   */
  function applyConflict(cause: unknown): boolean {
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
       * Lượt ký đang dở không còn hợp lệ. Bỏ hết trước khi hiện gì lên màn
       * hình: phiên engine của eSign Cloud, `jobId` + digest của USB Token, hộp
       * thoại OTP đang mở — tất cả đều gắn với một lease đã chết, và nối tiếp
       * chúng chỉ làm người ký tưởng mình vẫn đang trong một lượt ký còn sống.
       *
       * Token cục bộ cũng bị xoá ngay: nó không còn đại diện cho quyền ký nào
       * nữa, và giữ lại chỉ tạo ra một request kế tiếp mang token chết.
       */
      forgetAttempt();
      clearLeaseToken(signingRequestId);
      setLeaseToken(undefined);
      setFlow({ phase: "lost", error: cause });
      void refreshLease();
      return true;
    }

    if (isLeaseRequired(cause)) {
      /*
       * Client gửi lệnh ký mà KHÔNG có token — cục bộ đã mất nó trước khi lệnh
       * kịp đi (token bị xoá ở tab khác, hoặc chưa từng có). Xoá cho chắc rồi
       * để `blocked` (tính lại ở lần render sau) tự chuyển sang màn
       * `LEASE_TOKEN_MISSING` — không cần một `flow.phase` riêng cho ca này.
       */
      forgetAttempt();
      clearLeaseToken(signingRequestId);
      setLeaseToken(undefined);
      return true;
    }

    if (isDocumentChanged(cause)) {
      forgetAttempt();
      setDocumentVersion((value) => value + 1);
      setFlow({ phase: "stale", error: cause });
      void refreshLease();
      return true;
    }

    if (isAlreadyStarted(cause)) {
      // Chính người này đã có một lượt ký đang mở (hai tab, hoặc F5 giữa lúc
      // chờ OTP). Lease sẽ trả `HELD_BY_YOU`, và màn hình có hai đường ra: nối
      // lại lượt cũ, hoặc huỷ nó đi.
      forgetAttempt();
      setFlow({ phase: "resume", error: cause });
      void refreshLease();
      return true;
    }

    return false;
  }

  /**
   * Huỷ lượt ký đang mở rồi đọc lại trạng thái.
   *
   * Thứ tự quan trọng: bỏ trạng thái cục bộ TRƯỚC khi gọi DELETE. Gọi trước rồi
   * mới dọn là để lại một cửa sổ mà hộp thoại cũ vẫn mở trên một lượt ký backend
   * đã đóng — và trong cửa sổ đó người ký vẫn bấm được nút "tiếp tục".
   *
   * Không tự START lại sau khi huỷ: `cancelLease` đọc lại lease, và chỉ khi nó
   * về `AVAILABLE` thì nút Ký mới mở lại — do chính người ký bấm.
   */
  async function cancelAttempt() {
    forgetAttempt();
    setFlow({ phase: "idle" });
    /*
     * Không có token cục bộ thì không có gì của CHÍNH lượt này để trả lại — một
     * `DELETE` không token là một `DELETE` mù, có thể đụng vào lượt ký của
     * người khác nếu backend không đủ nghiêm. Chỉ đọc lại lease để màn hình
     * theo kịp trạng thái thật.
     */
    if (!leaseToken) {
      void refreshLease();
      return;
    }
    await lease.cancelLease();
    clearLeaseToken(signingRequestId);
    setLeaseToken(undefined);
  }

  /**
   * `UsbTokenTransport` với cùng bộ chặn 409 đó.
   *
   * Cả hai bước đều cần: `prepare` gặp `SIGNING_ALREADY_STARTED` khi người ký đã
   * có một phiên khác đang mở, còn `complete` gặp `SIGNING_DOCUMENT_CHANGED` khi
   * có người ký chen vào giữa lúc chờ PIN — backend huỷ job đúng ở chỗ đó.
   */
  function guardUsbConflicts(transport: UsbTokenTransport): UsbTokenTransport {
    return {
      prepare: (certificate, signal) =>
        guardConflicts(() => transport.prepare(certificate, signal)),
      complete: (jobId, payload, signal) =>
        guardConflicts(() => transport.complete(jobId, payload, signal)),
    };
  }

  function continueStep(active: SignatureSource): Promise<SignResponse> {
    return submitWorkflowSignStep(
      signingRequestId,
      toWorkflowContinueRequest(active.materialMode, active.vendor),
    ).then(toSignResponse);
  }

  async function runInline(active: SignatureSource, begin: () => Promise<SignResponse>) {
    setFlow({ phase: "signing" });
    try {
      const response = await begin();
      if (response.status === "COMPLETED") {
        applyCompleted();
        return;
      }
      // Nguồn khai `NONE` nhưng vẫn mở phiên: tin phản hồi, không tin khai báo.
      setSession({ source: active, begin: async () => response });
      setFlow({ phase: "idle" });
    } catch (cause) {
      if (applyConflict(cause)) return;
      setFlow({ phase: "failed", error: cause });
    }
  }

  function startSigning() {
    if (!canSign || !source || !form || !detail) return;

    /*
      USB Token KHÔNG đi qua `POST …/sign`: khoá riêng nằm trong thiết bị cắm ở
      máy người ký, nên không có bước START nào backend tự ký được. Hộp thoại
      chạy trọn luồng riêng — dựng digest ở `…/sign/usb-token/prepare`, gọi agent
      trên máy người ký, rồi nộp chữ ký ở `…/complete`.
    */
    if (isUsbToken(source)) {
      setFlow({ phase: "idle" });
      setUsbSession({ source, algorithm: form.algorithm });
      return;
    }

    const payload = buildStartRequest({
      source,
      form,
      fileName: detail.document.fileName,
    });
    const request = toWorkflowSignRequest(payload);
    const begin = () =>
      submitWorkflowSignStep(signingRequestId, request, p12File, leaseToken).then(toSignResponse);

    if (source.interactionModel === "NONE") {
      void runInline(source, begin);
      return;
    }
    setFlow({ phase: "idle" });
    setSession({ source, begin });
  }

  /** Nối lại phiên engine đang mở: CONTINUE, KHÔNG phải START. */
  function resumeSigning() {
    if (!source) return;
    setFlow({ phase: "idle" });
    setSession({ source, begin: () => continueStep(source) });
  }

  /* ---------------------------------------------------------------- *
   * Màn hình
   * ---------------------------------------------------------------- */

  if (loadError) {
    return (
      <Shell backHref={backHref} backLabel={c.back}>
        <BlockedCard
          tone="danger"
          title={c.loadFailed}
          body={loadError}
          action={
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-9 rounded-md border border-border bg-surface px-3 text-[12.5px] font-semibold text-fg"
            >
              {c.retry}
            </button>
          }
        />
      </Shell>
    );
  }

  if (blocked) {
    const copy = c.blocked[blocked];
    return (
      <Shell backHref={backHref} backLabel={c.back}>
        <BlockedCard tone="warning" title={copy.title} body={copy.body} />
      </Shell>
    );
  }

  /*
   * `detail`/`signer` còn thiếu mà KHÔNG rơi vào nhánh chặn nào ở trên thì chỉ
   * còn đúng một khả năng: yêu cầu đang trên đường về. Kiểm bằng chính hai giá
   * trị đó thay vì `!detail` riêng, để TypeScript thu hẹp kiểu ở phần dưới —
   * không có `!` nào phải viết tay, và cũng không có nhánh nào bị bỏ quên.
   */
  if (!detail || !signer) {
    return (
      <Shell backHref={backHref} backLabel={c.back}>
        <p className="flex items-center gap-2 py-10 text-[12.5px] text-fg-muted">
          <SpinnerIcon size={14} className="animate-spin" />
          {c.loading}
        </p>
      </Shell>
    );
  }

  const steps = buildStepViews(c, source, {
    review: consent,
    method: sourceReady,
    credential: credentialReady,
    // Bước cuối "xong" là đã ký thật, và lúc đó trang đã điều hướng đi rồi.
    sign: false,
  });

  const furthest = steps.reduce((last, view, index) => (view.reachable ? index : last), 0);
  const requestedIndex = steps.findIndex((view) => view.id === requestedStep);
  const stepIndex = Math.min(requestedIndex < 0 ? furthest : requestedIndex, furthest);
  const step = steps[stepIndex].id;
  const activeStep = c.steps[step];

  const blockers =
    step === "method"
      ? validation.byStep.source
      : step === "credential"
        ? validation.byStep.credential
        : [];

  /*
   * Trang này đã VÀO đây với một token hợp lệ (không thì `blocked` đã chặn ở
   * trên) — nghĩa là chính token đó là quyền ký, chứ không phải trạng thái
   * `AVAILABLE` của `GET`. `HELD_BY_YOU` là điều BÌNH THƯỜNG trong suốt lượt ký
   * này (chính token đang giữ), không còn là dấu hiệu "còn một lượt khác đang
   * mở" như ở màn `GET`-only trước đây — nên nó bị che khỏi khối hiển thị lease
   * để không hiện nhầm "huỷ lượt cũ để bắt đầu lại" giữa một lượt hoàn toàn hợp
   * lệ.
   */
  const displayLease =
    lease.lease?.state === "HELD_BY_YOU" && leaseToken
      ? { ...lease.lease, state: "AVAILABLE" as const }
      : lease.lease;

  /**
   * Quyền ký độc quyền, dịch sang một câu người ký làm được gì với nó.
   *
   * `LOCKED` vẫn chặn — token của trang này không đổi được việc có người khác
   * đang giữ lease. Không còn nhánh `HELD_BY_YOU`: xem `displayLease` ở trên.
   */
  const leaseBlockedReason = lease.leaseError
    ? t.signingLease.action.unavailable
    : lease.isLeaseLoading
      ? t.signingLease.action.checking
      : displayLease?.state === "LOCKED"
        ? t.signingLease.action.locked
        : undefined;

  /* Lý do khoá nút ký, xếp theo thứ tự người ký xử lý được. */
  const blockedReason = !consent
    ? c.action.needConsent
    : !form?.sourceId
      ? c.action.needMethod
      : fileLoading
        ? c.action.reloadingDocument
        : !sourceReady || !credentialReady
          ? (validation.byStep.credential[0] ??
            validation.byStep.source[0] ??
            c.action.needFields)
          : leaseBlockedReason;

  const busy =
    flow.phase === "signing" ||
    Boolean(session) ||
    Boolean(usbSession) ||
    lease.isLeaseCancelling;

  /*
   * `leaseToken` viết lại tường minh dù `blockedReason` đã bao gồm nó (qua màn
   * chặn `LEASE_TOKEN_MISSING`): đây là chốt chặn cuối trước một lệnh START, và
   * một điều kiện quan trọng đến thế không nên phụ thuộc vào việc chuỗi ba ngôi
   * phía trên còn đúng thứ tự hay không. KHÔNG dùng `lease.canStartSigning`
   * nữa — nó đòi `AVAILABLE`, mà trạng thái BÌNH THƯỜNG ở đây là `HELD_BY_YOU`
   * (chính token này đang giữ).
   */
  const canSign =
    !blockedReason && !busy && Boolean(leaseToken) && Boolean(source && form);

  const usbSelected = isUsbToken(source);

  /*
   * Khối "lượt ký chưa xong" của bước cuối chỉ hiện khi lease CHƯA nói điều đó.
   * Khi `displayLease` trả `HELD_BY_YOU` THẬT (không phải bị che vì là chính
   * token của trang này), khối trạng thái lượt ký phía trên đã mang đúng hai
   * nút này rồi — hiện thêm một bản nữa là hỏi cùng một câu hai lần.
   */
  const showResumeNotice =
    flow.phase === "resume" && displayLease?.state !== "HELD_BY_YOU";

  const loadingSources = !sources && !sourcesError;

  return (
    <Shell backHref={backHref} backLabel={c.back}>
      <div className="space-y-4">
        <header>
          <h1 className="text-[15px] font-semibold text-fg">{c.title}</h1>
          <p className="mt-0.5 text-[12px] text-fg-muted">
            {c.subtitle(signerDisplayName(signer), detail.document.fileName)}
          </p>
        </header>

        <StepProgress
          steps={steps}
          activeIndex={stepIndex}
          onSelect={(id) => setRequestedStep(id as StepId)}
          navLabel={c.steps.navLabel}
          stepOfLabel={c.steps.stepOf}
          lockedHint={c.steps.lockedHint}
        />

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_23.5rem]">
          <div className="flex min-w-0 flex-col gap-3">
            <DocumentSummary c={c} detail={detail} signer={signer} />

            {/*
              Bản xem tài liệu dùng lại NGUYÊN component của trang ký công khai:
              toạ độ của signature plan là PDF points gốc DƯỚI-TRÁI — cùng quy
              ước với `PublicSignatureSlot` mà nó đang nhận — nên overlay khớp
              mà không phải quy đổi gì. (Đừng nhầm với quy ước 0..1 gốc TRÊN-TRÁI
              của `SigningRequestSlot` ở phần soạn mẫu.)
            */}
            <ExternalSigningDocumentView
              t={t}
              file={file}
              slots={plan?.signatures ?? []}
              loading={fileLoading}
              errorTitle={fileError}
              onRetry={() => {
                setFileLoading(true);
                setDocumentVersion((value) => value + 1);
              }}
            />
          </div>

          <aside className="min-w-0 lg:sticky lg:top-19">
            <section className="rounded-lg border border-border bg-surface shadow-sm">
              <header className="border-b border-border-muted px-4 py-3">
                <h2 className="text-[13.5px] font-semibold text-fg">{activeStep.title}</h2>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-muted">
                  {activeStep.description}
                </p>
              </header>

              <div className="space-y-3 px-4 py-3.5">
                {/*
                  Trạng thái lượt ký đứng TRƯỚC nội dung của bước, và ở MỌI bước
                  chứ không riêng bước cuối: biết "đang có người khác ký" từ lúc
                  còn đang đọc tài liệu thì người ký không phải điền hết một form
                  dài rồi mới gặp một cái nút tắt.

                  `showHolder` bật ở màn nội bộ: người đọc vốn đã thấy danh sách
                  người ký của quy trình, nên `holderLabel` không tiết lộ gì mới.
                  Màn ký công khai thì không — xem `SigningLeasePanel`.
                */}
                <SigningLeasePanel
                  copy={t.signingLease}
                  lease={displayLease}
                  loading={lease.isLeaseLoading}
                  error={lease.leaseError}
                  cancelling={lease.isLeaseCancelling}
                  showHolder
                  heldBody={usbSelected ? c.resumeUsbBody : undefined}
                  onRetry={() => void refreshLease()}
                  onCancel={busy ? undefined : () => void cancelAttempt()}
                  /*
                    Nối lại lượt ký đang mở = `step=CONTINUE` của `POST …/sign`.
                    USB Token KHÔNG đi qua endpoint đó — phiên của nó giữ digest
                    của một tài liệu đã dựng sẵn, và chỉ chính tab đã dựng nó mới
                    ký xong được. Bày một nút chắc chắn trả lỗi ra thì tệ hơn là
                    nói thẳng phải chờ, nên với USB Token chỉ còn nút huỷ.
                  */
                  onResume={busy || usbSelected || !source ? undefined : resumeSigning}
                  resumeLabel={c.resume}
                />

                {step === "review" ? (
                  <>
                    <PlanBlock
                      c={c}
                      plan={plan}
                      error={planError}
                      onRetry={() => loadPlan()}
                    />
                    <ConsentCard c={c} consent={consent} onChange={setConsent} />
                  </>
                ) : null}

                {step === "method" ? (
                  <>
                    {sourcesError ? (
                      <Notice
                        tone="danger"
                        title={c.capabilitiesFailed}
                        body={sourcesError}
                      />
                    ) : null}

                    {loadingSources ? (
                      <p className="flex items-center gap-2 py-4 text-[12px] text-fg-muted">
                        <SpinnerIcon size={14} className="animate-spin" />
                        {c.capabilitiesLoading}
                      </p>
                    ) : null}

                    {sources && form ? (
                      <ExternalSigningMethodPicker
                        t={t}
                        form={form}
                        sources={sources}
                        note={c.methodNote}
                        documentFormat={documentFormat}
                        disabled={busy}
                        onSelectSource={changeSource}
                      />
                    ) : null}
                  </>
                ) : null}

                {step === "credential" && form ? (
                  <ExternalSigningCredentialStep
                    t={t}
                    source={source}
                    form={form}
                    p12File={p12File}
                    disabled={busy}
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
                    c={c}
                    leaseCopy={t.signingLease}
                    flow={flow}
                    source={source}
                    form={form}
                    documentName={detail.document.fileName}
                    onResume={resumeSigning}
                    showResumeNotice={showResumeNotice}
                    onCancelAttempt={() => void cancelAttempt()}
                    cancelling={lease.isLeaseCancelling}
                    catalog={catalog}
                  />
                ) : null}

                {/*
                  Vì sao nút "Tiếp tục" đang tắt — đọc thẳng từ `validateSignForm`,
                  lọc xuống đúng bước đang đứng. Bước cuối không cần: câu chặn của
                  nó đã nằm ngay dưới nút ký.
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
                    disabled={busy}
                    onClick={() => setRequestedStep(steps[stepIndex - 1].id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12.5px] font-semibold text-fg disabled:opacity-40"
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
                      onClick={startSigning}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent bg-accent text-[14px] font-bold text-accent-fg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? (
                        <SpinnerIcon size={16} className="animate-spin" />
                      ) : (
                        <PenLineIcon size={16} />
                      )}
                      {busy ? c.signing : c.sign}
                    </button>
                    {blockedReason && !busy ? (
                      <p className="mt-1.5 text-center text-[11px] text-warning">
                        {blockedReason}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!steps[stepIndex + 1]?.reachable}
                    title={
                      steps[stepIndex + 1]?.reachable ? undefined : c.steps.lockedHint
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
      </div>

      {/*
        Màn chờ của hai luồng không kết thúc trong một request — dùng lại NGUYÊN
        hộp thoại của màn `/sign`: cùng cơ chế mở popup xác nhận danh tính/OTP,
        cùng nhịp tự tiếp tục đúng một lần khi popup đóng lại.

        `continueSession` bỏ qua tham số `sessionId` mà hộp thoại truyền vào: ở
        luồng này id đó luôn rỗng, phiên nằm trong registry của máy chủ.
      */}
      {session ? (
        <SignSessionDialog
          t={t}
          fileName={detail.document.fileName}
          sourceName={sourceLabel(session.source)}
          interactionModel={session.source.interactionModel}
          timeoutSeconds={session.source.expectedWaitSeconds}
          agreementReady={agreementStage === "READY"}
          begin={() => guardConflicts(session.begin)}
          continueSession={() => guardConflicts(() => continueStep(session.source))}
          onPending={() => undefined}
          onCompleted={applyCompleted}
          onClose={() => setSession(undefined)}
        />
      ) : null}

      {/*
        USB Token — hộp thoại NGUYÊN BẢN của màn `/sign`. Nó tự chạy cả năm chặng
        (kết nối agent, chọn chứng thư, dựng digest, chờ PIN, nộp chữ ký), nên ở
        đây chỉ có hai endpoint của quy trình được đưa vào, kèm bộ chặn 409 dùng
        chung với lệnh ký thường.

        `onCompleted` bỏ qua tệp đã ký trong phản hồi: backend đã ghi bản đó vào
        tài liệu của yêu cầu rồi, và màn quy trình mới là chỗ trả lời câu hỏi
        tiếp theo của người ký — giờ tới ai, bao giờ xong.
      */}
      {usbSession ? (
        <UsbTokenSignDialog
          t={t}
          fileName={detail.document.fileName}
          sourceName={sourceLabel(usbSession.source)}
          transport={guardUsbConflicts(
            workflowUsbTokenTransport({
              signingRequestId,
              algorithm: usbSession.algorithm,
              catalog,
              leaseToken,
            }),
          )}
          catalog={catalog}
          onCompleted={applyCompleted}
          onClose={() => setUsbSession(undefined)}
        />
      ) : null}
    </Shell>
  );
}

/* ------------------------------------------------------------------ *
 * Mảnh giao diện
 * ------------------------------------------------------------------ */

function Shell({
  backHref,
  backLabel,
  children,
}: {
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href={backHref}
        className="inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12px] font-semibold text-fg hover:bg-inset"
      >
        <ArrowLeftIcon size={13} />
        {backLabel}
      </Link>
      {children}
    </div>
  );
}

type SignCopy = Dictionary["signRequest"]["workflows"]["sign"];

/**
 * "Bạn sắp ký mấy ô, ở trang nào."
 *
 * Không tải được plan cũng KHÔNG chặn việc ký — backend đọc lại plan của chính
 * nó — nên khối này chỉ báo lỗi kèm nút thử lại. Overlay trên tài liệu vắng mặt
 * lúc đó, và đấy đã là mất mát đủ để người ký biết có gì chưa ổn.
 */
function PlanBlock({
  c,
  plan,
  error,
  onRetry,
}: {
  c: SignCopy;
  plan?: SigningRequestSignaturePlan;
  error?: string;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <Notice
        tone="warning"
        title={c.planFailed}
        body={error}
        action={
          <button
            type="button"
            onClick={onRetry}
            className="h-8 shrink-0 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-fg"
          >
            {c.planRetry}
          </button>
        }
      />
    );
  }

  if (!plan) {
    return (
      <p className="flex items-center gap-2 text-[11.5px] text-fg-muted">
        <SpinnerIcon size={13} className="animate-spin" />
        {c.planLoading}
      </p>
    );
  }

  const pages = [...new Set(plan.signatures.map((slot) => slot.page))].sort((a, b) => a - b);

  return (
    <section className="rounded-md border border-border-muted bg-surface-2 p-3">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
        {c.planTitle}
      </h3>
      <p className="mt-1.5 text-[12px] font-semibold text-fg">
        {plan.signatures.length === 0
          ? c.planEmpty
          : c.planSummary(plan.signatures.length, pages)}
      </p>
      <p className="mt-1 text-[10.5px] leading-relaxed text-fg-muted">{c.planHint}</p>
    </section>
  );
}

/**
 * Ô đồng ý.
 *
 * Là một checkbox THẬT chứ không phải một nút giả lập: đây là mảnh giao diện
 * mang ý nghĩa pháp lý trên cả trang, và nó phải hoạt động với bàn phím, với
 * trình đọc màn hình và với mọi thứ trình duyệt đã biết làm.
 */
function ConsentCard({
  c,
  consent,
  onChange,
}: {
  c: SignCopy;
  consent: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-2.5">
      <p className="flex gap-1.5 text-[11.5px] leading-relaxed text-fg-muted">
        <PenLineIcon size={13} className="mt-0.5 shrink-0 text-fg-subtle" />
        {c.consent.scrollNote}
      </p>

      <label
        className={`flex cursor-pointer gap-2.5 rounded-lg border p-3 transition-colors ${
          consent ? "border-success bg-success-subtle" : "border-border bg-surface-2"
        }`}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-success"
        />
        <span>
          <span className="block text-[12.5px] font-semibold text-fg">
            {c.consent.checkbox}
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-fg-muted">
            {c.consent.hint}
          </span>
        </span>
      </label>
    </div>
  );
}

/** Bước cuối: nhắc lại đúng những gì sắp được gửi đi, rồi tới nút ký. */
function SignPanel({
  c,
  leaseCopy,
  flow,
  source,
  form,
  documentName,
  onResume,
  showResumeNotice,
  onCancelAttempt,
  cancelling,
  catalog,
}: {
  c: SignCopy;
  leaseCopy: Dictionary["signingLease"];
  flow: FlowState;
  source?: SignatureSource;
  form?: SignFormState;
  documentName: string;
  onResume: () => void;
  showResumeNotice: boolean;
  onCancelAttempt: () => void;
  cancelling: boolean;
  catalog?: AlgorithmCatalog;
}) {
  const usb = isUsbToken(source);

  return (
    <div className="space-y-3">
      {flow.phase === "stale" ? (
        <Notice tone="warning" title={c.staleTitle} body={c.staleBody} />
      ) : null}

      {/*
        Thua cuộc đua ngay tại lệnh ký. Khối này nói một điều mà khối trạng thái
        lượt ký phía trên KHÔNG nói được: cú bấm vừa rồi không gửi đi được gì cả.
        Trạng thái chờ và nhịp tự cập nhật thì đọc ở khối kia.
      */}
      {flow.phase === "locked" ? (
        <Notice
          tone="warning"
          title={leaseCopy.lockedNowTitle}
          body={leaseCopy.lockedNowBody}
        />
      ) : null}

      {/*
        Lease của lượt ký đang dở đã mất. Mọi thứ của lượt đó đã bị bỏ trước khi
        khối này hiện ra (xem `applyConflict`), nên ở đây KHÔNG có nút "tiếp
        tục" — nối lại một lượt ký không còn tồn tại chỉ nhận về đúng lỗi này.
      */}
      {flow.phase === "lost" ? (
        <Notice tone="danger" title={leaseCopy.lostTitle} body={leaseCopy.lostBody} />
      ) : null}

      {/*
        Lượt ký đang mở. Với USB Token KHÔNG có nút nối lại: "tiếp tục" ở đây là
        `step=CONTINUE` của `POST …/sign`, mà luồng USB Token không đi qua
        endpoint đó — phiên đang giữ digest của một tài liệu đã dựng sẵn, và chỉ
        chính tab đã dựng nó mới ký xong được. Bày một nút chắc chắn trả lỗi ra
        thì tệ hơn là nói thẳng phải chờ.
      */}
      {showResumeNotice ? (
        <Notice
          tone="warning"
          title={c.resumeTitle}
          body={usb ? c.resumeUsbBody : c.resumeBody}
          action={
            /*
              Hai đường ra, và USB Token chỉ có đường thứ hai: "tiếp tục" ở đây
              là `step=CONTINUE` của `POST …/sign`, mà luồng USB Token không đi
              qua endpoint đó — phiên đang giữ digest của một tài liệu đã dựng
              sẵn, và chỉ chính tab đã dựng nó mới ký xong được.

              Nút huỷ thì luôn có, kể cả với USB Token: trước khi có lease, một
              lượt ký USB kẹt lại chỉ còn cách ngồi chờ nó hết hạn.
            */
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onCancelAttempt}
                disabled={cancelling}
                className="h-8 shrink-0 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-fg hover:bg-inset disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelling ? leaseCopy.cancelling : leaseCopy.cancel}
              </button>
              {usb ? null : (
                <button
                  type="button"
                  onClick={onResume}
                  disabled={cancelling}
                  className="h-8 shrink-0 rounded-md border border-accent bg-accent px-3 text-[11.5px] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {c.resume}
                </button>
              )}
            </div>
          }
        />
      ) : null}

      {flow.phase === "failed" ? (
        <Notice
          tone="danger"
          title={c.failedTitle}
          body={errorMessage(flow.error, c.failedTitle)}
        />
      ) : null}

      {/*
        Thuật toán và mức baseline KHÔNG có ô chọn: chúng đến từ cấu hình người
        soạn ghi vào ô này, đã được lọc lại theo nguồn và định dạng (xem
        `initialWorkflowSignForm`). Vẫn hiện ra, vì đó là hai thứ đi vào chữ ký
        pháp lý và người ký có quyền biết.

        Mức baseline VẮNG MẶT với USB Token: bước prepare của luồng đó chỉ nhận
        chứng thư và thuật toán, mức baseline do dịch vụ ký tự quyết định. Hiện
        một giá trị không đi đâu cả là nói sai về chính chữ ký sắp tạo ra.
      */}
      <dl className="divide-y divide-border-muted rounded-md border border-border-muted bg-surface-2 px-3">
        <ReviewRow label={c.summary.documentLabel} value={documentName} />
        <ReviewRow label={c.sourceLabel} value={source ? sourceLabel(source) : "—"} />
        <ReviewRow
          label={c.algorithmLabel}
          value={form?.algorithm ? algorithmLabel(form.algorithm, catalog) : "—"}
        />
        {usb ? null : (
          <ReviewRow label={c.baselineLabel} value={form?.baselineLevel ?? "—"} />
        )}
      </dl>
    </div>
  );
}

/**
 * "Bạn đang ký cái gì" — đứng đầu cột trái, ngay trên chính tài liệu, và không
 * đổi theo bước nào cả.
 *
 * Mã kiểm tra tài liệu (sha256) có mặt cùng một câu giải thích ngắn: người ký
 * cẩn thận đối chiếu được nó với mã hiện trên màn quy trình, và đó là cách duy
 * nhất từ phía họ để biết tệp trên màn hình đúng là tệp đã hẹn.
 */
function DocumentSummary({
  c,
  detail,
  signer,
}: {
  c: SignCopy;
  detail: SigningRequestDetail;
  signer: SigningRequestSigner;
}) {
  const status =
    signer.status === "SIGNED"
      ? c.summary.statusSigned
      : signer.status === "DECLINED"
        ? c.summary.statusDeclined
        : c.summary.statusPending;

  return (
    <section className="rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
          {c.summary.title}
        </h2>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
            signer.status === "SIGNED"
              ? "bg-success-subtle text-success"
              : "bg-warning-subtle text-warning"
          }`}
        >
          {status}
        </span>
      </div>

      <p className="mt-1.5 text-[13.5px] font-semibold text-fg">{detail.title}</p>

      <dl className="mt-2.5 space-y-1.5">
        <SummaryRow icon={<FileTextIcon size={12} />} label={c.summary.documentLabel}>
          <span className="truncate" title={detail.document.fileName}>
            {detail.document.fileName}
          </span>
        </SummaryRow>

        <SummaryRow icon={<UsersIcon size={12} />} label={c.summary.signerLabel}>
          <span className="truncate" title={signerDisplayName(signer)}>
            {signerDisplayName(signer)}
          </span>
        </SummaryRow>

        <SummaryRow icon={<ClockIcon size={12} />} label={c.summary.stepLabel}>
          {c.summary.step(signer.signingOrder)}
        </SummaryRow>
      </dl>

      {detail.document.sha256 ? (
        <details className="mt-2.5 border-t border-border-muted pt-2">
          <summary className="cursor-pointer text-[10.5px] text-fg-muted">
            {c.summary.checksumLabel}
          </summary>
          <p className="mt-1.5 break-all font-mono text-[10px] leading-relaxed text-fg">
            {detail.document.sha256}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">
            {c.summary.checksumHint}
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

/** Màn chặn: một lý do, một câu trả lời, và đường về quy trình ở ngay trên. */
function BlockedCard({
  tone,
  title,
  body,
  action,
}: {
  tone: "warning" | "danger";
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const warning = tone === "warning";
  return (
    <section
      className={`rounded-lg border p-5 ${
        warning ? "border-warning bg-warning-subtle" : "border-danger bg-danger-subtle"
      }`}
    >
      <div className="flex gap-3">
        {warning ? (
          <InfoIcon size={18} className="mt-0.5 shrink-0 text-warning" />
        ) : (
          <AlertTriangleIcon size={18} className="mt-0.5 shrink-0 text-danger" />
        )}
        <div className="min-w-0 flex-1">
          <h2
            className={`text-[13.5px] font-semibold ${
              warning ? "text-warning" : "text-danger"
            }`}
          >
            {title}
          </h2>
          <p
            className={`mt-1 text-[12px] leading-relaxed ${
              warning ? "text-warning" : "text-danger"
            }`}
          >
            {body}
          </p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}

function Notice({
  tone,
  title,
  body,
  action,
}: {
  tone: "warning" | "danger";
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const warning = tone === "warning";
  return (
    <div
      role="status"
      className={`flex gap-2 rounded-md border p-3 ${
        warning ? "border-warning bg-warning-subtle" : "border-danger bg-danger-subtle"
      }`}
    >
      {warning ? (
        <InfoIcon size={14} className="mt-0.5 shrink-0 text-warning" />
      ) : (
        <AlertTriangleIcon size={14} className="mt-0.5 shrink-0 text-danger" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-[11.5px] font-semibold ${warning ? "text-warning" : "text-danger"}`}>
          {title}
        </p>
        <p
          className={`mt-0.5 text-[11px] leading-relaxed ${
            warning ? "text-warning" : "text-danger"
          }`}
        >
          {body}
        </p>
      </div>
      {action}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 py-2.5 text-[11.5px]">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right font-semibold text-fg" title={value}>
        {value}
      </dd>
    </div>
  );
}
