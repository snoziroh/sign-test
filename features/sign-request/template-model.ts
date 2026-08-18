import type { DocumentFormat } from "@/lib/types/signing";
import {
  createStep,
  createSlot,
  stagedPosition,
  type DraftIssue,
  type FlowStep,
  type SignatureSlot,
  type SlotConfig,
  type SlotSigner,
  type StepRule,
} from "./model";
import { DIRECTORY } from "./directory";

/**
 * MẪU YÊU CẦU KÝ — thứ biến việc soạn một yêu cầu từ "dựng lại cả quy trình"
 * thành "điền vào chỗ trống".
 *
 * Quan sát đứng sau: trong một tổ chức, phần lớn yêu cầu ký KHÔNG mới. Cùng một
 * tờ hợp đồng, cùng chừng ấy chỗ ký, cùng thứ tự duyệt, tháng nào cũng chạy vài
 * chục lần; cái duy nhất đổi là mấy con số và tên đối tác. Bắt người soạn dựng
 * lại luồng ký từ đầu mỗi lần là bắt họ lặp lại một quyết định đã chốt từ lâu —
 * và mỗi lần lặp là một cơ hội đặt sai vị trí chữ ký hoặc quên một người duyệt.
 *
 * Vì thế một mẫu đóng gói ĐÚNG những gì lặp lại:
 *
 * - **Tệp nền** kèm các biến `{{ten_bien}}` nằm ngay trong nội dung. Biến là
 *   text thật trong tệp chứ không phải siêu dữ liệu bên cạnh — nhờ vậy người
 *   soạn mẫu nhìn thấy chỗ trống ở đúng nơi nó sẽ được điền.
 * - **Số chữ ký và chỗ ký**: mỗi chỗ ký là một VAI (`TemplateRole`) — "Kế toán
 *   trưởng", "Giám đốc" — chứ không phải một con người. Vai giữ nguyên qua mọi
 *   lần dùng mẫu; người ký thì đổi.
 * - **Cấu hình ký của từng vai**: thuật toán, mức baseline, cách xác thực, và
 *   vị trí khung chữ ký trên trang. Đây là phần người dùng cuối hay chọn sai
 *   nhất và cũng là phần ít lý do để đổi giữa các lần dùng nhất.
 * - **Thứ tự bước**: các vai được chia vào bước, giữ nguyên ngữ nghĩa
 *   CO_SIGN / COUNTER_SIGN của `model.ts`.
 *
 * Mẫu KHÔNG chứa: người ký cụ thể (chỉ gợi ý), hạn ký tuyệt đối (chỉ số ngày),
 * và giá trị của biến. Ba thứ đó thuộc về từng lần dùng.
 *
 * Vẫn là bản dựng giao diện: mẫu nằm trong `localStorage` của trình duyệt (xem
 * `template-store.ts`), không có endpoint nào phía sau.
 */

/* ------------------------------------------------------------------ *
 * Biến trong tệp
 * ------------------------------------------------------------------ */

/**
 * Cú pháp biến: `{{ten_bien}}`.
 *
 * Chọn dấu ngoặc kép nhọn vì nó gần như không bao giờ xuất hiện tự nhiên trong
 * văn bản hành chính tiếng Việt, và vì mọi bộ soạn thảo đều gõ được — người soạn
 * mẫu chỉ cần mở tệp Word có sẵn và gõ chỗ trống vào, không cần công cụ riêng.
 *
 * Khoảng trắng bên trong được bỏ qua (`{{ ten }}` = `{{ten}}`) vì trình soạn
 * thảo hay tự chèn, nhưng khoá thì chuẩn hoá về dạng không khoảng trắng.
 */
export const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.\-]+)\s*\}\}/g;

export type VariableType = "text" | "multiline" | "number" | "date" | "select";

export const VARIABLE_TYPES: readonly VariableType[] = [
  "text",
  "multiline",
  "number",
  "date",
  "select",
];

export interface TemplateVariable {
  /** Khoá trong tệp, không có dấu ngoặc: `so_hop_dong`. */
  key: string;
  /** Nhãn hiện trên form điền. Rỗng thì dùng chính khoá. */
  label: string;
  /** Câu giải thích dưới ô nhập — chỗ nói rõ định dạng mong đợi. */
  hint: string;
  type: VariableType;
  /** Chỉ dùng với `select`. */
  options: string[];
  required: boolean;
  defaultValue: string;
}

export function createVariable(key: string): TemplateVariable {
  return {
    key,
    label: humanizeKey(key),
    hint: "",
    type: "text",
    options: [],
    required: true,
    defaultValue: "",
  };
}

/** `so_hop_dong` → `So hop dong`. Đoán một lần cho người soạn khỏi gõ lại. */
export function humanizeKey(key: string): string {
  const words = key.replace(/[_\-.]+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : key;
}

/** Mọi khoá biến xuất hiện trong một đoạn text, theo thứ tự gặp, không trùng. */
export function variableKeysIn(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(VARIABLE_PATTERN)) found.add(match[1]);
  return [...found];
}

/**
 * Thay biến bằng giá trị.
 *
 * Biến chưa có giá trị được GIỮ NGUYÊN dạng `{{ten}}` chứ không xoá thành chuỗi
 * rỗng: một hợp đồng thiếu số hợp đồng phải trông như hỏng, không được trông
 * như bình thường. Chỗ nào cần biết "còn thiếu gì" thì hỏi `missingVariables`.
 */
export function resolveText(text: string, values: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (token, key: string) => {
    const value = values[key];
    return value !== undefined && value !== "" ? value : token;
  });
}

export function defaultValues(template: SignTemplate): Record<string, string> {
  const values: Record<string, string> = {};
  for (const variable of template.variables) values[variable.key] = variable.defaultValue;
  return values;
}

/** Biến bắt buộc mà chưa có giá trị. */
export function missingVariables(
  template: SignTemplate,
  values: Record<string, string>,
): TemplateVariable[] {
  return template.variables.filter(
    (variable) => variable.required && !(values[variable.key] ?? "").trim(),
  );
}

export function filledCount(
  template: SignTemplate,
  values: Record<string, string>,
): number {
  return template.variables.filter((variable) => (values[variable.key] ?? "").trim()).length;
}

/* ------------------------------------------------------------------ *
 * Vai ký và bước
 * ------------------------------------------------------------------ */

export interface TemplateRole {
  id: string;
  /**
   * Mã nghiệp vụ của vai, gửi lên máy chủ và ĐỨNG YÊN suốt đời vai đó.
   *
   * Tách khỏi `name` vì hai thứ này có vòng đời khác nhau: đổi nhãn "Giám đốc"
   * thành "Tổng giám đốc" là việc trình bày, còn đổi mã là tạo ra một vai khác —
   * mọi yêu cầu ký đã phát đều gắn người ký theo mã này. Suy lại mã từ nhãn ở
   * mỗi lần lưu sẽ âm thầm làm đúng chuyện đó.
   */
  code: string;
  /** "Giám đốc", "Bên A" — nhãn của CHỖ ký, không phải tên người. */
  name: string;
  /** Bước chứa vai này, đánh số từ 0. */
  stepIndex: number;
  /**
   * Người thường ký ở vai này. Chỉ là gợi ý: người tạo yêu cầu vẫn đổi được, và
   * mẫu vẫn dùng được sau khi người đó rời tổ chức (id không khớp thì bỏ qua).
   */
  suggestedUserId?: string;
  config: SlotConfig;
}

export interface TemplateStepPlan {
  /** Rỗng thì màn hình gọi nó là "Bước N". */
  name: string;
  rule: StepRule;
}

/* ------------------------------------------------------------------ *
 * Mẫu
 * ------------------------------------------------------------------ */

/**
 * Mô tả tệp nguồn — CHỈ mô tả, không có nội dung.
 *
 * Sau `POST /api/templates` thì máy chủ đã giữ tệp gốc, và mọi thứ frontend cần
 * sau đó (PDF preview, danh sách biến, số trang) đều lấy từ `templateId` +
 * `versionId`. Giữ thêm một bản base64 trong bộ nhớ trình duyệt không phục vụ
 * bước nào cả, chỉ tạo ra một nguồn sự thật thứ hai có thể lệch với máy chủ.
 */
export interface TemplateFile {
  name: string;
  size: number;
  format?: DocumentFormat;
}

export interface SignTemplate {
  id: string;
  name: string;
  description: string;
  file: TemplateFile;
  variables: TemplateVariable[];
  steps: TemplateStepPlan[];
  roles: TemplateRole[];
  /** Tên yêu cầu dựng sẵn, dùng được biến: `Hợp đồng {{so_hop_dong}}`. */
  requestNamePattern: string;
  messagePattern: string;
  /** Hạn ký = ngày tạo + số ngày. Bỏ trống nghĩa là không đặt hạn. */
  deadlineDays?: number;
  remindSigners: boolean;
  notifyOnComplete: boolean;
  createdAt: string;
  updatedAt: string;
  /** Mẫu dựng sẵn của bản demo — sửa và xoá được, chỉ khác ở nhãn nguồn gốc. */
  builtIn?: boolean;
}

let sequence = 0;
export function nextTemplateId(prefix = "tpl"): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Mã mặc định cho một vai mới: `SIGNER_1`, `SIGNER_2`… bỏ qua những số đã dùng.
 *
 * Sinh ĐÚNG MỘT LẦN, lúc tạo vai. Người soạn sửa lại được thành mã có nghĩa
 * (`DIRECTOR`), nhưng từ đó về sau nó không tự đổi theo nhãn nữa.
 */
export function nextRoleCode(existing: TemplateRole[]): string {
  const used = new Set(existing.map((role) => role.code.trim().toUpperCase()));
  let index = existing.length + 1;
  while (used.has(`SIGNER_${index}`)) index += 1;
  return `SIGNER_${index}`;
}

export function createRole(
  stepIndex: number,
  positionIndex: number,
  code = `SIGNER_${positionIndex + 1}`,
): TemplateRole {
  return {
    id: nextTemplateId("role"),
    code,
    name: "",
    stepIndex,
    config: {
      method: "MPKI_APP",
      algorithm: "RSA_PSS_SHA256",
      baselineLevel: "T",
      visible: true,
      position: stagedPosition(positionIndex),
      reason: "",
      location: "",
    },
  };
}

export function createTemplate(file: TemplateFile): SignTemplate {
  const now = new Date().toISOString();
  return {
    id: nextTemplateId(),
    name: "",
    description: "",
    file,
    variables: [],
    steps: [{ name: "", rule: "ALL" }],
    roles: [createRole(0, 0)],
    requestNamePattern: "",
    messagePattern: "",
    remindSigners: true,
    notifyOnComplete: true,
    createdAt: now,
    updatedAt: now,
  };
}

/** Số chữ ký mà mẫu yêu cầu — con số người dùng nhìn trước khi chọn mẫu. */
export function templateSignatureCount(template: SignTemplate): number {
  return template.roles.length;
}

export function rolesInStep(template: SignTemplate, stepIndex: number): TemplateRole[] {
  return template.roles.filter((role) => role.stepIndex === stepIndex);
}

/** Mọi biến mà mẫu dùng ở bất kỳ đâu — nội dung tệp thì `template-document.ts` quét. */
export function patternVariableKeys(template: SignTemplate): string[] {
  const text = [
    template.requestNamePattern,
    template.messagePattern,
    ...template.roles.flatMap((role) => [role.config.reason, role.config.location]),
  ].join("\n");
  return variableKeysIn(text);
}

/* ------------------------------------------------------------------ *
 * Biến đổi mẫu — thuần, trả cấu trúc mới
 * ------------------------------------------------------------------ */

export function addTemplateStep(template: SignTemplate): SignTemplate {
  return { ...template, steps: [...template.steps, { name: "", rule: "ALL" }] };
}

/**
 * Bỏ một bước và mọi vai trong đó, rồi DỒN chỉ số của các bước sau.
 *
 * Dồn chỉ số là bắt buộc chứ không phải dọn dẹp cho đẹp: `stepIndex` là chỉ số
 * mảng, để hổng một số ở giữa là dựng ra một bước rỗng vô hình lúc áp mẫu.
 */
export function removeTemplateStep(template: SignTemplate, stepIndex: number): SignTemplate {
  if (template.steps.length <= 1) return template;
  return {
    ...template,
    steps: template.steps.filter((_, index) => index !== stepIndex),
    roles: template.roles
      .filter((role) => role.stepIndex !== stepIndex)
      .map((role) =>
        role.stepIndex > stepIndex ? { ...role, stepIndex: role.stepIndex - 1 } : role,
      ),
  };
}

export function moveTemplateStep(
  template: SignTemplate,
  from: number,
  to: number,
): SignTemplate {
  if (from === to || to < 0 || to >= template.steps.length) return template;
  const steps = [...template.steps];
  const [moved] = steps.splice(from, 1);
  steps.splice(to, 0, moved);

  return {
    ...template,
    steps,
    roles: template.roles.map((role) => {
      if (role.stepIndex === from) return { ...role, stepIndex: to };
      // Các bước nằm giữa `from` và `to` bị đẩy đúng một nấc, theo chiều di chuyển.
      if (from < to && role.stepIndex > from && role.stepIndex <= to) {
        return { ...role, stepIndex: role.stepIndex - 1 };
      }
      if (from > to && role.stepIndex >= to && role.stepIndex < from) {
        return { ...role, stepIndex: role.stepIndex + 1 };
      }
      return role;
    }),
  };
}

export function updateTemplateStep(
  template: SignTemplate,
  stepIndex: number,
  patch: Partial<TemplateStepPlan>,
): SignTemplate {
  return {
    ...template,
    steps: template.steps.map((step, index) =>
      index === stepIndex ? { ...step, ...patch } : step,
    ),
  };
}

export function addTemplateRole(template: SignTemplate, stepIndex: number): SignTemplate {
  return {
    ...template,
    roles: [
      ...template.roles,
      createRole(stepIndex, template.roles.length, nextRoleCode(template.roles)),
    ],
  };
}

export function removeTemplateRole(template: SignTemplate, roleId: string): SignTemplate {
  return { ...template, roles: template.roles.filter((role) => role.id !== roleId) };
}

export function updateTemplateRole(
  template: SignTemplate,
  roleId: string,
  patch: Partial<Omit<TemplateRole, "id">>,
): SignTemplate {
  return {
    ...template,
    roles: template.roles.map((role) => (role.id === roleId ? { ...role, ...patch } : role)),
  };
}

export function updateRoleConfig(
  template: SignTemplate,
  roleId: string,
  patch: Partial<SlotConfig>,
): SignTemplate {
  return updateTemplateRole(template, roleId, {
    config: {
      ...(template.roles.find((role) => role.id === roleId)?.config as SlotConfig),
      ...patch,
    },
  });
}

export function addTemplateVariable(
  template: SignTemplate,
  key: string,
): SignTemplate {
  if (template.variables.some((variable) => variable.key === key)) return template;
  return { ...template, variables: [...template.variables, createVariable(key)] };
}

export function removeTemplateVariable(template: SignTemplate, key: string): SignTemplate {
  return { ...template, variables: template.variables.filter((v) => v.key !== key) };
}

export function updateTemplateVariable(
  template: SignTemplate,
  key: string,
  patch: Partial<TemplateVariable>,
): SignTemplate {
  return {
    ...template,
    variables: template.variables.map((variable) =>
      variable.key === key ? { ...variable, ...patch } : variable,
    ),
  };
}

/* ------------------------------------------------------------------ *
 * Kiểm tra mẫu
 * ------------------------------------------------------------------ */

export type TemplateIssueCode =
  | "NO_NAME"
  | "NO_FILE"
  | "NO_ROLE"
  | "ROLE_WITHOUT_NAME"
  | "EMPTY_STEP"
  | "DUPLICATE_VARIABLE_KEY"
  | "SELECT_WITHOUT_OPTIONS"
  | "UNDECLARED_VARIABLE";

export interface TemplateIssue {
  code: TemplateIssueCode;
  stepIndex?: number;
  roleId?: string;
  variableKey?: string;
}

/**
 * `documentKeys` là các biến QUÉT ĐƯỢC từ nội dung tệp. Truyền vào chứ không tự
 * đọc: quét tệp là việc bất đồng bộ và tốn kém, còn hàm này chạy lại ở mỗi lần
 * gõ phím trong trình soạn mẫu.
 */
export function validateTemplate(
  template: SignTemplate,
  documentKeys: string[] = [],
): TemplateIssue[] {
  const issues: TemplateIssue[] = [];

  if (!template.name.trim()) issues.push({ code: "NO_NAME" });
  if (!template.file.name) issues.push({ code: "NO_FILE" });
  if (template.roles.length === 0) issues.push({ code: "NO_ROLE" });

  const seen = new Set<string>();
  for (const variable of template.variables) {
    if (seen.has(variable.key)) {
      issues.push({ code: "DUPLICATE_VARIABLE_KEY", variableKey: variable.key });
    }
    seen.add(variable.key);

    if (variable.type === "select" && variable.options.filter((o) => o.trim()).length === 0) {
      issues.push({ code: "SELECT_WITHOUT_OPTIONS", variableKey: variable.key });
    }
  }

  /*
   * Biến có trong tệp nhưng chưa khai báo là lỗi ĐÁNG NÓI chứ không phải cảnh
   * báo bỏ qua được: người dùng mẫu sẽ không bao giờ được hỏi giá trị của nó, và
   * tài liệu phát đi sẽ mang nguyên chuỗi `{{...}}` ra ngoài.
   */
  const declared = new Set(template.variables.map((variable) => variable.key));
  for (const key of new Set([...documentKeys, ...patternVariableKeys(template)])) {
    if (!declared.has(key)) issues.push({ code: "UNDECLARED_VARIABLE", variableKey: key });
  }

  template.steps.forEach((_, stepIndex) => {
    if (rolesInStep(template, stepIndex).length === 0) {
      issues.push({ code: "EMPTY_STEP", stepIndex });
    }
  });

  for (const role of template.roles) {
    if (!role.name.trim()) issues.push({ code: "ROLE_WITHOUT_NAME", roleId: role.id });
  }

  return issues;
}

/** Biến bắt buộc còn trống, kể ra dưới dạng lỗi của bản nháp yêu cầu ký. */
export function validateTemplateValues(
  template: SignTemplate,
  values: Record<string, string>,
): DraftIssue[] {
  return missingVariables(template, values).map((variable) => ({
    code: "MISSING_VARIABLE" as const,
    variableLabel: variable.label.trim() || variable.key,
  }));
}

/* ------------------------------------------------------------------ *
 * Áp mẫu vào một bản nháp
 * ------------------------------------------------------------------ */

export interface AppliedTemplate {
  steps: FlowStep[];
  name: string;
  message: string;
  deadline: string;
  remindSigners: boolean;
  notifyOnComplete: boolean;
}

/**
 * Dựng cây bước của bản nháp từ mẫu.
 *
 * Người ký gợi ý được gán SẴN vào ô. Đây là chỗ mẫu tiết kiệm nhiều thời gian
 * nhất, và cũng là chỗ dễ gây hại nhất nếu làm lặng lẽ — nên ô vẫn hiện đủ tên
 * người trên sơ đồ để người soạn thấy ngay mình đang gửi cho ai, và đổi được
 * như mọi ô khác.
 *
 * `reason` / `location` của từng vai được thay biến ngay tại đây: chúng đi vào
 * chữ ký chứ không hiện trên tài liệu, nên không có bước nào khác thay hộ.
 */
export function applyTemplate(
  template: SignTemplate,
  values: Record<string, string>,
  now = new Date(),
): AppliedTemplate {
  const steps = template.steps.map((plan, stepIndex) => {
    const slots: SignatureSlot[] = rolesInStep(template, stepIndex).map((role, index) =>
      slotFromRole(role, index, values),
    );
    return { ...createStep(slots), name: plan.name, rule: plan.rule };
  });

  return {
    steps: steps.length > 0 ? steps : [createStep()],
    name: resolveText(template.requestNamePattern, values).trim(),
    message: resolveText(template.messagePattern, values),
    deadline: template.deadlineDays ? addDays(now, template.deadlineDays) : "",
    remindSigners: template.remindSigners,
    notifyOnComplete: template.notifyOnComplete,
  };
}

function slotFromRole(
  role: TemplateRole,
  index: number,
  values: Record<string, string>,
): SignatureSlot {
  const suggested = role.suggestedUserId
    ? DIRECTORY.find((user) => user.id === role.suggestedUserId)
    : undefined;

  const signer: SlotSigner | undefined = suggested
    ? {
        kind: "system",
        userId: suggested.id,
        name: suggested.name,
        email: suggested.email,
        department: suggested.department,
      }
    : undefined;

  const slot = createSlot(index, signer);
  return {
    ...slot,
    roleName: role.name.trim() || undefined,
    config: {
      ...role.config,
      reason: resolveText(role.config.reason, values),
      location: resolveText(role.config.location, values),
    },
  };
}

function addDays(from: Date, days: number): string {
  const date = new Date(from.getTime());
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
