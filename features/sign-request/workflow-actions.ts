"use client";

import { baseUrlHeaders } from "@/features/signing/api-base-url";
import { readProblem } from "@/features/signing/api";
import { actorHeaders } from "./actor";

/**
 * NHỮNG THAO TÁC TRÊN MỘT YÊU CẦU KÝ MÀ DỊCH VỤ CHƯA CÓ ENDPOINT.
 *
 * KÝ thì đã có và KHÔNG còn nằm ở đây: `POST /api/signing-requests/{id}/sign`
 * cùng `GET …/signers/{signerId}/signature-plan` sống trong `workflow-api.ts`.
 * HUỶ cũng đã có và không còn nằm ở đây: `POST …/cancel` sống trong
 * `workflow-api.ts` (`cancelSigningRequest`). TỪ CHỐI cũng vậy: `POST
 * …/signers/{signerId}/decline` sống trong `workflow-api.ts`
 * (`declineWorkflowSlot`). Còn lại một việc của màn quy trình — nhắc — vẫn
 * chưa có đường nào để gọi.
 *
 * File này giữ chỗ cho nó, và giữ theo cách CHẠY ĐƯỢC ngay hôm nay:
 *
 * - Mỗi thao tác là một hàm thật với đúng chữ ký mà giao diện cần, nên khi
 *   endpoint xuất hiện chỉ phải điền đường dẫn vào `ENDPOINTS` — không phải đi
 *   sửa lại các component.
 * - Đường dẫn còn trống thì hàm ném `WorkflowEndpointMissingError` NGAY ở
 *   client. Giao diện bắt đúng lỗi đó và nói thẳng "chưa có API", thay vì gửi
 *   một lời gọi tới đường dẫn rỗng rồi hiện một lỗi 404 khiến người test đi
 *   tìm sai chỗ.
 *
 * Danh sách endpoint còn thiếu nằm ngay dưới đây; tên đường dẫn trong chú thích
 * chỉ là ĐỀ XUẤT, khớp lại với backend trước khi điền.
 */

/**
 * Đường dẫn của từng thao tác, tính từ gốc proxy `/api/workflow`.
 *
 * Chuỗi rỗng = chưa có API. Điền đường dẫn thật vào đây là thao tác tương ứng
 * sống dậy, không cần sửa gì thêm; `{id}` và `{signerId}` được thay lúc gọi.
 */
export type WorkflowAction = "remind";

const ENDPOINTS: Record<WorkflowAction, string> = {
  /** Đề xuất: `POST /api/workflow/signing-requests/{id}/signers/{signerId}/remind` */
  remind: "",
};

/**
 * Thao tác chưa có endpoint.
 *
 * Mang theo `action` để giao diện nói được CHÍNH XÁC thứ đang thiếu — "chưa nối
 * API" nói chung thì người đọc không biết phải bổ sung cái gì.
 */
export class WorkflowEndpointMissingError extends Error {
  constructor(readonly action: WorkflowAction) {
    super("WORKFLOW_ENDPOINT_MISSING");
    this.name = "WorkflowEndpointMissingError";
  }
}

export function isWorkflowActionAvailable(action: WorkflowAction): boolean {
  return ENDPOINTS[action] !== "";
}

async function callAction(
  action: WorkflowAction,
  replacements: Record<string, string>,
  body?: unknown,
  signal?: AbortSignal,
): Promise<void> {
  const template = ENDPOINTS[action];
  if (!template) throw new WorkflowEndpointMissingError(action);

  const path = Object.entries(replacements).reduce(
    (url, [key, value]) => url.replaceAll(`{${key}}`, encodeURIComponent(value)),
    template,
  );

  const response = await fetch(path, {
    method: "POST",
    headers: {
      ...baseUrlHeaders(),
      ...actorHeaders(),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw await readProblem(response);
}

/* ------------------------------------------------------------------ *
 * Thao tác của NGƯỜI TẠO
 * ------------------------------------------------------------------ */

/** Nhắc một người ký đang treo. */
export async function remindWorkflowSigner(
  signingRequestId: string,
  signerId: string,
  signal?: AbortSignal,
): Promise<void> {
  return callAction("remind", { id: signingRequestId, signerId }, undefined, signal);
}

/* ------------------------------------------------------------------ *
 * Diễn biến
 * ------------------------------------------------------------------ */

/**
 * NHẬT KÝ của một yêu cầu ký cũng CHƯA CÓ ENDPOINT — không có hàm giữ chỗ ở đây
 * vì không có nút nào gọi tới nó.
 *
 * Màn chi tiết đang dựng diễn biến bằng cách suy từ `signers[].status` và
 * `signedAt` của `GET /api/signing-requests/{id}`. Cách đó chỉ thấy được kết
 * quả cuối cùng của từng người: ai xem tài liệu lúc nào, ai bị nhắc mấy lần,
 * lần ký nào hỏng rồi thử lại — không có gì để dựng.
 *
 * Đề xuất: `GET /api/workflow/signing-requests/{id}/events`.
 */
