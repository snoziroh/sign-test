import type {
  SigningRequestDetail,
  SigningRequestSigner,
  SigningRequestSlot,
} from "@/lib/types/workflow";
import type { BaselineLevel } from "@/lib/types/signing";
import { documentFormatFromName } from "@/features/signing/document-format";
import {
  ALGORITHM_IDS,
  BASELINE_LEVELS,
  SIGN_METHODS,
  stagedPosition,
  type FlowStep,
  type SignatureSlot,
  type SignMethodId,
  type SignRequestRecord,
  type SlotConfig,
} from "./model";

/**
 * Dựng lại một `SignRequestRecord` từ `GET /api/signing-requests/{id}`.
 *
 * Vì sao cần: màn tiến trình (`RequestProgressView`) được viết cho luồng "vừa
 * tạo xong yêu cầu", nơi bản nháp còn nguyên trong bộ nhớ trang. Mở một yêu cầu
 * từ DANH SÁCH thì không có bản nháp nào cả — chỉ có phản hồi của máy chủ. Hàm
 * này lấp đúng khoảng đó, để hai lối vào dùng CHUNG một màn thay vì có hai màn
 * tiến trình phải sửa song song.
 *
 * ------------------------------------------------------------------
 * NHỮNG THỨ KHÔNG DỰNG LẠI ĐƯỢC
 * ------------------------------------------------------------------
 *
 * `POST /api/signing-requests` chưa bao giờ nhận lời nhắn, hạn ký, cờ nhắc, luật
 * ALL/ANY của bước và cấu hình ký của từng ô. Chúng không nằm ở đâu trên máy chủ
 * để mà đọc lại, nên bản dựng ở đây mang giá trị mặc định:
 *
 * - Tên bước: rỗng → giao diện hiện "Bước N".
 * - Luật bước: `ALL`. Backend chỉ có `signingOrder`, và "mọi người trong cùng
 *   một `signingOrder` đều phải ký" đúng với cách nó đang chạy — họ ký SONG
 *   SONG, không ai chờ ai.
 * - Cấu hình ký của ô: đọc từ `appearanceConfig` nếu người tạo có ghi vào đó
 *   (đây là map tự do backend lưu nguyên), còn lại là mặc định.
 *
 * Đừng hiển thị những giá trị đó như thể chúng đến từ máy chủ — màn chi tiết
 * đánh dấu chúng riêng.
 */
export function recordFromDetail(detail: SigningRequestDetail): SignRequestRecord {
  return {
    name: detail.title,
    message: "",
    deadline: "",
    remindSigners: false,
    notifyOnComplete: false,
    steps: stepsFromSigners(detail.signers),

    signingRequestId: detail.signingRequestId,
    createdAt: detail.createdAt,
    documentName: detail.document.fileName,
    documentSize: detail.document.sizeBytes,
    documentFormat: documentFormatFromName(detail.document.fileName),
    sourceType: detail.sourceType,
    serverStatus: detail.status,
    templateId: detail.templateId ?? undefined,
  };
}

/**
 * `signers[]` phẳng → cây bước.
 *
 * `signingOrder` là CẤP ký, không phải vị trí của một người: nhiều người cùng
 * giá trị là một cấp và ký song song. Vì thế nhóm theo giá trị rồi sắp xếp, chứ
 * không dùng order làm chỉ số mảng — cách sau vừa sinh ra những bước rỗng không
 * tồn tại, vừa tách những người đang ký song song thành các bước tuần tự.
 *
 * Trong một cấp thì `displayOrder` quyết định thứ tự hiển thị. Nó cũng là giá
 * trị đã nén của backend, nên đừng đối chiếu với thứ tự lúc gửi lên.
 */
function stepsFromSigners(signers: SigningRequestSigner[]): FlowStep[] {
  const byOrder = new Map<number, SigningRequestSigner[]>();
  for (const signer of signers) {
    const group = byOrder.get(signer.signingOrder);
    if (group) group.push(signer);
    else byOrder.set(signer.signingOrder, [signer]);
  }

  const orders = [...byOrder.keys()].sort((a, b) => a - b);
  let slotIndex = 0;

  return orders.map((order) => {
    const group = (byOrder.get(order) ?? []).sort((a, b) => a.displayOrder - b.displayOrder);

    return {
      /*
       * `id` của bước phải ổn định qua mỗi lần poll: `FlowCanvas` và hộp thoại ô
       * dùng nó làm khoá React, và một khoá đổi sau mỗi 15 giây sẽ dựng lại cả
       * cây — hộp thoại đang mở sẽ tự đóng ngay giữa lúc người dùng đang đọc.
       */
      id: `order-${order}`,
      name: "",
      rule: "ALL" as const,
      slots: group.map((signer) => slotFromSigner(signer, slotIndex++)),
    };
  });
}

/**
 * Tên hiển thị của một người ký ĐÃ ĐƯỢC GÁN.
 *
 * Nguồn là `signatureSlots[].title`, không phải `label`. Hai trường đó trả lời
 * hai câu hỏi khác nhau và chỉ một trong hai nói về con người:
 *
 * - `label` là nhãn của CHỖ KÝ: tên vai khi yêu cầu dựng từ mẫu ("Kế toán
 *   trưởng"), hoặc một chuỗi backend tự đánh số ("Người ký 1") khi tài liệu tải
 *   lên không có vai nào. Nó thuộc về bản thiết kế của quy trình.
 * - `title` là thứ client ghi xuống lúc phát yêu cầu (xem `buildSigners` trong
 *   `sign-request-workspace.tsx`) và là chỗ DUY NHẤT chở được tên người ký thật
 *   qua API — `signers[]` không có trường tên riêng.
 *
 * Nên khi quy trình đã có người thật đứng vào, "Người ký 1" là câu trả lời sai
 * cho câu hỏi "ai ký ô này". Rơi về `label` rồi `userId` chỉ để màn hình không
 * trống khi backend chưa có `title` — không phải để hiện thay.
 *
 * Lấy khung ĐẦU TIÊN: một người ký có thể có nhiều khung (ký cả trang đầu lẫn
 * trang cuối), nhưng tất cả đều của cùng một người và mang cùng một tên.
 */
export function signerDisplayName(signer: SigningRequestSigner): string {
  return (
    signer.signatureSlots[0]?.title?.trim() ||
    signer.label?.trim() ||
    signer.userId
  );
}

function slotFromSigner(signer: SigningRequestSigner, index: number): SignatureSlot {
  const first = signer.signatureSlots[0];
  const declined = signer.status === "DECLINED";

  return {
    /*
     * `signerId` của máy chủ, không phải id sinh ở client: nó là thứ mà mọi
     * thao tác trên người ký này (ký, từ chối, nhắc) sẽ tham chiếu tới.
     */
    id: signer.signerId,
    signer: {
      kind:
        signer.accessMode === "EXTERNAL_LINK"
          ? "link"
          : "system",
      userId:
        signer.accessMode === "INTERNAL"
          ? signer.userId
          : undefined,
      /*
       * Tên người ký thật (xem `signerDisplayName`). Không có `title` thì rơi về
       * `userId` — một chuỗi tự do do người tạo yêu cầu gõ vào, và cũng là tất
       * cả những gì biết được về người này. Hiện nguyên chuỗi đó thay vì bịa ra
       * một cái tên đẹp hơn.
       */
      name: signerDisplayName(signer),
      email: signer.userId.includes("@") ? signer.userId : "",
    },
    /*
     * Chỉ yêu cầu dựng từ MẪU mới có vai, và `roleCode` là dấu hiệu duy nhất
     * phân biệt. Tài liệu tải lên cũng có `label` ("Người ký 1") nhưng đó là số
     * thứ tự backend tự đánh, không phải vai — gán nó vào đây sẽ khiến sơ đồ chú
     * thích ô là "chỗ ký của mẫu" cho một quy trình chưa từng có mẫu nào.
     */
    roleName: signer.roleCode ? (signer.label?.trim() || signer.roleCode) : undefined,
    roleCode: signer.roleCode ?? undefined,
    slotCount: signer.signatureSlots.length || undefined,
    config: configFromSlot(first, index),
    signedAt: signer.status === "SIGNED" ? (signer.signedAt ?? undefined) : undefined,
    /*
     * Backend không có `declinedAt` riêng — `signedAt` mang thời điểm của lần
     * cập nhật trạng thái cuối. Rơi về epoch khi thiếu, vì `declinedAt` là thứ
     * quyết định ô hiện màu từ chối; mất nó thì một người đã từ chối lại hiện
     * ra như đang chờ ký.
     */
    declinedAt: declined ? (signer.signedAt ?? new Date(0).toISOString()) : undefined,
  };
}

/**
 * Cấu hình ký của một ô, đọc từ `appearanceConfig`.
 *
 * Map đó là chỗ DUY NHẤT chở được cấu hình ký qua API tạo yêu cầu, nhưng nó tự
 * do hoàn toàn: backend lưu nguyên và trả lại nguyên, không kiểm tra khoá nào.
 * Nên mọi giá trị đọc ra đều phải đối chiếu với bộ hằng của client trước khi
 * dùng — một chuỗi lạ lọt vào `method` sẽ làm hộp thoại cấu hình hiện một lựa
 * chọn không tồn tại.
 */
function configFromSlot(slot: SigningRequestSlot | undefined, index: number): SlotConfig {
  const appearance = slot?.appearanceConfig ?? {};

  return {
    method: pick(appearance.method, SIGN_METHODS, "MPKI_APP") as SignMethodId,
    algorithm: pick(appearance.algorithm, ALGORITHM_IDS, "RSA_PSS_SHA256"),
    baselineLevel: pick(appearance.baselineLevel, BASELINE_LEVELS, "T") as BaselineLevel,
    visible: true,
    position: slot
      ? {
          page: slot.page,
          xPct: slot.x,
          yPct: slot.y,
          widthPct: slot.width,
          heightPct: slot.height,
        }
      : stagedPosition(index),
    reason: typeof appearance.reason === "string" ? appearance.reason : "",
    location: typeof appearance.location === "string" ? appearance.location : "",
  };
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Phần việc của người đang thao tác trong yêu cầu này.
 *
 * Ghép theo `userId` — cùng khoá mà `POST /api/signing-requests` đã ghi xuống,
 * và cùng chuỗi mà `X-Username` gửi lên. Một người đứng ở hai bước là HAI phần
 * việc, nên trả về mảng chứ không phải một.
 */
export function myAssignments(
  detail: SigningRequestDetail,
  actor: string | null,
): SigningRequestSigner[] {
  if (!actor) return [];
  return detail.signers.filter((signer) => signer.userId === actor);
}

/**
 * Đã tới lượt người này chưa.
 *
 * Quy trình chạy theo CẤP `signingOrder`: một người chỉ ký được khi mọi người ký
 * bắt buộc ở các cấp TRƯỚC đã xong. Người cùng cấp không chặn nhau — đó chính là
 * ký song song, nên phép so sánh dưới đây là `>=` chứ không phải `>`. Tính ở
 * client để nút Ký nói được lý do khi còn khoá; backend vẫn quyết định cuối cùng.
 */
export function isTurnOf(detail: SigningRequestDetail, signer: SigningRequestSigner): boolean {
  if (signer.status !== "PENDING") return false;
  return detail.signers.every(
    (other) =>
      other.signingOrder >= signer.signingOrder ||
      other.status === "SIGNED" ||
      !other.required,
  );
}

/**
 * Vì sao một người KHÔNG ký được ô này — `undefined` nghĩa là ký được.
 *
 * Tồn tại để trang ký chặn TRƯỚC, ở một màn nói rõ lý do, thay vì để người dùng
 * điền xong mật khẩu chứng thư rồi mới ăn 403. Mỗi nhánh là một tình huống có
 * câu trả lời khác nhau ("chưa tới lượt" thì chờ, "không phải người ký" thì mở
 * nhầm quy trình), nên chúng là các mã riêng chứ không phải một cờ boolean.
 *
 * Thứ tự xét đi từ SỰ THẬT LỚN NHẤT xuống nhỏ nhất: một yêu cầu đã huỷ thì
 * chuyện đã tới lượt ai không còn nghĩa gì nữa, nên trạng thái của cả yêu cầu
 * phải được đọc trước trạng thái của một người.
 *
 * `DRAFT` KHÔNG bị chặn: backend vẫn nhận lệnh ký ở trạng thái đó (đo trên bàn
 * thử — `POST …/sign` đi thẳng tới tầng kiểm tra chứng thư), và yêu cầu vừa tạo
 * xong nằm nguyên ở `DRAFT` cho tới chữ ký đầu tiên. Chặn nó là chặn đúng lượt
 * ký mở màn của mọi quy trình.
 *
 * Đây vẫn chỉ là phép tính Ở CLIENT để giao diện nói được lý do; backend mới là
 * nơi quyết định cuối cùng.
 */
export type SignBlockReason =
  | "REQUEST_CANCELLED"
  | "REQUEST_COMPLETED"
  | "ALREADY_SIGNED"
  | "DECLINED"
  | "NOT_YOUR_TURN";

export function signBlockReason(
  detail: SigningRequestDetail,
  signer: SigningRequestSigner,
): SignBlockReason | undefined {
  if (detail.status === "CANCELLED") return "REQUEST_CANCELLED";
  if (detail.status === "COMPLETED") return "REQUEST_COMPLETED";
  if (signer.status === "SIGNED") return "ALREADY_SIGNED";
  if (signer.status === "DECLINED") return "DECLINED";
  if (!isTurnOf(detail, signer)) return "NOT_YOUR_TURN";
  return undefined;
}
