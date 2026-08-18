import type {
  TemplateDataType,
  TemplateDetail,
  TemplateField,
  TemplateSignerRole,
} from "@/lib/types/workflow";
import type { PlaceholderBox } from "./template-document";
import type { TemplateVariable, VariableType } from "./template-model";
import { createSlot, createStep, type FlowStep, type SignatureSlot } from "./model";

/**
 * Dịch một MẪU CỦA MÁY CHỦ sang thứ màn soạn yêu cầu ký đang biết đọc.
 *
 * Hai mô hình không trùng nhau, và chỗ lệch nằm ở chỗ ai quyết định cái gì:
 *
 * - Mẫu của máy chủ là một bản ĐÃ PUBLISH. Số chỗ ký, thứ tự bước và toạ độ từng
 *   khung chữ ký đã chốt trong `version`; người tạo yêu cầu chỉ chọn AI đứng vào
 *   từng vai. Vì thế cây bước dựng ra ở đây là để ĐỌC và GÁN NGƯỜI, không phải
 *   để sửa cấu trúc — `POST /api/signing-requests` với nguồn mẫu còn từ chối
 *   thẳng nếu client gửi kèm toạ độ.
 * - Các ô phải điền là `fields`, đã kèm toạ độ (`boxes`) trên PDF preview. Bản
 *   dựng trước quét `{{bien}}` ngay trên trình duyệt; giờ máy chủ đã quét sẵn,
 *   nên phần quét ở client không còn được dùng cho mẫu.
 *
 * Cái KHÔNG có ở phía máy chủ: phương thức ký, thuật toán, mức baseline của từng
 * vai. Mẫu chỉ mô tả chỗ ký, không mô tả cách ký. Ô mới dựng ra vì thế nhận cấu
 * hình mặc định của `createSlot`, và người soạn đổi được như mọi ô khác.
 */

/* ------------------------------------------------------------------ *
 * Ô phải điền
 * ------------------------------------------------------------------ */

/**
 * Chỉ ô do NGƯỜI dùng điền mới thành một ô nhập.
 *
 * `SYSTEM` (ngày tháng, số hiệu), `SIGNER` (lấy từ hồ sơ người ký), `CONSTANT`
 * và `EXPRESSION` đều do backend tự điền — hỏi người dùng bốn loại đó là hỏi một
 * câu mà câu trả lời sẽ bị bỏ đi. `allowManualInput` mở ngoại lệ cho những ô mà
 * mẫu cho phép ghi đè bằng tay.
 */
export function isFillable(field: TemplateField): boolean {
  return field.sourceType === "MANUAL" || field.allowManualInput;
}

export function fillableFields(detail: TemplateDetail): TemplateField[] {
  return detail.fields
    .filter(isFillable)
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

/**
 * Kiểu dữ liệu của backend → loại ô nhập.
 *
 * `DATETIME` rơi về ô ngày và `DECIMAL` rơi về ô số: `<input type="datetime-local">`
 * trả về chuỗi không cùng định dạng với thứ backend chờ, và tách riêng một loại ô
 * cho phần thập phân không thêm được gì mà ô số chưa làm. `BOOLEAN` thành ô chọn
 * hai giá trị — một checkbox không phân biệt được "chưa trả lời" với "không".
 */
export function variableTypeOf(dataType: TemplateDataType): VariableType {
  switch (dataType) {
    case "LONG_TEXT":
      return "multiline";
    case "NUMBER":
    case "DECIMAL":
      return "number";
    case "DATE":
    case "DATETIME":
      return "date";
    case "SELECT":
    case "BOOLEAN":
      return "select";
    default:
      return "text";
  }
}

/**
 * Danh sách lựa chọn của một ô SELECT.
 *
 * `validationConfig` và `formatConfig` là `Map<String, Object>` tự do ở backend
 * — không có khoá nào được đặt tên trong contract. Dò vài tên hay gặp thay vì
 * chốt một tên: đoán sai thì ô chọn rỗng và người dùng bí, còn dò thừa thì không
 * mất gì. Ô SELECT không dò ra lựa chọn nào sẽ rơi về ô chữ ở `toVariable`, để
 * người dùng vẫn điền được.
 */
const OPTION_KEYS = ["options", "allowedValues", "values", "enum", "choices"] as const;

export function optionsOf(field: TemplateField): string[] {
  if (field.dataType === "BOOLEAN") return ["true", "false"];

  for (const source of [field.validationConfig, field.formatConfig]) {
    for (const key of OPTION_KEYS) {
      const value = source?.[key];
      if (Array.isArray(value)) {
        const options = value.map((item) => String(item)).filter((item) => item.trim());
        if (options.length > 0) return options;
      }
    }
  }
  return [];
}

/** Một `field` của máy chủ dưới hình dạng mà form điền đang biết vẽ. */
export function toVariable(field: TemplateField): TemplateVariable {
  const options = optionsOf(field);
  const type = variableTypeOf(field.dataType);

  return {
    key: field.code,
    label: field.label || field.code,
    hint: field.description ?? "",
    // Ô chọn không có lựa chọn nào là ô không dùng được — thà cho gõ tay.
    type: type === "select" && options.length === 0 ? "text" : type,
    options,
    required: field.required,
    defaultValue: field.defaultValue ?? "",
  };
}

export function templateVariables(detail: TemplateDetail): TemplateVariable[] {
  return fillableFields(detail).map(toVariable);
}

export function templateDefaultValues(detail: TemplateDetail): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fillableFields(detail)) values[field.code] = field.defaultValue ?? "";
  return values;
}

/**
 * Chỗ đứng của từng ô phải điền trên PDF preview, để bản xem trước vẽ giá trị
 * vừa gõ lên đúng chỗ trống.
 *
 * Toạ độ đến thẳng từ máy chủ (`fields[].boxes`, chuẩn hoá 0..1 gốc trên-trái) —
 * cùng hệ quy chiếu với `PlaceholderBox`, nên chỉ đổi tên trường. Một ô xuất
 * hiện nhiều lần trong tài liệu có nhiều box, và cả nhiều box đó đều được vẽ.
 */
export function templatePlaceholderBoxes(detail: TemplateDetail): PlaceholderBox[] {
  return fillableFields(detail).flatMap((field) =>
    field.boxes.map((box) => ({
      key: field.code,
      page: box.page,
      xPct: box.x,
      yPct: box.y,
      widthPct: box.width,
      heightPct: box.height,
    })),
  );
}

/* ------------------------------------------------------------------ *
 * Vai ký → cây bước
 * ------------------------------------------------------------------ */

/**
 * Gom vai theo `signingOrder`: các vai cùng số là một BƯỚC, ký song song.
 *
 * `signingOrder` không đảm bảo liền mạch (1, 2, 5 là hợp lệ ở backend), nên gom
 * rồi sắp xếp chứ không dùng nó làm chỉ số mảng. Sau khi gom, bước thứ N của màn
 * hình là nhóm thứ N — và đó cũng là thứ tự CO_SIGN / COUNTER_SIGN mà `model.ts`
 * suy ra từ vị trí.
 */
export function groupRolesByStep(detail: TemplateDetail): TemplateSignerRole[][] {
  const groups = new Map<number, TemplateSignerRole[]>();
  for (const role of detail.signerRoles) {
    const group = groups.get(role.signingOrder);
    if (group) group.push(role);
    else groups.set(role.signingOrder, [role]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, roles]) => roles.slice().sort((a, b) => a.displayOrder - b.displayOrder));
}

/**
 * Dựng cây bước từ mẫu, mọi ô còn TRỐNG NGƯỜI.
 *
 * Không gán sẵn ai: `selectionType` của backend hiện chỉ có `ANY_USER`, tức mẫu
 * không nêu tên ai cả. Bản dựng trước có "người ký gợi ý" vì mẫu lúc đó nằm ở
 * localStorage và tự khai ra được; giờ thì không có nguồn nào để gợi ý, và bịa
 * ra một cái tên ở màn tạo yêu cầu là cách chắc chắn nhất để gửi nhầm người.
 *
 * Vị trí chữ ký được chép vào `config.position` chỉ để hiển thị. Yêu cầu ký từ
 * mẫu không gửi toạ độ lên — backend chép từ bản đã publish.
 */
export function stepsFromTemplate(detail: TemplateDetail): FlowStep[] {
  const groups = groupRolesByStep(detail);
  if (groups.length === 0) return [createStep()];

  let index = 0;
  return groups.map((roles) =>
    createStep(
      roles.map((role) => {
        const slot = createSlot(index++);
        return slotFromRole(slot, role);
      }),
    ),
  );
}

function slotFromRole(slot: SignatureSlot, role: TemplateSignerRole): SignatureSlot {
  const first = role.signatureSlots
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder)[0];

  return {
    ...slot,
    roleName: role.label?.trim() || role.code,
    roleCode: role.code,
    slotCount: role.signatureSlots.length,
    config: first
      ? {
          ...slot.config,
          position: {
            page: first.page,
            xPct: first.x,
            yPct: first.y,
            widthPct: first.width,
            heightPct: first.height,
          },
        }
      : slot.config,
  };
}

/**
 * Tên gợi ý cho yêu cầu ký khi người dùng chưa gõ gì.
 *
 * Mẫu của máy chủ không có "mẫu tên yêu cầu" như bản dựng trước — nó chỉ có tên
 * của chính nó. Dùng tên mẫu là phỏng đoán tốt nhất còn lại, và người soạn vẫn
 * sửa được ở bước xác nhận.
 */
export function suggestedRequestName(detail: TemplateDetail): string {
  return detail.template.name.trim();
}
