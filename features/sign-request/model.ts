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

export interface SignRequestRecord extends SignRequestDraft {
  code: string;
  createdAt: string;
  documentName: string;
  documentSize: number;
  documentFormat?: DocumentFormat;
  cancelledAt?: string;
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

export function requestStatus(record: SignRequestRecord): RequestStatus {
  if (record.cancelledAt) return "cancelled";
  if (hasDecline(record.steps)) return "declined";
  return activeStepIndex(record.steps) === -1 ? "completed" : "running";
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
  | "DUPLICATE_IN_STEP";

export interface DraftIssue {
  code: DraftIssueCode;
  /** Bước liên quan, đánh số từ 0. Thiếu nghĩa là lỗi của cả yêu cầu. */
  stepIndex?: number;
  slotId?: string;
  /** Tên người ký bị trùng — chỉ dùng cho `DUPLICATE_IN_STEP`. */
  signerName?: string;
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
 * Mô phỏng tiến trình (chỉ dành cho bản dựng giao diện)
 * ------------------------------------------------------------------ */

/**
 * Ký hộ ô tiếp theo đang tới lượt, để xem tiến trình chuyển trạng thái mà không
 * cần dịch vụ thật. Không có gì ở đây được dùng lại khi nối vào backend — lúc đó
 * trạng thái đến từ máy chủ.
 */
export function simulateNextSignature(steps: FlowStep[]): FlowStep[] {
  const active = activeStepIndex(steps);
  if (active === -1) return steps;

  const step = steps[active];
  const target = step.slots.find((slot) => !slot.signedAt && !slot.declinedAt);
  if (!target) return steps;

  return updateSlot(steps, target.id, { signedAt: new Date().toISOString() });
}

export function resetProgress(steps: FlowStep[]): FlowStep[] {
  return steps.map((step) => ({
    ...step,
    slots: step.slots.map((slot) => ({
      id: slot.id,
      signer: slot.signer,
      config: slot.config,
    })),
  }));
}

/** Mã yêu cầu hiển thị trên màn tiến trình — dạng `SR-2026-0731`. */
export function makeRequestCode(now = new Date()): string {
  const serial = Math.floor(1000 + Math.random() * 9000);
  return `SR-${now.getFullYear()}-${serial}`;
}
