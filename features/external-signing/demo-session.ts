"use client";

import type {
  PublicSignRequest,
  PublicSignResponse,
  PublicSignaturePlan,
  PublicSigningContext,
  PublicSigningExchangeResponse,
} from "@/lib/types/external-signing";
import type { SigningLeaseResponse } from "@/lib/types/signing-lease";
import { ExternalSigningError, type ExternalSigningTransport } from "./api";
import { DEMO_SLOT, buildDemoDocument, demoDocumentBase64 } from "./demo-document";

/**
 * CHẾ ĐỘ MÔ PHỎNG của trang ký công khai — bật bằng `#demo=1`.
 *
 * Lý do nó tồn tại: nhóm endpoint `/api/public/**` là **contract mục tiêu**, chưa
 * được cài vào signing-service. Không có bản mô phỏng thì `/external-sign` chỉ
 * hiển thị được đúng một trạng thái — "không kết nối được" — và cả phần còn lại
 * của màn hình (bố cục, overlay chữ ký, ba phương thức ký, hai bước chờ của eSign
 * Cloud, năm màn báo link không dùng được) không ai xem lại được trước khi
 * backend lên.
 *
 * Nó cắm vào đúng `ExternalSigningTransport`, nên máy trạng thái ký và mọi
 * component đều chạy trên cùng một đường với dịch vụ thật. Khi backend sẵn sàng:
 * xoá file này cùng `demo-document.ts`, bỏ nhánh `readDemoFlag()` trong
 * `use-external-signing-session.ts`. Không component nào phải sửa.
 *
 * Mọi trạng thái ở đây là biến trong module — không cookie, không storage, không
 * lời gọi mạng nào.
 */

/**
 * Kịch bản chọn bằng chính giá trị token: `#demo=1&t=expired`.
 *
 * Mỗi mã lỗi trong bảng §11 của tài liệu cần một đường vào để xem được màn hình
 * tương ứng; không có chúng thì các nhánh lỗi chỉ được kiểm bằng cách đọc code.
 */
const SCENARIOS = {
  expired: { status: 410, code: "EXTERNAL_SIGNING_LINK_EXPIRED" },
  invalid: { status: 401, code: "EXTERNAL_SIGNING_TOKEN_INVALID" },
  notcurrent: { status: 409, code: "SIGNER_NOT_CURRENT" },
  signed: { status: 409, code: "SIGNER_ALREADY_PROCESSED" },
  changed: { status: 409, code: "SIGNING_DOCUMENT_CHANGED" },
} as const;

/**
 * `#demo=1&t=conflict` — KÝ SONG SONG, không phải một mã lỗi của bảng trên.
 *
 * Phiên mở bình thường, nhưng lượt ký ĐẦU TIÊN trả 409 `SIGNING_DOCUMENT_CHANGED`
 * rồi lượt sau thành công: đúng thứ xảy ra khi người cùng cấp nộp chữ ký trước
 * mình vài giây. Đây là đường duy nhất xem được nhánh phục hồi (tải lại tài liệu
 * + ký lại) trước khi backend công khai lên.
 */
const CONFLICT_SCENARIO = "conflict";
let pendingConflict = false;

/**
 * `#demo=1&t=locked` — QUYỀN KÝ ĐỘC QUYỀN đang nằm trong tay người khác.
 *
 * Đường duy nhất xem được nhánh chờ của lease trước khi backend công khai lên:
 * màn hình mở ra ở trạng thái `LOCKED`, nhịp poll 5 giây chạy, rồi tự chuyển
 * sang `AVAILABLE` khi hết `DEMO_LOCK_MS` — đúng thứ xảy ra khi người ký hiện
 * tại hoàn tất và backend giải phóng lease.
 */
const LOCKED_SCENARIO = "locked";
const DEMO_LOCK_MS = 25_000;

/** Mốc hết lock của kịch bản trên; `0` = không ai giữ. */
let lockedUntil = 0;

/**
 * Lượt ký của CHÍNH phiên này đang mở hay chưa.
 *
 * Bật lên khi một giao dịch eSign Cloud vào trạng thái chờ, tắt đi khi ký xong
 * hoặc khi người ký bấm huỷ — nhờ vậy `HELD_BY_YOU` và nút "huỷ lượt cũ" xem
 * được ở bản mô phỏng đúng như ở luồng thật.
 */
let leaseHeldByMe = false;

/** Phiên mô phỏng sống 20 phút, đủ dài để xem đồng hồ đếm ngược chạy. */
const SESSION_MINUTES = 20;

/** Đủ lâu để thấy trạng thái chờ, đủ nhanh để không ai phải ngồi đợi. */
const LATENCY_MS = 450;

const DEMO_CONTEXT: PublicSigningContext = {
  signingRequestId: "0f6f637c-e38d-4908-b45c-cd49f8681022",
  signerId: "c409f89f-91f7-4d50-ac41-b62cce304b2d",
  title: "Hợp đồng dịch vụ DEMO-2026-0813",
  signerLabel: "Nguyễn Văn A — Bên nhận việc",
  signingOrder: 2,
  signerStatus: "PENDING",
  documentName: "hop-dong-dich-vu.pdf",
  documentContentType: "application/pdf",
  documentSha256: "",
  documentUrl: "/api/public/signing-session/document",
  signaturePlanUrl: "/api/public/signing-session/signature-plan",
};

/**
 * Bước hiện tại của giao dịch eSign Cloud.
 *
 * `START` → `PENDING_IDENTITY` → `PENDING_OTP` → `COMPLETED` là đúng ba pha của
 * luồng thật, và bản mô phỏng đi hết cả ba: hai màn chờ giữa đường là phần dễ
 * hỏng nhất của giao diện.
 */
let signCloudStage: "NONE" | "IDENTITY" | "OTP" = "NONE";

function wait(ms = LATENCY_MS): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function fail(scenario: keyof typeof SCENARIOS): never {
  const { status, code } = SCENARIOS[scenario];
  throw new ExternalSigningError(status, code);
}

/** sha256 thật của tệp mô phỏng — để ô "mã kiểm tra tài liệu" không phải chuỗi bịa. */
async function documentSha256(): Promise<string> {
  const bytes = await buildDemoDocument().arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function buildContext(): Promise<PublicSigningContext> {
  return { ...DEMO_CONTEXT, documentSha256: await documentSha256() };
}

export const demoTransport: ExternalSigningTransport = {
  async exchange(token) {
    await wait();
    signCloudStage = "NONE";

    const scenario = token.trim().toLowerCase();
    if (scenario in SCENARIOS) fail(scenario as keyof typeof SCENARIOS);
    pendingConflict = scenario === CONFLICT_SCENARIO;
    leaseHeldByMe = false;
    lockedUntil = scenario === LOCKED_SCENARIO ? Date.now() + DEMO_LOCK_MS : 0;

    const response: PublicSigningExchangeResponse = {
      csrfToken: `demo-csrf-${crypto.randomUUID()}`,
      sessionExpiresAt: new Date(Date.now() + SESSION_MINUTES * 60_000).toISOString(),
      context: await buildContext(),
    };
    return response;
  },

  /** Mô phỏng cookie phiên còn sống sau F5. */
  async getContext() {
    await wait();
    return buildContext();
  },

  async loadDocument() {
    await wait(250);
    return buildDemoDocument();
  },

  async loadSignaturePlan() {
    await wait(250);
    const plan: PublicSignaturePlan = {
      signingRequestId: DEMO_CONTEXT.signingRequestId,
      signerId: DEMO_CONTEXT.signerId,
      userId: "external:nguyen-van-a",
      fileName: DEMO_CONTEXT.documentName,
      format: "PDF",
      documentSha256: await documentSha256(),
      documentContentUrl: `/api/signing-requests/${DEMO_CONTEXT.signingRequestId}/document`,
      signatures: [
        {
          slotCode: "CONTRACTOR_SIGNATURE",
          title: "Bên nhận việc",
          page: DEMO_SLOT.page,
          x: DEMO_SLOT.x,
          y: DEMO_SLOT.y,
          width: DEMO_SLOT.width,
          height: DEMO_SLOT.height,
        },
      ],
    };
    return plan;
  },

  async sign(request: PublicSignRequest) {
    await wait(900);

    /*
     * Người cùng cấp vừa ký xong trước: bản tài liệu mà lượt này khởi động không
     * còn là bản mới nhất. Cờ tự tắt sau một lần, nên lần ký lại (trên bản vừa
     * tải về) đi tiếp bình thường — giống hệt luồng thật.
     */
    if (pendingConflict) {
      pendingConflict = false;
      signCloudStage = "NONE";
      throw new ExternalSigningError(409, "SIGNING_DOCUMENT_CHANGED");
    }

    if (request.materialMode === "PKCS12") {
      if (!request.pkcs12?.password) {
        throw new ExternalSigningError(400, "SIGN_REQUEST_INVALID");
      }
      return completed();
    }

    const vendor = request.remoteCa?.vendor;

    // MPKI App giữ request tới khi người ký bấm xác nhận trên điện thoại: một
    // request duy nhất, không có bước tiếp.
    if (vendor === "FPT_MPKI_APP") {
      if (!request.remoteCa?.username?.trim()) {
        throw new ExternalSigningError(400, "MPKI_USERNAME_REQUIRED");
      }
      await wait(2_200);
      return completed();
    }

    if (request.step === "START") {
      if (!request.remoteCa?.agreementUuid?.trim() && !request.remoteCa?.enrollment) {
        throw new ExternalSigningError(400, "FPT_ENROLLMENT_REQUIRED");
      }
      signCloudStage = "IDENTITY";
      leaseHeldByMe = true;
      return {
        status: "PENDING_IDENTITY",
        nextUrl: "/external-sign/demo-ca?stage=identity",
        message:
          "Mở trang của nhà cung cấp chứng thư để xác nhận danh tính, rồi quay lại đây bấm Tiếp tục.",
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      };
    }

    // CONTINUE: bước tiếp phụ thuộc STAGE CỦA PHIÊN, không phụ thuộc payload —
    // hai lần CONTINUE của luồng thật có body y hệt nhau.
    if (signCloudStage === "IDENTITY") {
      signCloudStage = "OTP";
      return {
        status: "PENDING_OTP",
        nextUrl: "/external-sign/demo-ca?stage=otp",
        message: "Nhập mã OTP trên trang của nhà cung cấp chứng thư để hoàn tất chữ ký.",
        expiresAt: new Date(Date.now() + 3 * 60_000).toISOString(),
      };
    }

    if (signCloudStage === "OTP") {
      signCloudStage = "NONE";
      return completed();
    }

    throw new ExternalSigningError(409, "SIGNING_NOT_STARTED");
  },

  async getLease() {
    await wait(200);
    return buildLease();
  },

  /**
   * Huỷ lượt ký của chính phiên này. KHÔNG đụng tới `lockedUntil`: lease của
   * người khác không phải thứ nút này giải phóng được — đúng như backend.
   */
  async cancelLease() {
    await wait(300);
    leaseHeldByMe = false;
    signCloudStage = "NONE";
    return buildLease();
  },
};

function buildLease(): SigningLeaseResponse {
  const remainingMs = lockedUntil - Date.now();

  if (remainingMs > 0) {
    return {
      state: "LOCKED",
      holderSignerId: "8a2f0f4e-2b1d-4c77-9d63-1f0b2f6a5c11",
      holderUserId: "internal:tran-thi-b",
      holderLabel: "Trần Thị B — Bên giao việc",
      expiresAt: new Date(lockedUntil).toISOString(),
      retryAfterSeconds: Math.ceil(remainingMs / 1000),
    };
  }

  if (leaseHeldByMe) {
    return {
      state: "HELD_BY_YOU",
      holderSignerId: DEMO_CONTEXT.signerId,
      holderUserId: "external:nguyen-van-a",
      holderLabel: DEMO_CONTEXT.signerLabel,
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      retryAfterSeconds: 600,
    };
  }

  return {
    state: "AVAILABLE",
    holderSignerId: null,
    holderUserId: null,
    holderLabel: null,
    expiresAt: null,
    retryAfterSeconds: 0,
  };
}

function completed(): PublicSignResponse {
  leaseHeldByMe = false;
  return {
    status: "COMPLETED",
    document: {
      fileName: "hop-dong-dich-vu-signed.pdf",
      contentType: "application/pdf",
      contentBase64: demoDocumentBase64(),
    },
  };
}
