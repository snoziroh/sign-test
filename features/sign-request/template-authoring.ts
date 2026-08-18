import type { Dictionary } from "@/lib/i18n";
import type {
  ConfigureSignerRoleRequest,
  ConfigureTemplateFieldRequest,
  CreatedTemplateField,
  TemplateDataType,
} from "@/lib/types/workflow";
import {
  rolesInStep,
  type SignTemplate,
  type TemplateRole,
  type TemplateVariable,
  type VariableType,
} from "./template-model";

/**
 * Cầu nối giữa BẢN NHÁP TRONG TRÌNH SOẠN và HAI DTO của máy chủ.
 *
 * Tách riêng khỏi hộp thoại vì đây không phải chuyện giao diện: mỗi hàm dưới đây
 * mã hoá một ràng buộc mà backend sẽ từ chối nếu vi phạm, và chúng cần đọc được
 * cạnh nhau thay vì nằm rải trong một component 2000 dòng.
 *
 * Nguyên tắc: KHÔNG hàm nào ở đây sinh ra định danh của máy chủ. `fieldId` do
 * `POST /api/templates` cấp, và mã vai do người soạn đặt một lần rồi giữ nguyên.
 */

/** Trần dung lượng của backend (`workflow.upload.max-file-size`). */
export const MAX_TEMPLATE_FILE_BYTES = 20 * 1024 * 1024;

/** Backend chỉ đọc được hai định dạng này ở endpoint mẫu — PDF thì không. */
export const TEMPLATE_ACCEPTED_EXTENSIONS = [".docx", ".xlsx"] as const;

/** `CreateTemplateHttpRequest.code`. */
const TEMPLATE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const MAX_TEMPLATE_CODE_LENGTH = 100;
const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_ROLE_CODE_LENGTH = 128;
const MAX_SLOT_CODE_LENGTH = 128;

/**
 * Kiểu dữ liệu của trình soạn → enum của backend.
 *
 * Năm kiểu này ánh xạ một-một, nên không có nhánh nào rơi về `TEXT` một cách âm
 * thầm. `DECIMAL`, `DATETIME` và `BOOLEAN` của backend chưa có ô tương ứng trên
 * giao diện — thêm chúng là thêm ở đây VÀ ở `VARIABLE_TYPES`, không phải một chỗ.
 */
const DATA_TYPE_BY_VARIABLE_TYPE: Record<VariableType, TemplateDataType> = {
  text: "TEXT",
  multiline: "LONG_TEXT",
  number: "NUMBER",
  date: "DATE",
  select: "SELECT",
};

export function backendDataType(type: VariableType): TemplateDataType {
  return DATA_TYPE_BY_VARIABLE_TYPE[type];
}

/** Chuẩn hoá mã mẫu về đúng bộ ký tự backend nhận, và không để lọt ký tự đầu sai. */
export function normalizeTemplateCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "_")
    .replace(/^[^A-Z0-9]+/, "")
    .slice(0, MAX_TEMPLATE_CODE_LENGTH);
}

export function normalizeRoleCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "_")
    .slice(0, MAX_ROLE_CODE_LENGTH);
}

/**
 * Các vai theo ĐÚNG thứ tự ký: bước 1 trước bước 2, trong một bước thì theo thứ
 * tự người soạn thêm vào. `displayOrder` đếm từ đây, nên nó khớp đúng thứ tự
 * người soạn đang nhìn thấy; `signingOrder` thì lấy từ `stepIndex` của vai.
 */
export function orderedRoles(draft: SignTemplate): TemplateRole[] {
  return draft.steps.flatMap((_, stepIndex) => rolesInStep(draft, stepIndex));
}

/** Mã khung chữ ký, suy từ mã vai nên cũng đứng yên khi đổi nhãn. */
export function slotCodeFor(role: TemplateRole): string {
  const suffix = "_SIGN";
  const base = normalizeRoleCode(role.code).slice(0, MAX_SLOT_CODE_LENGTH - suffix.length);
  return `${base}${suffix}`;
}

/* ------------------------------------------------------------------ *
 * PUT …/fields
 * ------------------------------------------------------------------ */

/**
 * Dựng thân `PUT …/fields`.
 *
 * Duyệt theo DANH SÁCH CỦA MÁY CHỦ chứ không theo danh sách trong bản nháp: yêu
 * cầu phải chứa đúng một lần mỗi `fieldId` backend đã dò được, và `displayOrder`
 * phải liên tục từ 0. Lấy thứ tự từ mảng của máy chủ là cả hai điều kiện tự đúng,
 * kể cả khi trình soạn còn giữ một biến đã biến mất khỏi tệp.
 *
 * Biến chưa được cấu hình trên giao diện vẫn được gửi kèm giá trị mặc định hợp
 * lệ — thiếu một ô là cả lời gọi bị từ chối, và bỏ trống nhãn thì publish sẽ
 * chặn sau đó vì ô chưa `configured`.
 */
export function toFieldRequests(
  serverFields: CreatedTemplateField[],
  variables: TemplateVariable[],
): ConfigureTemplateFieldRequest[] {
  const byCode = new Map(variables.map((variable) => [variable.key, variable]));

  return serverFields.map((field, index) => {
    const variable = byCode.get(field.code);
    const type = variable?.type ?? "text";
    const dataType = backendDataType(type);

    return {
      fieldId: field.fieldId,
      label: variable?.label.trim() || field.code,
      description: variable?.hint.trim() || null,
      dataType,
      required: variable?.required ?? true,
      /*
       * Trình soạn chỉ dựng được ô người dùng tự điền. `SYSTEM`/`SIGNER` đòi một
       * `sourceReference` có trong registry của backend, mà giao diện chưa có
       * chỗ chọn — gửi chúng là chắc chắn 400.
       */
      sourceType: "MANUAL",
      sourceReference: null,
      defaultValue: variable?.defaultValue.trim() || null,
      /* `MANUAL` bắt buộc cho nhập tay; `allowOverride` lại đòi `allowManualInput`. */
      allowManualInput: true,
      allowSourceLink: false,
      allowOverride: false,
      displayOrder: index,
      validationConfig: validationConfigFor(dataType, variable),
      /* Bộ khoá của `formatConfig` bị backend kiểm rất chặt và giao diện chưa dùng tới. */
      formatConfig: {},
    };
  });
}

function validationConfigFor(
  dataType: TemplateDataType,
  variable?: TemplateVariable,
): Record<string, unknown> {
  if (dataType !== "SELECT") return {};
  return { options: selectOptions(variable) };
}

/** Backend đòi mảng không rỗng, mỗi phần tử là chuỗi đã trim, không trùng nhau. */
export function selectOptions(variable?: TemplateVariable): string[] {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const raw of variable?.options ?? []) {
    const option = raw.trim();
    if (!option || seen.has(option)) continue;
    seen.add(option);
    options.push(option);
  }
  return options;
}

/* ------------------------------------------------------------------ *
 * PUT …/signers
 * ------------------------------------------------------------------ */

/**
 * Dựng thân `PUT …/signers`, khung chữ ký nằm luôn trong từng vai.
 *
 * `signingOrder` là BƯỚC ký, lấy thẳng từ `stepIndex` của vai: hai vai trong
 * cùng một bước gửi cùng số và backend hiểu là ký SONG SONG. Không đánh số lại
 * và không kiểm tra tính liên tục — backend nén về `1..K` theo thứ tự tăng dần,
 * nên một bước rỗng ở giữa (đã bị `authoringBlockers` chặn vì lý do khác) cũng
 * không làm lệch các bước sau.
 *
 * `displayOrder` chạy 0..N-1 theo thứ tự phẳng của các vai — đúng thứ tự người
 * soạn nhìn thấy, và backend giữ nguyên thứ tự đó khi trả về.
 */
export function toSignerRoleRequests(draft: SignTemplate): ConfigureSignerRoleRequest[] {
  return orderedRoles(draft).map((role, index) => ({
    code: normalizeRoleCode(role.code),
    label: role.name.trim(),
    description: null,
    signingOrder: role.stepIndex + 1,
    /* V1 của backend từ chối vai không bắt buộc và mọi `selectionType` khác. */
    required: true,
    selectionType: "ANY_USER",
    selectionConfig: {},
    allowChangeSigner: true,
    displayOrder: index,
    signatureSlots: [
      {
        code: slotCodeFor(role),
        title: role.name.trim() || null,
        page: role.config.position.page,
        /* Chuẩn hoá 0..1 gốc trên-trái — đúng hệ backend nhận, không lật trục. */
        x: role.config.position.xPct,
        y: role.config.position.yPct,
        width: role.config.position.widthPct,
        height: role.config.position.heightPct,
        required: true,
        /*
         * Một khung một vai. `displayOrder` là thứ tự trong PHẠM VI MỘT VAI và
         * backend tự đánh lại `0..n-1`, nên giá trị nào cũng ra `0` — để `0` cho
         * đúng nghĩa, không phải vì một luật liên tục nào.
         */
        displayOrder: 0,
        appearanceConfig: {
          method: role.config.method,
          algorithm: role.config.algorithm,
          baselineLevel: role.config.baselineLevel,
          reason: role.config.reason,
          location: role.config.location,
        },
      },
    ],
  }));
}

/* ------------------------------------------------------------------ *
 * Kiểm tra trước khi gọi
 * ------------------------------------------------------------------ */

export interface AuthoringContext {
  /** Câu chữ của các blocker cũng hiện trên màn hình, nên chúng phải theo ngôn ngữ đang chọn. */
  t: Dictionary;
  code: string;
  draft?: SignTemplate;
  serverFields: CreatedTemplateField[];
  pageCount: number;
  hasServerDraft: boolean;
}

/**
 * Mọi lý do khiến máy chủ sẽ từ chối, kể ra bằng tiếng người TRƯỚC khi gọi.
 *
 * Không phải để thay backend kiểm tra — backend vẫn là nơi quyết định. Mà vì các
 * lỗi này trả về dưới dạng mã (`SIGNATURE_SLOT_OUT_OF_BOUNDS`,
 * `FIELD_SET_MISMATCH`) không chỉ ra được vai nào, biến nào, và người soạn thì
 * đang nhìn một sơ đồ có mười ô giống hệt nhau.
 */
export function authoringBlockers(context: AuthoringContext): string[] {
  const { t, code, draft, serverFields, pageCount, hasServerDraft } = context;
  const m = t.signRequest.template.builder.blockers;
  const issues: string[] = [];

  const trimmedCode = code.trim();
  if (!trimmedCode) issues.push(m.codeMissing);
  else if (!TEMPLATE_CODE_PATTERN.test(trimmedCode)) issues.push(m.codeInvalid);
  else if (trimmedCode.length > MAX_TEMPLATE_CODE_LENGTH) {
    issues.push(m.codeTooLong(MAX_TEMPLATE_CODE_LENGTH));
  }

  if (!draft) {
    issues.push(m.noDocument);
    return issues;
  }

  if (!draft.name.trim()) issues.push(m.nameMissing);
  else if (draft.name.trim().length > MAX_NAME_LENGTH) {
    issues.push(m.nameTooLong(MAX_NAME_LENGTH));
  }

  if (draft.description.trim().length > MAX_DESCRIPTION_LENGTH) {
    issues.push(m.descriptionTooLong(MAX_DESCRIPTION_LENGTH));
  }

  if (!hasServerDraft) issues.push(m.notAnalyzed);

  issues.push(...variableBlockers(m, serverFields, draft.variables));
  issues.push(...roleBlockers(m, draft));
  issues.push(...slotBlockers(m, draft, pageCount));

  return [...new Set(issues)];
}

type BlockerMessages = Dictionary["signRequest"]["template"]["builder"]["blockers"];

function variableBlockers(
  m: BlockerMessages,
  serverFields: CreatedTemplateField[],
  variables: TemplateVariable[],
): string[] {
  const issues: string[] = [];
  const byCode = new Map(variables.map((variable) => [variable.key, variable]));

  for (const field of serverFields) {
    const variable = byCode.get(field.code);
    if (!variable) continue;

    if (variable.type !== "select") continue;

    const options = selectOptions(variable);
    if (options.length === 0) {
      issues.push(m.selectNoOptions(field.code));
      continue;
    }

    const fallback = variable.defaultValue.trim();
    if (fallback && !options.includes(fallback)) {
      issues.push(m.defaultNotInOptions(field.code));
    }
  }

  return issues;
}

function roleBlockers(m: BlockerMessages, draft: SignTemplate): string[] {
  const issues: string[] = [];
  const roles = orderedRoles(draft);

  if (roles.length === 0) {
    issues.push(m.noRoles);
    return issues;
  }

  /*
   * Bước rỗng vẫn là lỗi — nó không diễn đạt được gì và backend đòi tập bước
   * liên tục từ 1 lúc publish. Nhưng NHIỀU VAI trong một bước thì không: đó là
   * ký song song, và backend nhận đúng như thế.
   */
  draft.steps.forEach((_, stepIndex) => {
    if (rolesInStep(draft, stepIndex).length === 0) {
      issues.push(m.emptyStep(stepIndex + 1));
    }
  });

  const usedCodes = new Set<string>();
  for (const role of roles) {
    const label = role.name.trim() || m.unnamedRole;
    const roleCode = normalizeRoleCode(role.code).trim();

    if (!role.name.trim()) issues.push(m.roleUnnamed);

    if (!roleCode) issues.push(m.roleNoCode(label));
    else if (usedCodes.has(roleCode)) issues.push(m.duplicateRoleCode(roleCode));
    else usedCodes.add(roleCode);

    if (!role.config.visible) {
      /*
       * Backend đòi mỗi vai bắt buộc phải có ít nhất một khung chữ ký bắt buộc,
       * và mọi vai của mẫu đều là bắt buộc. Chữ ký vô hình vì thế không publish
       * được — chặn ở đây thay vì để hỏng ở bước cuối.
       */
      issues.push(m.roleInvisible(label));
    }
  }

  return issues;
}

function slotBlockers(m: BlockerMessages, draft: SignTemplate, pageCount: number): string[] {
  const issues: string[] = [];
  const placed: { label: string; role: TemplateRole }[] = [];

  for (const role of orderedRoles(draft)) {
    if (!role.config.visible) continue;

    const label = role.name.trim() || m.unnamedRole;
    const { page, xPct, yPct, widthPct, heightPct } = role.config.position;

    if (pageCount > 0 && (page < 1 || page > pageCount)) {
      issues.push(m.slotPageOutOfRange(label, page, pageCount));
    }

    if (widthPct <= 0 || heightPct <= 0) {
      issues.push(m.slotNoSize(label));
    } else if (xPct < 0 || yPct < 0 || xPct + widthPct > 1 || yPct + heightPct > 1) {
      issues.push(m.slotOutOfBounds(label));
    }

    placed.push({ label, role });
  }

  /* Backend từ chối hai khung đè nhau, kể cả khi chúng thuộc hai vai khác nhau. */
  for (let first = 0; first < placed.length; first += 1) {
    for (let second = first + 1; second < placed.length; second += 1) {
      if (overlaps(placed[first].role, placed[second].role)) {
        issues.push(m.slotOverlap(placed[first].label, placed[second].label));
      }
    }
  }

  return issues;
}

function overlaps(left: TemplateRole, right: TemplateRole): boolean {
  const a = left.config.position;
  const b = right.config.position;
  if (a.page !== b.page) return false;

  return (
    a.xPct < b.xPct + b.widthPct &&
    b.xPct < a.xPct + a.widthPct &&
    a.yPct < b.yPct + b.heightPct &&
    b.yPct < a.yPct + a.heightPct
  );
}
