import type { BaselineLevel, DocumentFormat, SignatureMode } from "@/lib/types/signing";
import type { SignaturePosition } from "@/features/signing/components/sign-document-preview";

/**
 * Mô hình của một YÊU CẦU KÝ nhiều bước — khác hẳn màn ký một mình ở `/`.
 *
 * Ở màn `/` người dùng tự ký ngay trên trình duyệt: một tệp, một nguồn khoá, một
 * chữ ký. Ở đây họ SOẠN một quy trình cho người khác chạy: nhiều bước, mỗi bước
 * nhiều người ký song song, và người ký thật sự ký ở lúc khác, trên máy khác.
 *
 * Hai luật của mô hình, và cả hai đều là ngữ nghĩa của backend chứ không phải
 * quy ước hiển thị:
 *
 * 1. **Bước 1 là CO_SIGN, mọi bước sau là COUNTER_SIGN.** Chữ ký trong cùng một
 *    bước song song với nhau (không cái nào ký đè cái nào); chữ ký ở bước N ký
 *    ĐÈ lên toàn bộ chữ ký của các bước 1…N-1. Vì thế thứ tự bước là dữ liệu có
 *    nghĩa — kéo đổi chỗ hai bước là đổi hẳn cây chữ ký, không phải đổi cách sắp
 *    xếp màn hình.
 * 2. **`targetSignatureId` không tồn tại lúc soạn.** Id chữ ký chỉ có sau khi
 *    chữ ký ở bước trước được tạo ra thật. Bản nháp chỉ mô tả QUAN HỆ (bước này
 *    counter-sign những bước nào); id được điền lúc phát lệnh ký cho từng người.
 *
 * Đây là bản dựng giao diện: không có route API nào phía sau, mọi thứ sống trong
 * state của trang. Chỗ nào sau này phải nối vào dịch vụ thật đều được ghi chú.
 */

/* ------------------------------------------------------------------ *
 * Người ký
 * ------------------------------------------------------------------ */

/**
 * Hai cách một người tới được lệnh ký:
 * - `system` — tài khoản có sẵn trên hệ thống, đăng nhập rồi thấy việc trong
 *   hàng chờ của mình.
 * - `link` — người ngoài hệ thống, nhận một liên kết ký kèm bước xác thực riêng.
 *   Chỉ cần một địa chỉ email để gửi.
 */
export type SignerKind = "system" | "link";

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  department: string;
  /** Chứng thư mặc định của người này — hiện để người soạn biết họ ký được. */
  credential: string;
}

export interface SlotSigner {
  kind: SignerKind;
  /** Chỉ có với `system`. */
  userId?: string;
  name: string;
  email: string;
  department?: string;
}

/* ------------------------------------------------------------------ *
 * Cấu hình chữ ký của một ô
 * ------------------------------------------------------------------ */

/**
 * Cách người ký chạm tới khoá riêng. Trùng với các nguồn mà dịch vụ ký đang có
 * (xem `interactionModel` trong `lib/types/signing.ts`) vì đây chính là thứ
 * quyết định người ký thấy màn chờ nào sau khi bấm Ký.
 */
export type SignMethodId = "MPKI_APP" | "ESIGN_OTP" | "USB_TOKEN" | "PKCS12";

export const SIGN_METHODS: readonly SignMethodId[] = [
  "MPKI_APP",
  "ESIGN_OTP",
  "USB_TOKEN",
  "PKCS12",
];

/**
 * Người nhận link không cầm được token cắm vào máy của tổ chức và cũng không
 * nên được yêu cầu tải một tệp `.p12` lên — hai nguồn đó chỉ dành cho người
 * trong hệ thống.
 */
export const LINK_SIGN_METHODS: readonly SignMethodId[] = ["MPKI_APP", "ESIGN_OTP"];

export const ALGORITHM_IDS: readonly string[] = [
  "RSA_PSS_SHA256",
  "RSA_PSS_SHA384",
  "RSA_PSS_SHA512",
  "RSA_PKCS1_SHA256",
  "RSA_PKCS1_SHA384",
  "RSA_PKCS1_SHA512",
  "ECDSA_SHA256",
  "ECDSA_SHA384",
  "ECDSA_SHA512",
];

export const BASELINE_LEVELS: readonly BaselineLevel[] = ["B", "T", "LT", "LTA"];

export interface SlotConfig {
  method: SignMethodId;
  algorithm: string;
  baselineLevel: BaselineLevel;
  /** Chữ ký hiện lên trang giấy hay chỉ nằm trong cấu trúc tệp. */
  visible: boolean;
  /** Chỉ dùng khi tài liệu là PDF và `visible` bật. */
  position: SignaturePosition;
  reason: string;
  location: string;
}

/* ------------------------------------------------------------------ *
 * Ô chữ ký và bước ký
 * ------------------------------------------------------------------ */

export interface SignatureSlot {
  id: string;
  /** Chưa gán ai — ô vẫn tồn tại để giữ chỗ, nhưng chặn việc tạo yêu cầu. */
  signer?: SlotSigner;
  /**
   * Tên VAI khi ô này đến từ một mẫu: "Kế toán trưởng", "Bên A".
   *
   * Ô trống của một mẫu không phải ô trống bình thường — nó đã biết chỗ ký này
   * dùng để làm gì, chỉ chưa biết ai đứng vào. Giữ lại nhãn đó là khác biệt giữa
   * "Chọn người ký" và "Kế toán trưởng — chưa chọn ai".
   */
  roleName?: string;
  /**
   * `code` của vai trong mẫu đã publish — thứ `POST /api/signing-requests` dùng
   * để biết ô này ứng với vai nào.
   *
   * Khác `roleName` ở chỗ nó là ĐỊNH DANH chứ không phải nhãn: nhãn đổi được và
   * dịch được, mã thì phải khớp từng ký tự với bản đã publish.
   */
  roleCode?: string;
  /**
   * Số khung chữ ký mà vai này có trên tài liệu, khi mẫu đặt nhiều hơn một
   * (ví dụ ký cả trang đầu lẫn trang cuối).
   *
   * Chỉ để hiển thị. Sơ đồ vẫn vẽ một ô cho một vai vì "ai ký, sau ai" là câu
   * hỏi của màn này, còn vị trí thì bản đã publish quyết định — yêu cầu ký từ
   * mẫu KHÔNG gửi toạ độ lên, backend tự chép.
   */
  slotCount?: number;
  config: SlotConfig;
  /** Thời điểm ký, chỉ có sau khi yêu cầu đã chạy. ISO 8601. */
  signedAt?: string;
  /** Người ký từ chối — nhánh hỏng, giữ lại lý do để hiện trên tiến trình. */
  declinedAt?: string;
  declineReason?: string;
}

/**
 * `ALL` — mọi người trong bước phải ký thì bước mới xong (mặc định, và là thứ
 * duy nhất đúng với phần lớn quy trình phê duyệt). `ANY` — một người ký là đủ,
 * dùng cho các bước "bất kỳ ai trong nhóm trực".
 */
export type StepRule = "ALL" | "ANY";

export interface FlowStep {
  id: string;
  /** Tên do người soạn đặt; rỗng thì hiển thị "Bước N". */
  name: string;
  rule: StepRule;
  slots: SignatureSlot[];
}

export interface SignRequestDraft {
  name: string;
  message: string;
  /** `yyyy-mm-dd`, rỗng nghĩa là không đặt hạn. */
  deadline: string;
  remindSigners: boolean;
  notifyOnComplete: boolean;
  steps: FlowStep[];
}

/**
 * Một yêu cầu ký ĐÃ PHÁT.
 *
 * Nó là hợp của hai nguồn, và ranh giới giữa chúng là thứ phải nhớ khi đọc file
 * này:
 *
 * - Phần đến từ **máy chủ**: `signingRequestId`, `serverStatus`, và trạng thái
 *   đã ký của từng ô (`signedAt`/`declinedAt`, do `mergeServerSigners` đắp vào
 *   cây bước). Đây là sự thật; màn tiến trình đọc lại nó bằng
 *   `GET /api/signing-requests/{id}`.
 * - Phần **chỉ sống ở client**: lời nhắn, hạn ký, cờ nhắc nhở, luật ALL/ANY của
 *   bước, và cấu hình ký của từng ô (phương thức, thuật toán, mức baseline).
 *   `POST /api/signing-requests` không có trường nào chở chúng, nên chúng không
 *   đi đâu cả — giữ lại để màn tiến trình hiển thị đúng thứ người soạn đã chọn,
 *   và để bước ký thật (`POST /api/v1/sign`) dùng về sau.
 *
 * Không trộn lẫn hai phần: mọi thứ ở nhóm sau sẽ MẤT nếu người dùng tải lại
 * trang, còn nhóm trước thì không.
 */
export interface SignRequestRecord extends SignRequestDraft {
  /** UUID do backend cấp. Cũng là mã hiển thị — dịch vụ không sinh mã ngắn nào. */
  signingRequestId: string;
  createdAt: string;
  documentName: string;
  documentSize: number;
  documentFormat?: DocumentFormat;
  sourceType: "TEMPLATE_PREVIEW" | "UPLOADED_DOCUMENT";
  /** Trạng thái mới nhất đọc được từ máy chủ. */
  serverStatus: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  /**
   * Mẫu đã dùng và giá trị đã điền, chụp lại tại thời điểm phát yêu cầu.
   *
   * Chép TÊN mẫu chứ không chỉ id: mẫu sửa được và ngừng phục vụ được, còn yêu
   * cầu đã phát thì phải đọc được mãi. Một bản ghi trỏ tới id của mẫu đã đổi là
   * một bản ghi không giải thích được nữa.
   */
  templateId?: string;
  templateName?: string;
  variableValues?: Record<string, string>;
  /** Cảnh báo do `POST /previews` trả về — biến thiếu, biến thừa. */
  previewWarnings?: string[];
}

/* ------------------------------------------------------------------ *
 * Dựng giá trị mặc định
 * ------------------------------------------------------------------ */

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Khung ký mặc định được RẢI chứ không chồng lên nhau: mỗi ô mới lùi sang phải
 * rồi xuống hàng. Hai chữ ký nằm đè nhau trên cùng toạ độ là lỗi chỉ lộ ra ở tệp
 * PDF cuối cùng — lúc đó thì đã muộn, cả hai người đều ký xong rồi.
 */
export function stagedPosition(index: number): SignaturePosition {
  const column = index % 3;
  const row = Math.floor(index / 3) % 4;
  return {
    page: 1,
    xPct: 0.05 + column * 0.315,
    yPct: 0.74 - row * 0.16,
    widthPct: 0.28,
    heightPct: 0.11,
  };
}

export function createSlot(index: number, signer?: SlotSigner): SignatureSlot {
  const link = signer?.kind === "link";
  return {
    id: nextId("slot"),
    signer,
    config: {
      method: link ? "ESIGN_OTP" : "MPKI_APP",
      algorithm: "RSA_PSS_SHA256",
      baselineLevel: "T",
      visible: true,
      position: stagedPosition(index),
      reason: "",
      location: "",
    },
  };
}

export function createStep(slots: SignatureSlot[] = []): FlowStep {
  return { id: nextId("step"), name: "", rule: "ALL", slots };
}

export function createDraft(): SignRequestDraft {
  return {
    name: "",
    message: "",
    deadline: "",
    remindSigners: true,
    notifyOnComplete: true,
    steps: [createStep()],
  };
}

/* ------------------------------------------------------------------ *
 * Đọc quan hệ giữa các bước
 * ------------------------------------------------------------------ */

export function stepMode(index: number): SignatureMode {
  return index === 0 ? "CO_SIGN" : "COUNTER_SIGN";
}

/** Số chữ ký mà bước `index` sẽ ký đè lên. */
export function signaturesBefore(steps: FlowStep[], index: number): number {
  return steps.slice(0, index).reduce((total, step) => total + step.slots.length, 0);
}

export function totalSlots(steps: FlowStep[]): number {
  return steps.reduce((total, step) => total + step.slots.length, 0);
}

export function countSigned(steps: FlowStep[]): number {
  return steps.reduce(
    (total, step) => total + step.slots.filter((slot) => slot.signedAt).length,
    0,
  );
}

/** Đủ chữ ký để bước này coi như xong chưa — `ANY` chỉ cần một. */
export function isStepComplete(step: FlowStep): boolean {
  if (step.slots.length === 0) return false;
  const signed = step.slots.filter((slot) => slot.signedAt).length;
  return step.rule === "ANY" ? signed >= 1 : signed === step.slots.length;
}

export function hasDecline(steps: FlowStep[]): boolean {
  return steps.some((step) => step.slots.some((slot) => slot.declinedAt));
}

/**
 * Bước đang tới lượt: bước chưa hoàn tất đầu tiên. Trả `-1` khi mọi bước đã
 * xong. Một bước bị từ chối vẫn là bước "đang mở" — quy trình dừng ở đó chứ
 * không nhảy tiếp.
 */
export function activeStepIndex(steps: FlowStep[]): number {
  return steps.findIndex((step) => !isStepComplete(step));
}

export type SlotStatus = "signed" | "declined" | "pending" | "queued";

export function slotStatus(
  steps: FlowStep[],
  stepIndex: number,
  slot: SignatureSlot,
): SlotStatus {
  if (slot.signedAt) return "signed";
  if (slot.declinedAt) return "declined";
  const active = activeStepIndex(steps);
  return active === stepIndex ? "pending" : "queued";
}

export type RequestStatus = "completed" | "declined" | "cancelled" | "running";

/**
 * Trạng thái hiển thị, suy từ trạng thái của MÁY CHỦ chứ không từ việc đếm chữ
 * ký ở client.
 *
 * Hai chỗ hai bên không trùng nhau, và máy chủ đúng: nó biết `COMPLETED` nghĩa
 * là mọi người ký BẮT BUỘC đã ký, còn client đếm hết mọi ô. `declined` không có
 * trong enum của backend (yêu cầu vẫn `IN_PROGRESS` khi một người từ chối), nên
 * nó được suy thêm từ trạng thái của từng người ký — người dùng cần thấy quy
 * trình đang tắc, chứ không phải "đang chạy".
 */
export function requestStatus(record: SignRequestRecord): RequestStatus {
  if (record.serverStatus === "CANCELLED") return "cancelled";
  if (record.serverStatus === "COMPLETED") return "completed";
  if (hasDecline(record.steps)) return "declined";
  return "running";
}

/* ------------------------------------------------------------------ *
 * Kiểm tra bản nháp
 * ------------------------------------------------------------------ */

/**
 * Mã lỗi, không phải câu chữ: câu chữ nằm ở từ điển và đổi theo ngôn ngữ, còn
 * chỗ hỏng thì không.
 */
export type DraftIssueCode =
  | "NO_DOCUMENT"
  | "NO_NAME"
  | "EMPTY_STEP"
  | "SLOT_WITHOUT_SIGNER"
  | "LINK_WITHOUT_EMAIL"
  | "DUPLICATE_IN_STEP"
  | "MISSING_VARIABLE";

export interface DraftIssue {
  code: DraftIssueCode;
  /** Bước liên quan, đánh số từ 0. Thiếu nghĩa là lỗi của cả yêu cầu. */
  stepIndex?: number;
  slotId?: string;
  /** Tên người ký bị trùng — chỉ dùng cho `DUPLICATE_IN_STEP`. */
  signerName?: string;
  /** Nhãn biến còn trống — chỉ dùng cho `MISSING_VARIABLE`. */
  variableLabel?: string;
}

export function validateDraft(draft: SignRequestDraft, document?: File): DraftIssue[] {
  const issues: DraftIssue[] = [];

  if (!document) issues.push({ code: "NO_DOCUMENT" });
  if (!draft.name.trim()) issues.push({ code: "NO_NAME" });

  draft.steps.forEach((step, stepIndex) => {
    if (step.slots.length === 0) {
      issues.push({ code: "EMPTY_STEP", stepIndex });
      return;
    }

    const seen = new Set<string>();
    for (const slot of step.slots) {
      const signer = slot.signer;
      if (!signer) {
        issues.push({ code: "SLOT_WITHOUT_SIGNER", stepIndex, slotId: slot.id });
        continue;
      }
      if (signer.kind === "link" && !signer.email.trim()) {
        issues.push({ code: "LINK_WITHOUT_EMAIL", stepIndex, slotId: slot.id });
      }

      /*
       * Trùng người TRONG một bước là lỗi thật: hai chữ ký song song của cùng
       * một người trên cùng một tài liệu không thêm giá trị pháp lý nào, và
       * người đó sẽ nhận hai lần cùng một việc. Trùng giữa CÁC bước thì hợp lệ
       * — ký với tư cách người soạn ở bước 1 rồi ký duyệt ở bước 3 là quy trình
       * bình thường.
       */
      const key = (signer.userId ?? signer.email.trim().toLowerCase()) || slot.id;
      if (seen.has(key)) {
        issues.push({ code: "DUPLICATE_IN_STEP", stepIndex, slotId: slot.id, signerName: signer.name });
      }
      seen.add(key);
    }
  });

  return issues;
}

export function issuesForStep(issues: DraftIssue[], stepIndex: number): DraftIssue[] {
  return issues.filter((issue) => issue.stepIndex === stepIndex);
}

/* ------------------------------------------------------------------ *
 * Biến đổi cây bước — tất cả đều thuần, trả cấu trúc mới
 * ------------------------------------------------------------------ */

export function addStep(steps: FlowStep[], slots: SignatureSlot[] = []): FlowStep[] {
  return [...steps, createStep(slots)];
}

/** Bỏ một bước. Bước cuối cùng không bỏ được: quy trình phải có tối thiểu một bước. */
export function removeStep(steps: FlowStep[], stepId: string): FlowStep[] {
  if (steps.length <= 1) return steps;
  return steps.filter((step) => step.id !== stepId);
}

export function updateStep(
  steps: FlowStep[],
  stepId: string,
  patch: Partial<Omit<FlowStep, "id" | "slots">>,
): FlowStep[] {
  return steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step));
}

export function moveStep(steps: FlowStep[], from: number, to: number): FlowStep[] {
  if (from === to || from < 0 || to < 0 || from >= steps.length || to >= steps.length) {
    return steps;
  }
  const next = [...steps];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function addSlot(
  steps: FlowStep[],
  stepId: string,
  signer?: SlotSigner,
): FlowStep[] {
  const slot = createSlot(totalSlots(steps), signer);
  return steps.map((step) =>
    step.id === stepId ? { ...step, slots: [...step.slots, slot] } : step,
  );
}

/** Chèn một ô đã dựng sẵn vào đúng vị trí được thả. */
export function insertSlot(
  steps: FlowStep[],
  stepId: string,
  slot: SignatureSlot,
  index?: number,
): FlowStep[] {
  return steps.map((step) => {
    if (step.id !== stepId) return step;
    const slots = [...step.slots];
    const at = index === undefined ? slots.length : Math.min(Math.max(index, 0), slots.length);
    slots.splice(at, 0, slot);
    return { ...step, slots };
  });
}

export function removeSlot(steps: FlowStep[], slotId: string): FlowStep[] {
  return steps.map((step) => ({
    ...step,
    slots: step.slots.filter((slot) => slot.id !== slotId),
  }));
}

export function updateSlot(
  steps: FlowStep[],
  slotId: string,
  patch: Partial<Omit<SignatureSlot, "id">>,
): FlowStep[] {
  return steps.map((step) => ({
    ...step,
    slots: step.slots.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)),
  }));
}

export function findSlot(
  steps: FlowStep[],
  slotId: string,
): { step: FlowStep; stepIndex: number; slot: SignatureSlot; slotIndex: number } | undefined {
  for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
    const step = steps[stepIndex];
    const slotIndex = step.slots.findIndex((slot) => slot.id === slotId);
    if (slotIndex >= 0) {
      return { step, stepIndex, slot: step.slots[slotIndex], slotIndex };
    }
  }
  return undefined;
}

/**
 * Chuyển một ô sang bước khác (hoặc đổi chỗ trong cùng bước).
 *
 * `toIndex` là vị trí trong danh sách ĐÍCH sau khi đã nhấc ô ra — người gọi chỉ
 * cần đưa chỉ số của ô mà nó được thả vào trước; `undefined` là thả xuống cuối.
 */
export function moveSlot(
  steps: FlowStep[],
  slotId: string,
  toStepId: string,
  toIndex?: number,
): FlowStep[] {
  const found = findSlot(steps, slotId);
  if (!found) return steps;

  const stripped = steps.map((step) => ({
    ...step,
    slots: step.slots.filter((slot) => slot.id !== slotId),
  }));

  return stripped.map((step) => {
    if (step.id !== toStepId) return step;
    const slots = [...step.slots];
    const at = toIndex === undefined ? slots.length : Math.min(Math.max(toIndex, 0), slots.length);
    slots.splice(at, 0, found.slot);
    return { ...step, slots };
  });
}

/* ------------------------------------------------------------------ *
 * Đắp trạng thái của máy chủ vào cây bước
 * ------------------------------------------------------------------ */

/** Đúng phần `signers[]` của `GET /api/signing-requests/{id}` mà hàm dưới cần. */
export interface ServerSignerStatus {
  roleCode: string | null;
  userId: string;
  signingOrder: number;
  status: "PENDING" | "SIGNED" | "DECLINED";
  signedAt: string | null;
}

/**
 * Ghép trạng thái từ máy chủ lên cây bước đang giữ ở client.
 *
 * Vì sao phải ghép thay vì dựng lại cây từ response: response chỉ có
 * `signers[]` phẳng với `signingOrder`, không có tên bước, không có luật
 * ALL/ANY, không có cấu hình ký — những thứ đó chưa bao giờ được gửi lên. Dựng
 * lại từ response là vứt đi một nửa thứ người soạn đã chọn.
 *
 * Ghép theo hai khoá, theo đúng cách yêu cầu đã được tạo ra:
 * - Nguồn từ mẫu: theo `roleCode`. Vai là định danh ổn định của một chỗ ký.
 * - Tài liệu tự tải lên: theo CẤP KÝ + `userId`, vì tài liệu trần không có vai
 *   nào. Một người ký hai lần ở hai bước khác nhau là hợp lệ, nên chỉ `userId`
 *   thôi thì không đủ phân biệt.
 *
 * Cấp ký lấy bằng cách gom `signingOrder` của response rồi sắp tăng dần, và bước
 * thứ N của cây client ứng với cấp thứ N. KHÔNG so `stepIndex + 1` thẳng với
 * `signingOrder`: giá trị đọc về là giá trị ĐÃ NÉN của backend, không phải giá
 * trị client gửi lên, nên hai con số đó không có gì bảo đảm bằng nhau.
 *
 * Ô không khớp được với người ký nào giữ nguyên trạng thái cũ — thà hiện "chưa
 * ký" cho một ô đã ký còn hơn gán nhầm chữ ký của người này sang người khác.
 */
export function mergeServerSigners(
  steps: FlowStep[],
  signers: ServerSignerStatus[],
): FlowStep[] {
  const byRole = new Map<string, ServerSignerStatus>();
  const byOrderAndUser = new Map<string, ServerSignerStatus>();
  for (const signer of signers) {
    if (signer.roleCode) byRole.set(signer.roleCode, signer);
    byOrderAndUser.set(`${signer.signingOrder}|${signer.userId}`, signer);
  }

  /* Các cấp ký của máy chủ, tăng dần: phần tử thứ N là cấp của bước thứ N. */
  const levels = [...new Set(signers.map((signer) => signer.signingOrder))].sort(
    (left, right) => left - right,
  );

  return steps.map((step, stepIndex) => ({
    ...step,
    slots: step.slots.map((slot) => {
      const userId = signerIdOf(slot);
      const level = levels[stepIndex];
      const match =
        (slot.roleCode ? byRole.get(slot.roleCode) : undefined) ??
        (userId && level !== undefined
          ? byOrderAndUser.get(`${level}|${userId}`)
          : undefined);
      if (!match) return slot;

      return {
        ...slot,
        signedAt: match.status === "SIGNED" ? (match.signedAt ?? undefined) : undefined,
        declinedAt:
          match.status === "DECLINED" ? (match.signedAt ?? new Date(0).toISOString()) : undefined,
      };
    }),
  }));
}

/**
 * Định danh gửi lên trong `signers[].userId`.
 *
 * Người ngoài hệ thống không có tài khoản, nên địa chỉ email đóng vai định danh.
 * Backend chỉ đòi một chuỗi ≤128 ký tự và không tra cứu nó ở đâu cả — với dịch
 * vụ chưa có xác thực thì email là chuỗi duy nhất còn phân biệt được người này
 * với người kia.
 */
export function signerIdOf(slot: SignatureSlot): string | undefined {
  const signer = slot.signer;
  if (!signer) return undefined;
  const value = (signer.userId ?? signer.email).trim();
  return value ? value.slice(0, 128) : undefined;
}
