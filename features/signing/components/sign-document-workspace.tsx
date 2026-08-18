"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { useLocale } from "@/components/i18n/locale-provider";
import { useToast } from "@/components/ui/toast";
import { Dialog } from "@/components/ui/dialog";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  DownloadIcon,
  ImageUpIcon,
  InfoIcon,
  RotateCcwIcon,
  SpinnerIcon,
  TrashIcon,
} from "@/components/ui/icons";
import type { ContentType } from "@/lib/types/domain";
import type {
  BaselineLevel,
  DocumentFormat,
  MpkiCredential,
  SignatureMode,
  SignatureSource,
  SignCapabilities,
  SignedDocument,
  SignResponse,
  UsbTokenJobRequest,
} from "@/lib/types/signing";
import {
  detectContentType,
  detectDocumentFormat,
  formatBytes,
  readTargetSignatures,
  type TargetSignature,
} from "../document-format";
import {
  algorithmLabel,
  algorithmsFor,
  buildAlgorithmCatalog,
  groupAlgorithms,
  reselectAlgorithm,
  requiresEcKey,
  type AlgorithmCatalog,
} from "../signature-algorithm";
import { errorMessage } from "../api";
import { useApiBaseUrl } from "../api-base-url";
import {
  createFptEnrollment,
  checkFptEnrollmentStatus,
  downloadSignedDocument,
  getCapabilities,
  listMpkiCredentials,
  signedDocumentAsFile,
  submitSignStep,
} from "../sign-api";
import {
  enrollmentImageDataUrl,
  readEnrollmentImage,
  type EnrollmentImage,
} from "../enrollment-image";
import {
  buildContinueRequest,
  buildSignSteps,
  buildStartRequest,
  buildUsbTokenJobRequest,
  enrollmentComplete,
  enrollmentImagePayload,
  findSource,
  isMpki,
  isPkcs12,
  isSignCloud,
  isUsbToken,
  resolveFormState,
  sourceLabel,
  supportsFormat,
  supportsVisibleSignature,
  validateSignForm,
  REQUIRED_ENROLLMENT_IMAGE_KEYS,
  REQUIRED_ENROLLMENT_KEYS,
  type AgreementStage,
  type EnrollmentFormState,
  type EnrollmentImageKey,
  type SignAppearanceGeometry,
  type SignFormState,
  type SignStepId,
} from "../sign-configuration";
import {
  clearAgreementUuid,
  clearSessionRecord,
  loadSessionRecord,
  saveSessionRecord,
  type SignSessionRecord,
} from "../sign-record-store";
import {
  DEFAULT_SIGNATURE_POSITION,
  DocumentPanel,
  DocumentPreview,
  type PdfPageMetrics,
  type SignaturePosition,
} from "./sign-document-preview";
import {
  FptAgentUnreachableError,
  getAgentToken,
  listAgentCertificates,
} from "../usb-token-agent";
import { mergeUsbTokenSource } from "../usb-token-source";
import { documentUsbTokenTransport } from "../usb-token-transport";
import { ConfigCard, Field, Pkcs12Card, SourcePicker } from "./credential-cards";
import { SignSessionDialog } from "./sign-session-dialog";
import { SignStepProgress, type SignStepView } from "./sign-step-progress";
import { UsbTokenSignDialog } from "./usb-token-sign-dialog";
import { WarningBlock } from "./sign-dialog-parts";

/**
 * Màn ký một tài liệu, chạy trên `POST /api/v1/sign`.
 *
 * Trình tự: `GET /capabilities` → chọn tài liệu → chọn nguồn chữ ký → điền phần
 * riêng của nguồn → `POST /sign` bước START.
 *
 * Trình tự đó cũng chính là thứ người dùng thấy: khối cấu hình đi từng bước một
 * (`buildSignSteps`), mỗi lần chỉ hiện thẻ của bước đang đứng. Không phải để cho
 * gọn — mỗi bước quyết định nội dung của bước sau (định dạng lọc nguồn, nguồn lọc
 * thuật toán), nên bày hết ra từ đầu là mời người dùng điền những ô sẽ bị dựng
 * lại. Bước đã xong vẫn quay lại được bằng thanh tiến trình.
 *
 * Từ bước START có ba kết cục, và chúng do
 * `interactionModel` của nguồn quyết định chứ không do màn hình đoán:
 *
 * - `NONE` (PKCS#12) — ký xong ngay trong response.
 * - `APP_CONFIRMATION` (MPKI App) — request bị giữ tới khi người ký xác nhận.
 * - `REDIRECT_OTP` (eSign Cloud) — mở phiên, rồi hai bước CONTINUE.
 *
 * Không có artifact, không có id thao tác để poll: tài liệu đi kèm trong
 * multipart mỗi lần START, và tệp đã ký chỉ tồn tại trong response.
 *
 * NGOẠI LỆ DUY NHẤT là `LOCAL_AGENT` (FPT USB Token): nó không đi qua `/sign` mà
 * qua cặp endpoint `/usb-token/signing-jobs` → `.../complete`, cộng ba lời gọi
 * thẳng từ trình duyệt tới FPT-CA Signing Agent. Toàn bộ luồng đó nằm trong
 * `UsbTokenSignDialog`; ở đây chỉ có nhánh mở hộp thoại và nhận tệp đã ký về.
 */

interface FlowState {
  phase: "idle" | "signing" | "completed" | "failed";
  error?: string;
}

interface DialogState {
  source: SignatureSource;
  begin: () => Promise<SignResponse>;
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

export function SignDocumentWorkspace() {
  const { toast } = useToast();
  const { t } = useLocale();
  const { baseUrl } = useApiBaseUrl();
  const inputRef = useRef<HTMLInputElement>(null);
  const p12InputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController>(undefined);
  /**
   * Định dạng tệp đang chọn, đọc được từ `loadCapabilities` mà không phải đưa
   * nó vào deps — đưa vào là mỗi lần đổi tệp lại gọi lại `/capabilities`.
   * Có lệch một nhịp cũng không sai: effect chọn lại thuật toán ở dưới chạy sau
   * và sửa nốt.
   */
  const formatRef = useRef<DocumentFormat | undefined>(undefined);

  const [capabilities, setCapabilities] = useState<SignCapabilities>();
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);
  const [capabilitiesError, setCapabilitiesError] = useState<string>();

  const [file, setFile] = useState<File>();
  const [dragging, setDragging] = useState(false);
  const [p12File, setP12File] = useState<File>();
  const [targets, setTargets] = useState<TargetSignature[]>([]);
  const [scanningTargets, setScanningTargets] = useState(false);

  const [form, setForm] = useState<SignFormState>();
  const [credentials, setCredentials] = useState<MpkiCredential[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string>();

  const [position, setPosition] = useState<SignaturePosition>(DEFAULT_SIGNATURE_POSITION);
  const [pdfPageSize, setPdfPageSize] = useState<PdfPageMetrics>();

  /**
   * Bước người dùng ĐANG YÊU CẦU xem, không nhất thiết là bước đang hiện: nó còn
   * bị kẹp lại theo `furthestReachable` mỗi lần render. Xoá tệp đang chọn không
   * cần đẩy state này về đầu — bước 1 chưa xong thì mọi bước sau tự khoá.
   */
  const [activeStep, setActiveStep] = useState<SignStepId>("document");

  const [flow, setFlow] = useState<FlowState>({ phase: "idle" });
  const [dialog, setDialog] = useState<DialogState>();
  const [usbDialog, setUsbDialog] = useState<UsbTokenDialogState>();
  const [signed, setSigned] = useState<SignedDocument>();
  const [resultOpen, setResultOpen] = useState(false);
  const [resume, setResume] = useState<SignSessionRecord | null>(null);
  /**
   * Chỉ sống trong phiên làm việc này và CỐ Ý không được persist: biết chắc một
   * agreement đã READY hay chưa đòi một lời gọi status có tính phí, nên sau khi
   * tải lại trang thì quay về `UNKNOWN` (không chặn) thay vì tự đi kiểm tra.
   */
  const [agreementStage, setAgreementStage] = useState<AgreementStage>("UNKNOWN");

  const contentType: ContentType | undefined = file ? detectContentType(file) : undefined;
  const documentFormat: DocumentFormat | undefined = file ? detectDocumentFormat(file) : undefined;
  const source = findSource(capabilities?.sources ?? [], form?.sourceId);
  /**
   * Nhãn thuật toán do backend đặt. Dựng một lần cho mỗi lần tải capability —
   * nó đi xuống hộp thoại USB Token nên phải ổn định giữa các lần render.
   */
  const catalog = useMemo(() => buildAlgorithmCatalog(capabilities), [capabilities]);

  /**
   * Capability tải lại mỗi khi đổi baseUrl: hai môi trường có thể bật các nguồn
   * khác nhau, và giữ lại danh sách cũ sẽ dựng form theo ràng buộc của môi
   * trường không còn được gọi nữa.
   */
  const loadCapabilities = useCallback(async () => {
    setCapabilitiesLoading(true);
    setCapabilitiesError(undefined);
    try {
      // Nguồn USB Token do client khai — `/capabilities` chỉ mô tả các nguồn của
      // `POST /sign`, mà luồng đó đi endpoint khác. Xem `usb-token-source.ts`.
      const next = mergeUsbTokenSource(await getCapabilities());
      setCapabilities(next);
      setForm((current) => {
        const preferred =
          findSource(next.sources, current?.sourceId) ?? next.sources[0];
        return preferred ? resolveFormState(preferred, current, formatRef.current) : undefined;
      });
    } catch (error) {
      setCapabilities(undefined);
      setForm(undefined);
      setCapabilitiesError(errorMessage(error, t.sign.source.loadFailed));
    } finally {
      setCapabilitiesLoading(false);
    }
  }, [t.sign.source.loadFailed]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nạp dữ liệu từ dịch vụ ký, chạy lại khi đổi môi trường
    void loadCapabilities();
  }, [loadCapabilities, baseUrl]);

  /**
   * Đổi tệp sang định dạng khác thì phải CHỌN LẠI thuật toán.
   *
   * Đây không phải chuyện gọn gàng: cùng một nguồn PKCS12, PDF ký được cả 9
   * thuật toán còn DOCX chỉ 3 × PKCS#1. Giữ nguyên `RSA_PSS_SHA256` khi người
   * dùng đổi từ PDF sang DOCX là để nút Ký gửi lên một tổ hợp chắc chắn trả
   * `422 ALGORITHM_NOT_SUPPORTED`.
   *
   * Chỉ đụng vào khi lựa chọn hiện tại thật sự hết hợp lệ — `reselectAlgorithm`
   * trả `undefined` ở mọi trường hợp khác, nên thao tác của người dùng không bị
   * ghi đè sau mỗi lần render.
   */
  useEffect(() => {
    formatRef.current = documentFormat;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ lựa chọn thuật toán với ràng buộc của định dạng vừa đổi; chỉ chạy khi lựa chọn hiện tại đã hết hợp lệ
    setForm((current) => {
      if (!current) return current;
      const active = findSource(capabilities?.sources ?? [], current.sourceId);
      if (!active) return current;
      const next = reselectAlgorithm(active, documentFormat, current.algorithm);
      return next ? { ...current, algorithm: next } : current;
    });
  }, [documentFormat, capabilities]);

  // Phiên eSign Cloud còn sống sau khi tải lại trang: đề nghị nối lại thay vì
  // ký lại từ đầu — bước START đã bị tính phí rồi.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ từ localStorage khi mount
    setResume(loadSessionRecord());
    // `agreementUuid` không được khôi phục — nó không còn được lưu nữa. Lời gọi
    // này chỉ dọn giá trị các bản trước để lại; xem `clearAgreementUuid`.
    clearAgreementUuid();
    // Huỷ lệnh ký đang treo khi rời màn hình — đọc ref lúc unmount là cố ý.
    return () => abortRef.current?.abort();
  }, []);

  /**
   * Ký xong thì bản xem trước chuyển sang chính TỆP ĐÃ KÝ: người dùng vừa bỏ ra
   * một lượt ký, thứ họ muốn nhìn là kết quả — còn khung kéo thả trên bản gốc
   * lúc này chỉ mời họ sửa một toạ độ không còn tác dụng gì nữa.
   *
   * `useMemo` là bắt buộc chứ không phải tối ưu: `signedDocumentAsFile` giải
   * base64 và dựng một `File` MỚI mỗi lần gọi, mà `PdfPreview` lại nạp lại tài
   * liệu theo tham chiếu `file`.
   */
  const signedFile = useMemo(() => (signed ? signedDocumentAsFile(signed) : undefined), [signed]);
  const previewFile = signedFile ?? file;
  const previewContentType = signedFile ? detectContentType(signedFile) : contentType;

  const appearanceSupported = supportsVisibleSignature(source, documentFormat);
  const geometry = buildGeometry(appearanceSupported, form, position, pdfPageSize);
  const validation = validateSignForm({
    source,
    form,
    file,
    format: documentFormat,
    p12File,
    maxUploadBytes: capabilities?.maxUploadBytes,
    credentialCount: credentials.length,
    agreementStage,
    formatBytes,
    messages: t.sign.validation,
  });
  const busy = flow.phase === "signing";
  const canSign = validation.valid && !busy;

  /*
   * Trạng thái từng bước được TÍNH LẠI mỗi render từ chính `validation` đang
   * điều khiển nút ký — không có cờ "đã hoàn tất" nào được nhớ riêng. Nhờ vậy
   * sửa ngược một ô ở bước trước (đổi tệp sang định dạng nguồn không ký được)
   * lập tức khoá lại các bước sau, thay vì để người dùng đi tiếp tới nút ký rồi
   * mới biết.
   */
  const steps = buildSignSteps(source);
  const stepViews = buildStepViews(steps, validation.byStep, flow.phase === "completed");
  const furthest = furthestReachable(stepViews);
  const requestedIndex = steps.indexOf(activeStep);
  const activeIndex = Math.min(requestedIndex < 0 ? furthest : requestedIndex, furthest);
  const currentStep = steps[activeIndex];

  /* ---------------------------------------------------------------- *
   * Tài liệu
   * ---------------------------------------------------------------- */

  const openDocument = useCallback(async (selected: File) => {
    setFile(selected);
    setFlow({ phase: "idle" });
    setSigned(undefined);
    setPosition(DEFAULT_SIGNATURE_POSITION);
    setPdfPageSize(undefined);
    // Chữ ký đích thuộc về đúng file này — bỏ lựa chọn cũ trước khi quét lại.
    setForm((current) => (current ? { ...current, targetSignatureId: "" } : current));
    // Chọn xong tệp là biết được nguồn nào ký được định dạng đó — đi thẳng tới
    // bước chọn nguồn thay vì bắt bấm "Tiếp tục" cho một bước đã xong.
    setActiveStep("source");

    setScanningTargets(true);
    try {
      setTargets(await readTargetSignatures(selected));
    } catch {
      // Quét thất bại chỉ mất tiện ích chọn sẵn; vẫn nhập tay được.
      setTargets([]);
    } finally {
      setScanningTargets(false);
    }
  }, []);

  function selectFile(selected?: File) {
    if (!selected) return;
    void openDocument(selected);
  }

  /**
   * Về đúng trạng thái của lần đầu mở trang: bỏ tài liệu, bỏ tệp khoá, và dựng
   * lại form từ mặc định của capability thay vì giữ lựa chọn cũ.
   *
   * KHÔNG chừa lại gì của lần ký vừa xong — kể cả `agreementUuid`, và kể cả khi
   * điều đó buộc lần ký sau phải đăng ký chứng thư lại (thêm một giao dịch bên
   * FPT). Đó là cái giá đã được chấp nhận để màn ký không mang thông tin của
   * người ký này sang lượt của người ký khác.
   *
   * Ngoại lệ duy nhất là `capabilities`: nó mô tả DỊCH VỤ chứ không mô tả lần ký
   * nào, và gọi lại `/capabilities` chỉ để nhận đúng câu trả lời cũ là một vòng
   * loading thừa.
   *
   * Tệp đã ký thì biến mất thật — nó chỉ sống trong bộ nhớ trang, nên dòng ghi
   * chú dưới nút nói rõ phải tải về trước.
   */
  function restartFlow() {
    setFile(undefined);
    setTargets([]);
    setScanningTargets(false);
    setDragging(false);
    setP12File(undefined);
    setCredentials([]);
    setCredentialsError(undefined);
    setCredentialsLoading(false);
    setPosition(DEFAULT_SIGNATURE_POSITION);
    setPdfPageSize(undefined);
    setSigned(undefined);
    setFlow({ phase: "idle" });
    setResultOpen(false);
    setAgreementStage("UNKNOWN");
    setActiveStep("document");
    // Không có tệp thì cũng không có định dạng — cùng nhịp với lúc mount.
    formatRef.current = undefined;
    // Chọn lại đúng tệp vừa bỏ ra vẫn phải kích hoạt `onChange`.
    if (inputRef.current) inputRef.current.value = "";
    if (p12InputRef.current) p12InputRef.current.value = "";

    // Cùng trình tự với lúc mount: dựng form từ nguồn đầu tiên KHÔNG mang theo
    // `previous` — mọi lựa chọn, mật khẩu và hồ sơ đăng ký của lần trước rơi hết.
    setForm(() =>
      capabilities?.sources[0]
        ? resolveFormState(capabilities.sources[0], undefined, undefined)
        : undefined,
    );
  }

  /**
   * "Ký lại với chữ ký này": giữ nguyên cấu hình vừa ký, và quay về ĐÚNG bản
   * chưa ký của tài liệu.
   *
   * `file` chưa bao giờ bị thay — bản đã ký chỉ nằm ở `signed`, và `previewFile`
   * ưu tiên hiển thị nó. Nên rollback ở đây gọn đúng một việc: bỏ `signed` đi.
   *
   * Bỏ `signed` cũng là bỏ hẳn kết quả vừa ký: nó không tồn tại ở đâu ngoài bộ
   * nhớ trang này. Hộp thoại nói rõ điều đó ngay cạnh nút.
   */
  function signAgainWithSameSignature() {
    setSigned(undefined);
    setFlow({ phase: "idle" });
    setResultOpen(false);
  }

  function removeFile() {
    setFile(undefined);
    setTargets([]);
    setSigned(undefined);
    setFlow({ phase: "idle" });
    setPdfPageSize(undefined);
    setActiveStep("document");
    if (inputRef.current) inputRef.current.value = "";
  }

  /* ---------------------------------------------------------------- *
   * Nguồn chữ ký và phần riêng của từng nguồn
   * ---------------------------------------------------------------- */

  function changeSource(sourceId: string) {
    const next = findSource(capabilities?.sources ?? [], sourceId);
    if (!next) return;
    setForm((current) => resolveFormState(next, current, documentFormat));
    setFlow({ phase: "idle" });
  }

  const update = useCallback(
    <K extends keyof SignFormState>(key: K, value: SignFormState[K]) => {
      setForm((current) => (current ? { ...current, [key]: value } : current));
    },
    [],
  );

  /**
   * Danh sách credential MPKI của người ký. Chỉ chọn sẵn khi có ĐÚNG một — nhiều
   * hơn thì để trống, vì chọn nhầm là ký nhầm một danh tính pháp lý.
   */
  async function loadCredentials() {
    const username = form?.mpkiUsername.trim();
    if (!username) return;
    setCredentialsLoading(true);
    setCredentialsError(undefined);
    try {
      const list = await listMpkiCredentials(username);
      setCredentials(list);
      update("mpkiCredentialId", list.length === 1 ? list[0].credentialId : "");
      if (list.length === 0) toast.warning(t.sign.mpki.emptyTitle, t.sign.mpki.empty);
    } catch (error) {
      setCredentials([]);
      setCredentialsError(errorMessage(error, t.sign.mpki.loadFailed));
    } finally {
      setCredentialsLoading(false);
    }
  }

  /* ---------------------------------------------------------------- *
   * Ký
   * ---------------------------------------------------------------- */

  const applyCompleted = useCallback(
    (response: SignResponse) => {
      clearSessionRecord();
      setResume(null);
      setDialog(undefined);
      setUsbDialog(undefined);

      if (!response.document) {
        setFlow({ phase: "failed", error: t.sign.toast.missingDocument });
        toast.danger(t.sign.toast.signFailedTitle, t.sign.toast.missingDocument);
        return;
      }

      setSigned(response.document);
      setFlow({ phase: "completed" });
      setResultOpen(true);
      toast.success(t.sign.toast.signSuccessTitle, response.document.fileName);
    },
    [t, toast],
  );

  const rememberSession = useCallback(
    (response: SignResponse, active: SignatureSource, fileName?: string) => {
      if (!response.sessionId) return;
      saveSessionRecord({
        sessionId: response.sessionId,
        materialMode: active.materialMode,
        vendor: active.vendor ?? undefined,
        status: response.status,
        fileName,
        expiresAt: response.expiresAt,
        createdAt: Date.now(),
      });
    },
    [],
  );

  function startSign() {
    if (!canSign || !source || !form || !file) return;

    // USB Token không có bước START: hộp thoại tự tạo job rồi đi tiếp qua agent.
    if (isUsbToken(source)) {
      setFlow({ phase: "idle" });
      setUsbDialog({ source, file, request: buildUsbTokenJobRequest({ form, geometry }) });
      return;
    }

    const payload = buildStartRequest({ source, form, geometry, fileName: file.name });
    const files = { file, ...(isPkcs12(source) && p12File ? { p12File } : {}) };
    const begin = () => submitSignStep(payload, files);

    // Nguồn không cần tương tác trả kết quả ngay: giữ người dùng ở lại màn hình
    // thay vì mở một hộp thoại chỉ để đóng lại sau nửa giây.
    if (source.interactionModel === "NONE") {
      void runInline(begin);
      return;
    }
    setFlow({ phase: "idle" });
    setDialog({ source, begin });
  }

  async function runInline(begin: () => Promise<SignResponse>) {
    const controller = new AbortController();
    abortRef.current = controller;
    setFlow({ phase: "signing" });
    try {
      const response = await begin();
      if (response.status === "COMPLETED") {
        applyCompleted(response);
        return;
      }
      // Nguồn khai `NONE` nhưng vẫn mở phiên: tin phản hồi, không tin khai báo.
      if (source) {
        rememberSession(response, source, file?.name);
        setDialog({ source, begin: async () => response });
      }
      setFlow({ phase: "idle" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message = errorMessage(error, t.sign.toast.signFailedGeneric);
      setFlow({ phase: "failed", error: message });
      toast.danger(t.sign.toast.signFailedTitle, message);
    }
  }

  /** Nối lại một phiên đã mở: CONTINUE, KHÔNG phải START — START lại là mất thêm một lượt ký. */
  function resumeSession() {
    const record = resume;
    if (!record) return;
    const active =
      findSource(capabilities?.sources ?? [], form?.sourceId) ??
      capabilities?.sources.find((item) => item.vendor === record.vendor);
    if (!active) return;

    setResume(null);
    setDialog({
      source: active,
      // Bản ghi của màn `/sign` luôn có `sessionId` — trường này chỉ tuỳ chọn để
      // dùng chung kiểu được với luồng công khai (phiên sống trong cookie).
      begin: () =>
        submitSignStep(buildContinueRequest(record.materialMode, record.sessionId!)),
    });
  }

  function dismissResume() {
    setResume(null);
    clearSessionRecord();
  }

  /* ---------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------- */

  return (
    <>
      {resume ? (
        <ResumeBanner
          t={t}
          record={resume}
          onResume={resumeSession}
          onDismiss={dismissResume}
        />
      ) : null}

      {/*
        Thanh tiến trình chiếm trọn bề ngang, đứng trên CẢ hai cột: nó nói về
        toàn bộ màn hình chứ không riêng khối cấu hình, và bản xem trước bên trái
        cũng đổi theo bước (chỉ có gì để xem sau bước 1).

        Màn hẹp: một cột, thứ tự DOM là tiến trình → cấu hình → xem trước. Khối
        cấu hình lên trước vì nó là nơi thao tác; bản xem trước chỉ để đối chiếu.

        Từ `xl`: hai cột, đặt bằng `col-start`/`row-start` chứ không bằng thứ tự
        DOM. Cột trái CHỈ có bản xem trước và ăn hết phần còn lại của chiều ngang
        — khung ký được kéo thả trên chính trang PDF nên trang càng to toạ độ
        càng đặt được chính xác.
      */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div className="xl:col-span-2 xl:col-start-1 xl:row-start-1">
          <SignStepProgress
            t={t}
            steps={stepViews}
            activeIndex={activeIndex}
            onSelect={setActiveStep}
          />
        </div>

        <div className="xl:col-start-2 xl:row-start-2">
          <ConfigurationPanel
            t={t}
            step={currentStep}
            stepComplete={stepViews[activeIndex]?.complete ?? false}
            previousStep={steps[activeIndex - 1]}
            nextStep={steps[activeIndex + 1]}
            onStepChange={setActiveStep}
            capabilities={capabilities}
            catalog={catalog}
            capabilitiesLoading={capabilitiesLoading}
            capabilitiesError={capabilitiesError}
            onReloadCapabilities={loadCapabilities}
            source={source}
            form={form}
            file={file}
            contentType={contentType}
            documentFormat={documentFormat}
            dragging={dragging}
            documentInputRef={inputRef}
            onDraggingChange={setDragging}
            onSelectFile={selectFile}
            onRemoveFile={removeFile}
            targets={targets}
            scanningTargets={scanningTargets}
            p12File={p12File}
            p12InputRef={p12InputRef}
            onP12FileChange={setP12File}
            credentials={credentials}
            credentialsLoading={credentialsLoading}
            credentialsError={credentialsError}
            onLoadCredentials={loadCredentials}
            blockers={validation.byStep[currentStep] ?? []}
            appearanceSupported={appearanceSupported}
            flow={flow}
            canSign={canSign}
            agreementStage={agreementStage}
            onAgreementStageChange={setAgreementStage}
            onSourceChange={changeSource}
            onUpdate={update}
            onSign={startSign}
            onShowResult={() => setResultOpen(true)}
            onRestart={restartFlow}
          />
        </div>

        <div className="xl:col-start-1 xl:row-start-2">
          <DocumentPreview
            t={t}
            file={previewFile}
            format={previewContentType}
            signed={Boolean(signedFile)}
            visibleSignature={
              !signedFile && appearanceSupported && Boolean(form?.visibleSignature)
            }
            signaturePosition={position}
            onSignaturePositionChange={setPosition}
            onPageMetrics={setPdfPageSize}
          />
        </div>
      </div>

      {dialog ? (
        <SignSessionDialog
          t={t}
          fileName={file?.name}
          sourceName={sourceLabel(dialog.source)}
          interactionModel={dialog.source.interactionModel}
          timeoutSeconds={dialog.source.expectedWaitSeconds}
          agreementReady={agreementStage === "READY"}
          begin={dialog.begin}
          continueSession={(sessionId) =>
            // Luôn có ở đây: hộp thoại chỉ gọi lại khi đã có phiên đang mở (REDIRECT_OTP
            // luôn trả `sessionId`), tham số tuỳ chọn chỉ để dùng chung được với luồng
            // công khai — nơi phiên sống trong cookie, không có `sessionId`.
            submitSignStep(buildContinueRequest(dialog.source.materialMode, sessionId!))
          }
          onPending={(response) => {
            rememberSession(response, dialog.source, file?.name);
            setResume(null);
          }}
          onCompleted={applyCompleted}
          onClose={() => setDialog(undefined)}
        />
      ) : null}

      {usbDialog ? (
        <UsbTokenSignDialog
          t={t}
          fileName={usbDialog.file.name}
          sourceName={sourceLabel(usbDialog.source)}
          transport={documentUsbTokenTransport(usbDialog.file, usbDialog.request)}
          catalog={catalog}
          onCompleted={applyCompleted}
          onClose={() => setUsbDialog(undefined)}
        />
      ) : null}

      <SigningResultDialog
        t={t}
        open={resultOpen}
        document={signed}
        source={source}
        form={form}
        catalog={catalog}
        onClose={() => setResultOpen(false)}
        onSignAgain={signAgainWithSameSignature}
      />
    </>
  );
}

/**
 * Một bước "xong" khi không còn thông báo nào của `validateSignForm` mang nhãn
 * của nó — không có cờ riêng nào để lệch pha với nút ký.
 *
 * Bước cuối là ngoại lệ: nó không có ràng buộc riêng nào (mọi lỗi đều thuộc bốn
 * bước trước), nên chỉ đánh dấu xong khi tài liệu đã ký thật.
 *
 * `reachable` cộng dồn theo chiều đi tới: gặp bước đầu tiên chưa xong là khoá
 * hết phần còn lại. Đây là lý do không cần effect nào để kéo người dùng lùi lại
 * khi họ sửa ngược một bước phía trên.
 */
function buildStepViews(
  steps: SignStepId[],
  byStep: Record<SignStepId, string[]>,
  documentSigned: boolean,
): SignStepView[] {
  let open = true;
  return steps.map((id) => {
    const complete = id === "review" ? documentSigned : (byStep[id]?.length ?? 0) === 0;
    const view: SignStepView = { id, complete, reachable: open };
    if (!complete) open = false;
    return view;
  });
}

function furthestReachable(views: SignStepView[]): number {
  let last = 0;
  views.forEach((view, index) => {
    if (view.reachable) last = index;
  });
  return last;
}

/**
 * Quy đổi khung ký từ tỉ lệ trang sang toạ độ PDF. Gốc toạ độ của PAdES là góc
 * DƯỚI-TRÁI còn khung trên màn hình đo từ mép TRÊN, nên `y` phải lật lại — gửi
 * thẳng tỉ lệ sẽ đặt chữ ký đối xứng qua giữa trang.
 */
function buildGeometry(
  appearanceSupported: boolean,
  form?: SignFormState,
  position?: SignaturePosition,
  page?: PdfPageMetrics,
): SignAppearanceGeometry | undefined {
  if (!appearanceSupported || !form?.visibleSignature) return undefined;
  if (!position || !page || page.page !== position.page) return undefined;

  const height = position.heightPct * page.heightPt;
  return {
    page: position.page,
    x: Math.round(position.xPct * page.widthPt),
    y: Math.round(page.heightPt - position.yPct * page.heightPt - height),
    width: Math.round(position.widthPct * page.widthPt),
    height: Math.round(height),
  };
}

function ResumeBanner({
  t,
  record,
  onResume,
  onDismiss,
}: {
  t: Dictionary;
  record: SignSessionRecord;
  onResume: () => void;
  onDismiss: () => void;
}) {
  const r = t.sign.resume;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-accent bg-accent-subtle px-4 py-3">
      <InfoIcon size={16} className="shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-fg">{r.title}</p>
        <p className="mt-0.5 truncate text-[11.5px] text-fg-muted">
          {record.fileName ? r.descriptionWithFile(record.fileName) : r.description}
        </p>
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

interface ConfigurationPanelProps {
  t: Dictionary;
  /** Bước đang hiện — panel chỉ dựng đúng thẻ của bước này. */
  step: SignStepId;
  stepComplete: boolean;
  previousStep?: SignStepId;
  nextStep?: SignStepId;
  onStepChange: (step: SignStepId) => void;
  capabilities?: SignCapabilities;
  /** Nhãn thuật toán do backend đặt — không dựng nhãn ở client. */
  catalog: AlgorithmCatalog;
  capabilitiesLoading: boolean;
  capabilitiesError?: string;
  onReloadCapabilities: () => void;
  source?: SignatureSource;
  form?: SignFormState;
  file?: File;
  contentType?: ContentType;
  documentFormat?: DocumentFormat;
  dragging: boolean;
  documentInputRef: React.RefObject<HTMLInputElement | null>;
  onDraggingChange: (dragging: boolean) => void;
  onSelectFile: (file?: File) => void;
  onRemoveFile: () => void;
  targets: TargetSignature[];
  scanningTargets: boolean;
  p12File?: File;
  p12InputRef: React.RefObject<HTMLInputElement | null>;
  onP12FileChange: (file?: File) => void;
  credentials: MpkiCredential[];
  credentialsLoading: boolean;
  credentialsError?: string;
  onLoadCredentials: () => void;
  /** Chỉ những gì đang chặn BƯỚC NÀY — danh sách đầy đủ không giúp gì ở đây. */
  blockers: string[];
  appearanceSupported: boolean;
  flow: FlowState;
  canSign: boolean;
  agreementStage: AgreementStage;
  onAgreementStageChange: (stage: AgreementStage) => void;
  onSourceChange: (sourceId: string) => void;
  onUpdate: <K extends keyof SignFormState>(key: K, value: SignFormState[K]) => void;
  onSign: () => void;
  onShowResult: () => void;
  /** Về bước 1 với tài liệu gốc — chỉ có nghĩa sau khi đã ký xong. */
  onRestart: () => void;
}

/**
 * Khối cấu hình, dựng đúng MỘT bước mỗi lần.
 *
 * Bố cục của mọi bước giống hệt nhau — mô tả ngắn, thẻ nội dung, lỗi còn lại,
 * rồi cặp nút quay lại/tiếp tục — nên người dùng không phải học lại chỗ đặt tay
 * ở mỗi bước.
 */
function ConfigurationPanel(props: ConfigurationPanelProps) {
  const {
    t,
    step,
    stepComplete,
    previousStep,
    nextStep,
    onStepChange,
    source,
    form,
    blockers,
    flow,
  } = props;
  const s = t.sign.steps;

  return (
    <section aria-labelledby="configuration-heading" className="space-y-3">
      <h2 id="configuration-heading" className="sr-only">
        {t.sign.config.configurationTitle}
      </h2>

      <p className="text-[11.5px] leading-relaxed text-fg-muted">{s[step].description}</p>

      {step === "document" ? (
        <DocumentPanel
          t={t}
          file={props.file}
          format={props.contentType}
          documentFormat={props.documentFormat}
          dragging={props.dragging}
          inputRef={props.documentInputRef}
          onDraggingChange={props.onDraggingChange}
          onSelectFile={props.onSelectFile}
          onRemoveFile={props.onRemoveFile}
        />
      ) : null}

      {step === "source" ? <SourceCard {...props} /> : null}

      {step === "credential" && source && form ? (
        <>
          {isPkcs12(source) ? (
            <Pkcs12Card
              copy={t.sign.pkcs12}
              form={form}
              p12File={props.p12File}
              p12InputRef={props.p12InputRef}
              onP12FileChange={props.onP12FileChange}
              onUpdate={props.onUpdate}
            />
          ) : null}
          {isMpki(source) ? <MpkiCard {...props} source={source} form={form} /> : null}
          {isSignCloud(source) ? <SignCloudCard {...props} source={source} form={form} /> : null}
          {isUsbToken(source) ? <UsbTokenCard t={t} /> : null}
        </>
      ) : null}

      {step === "signature" && source && form ? (
        <SignatureConfigCard
          t={t}
          source={source}
          form={form}
          catalog={props.catalog}
          documentFormat={props.documentFormat}
          appearanceSupported={supportsVisibleSignature(source, props.documentFormat)}
          targets={props.targets}
          scanningTargets={props.scanningTargets}
          onUpdate={props.onUpdate}
        />
      ) : null}

      {step === "review" ? <ReviewCard {...props} /> : null}

      {/*
        Bước 1 CỐ Ý không hiện lỗi: "hãy chọn tài liệu" nằm ngay dưới một ô kéo
        thả rỗng chỉ là tiếng ồn.
      */}
      {step !== "document" && blockers.length > 0 ? (
        <div role="status" className="rounded-lg border border-warning bg-warning-subtle p-3">
          <div className="flex gap-2">
            <InfoIcon size={15} className="mt-0.5 shrink-0 text-warning" />
            <ul className="space-y-1 text-[11.5px] text-warning">
              {blockers.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {step === "review" ? <SignAction {...props} /> : null}

      {/* Lỗi ký hiện ở mọi bước: người dùng có thể đã quay lại sửa cấu hình. */}
      {flow.phase === "failed" ? (
        <div className="rounded-lg border border-danger bg-danger-subtle p-3">
          <p className="text-[12.5px] font-semibold text-danger">{t.sign.config.signFailedTitle}</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-danger">
            {flow.error ?? t.sign.toast.signFailedGeneric}
          </p>
        </div>
      ) : null}

      {/* Bước đầu không có nút Quay lại — `ml-auto` giữ nút Tiếp tục ở bên phải. */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {previousStep ? (
          <button
            type="button"
            onClick={() => onStepChange(previousStep)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface pl-2.5 pr-3 text-[12.5px] font-semibold text-fg"
          >
            <ArrowLeftIcon size={14} />
            {s.back}
          </button>
        ) : null}

        {nextStep ? (
          <button
            type="button"
            disabled={!stepComplete}
            onClick={() => onStepChange(nextStep)}
            title={stepComplete ? undefined : s.lockedHint}
            className="ml-auto flex h-9 items-center gap-1.5 rounded-md border border-accent bg-accent pl-3.5 pr-3 text-[12.5px] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-45"
          >
            {s.next}
            <ArrowRightIcon size={14} />
          </button>
        ) : null}
      </div>
    </section>
  );
}

/** Bước 2 — nguồn chữ ký, cộng các trạng thái của `GET /capabilities`. */
function SourceCard({
  t,
  capabilities,
  capabilitiesLoading,
  capabilitiesError,
  onReloadCapabilities,
  form,
  documentFormat,
  onSourceChange,
}: ConfigurationPanelProps) {
  return (
    <ConfigCard title={t.sign.source.title}>
      {capabilitiesError ? (
        <div className="space-y-2">
          <p className="rounded-md bg-danger-subtle p-3 text-[11.5px] text-danger">
            {capabilitiesError}
          </p>
          <button
            type="button"
            onClick={onReloadCapabilities}
            className="h-8 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-fg"
          >
            {t.sign.source.retry}
          </button>
        </div>
      ) : capabilitiesLoading ? (
        <p className="text-[11.5px] text-fg-muted">{t.sign.source.loading}</p>
      ) : !capabilities?.sources.length ? (
        <p className="text-[11.5px] text-fg-muted">{t.sign.source.empty}</p>
      ) : (
        <SourcePicker
          copy={{ unsupportedForFormat: t.sign.source.unsupportedForFormat }}
          sources={capabilities.sources}
          selectedId={form?.sourceId}
          documentFormat={documentFormat}
          sourceLabel={sourceLabel}
          supportsFormat={supportsFormat}
          onChange={onSourceChange}
        />
      )}
    </ConfigCard>
  );
}

/**
 * Bước cuối — nhắc lại đúng những gì sắp được gửi đi. Bốn dòng này là toàn bộ
 * phần người dùng vừa cấu hình ở ba bước trước, gom vào một chỗ để đọc lại trước
 * khi bấm một nút có tính phí.
 */
function ReviewCard({
  t,
  file,
  documentFormat,
  source,
  form,
  catalog,
  appearanceSupported,
}: ConfigurationPanelProps) {
  const s = t.sign.steps;
  return (
    <ConfigCard title={s.summaryTitle}>
      <dl className="divide-y divide-border-muted">
        <SummaryRow label={s.summaryDocument} value={file?.name ?? s.summaryUnset} />
        <SummaryRow label={s.summaryFormat} value={documentFormat ?? s.summaryUnset} />
        <SummaryRow label={s.summarySource} value={source ? sourceLabel(source) : s.summaryUnset} />
        <SummaryRow
          label={s.summaryProfile}
          value={
            form ? `${form.baselineLevel} · ${algorithmLabel(form.algorithm, catalog)}` : s.summaryUnset
          }
        />
        {appearanceSupported ? (
          <SummaryRow
            label={s.summaryAppearance}
            value={form?.visibleSignature ? s.summaryOn : s.summaryOff}
          />
        ) : null}
      </dl>
    </ConfigCard>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3 py-2.5 text-[11.5px]">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right font-semibold text-fg" title={value}>
        {value}
      </dd>
    </div>
  );
}

/** Nút ký / nút tải tệp đã ký. Chỉ sống ở bước cuối. */
function SignAction({
  t,
  source,
  flow,
  canSign,
  onSign,
  onShowResult,
  onRestart,
}: ConfigurationPanelProps) {
  if (flow.phase === "completed") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={onShowResult}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent bg-accent text-[14px] font-bold text-accent-fg"
        >
          <DownloadIcon size={16} />
          {t.sign.config.downloadSignedFile}
        </button>

        {/*
          Nút phụ, KHÔNG phải nút nhấn mạnh: tải tệp về vẫn là việc cần làm
          trước — bắt đầu lại mà chưa tải là mất hẳn kết quả vừa ký.
        */}
        <button
          type="button"
          onClick={onRestart}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface text-[12.5px] font-semibold text-fg"
        >
          <RotateCcwIcon size={14} />
          {t.sign.steps.restart}
        </button>
        <p className="text-center text-[10.5px] leading-relaxed text-fg-muted">
          {t.sign.steps.restartHint}
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={!canSign}
        onClick={onSign}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent bg-accent text-[14px] font-bold text-accent-fg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {flow.phase === "signing" ? (
          <SpinnerIcon size={16} className="animate-spin" />
        ) : (
          <CheckIcon size={16} />
        )}
        {flow.phase === "signing" ? t.sign.status.signing : t.sign.config.signButton}
      </button>
      {source && t.sign.source.interaction[source.interactionModel] ? (
        <p className="text-center text-[10.5px] leading-relaxed text-fg-muted">
          {t.sign.source.interaction[source.interactionModel]}
        </p>
      ) : null}
    </>
  );
}


function MpkiCard({
  t,
  form,
  credentials,
  credentialsLoading,
  credentialsError,
  onLoadCredentials,
  onUpdate,
}: ConfigurationPanelProps & { source: SignatureSource; form: SignFormState }) {
  const m = t.sign.mpki;
  return (
    <ConfigCard title={m.title}>
      <div className="space-y-3">
        <Field label={m.usernameLabel} htmlFor="mpki-username">
          <div className="flex gap-2">
            <input
              id="mpki-username"
              value={form.mpkiUsername}
              placeholder={m.usernamePlaceholder}
              autoComplete="off"
              onChange={(event) => onUpdate("mpkiUsername", event.target.value)}
              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-[12px] text-fg"
            />
            <button
              type="button"
              onClick={onLoadCredentials}
              disabled={!form.mpkiUsername.trim() || credentialsLoading}
              className="h-9 shrink-0 rounded-md border border-border bg-surface px-3 text-[11.5px] font-semibold text-fg disabled:opacity-50"
            >
              {credentialsLoading ? m.loading : m.loadCredentials}
            </button>
          </div>
        </Field>

        {credentialsError ? (
          <p className="rounded-md bg-danger-subtle p-2.5 text-[11px] text-danger">
            {credentialsError}
          </p>
        ) : null}

        {credentials.length > 0 ? (
          <Field label={m.credentialLabel} htmlFor="mpki-credential">
            <select
              id="mpki-credential"
              value={form.mpkiCredentialId}
              onChange={(event) => onUpdate("mpkiCredentialId", event.target.value)}
              className="h-9 w-full rounded-md border border-border bg-surface px-2 text-[12px] text-fg"
            >
              <option value="">{m.chooseCredential}</option>
              {credentials.map((credential) => (
                <option key={credential.credentialId} value={credential.credentialId}>
                  {credentialOptionLabel(credential)}
                </option>
              ))}
            </select>
            {credentials.length > 1 ? (
              <p className="mt-1.5 text-[10.5px] text-warning">{m.multipleWarning}</p>
            ) : null}
          </Field>
        ) : null}

        <p className="text-[10.5px] leading-relaxed text-fg-muted">{m.note}</p>
      </div>
    </ConfigCard>
  );
}

function credentialOptionLabel(credential: MpkiCredential): string {
  const name = credential.subjectDn
    ? credential.subjectDn.match(/(?:^|,)\s*CN=([^,]+)/i)?.[1]?.trim() || credential.subjectDn
    : credential.credentialId;
  const parts = [name];
  if (credential.status) parts.push(credential.status);
  if (credential.validTo) parts.push(new Date(credential.validTo).toLocaleDateString());
  return parts.join(" · ");
}

/**
 * USB Token không có gì để cấu hình trước: chứng thư nằm trong thiết bị và chỉ
 * đọc được khi bấm ký — kể cả tên người ký, vốn là CN của chứng thư được chọn
 * trong hộp thoại ký. Khối này vì thế chỉ còn một nút thử kết nối agent, để tách
 * "agent chưa chạy" ra khỏi "ký hỏng" TRƯỚC khi tạo job.
 */
function UsbTokenCard({ t }: { t: Dictionary }) {
  const u = t.sign.usbToken;
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
        message: certificates.length
          ? u.agentReady(certificates.length)
          : u.noCertificates,
      });
    } catch (error) {
      setResult({
        ok: false,
        message:
          error instanceof FptAgentUnreachableError
            ? u.errorUnreachable
            : errorMessage(error, u.errorGeneric),
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <ConfigCard title={u.title}>
      <div className="space-y-3">
        <div>
          <button
            type="button"
            onClick={checkAgent}
            disabled={checking}
            className="h-8.5 w-full rounded-md border border-border bg-surface text-[11.5px] font-semibold text-fg disabled:opacity-50"
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

        {/* Trả lời trước câu hỏi "tên người ký điền ở đâu" — ô đó đã bị bỏ. */}
        <p className="text-[10.5px] leading-relaxed text-fg-muted">{u.signerNameNote}</p>
        <p className="text-[10.5px] leading-relaxed text-fg-muted">{u.note}</p>
        {/* Vì sao dropdown thuật toán của luồng này ngắn hơn các luồng khác. */}
        <p className="text-[10.5px] leading-relaxed text-fg-muted">{u.algorithmNote}</p>
        <WarningBlock>{u.pinPolicyNote}</WarningBlock>
      </div>
    </ConfigCard>
  );
}

/**
 * eSign Cloud là luồng tốn tiền, nên khối này ưu tiên một việc: giữ được
 * `agreementUuid`. Ký thẳng khi chưa có uuid vẫn chạy (service tự đăng ký) nhưng
 * uuid KHÔNG được trả về trong response ký — lần sau lại đăng ký lại. Nút "đăng
 * ký riêng" tồn tại chính vì nó là đường duy nhất lấy được uuid về.
 */
function SignCloudCard({
  t,
  form,
  agreementStage,
  onAgreementStageChange,
  onUpdate,
}: ConfigurationPanelProps & { source: SignatureSource; form: SignFormState }) {
  const { toast } = useToast();
  const e = t.sign.esign;
  const [enrolling, setEnrolling] = useState(false);
  const [sicUrl, setSicUrl] = useState<string>();
  const [statusArmed, setStatusArmed] = useState(false);
  const [statusChecking, setStatusChecking] = useState(false);
  const [statusResult, setStatusResult] = useState<string>();
  /** Trang SIC đang mở ở cửa sổ khác — chờ nó đóng để kiểm tra đúng một lần. */
  const [awaitingSic, setAwaitingSic] = useState(false);
  /** Trình duyệt chặn popup: không có handle thì không biết lúc nào trang đóng. */
  const [sicBlocked, setSicBlocked] = useState(false);
  const sicWindowRef = useRef<Window | null>(null);

  const locked = agreementStage === "READY";
  const awaitingConfirmation = agreementStage === "AWAITING_CONFIRMATION";
  const enrollment = form.enrollment;
  const setEnrollment = (key: keyof typeof enrollment, value: string) =>
    onUpdate("enrollment", { ...enrollment, [key]: value });
  const setEnrollmentImage = (key: EnrollmentImageKey, value: EnrollmentImage | null) =>
    onUpdate("enrollment", { ...enrollment, [key]: value });

  async function enroll() {
    setEnrolling(true);
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
          // Luôn gửi đủ ba khoá ảnh, rỗng khi người dùng không nộp ảnh nào.
          ...enrollmentImagePayload(enrollment),
        },
      });
      // Chỉ vào form. `agreementUuid` KHÔNG được lưu xuống trình duyệt: nó gắn
      // với hồ sơ CCCD của người ký này và không được sống quá lượt ký này.
      onUpdate("agreementUuid", result.agreementUuid);
      setSicUrl(result.sicUrl ?? undefined);
      setStatusResult(undefined);
      setSicBlocked(false);
      // Chứng thư chưa tồn tại tới khi người ký xác nhận xong trên trang SIC —
      // từ đây nút ký bị chặn cho tới khi status trả READY.
      onAgreementStageChange("AWAITING_CONFIRMATION");
      toast.success(e.enrollDone, result.agreementUuid);
    } catch (error) {
      toast.danger(e.enrollFailed, errorMessage(error, e.enrollFailed));
    } finally {
      setEnrolling(false);
    }
  }

  /**
   * 💸 Mỗi lần gọi là một giao dịch FPT và một lượt ký bị trừ. Không có API
   * chỉ-đọc thay thế, nên hàm này chỉ được gọi từ hai chỗ, cả hai đều bắt nguồn
   * từ một thao tác cố ý của người dùng: nút kiểm tra thủ công, và đúng MỘT lần
   * khi trang xác nhận danh tính mà chính họ mở ra đã đóng lại. Không poll.
   */
  const checkStatus = useCallback(async () => {
    const agreementUuid = form.agreementUuid.trim();
    if (!agreementUuid) return;
    setStatusChecking(true);
    setStatusResult(undefined);
    try {
      const result = await checkFptEnrollmentStatus(agreementUuid);
      setStatusResult([result.status, result.fptResponseMessage].filter(Boolean).join(" — "));
      if (result.status === "READY") {
        onAgreementStageChange("READY");
        toast.success(e.agreementReady, form.agreementUuid.trim());
      }
    } catch (error) {
      setStatusResult(errorMessage(error, e.statusFailed));
    } finally {
      setStatusChecking(false);
      setStatusArmed(false);
    }
  }, [form.agreementUuid, e.statusFailed, e.agreementReady, onAgreementStageChange, toast]);

  /**
   * Mở trang xác nhận danh tính ở cửa sổ riêng và giữ lại handle của nó.
   *
   * CỐ Ý không dùng `noopener`: mất handle là mất tín hiệu "trang đã đóng", mà
   * đó chính là lúc duy nhất đáng gọi status. Đánh đổi được vì trang bên kia là
   * của FPT và cross-origin chỉ chạm được tới `location` của trang này.
   */
  function openSic() {
    if (!sicUrl) return;
    const popup = window.open(sicUrl, "fpt-sic-confirm", "popup,width=520,height=780");
    if (!popup) {
      // Popup bị chặn: rơi về liên kết mở tay + nút kiểm tra thủ công.
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
   * Vòng lặp này chỉ theo dõi cửa sổ, KHÔNG gọi mạng; API chỉ được gọi đúng một
   * lần, sau khi cửa sổ đã đóng.
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

  /** Quay lại bước đăng ký: bỏ uuid hiện tại và mọi dấu vết của lần xác nhận trước. */
  function restartEnrollment() {
    onUpdate("agreementUuid", "");
    onAgreementStageChange("UNKNOWN");
    setSicUrl(undefined);
    setStatusResult(undefined);
    setSicBlocked(false);
    setAwaitingSic(false);
    sicWindowRef.current = null;
  }

  return (
    <ConfigCard title={e.title}>
      <div className="space-y-3">
        {/* Trả lời trước câu hỏi "tên người ký điền ở đâu" — ô đó đã bị bỏ. */}
        <p className="text-[10.5px] leading-relaxed text-fg-muted">{e.signerNameNote}</p>

        {/*
          `agreementUuid` CHỈ ĐỌC, ở mọi trạng thái. Nó là định danh CA cấp về
          trong response của yêu cầu đăng ký chứng thư — gõ tay một chuỗi vào đây
          là trỏ sang hồ sơ của người khác, hoặc sang một hồ sơ không tồn tại mà
          màn hình không có cách nào biết (kiểm tra được thì tốn một lượt ký).
          Đường duy nhất để có giá trị khác là đăng ký lại, và nút dưới nói rõ
          cái giá của việc đó.
        */}
        {form.agreementUuid ? (
          <Field label={e.agreementLabel}>
            <div
              className={`rounded-md border p-2.5 ${
                locked ? "border-success bg-success-subtle" : "border-border bg-inset"
              }`}
            >
              {locked ? (
                <div className="flex items-center gap-1.5">
                  <CheckIcon size={13} className="shrink-0 text-success" />
                  <p className="text-[11px] font-semibold text-success">{e.agreementReady}</p>
                </div>
              ) : (
                <p className="text-[11px] font-semibold text-fg-muted">{e.agreementIssued}</p>
              )}
              <p className="mt-1.5 break-all font-mono text-[11px] text-fg">{form.agreementUuid}</p>
            </div>
            <button
              type="button"
              onClick={restartEnrollment}
              className="mt-2 h-8 w-full rounded-md border border-border bg-surface text-[11.5px] font-semibold text-fg"
            >
              {locked ? e.agreementRecreate : e.forget}
            </button>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-fg-muted">
              {locked ? e.agreementRecreateHint : e.agreementHint}
            </p>
          </Field>
        ) : (
          <Field label={e.agreementLabel}>
            <div className="rounded-md border border-dashed border-border bg-inset p-2.5">
              <p className="text-[11px] leading-relaxed text-fg-muted">{e.agreementEmpty}</p>
            </div>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-fg-muted">{e.agreementHint}</p>
          </Field>
        )}

        {!form.agreementUuid ? (
          <div className="space-y-3 rounded-md border border-border-muted p-3">
            <p className="text-[11px] font-semibold text-fg-muted">{e.enrollmentTitle}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <EnrollmentField
                id="enroll-personal-name"
                field="personalName"
                label={e.personalNameLabel}
                value={enrollment.personalName}
                onChange={(value) => setEnrollment("personalName", value)}
              />
              <EnrollmentField
                id="enroll-citizen-id"
                field="citizenID"
                label={e.citizenIdLabel}
                value={enrollment.citizenID}
                onChange={(value) => setEnrollment("citizenID", value)}
              />
              <EnrollmentField
                id="enroll-mobile"
                field="mobileNo"
                label={e.mobileLabel}
                value={enrollment.mobileNo}
                onChange={(value) => setEnrollment("mobileNo", value)}
              />
              <EnrollmentField
                id="enroll-email"
                field="email"
                label={e.emailLabel}
                value={enrollment.email}
                onChange={(value) => setEnrollment("email", value)}
              />
              <EnrollmentField
                id="enroll-location"
                field="location"
                label={e.locationLabel}
                value={enrollment.location}
                onChange={(value) => setEnrollment("location", value)}
              />
              <EnrollmentField
                id="enroll-province"
                field="stateOrProvince"
                label={e.provinceLabel}
                value={enrollment.stateOrProvince}
                onChange={(value) => setEnrollment("stateOrProvince", value)}
              />
              <EnrollmentField
                id="enroll-country"
                field="country"
                label={e.countryLabel}
                value={enrollment.country}
                onChange={(value) => setEnrollment("country", value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-fg-muted">{e.photosTitle}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <EnrollmentImageField
                  t={t}
                  id="enroll-photo-front"
                  field="photoFrontSideIDCard"
                  label={e.photoFrontLabel}
                  value={enrollment.photoFrontSideIDCard}
                  onChange={(image) => setEnrollmentImage("photoFrontSideIDCard", image)}
                />
                <EnrollmentImageField
                  t={t}
                  id="enroll-photo-back"
                  field="photoBackSideIDCard"
                  label={e.photoBackLabel}
                  value={enrollment.photoBackSideIDCard}
                  onChange={(image) => setEnrollmentImage("photoBackSideIDCard", image)}
                />
                <EnrollmentImageField
                  t={t}
                  id="enroll-face-image"
                  field="faceImage"
                  label={e.faceImageLabel}
                  value={enrollment.faceImage}
                  onChange={(image) => setEnrollmentImage("faceImage", image)}
                />
              </div>
              <p className="text-[10.5px] leading-relaxed text-fg-muted">{e.photosHint}</p>
            </div>

            {/* Legend đứng sau cả hai khối vì dấu * xuất hiện ở cả hai. */}
            <p className="text-[10.5px] text-fg-muted">
              <span className="text-danger">*</span> {e.requiredLegend}
            </p>

            <p className="text-[10.5px] leading-relaxed text-fg-muted">{e.privacyNote}</p>

            {/* Hành động chính của khối này — lấy được `agreementUuid` về. */}
            <button
              type="button"
              onClick={enroll}
              disabled={enrolling || !enrollmentComplete(enrollment)}
              className="h-9 w-full rounded-md border border-accent bg-accent text-[12px] font-bold text-accent-fg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enrolling ? e.enrolling : e.enroll}
            </button>
            {!enrollmentComplete(enrollment) ? (
              <p className="text-[10.5px] leading-relaxed text-warning">{e.requiredMissing}</p>
            ) : null}
            <p className="text-[10.5px] leading-relaxed text-fg-muted">{e.enrollHint}</p>
          </div>
        ) : null}

        {/*
          Xác nhận danh tính: mở trang SIC, và khi nó đóng lại thì tự kiểm tra
          trạng thái đúng một lần. Cảnh báo phí đứng TRƯỚC nút mở, vì lúc bấm mở
          là người dùng đã chấp nhận lần kiểm tra sẽ chạy sau đó.
        */}
        {awaitingConfirmation && sicUrl ? (
          <div className="space-y-2 rounded-md border border-accent bg-accent-subtle p-3">
            <p className="text-[11px] font-semibold text-fg">{e.confirmTitle}</p>
            <p className="text-[10.5px] leading-relaxed text-fg-muted">{e.confirmBody}</p>
            <WarningBlock>{e.confirmCostWarning}</WarningBlock>

            <button
              type="button"
              onClick={openSic}
              disabled={awaitingSic || statusChecking}
              className="h-8.5 w-full rounded-md border border-accent bg-accent text-[11.5px] font-semibold text-accent-fg disabled:opacity-60"
            >
              {awaitingSic ? e.confirmWaiting : statusChecking ? e.statusChecking : e.openSicUrl}
            </button>

            {sicBlocked ? (
              <div className="space-y-1.5">
                <p className="text-[10.5px] leading-relaxed text-warning">{e.confirmPopupBlocked}</p>
                <a
                  href={sicUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex h-8 w-full items-center justify-center rounded-md border border-border bg-surface text-[11px] font-semibold text-fg"
                >
                  {e.confirmOpenManually}
                </a>
                <button
                  type="button"
                  onClick={() => void checkStatus()}
                  disabled={statusChecking}
                  className="h-8 w-full rounded-md border border-border bg-surface text-[11px] font-semibold text-fg disabled:opacity-50"
                >
                  {statusChecking ? e.statusChecking : e.confirmCheckNow}
                </button>
              </div>
            ) : null}

            {statusResult ? (
              <p className="rounded-md bg-surface p-2.5 text-[11px] text-fg">{statusResult}</p>
            ) : null}
            {/* Đóng trang sớm / xác nhận chưa xong: cho thử lại, vẫn đúng một lần mỗi cú bấm. */}
            {statusResult && !statusChecking && !awaitingSic && !sicBlocked ? (
              <button
                type="button"
                onClick={() => void checkStatus()}
                className="h-8 w-full rounded-md border border-border bg-surface text-[11px] font-semibold text-fg"
              >
                {e.confirmCheckAgain}
              </button>
            ) : null}
          </div>
        ) : null}

        {form.agreementUuid ? (
          <details className="rounded-md border border-border-muted p-3">
            <summary className="cursor-pointer text-[11px] font-semibold text-fg-muted">
              {e.advancedTitle}
            </summary>
            <div className="mt-2 space-y-2">
              <WarningBlock>{e.statusWarning}</WarningBlock>
              <button
                type="button"
                onClick={() => (statusArmed ? checkStatus() : setStatusArmed(true))}
                disabled={statusChecking}
                className={`h-8.5 w-full rounded-md border text-[11.5px] font-semibold disabled:opacity-50 ${
                  statusArmed
                    ? "border-warning bg-warning-subtle text-warning"
                    : "border-border bg-surface text-fg"
                }`}
              >
                {statusChecking ? e.statusChecking : statusArmed ? e.statusConfirm : e.statusCheck}
              </button>
              {statusResult ? (
                <p className="rounded-md bg-inset p-2.5 text-[11px] text-fg">{statusResult}</p>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </ConfigCard>
  );
}

/**
 * Dấu bắt buộc KHÔNG được đặt bằng tay ở từng chỗ gọi: nó suy ra từ
 * `REQUIRED_ENROLLMENT_KEYS` — cùng danh sách đang điều khiển nút đăng ký và nút
 * ký. Đánh dấu một ô là bắt buộc mà quên chặn nút là kiểu lệch tệ nhất ở form này.
 */
function EnrollmentField({
  id,
  field,
  label,
  value,
  onChange,
}: {
  id: string;
  field: keyof EnrollmentFormState;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const required = (REQUIRED_ENROLLMENT_KEYS as readonly string[]).includes(field);
  const empty = required && !value.trim();

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[10.5px] font-semibold text-fg-muted">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        ) : null}
      </label>
      <input
        id={id}
        value={value}
        autoComplete="off"
        required={required}
        aria-required={required || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`h-8.5 w-full rounded-md border bg-surface px-2 text-[11.5px] text-fg ${
          empty ? "border-warning" : "border-border"
        }`}
      />
    </div>
  );
}

/**
 * Một ô ảnh của hồ sơ đăng ký: chọn tệp → base64 → xem trước.
 *
 * Ảnh KHÔNG tải lên ngay khi chọn — nó nằm trong state của form tới lúc bấm đăng
 * ký (hoặc tới bước START tự đăng ký). Hai mặt CCCD là bắt buộc; ảnh chân dung
 * bỏ trống vẫn hợp lệ và được gửi với chuỗi rỗng.
 *
 * Dấu bắt buộc suy ra từ `REQUIRED_ENROLLMENT_IMAGE_KEYS` chứ không đặt tay ở
 * chỗ gọi — cùng lý do với `EnrollmentField`.
 */
function EnrollmentImageField({
  t,
  id,
  field,
  label,
  value,
  onChange,
}: {
  t: Dictionary;
  id: string;
  field: EnrollmentImageKey;
  label: string;
  value: EnrollmentImage | null;
  onChange: (image: EnrollmentImage | null) => void;
}) {
  const e = t.sign.esign;
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<string>();
  const required = (REQUIRED_ENROLLMENT_IMAGE_KEYS as readonly string[]).includes(field);
  const missing = required && !value;
  const pickLabel = reading ? e.imageReading : value ? e.imageReplace : e.imageChoose;

  async function pick(file?: File) {
    if (!file) return;
    setProblem(undefined);
    setReading(true);
    try {
      const result = await readEnrollmentImage(file);
      if (result.ok) onChange(result.image);
      else setProblem(e.imageProblem[result.problem]);
    } finally {
      setReading(false);
      // Chọn lại đúng tệp vừa bị từ chối cũng phải kích hoạt onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <p className="mb-1 text-[10.5px] font-semibold text-fg-muted">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        ) : null}
      </p>

      <div
        className={`rounded-md border bg-surface p-2 ${missing ? "border-warning" : "border-border"}`}
      >
        {value ? (
          <>
            {/* Ảnh cục bộ dạng data URL — next/image không phục vụ được gì ở đây. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrollmentImageDataUrl(value)}
              alt={label}
              className="mb-2 h-20 w-full rounded-sm bg-inset object-contain"
            />
            <p className="truncate text-[10px] text-fg-muted" title={value.fileName}>
              {value.fileName}
            </p>
            <p className="text-[10px] text-fg-muted">{formatBytes(value.byteLength)}</p>
          </>
        ) : (
          <div className="mb-2 flex h-20 items-center justify-center rounded-sm bg-inset text-[10px] text-fg-muted">
            {e.imageEmpty}
          </div>
        )}

        {/*
          Ba ô ảnh nằm cạnh nhau trong một cột hẹp, nên nhãn chữ ("Đổi ảnh",
          "Xoá ảnh") tràn ra khỏi nút. Chỉ hiện icon; tên đọc được vẫn còn
          nguyên ở `aria-label`, và `title` cho chuột.
        */}
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={reading}
            aria-label={pickLabel}
            title={pickLabel}
            className="flex h-7 flex-1 items-center justify-center rounded-md border border-border bg-surface text-fg disabled:opacity-50"
          >
            {reading ? (
              <SpinnerIcon size={13} className="animate-spin" />
            ) : (
              <ImageUpIcon size={13} />
            )}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => {
                setProblem(undefined);
                onChange(null);
              }}
              aria-label={e.imageRemove}
              title={e.imageRemove}
              className="flex h-7 w-9 items-center justify-center rounded-md border border-border bg-surface text-fg"
            >
              <TrashIcon size={13} />
            </button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => pick(event.target.files?.[0])}
        />
      </div>

      {problem ? <p className="mt-1 text-[10px] text-danger">{problem}</p> : null}
    </div>
  );
}

function SignatureConfigCard({
  t,
  source,
  form,
  catalog,
  documentFormat,
  appearanceSupported,
  targets,
  scanningTargets,
  onUpdate,
}: {
  t: Dictionary;
  source: SignatureSource;
  form: SignFormState;
  catalog: AlgorithmCatalog;
  documentFormat?: DocumentFormat;
  /** Nguồn khai `visibleSignature` VÀ tài liệu là PDF. */
  appearanceSupported: boolean;
  targets: TargetSignature[];
  scanningTargets: boolean;
  onUpdate: <K extends keyof SignFormState>(key: K, value: SignFormState[K]) => void;
}) {
  const c = t.sign.config;

  return (
    <ConfigCard title={c.configurationTitle}>
      <div className="space-y-3">
        <fieldset>
          <legend className="mb-1.5 text-[11px] font-semibold text-fg-muted">
            {c.baselineLevelLabel}
          </legend>
          <div className="flex flex-wrap gap-1 rounded-lg bg-inset p-1">
            {source.baselineLevels.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={form.baselineLevel === level}
                onClick={() => onUpdate("baselineLevel", level as BaselineLevel)}
                className={`min-w-12 flex-1 rounded-md py-1.5 text-[11.5px] font-semibold ${
                  form.baselineLevel === level ? "bg-surface text-fg shadow-sm" : "text-fg-muted"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          {form.baselineLevel === "T" ? (
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-fg-muted">{c.timestampNote}</p>
          ) : null}
        </fieldset>

        <AlgorithmPicker
          t={t}
          source={source}
          form={form}
          catalog={catalog}
          documentFormat={documentFormat}
          onUpdate={onUpdate}
        />

        {source.signatureModes.length > 0 ? (
          <fieldset>
            <legend className="mb-1.5 text-[11px] font-semibold text-fg-muted">
              {c.signatureTypeLabel}
            </legend>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-inset p-1">
              {source.signatureModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={form.signatureMode === mode}
                  onClick={() => onUpdate("signatureMode", mode as SignatureMode)}
                  className={`rounded-md py-1.5 text-[11.5px] font-semibold ${
                    form.signatureMode === mode ? "bg-surface text-fg shadow-sm" : "text-fg-muted"
                  }`}
                >
                  {mode === "CO_SIGN" ? c.coSign : c.counterSign}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {form.signatureMode === "COUNTER_SIGN" ? (
          <TargetSignaturePicker
            t={t}
            value={form.targetSignatureId}
            targets={targets}
            scanning={scanningTargets}
            onChange={(value) => onUpdate("targetSignatureId", value)}
          />
        ) : null}

        {appearanceSupported ? (
          <label className="flex items-center gap-2 text-[11.5px] text-fg">
            <input
              type="checkbox"
              checked={form.visibleSignature}
              onChange={(event) => onUpdate("visibleSignature", event.target.checked)}
              className="size-3.5"
            />
            {c.visibleSignature}
          </label>
        ) : (
          <p className="text-[10.5px] text-fg-muted">{c.appearanceUnsupported}</p>
        )}

        <Field label={c.documentNameLabel} htmlFor="document-name">
          <input
            id="document-name"
            value={form.documentName}
            placeholder={c.documentNamePlaceholder}
            onChange={(event) => onUpdate("documentName", event.target.value)}
            className="h-9 w-full rounded-md border border-border bg-surface px-2 text-[12px] text-fg"
          />
          <p className="mt-1.5 text-[10.5px] text-fg-muted">{c.documentNameHint}</p>
        </Field>
      </div>
    </ConfigCard>
  );
}

/**
 * Dropdown thuật toán ký.
 *
 * Ba quyết định ở đây, và cả ba đều là hàng rào chống một ca hỏng cụ thể:
 *
 * 1. Danh sách đọc từ `algorithmsFor(source, format)` — tức
 *    `algorithmsByFormat[format]` — chứ KHÔNG từ `source.algorithms`. Trường sau
 *    là hợp của mọi định dạng: dựng dropdown từ nó cho phép chọn PSS với file
 *    `.docx` và ăn `422 ALGORITHM_NOT_SUPPORTED`.
 *
 * 2. Nhãn lấy từ `algorithmCatalog[].label` của backend. Bảng nhãn hardcode ở
 *    client lệch pha ngay lần thêm thuật toán tiếp theo — và lệch theo kiểu tệ
 *    nhất: người dùng thấy một tên, file ký ra mang thuật toán khác.
 *
 * 3. Thứ tự giữ NGUYÊN như backend trả (PSS → PKCS#1 → ECDSA, phần tử đầu là
 *    mặc định). `<optgroup>` chỉ gom lại cho dễ đọc, không sắp xếp lại.
 *
 * Nhóm ECDSA vẫn hiện đủ dù chưa biết chứng thư có khoá EC hay không: điều đó
 * chỉ biết được sau khi mở file .p12 bằng mật khẩu — tức sau khi đã bấm Ký. Ghi
 * chú dưới ô là thứ duy nhất làm được từ trước; phần còn lại dựa vào mã lỗi
 * `ALGORITHM_KEY_TYPE_MISMATCH`.
 */
function AlgorithmPicker({
  t,
  source,
  form,
  catalog,
  documentFormat,
  onUpdate,
}: {
  t: Dictionary;
  source: SignatureSource;
  form: SignFormState;
  catalog: AlgorithmCatalog;
  documentFormat?: DocumentFormat;
  onUpdate: <K extends keyof SignFormState>(key: K, value: SignFormState[K]) => void;
}) {
  const c = t.sign.config;
  const available = algorithmsFor(source, documentFormat);
  const groups = groupAlgorithms(available, catalog);
  const restricted =
    Boolean(documentFormat) && available.length < (source.algorithms?.length ?? 0);

  if (available.length === 0) {
    return (
      <Field label={c.algorithmLabel}>
        <p className="text-[11px] text-warning">
          {documentFormat ? c.algorithmNoneForFormat(documentFormat) : c.algorithmNone}
        </p>
      </Field>
    );
  }

  return (
    <Field label={c.algorithmLabel} htmlFor="signature-algorithm">
      <select
        id="signature-algorithm"
        value={form.algorithm}
        onChange={(event) => onUpdate("algorithm", event.target.value)}
        className="h-9 w-full rounded-md border border-border bg-surface px-2 text-[12px] text-fg"
      >
        {groups.map((group) => (
          <optgroup key={group.scheme} label={c.algorithmScheme[group.scheme] ?? group.scheme}>
            {group.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {restricted && documentFormat ? (
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-fg-muted">
          {c.algorithmFormatNote(documentFormat)}
        </p>
      ) : null}

      {requiresEcKey(form.algorithm, catalog) ? (
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-warning">{c.algorithmEcNote}</p>
      ) : null}
    </Field>
  );
}

/**
 * Chữ ký đích của counter-sign. Danh sách quét được từ chính file đang chọn —
 * service không trả id chữ ký về, nên đây là cách duy nhất có sẵn giá trị đúng.
 * Vẫn giữ ô nhập tay cho PDF ký bằng công cụ khác (id dạng `sha256:<hex>`).
 */
function TargetSignaturePicker({
  t,
  value,
  targets,
  scanning,
  onChange,
}: {
  t: Dictionary;
  value: string;
  targets: TargetSignature[];
  scanning: boolean;
  onChange: (value: string) => void;
}) {
  const g = t.sign.target;
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold text-fg-muted" htmlFor="target-signature">
        {g.label}
      </label>

      {scanning ? (
        <p className="text-[11px] text-fg-muted">{g.scanning}</p>
      ) : targets.length > 0 ? (
        <select
          id="target-signature"
          value={targets.some((target) => target.id === value) ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full rounded-md border border-border bg-surface px-2 font-mono text-[11px] text-fg"
        >
          <option value="">{g.choose}</option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.id}
            </option>
          ))}
        </select>
      ) : (
        <p className="mb-1.5 text-[11px] text-warning">{g.none}</p>
      )}

      <input
        aria-label={g.manual}
        value={value}
        placeholder={g.manualPlaceholder}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 font-mono text-[11px] text-fg"
      />
      <p className="mt-1.5 text-[10.5px] leading-relaxed text-fg-muted">{g.hint}</p>
    </div>
  );
}

/**
 * Tệp đã ký chỉ tồn tại trong bộ nhớ của trang này — không có endpoint tải lại.
 * Vì vậy hộp thoại nói rõ điều đó và mời tải ngay, thay vì để người dùng đóng
 * lại rồi đi tìm một nút "tải về" không tồn tại.
 */
function SigningResultDialog({
  t,
  open,
  document,
  source,
  form,
  catalog,
  onClose,
  onSignAgain,
}: {
  t: Dictionary;
  open: boolean;
  document?: SignedDocument;
  source?: SignatureSource;
  form?: SignFormState;
  catalog: AlgorithmCatalog;
  onClose: () => void;
  onSignAgain: () => void;
}) {
  const { toast } = useToast();

  function download() {
    if (!document) return;
    downloadSignedDocument(document);
    toast.success(t.sign.toast.downloadSuccessTitle, document.fileName);
  }

  return (
    <Dialog open={open} onClose={onClose} label={t.sign.result.dialogLabel} className="max-w-125">
      <div className="border-b border-border-muted px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
            <CheckIcon size={18} />
          </span>
          <div>
            <h2 className="text-[16px] font-semibold text-fg">{t.sign.result.title}</h2>
            <p className="mt-1 text-[12.5px] text-fg-muted">{t.sign.result.subtitle}</p>
          </div>
        </div>
      </div>

      <dl className="divide-y divide-border-muted px-5">
        <ResultRow label={t.sign.result.document} value={document?.fileName ?? "—"} />
        <ResultRow
          label={t.sign.result.source}
          value={source ? sourceLabel(source) : "—"}
        />
        <ResultRow
          label={t.sign.result.profile}
          value={form ? `${form.baselineLevel} · ${algorithmLabel(form.algorithm, catalog)}` : "—"}
        />
      </dl>

      <p className="px-5 pb-1 pt-3 text-[11.5px] leading-relaxed text-fg-muted">
        {t.sign.result.inMemoryNote}
      </p>
      {/* Nút "ký lại" vứt bỏ kết quả vừa ký — phải nói trước, không phải nói sau. */}
      <p className="px-5 pb-1 pt-2 text-[11.5px] leading-relaxed text-fg-muted">
        {t.sign.result.signAgainHint}
      </p>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border-muted px-5 py-3">
        <button
          type="button"
          onClick={onSignAgain}
          disabled={!document}
          className="h-8.5 rounded-md border border-border bg-surface px-4 text-[12.5px] font-semibold text-fg disabled:opacity-55"
        >
          {t.sign.result.signAgainSameSignature}
        </button>
        <button
          type="button"
          onClick={download}
          disabled={!document}
          className="flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg disabled:opacity-55"
        >
          <DownloadIcon size={14} />
          {t.sign.result.download}
        </button>
      </div>
    </Dialog>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-4 py-3 text-[12.5px]">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="truncate text-right font-semibold text-fg">{value}</dd>
    </div>
  );
}
