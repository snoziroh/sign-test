import type { MaterialMode, RemoteCaVendor, SignStatus } from "@/lib/types/signing";

/**
 * Những thứ phải sống sót qua một lần tải lại trang.
 *
 * Chỉ luồng eSign Cloud cần đến chuyện này: nó có phiên ba pha, và giữa các pha
 * người ký phải rời trình duyệt sang trang của CA để xác nhận danh tính rồi nhập
 * OTP. Mất `sessionId` giữa chừng là mất luôn giao dịch đã trả tiền — phiên vẫn
 * sống 15 phút bên server nhưng không còn cách nào nối lại.
 *
 * Luồng p12 và MPKI App không cần: chúng xong ngay trong một request.
 *
 * KHÔNG lưu: `nextUrl` (mang token giao dịch dùng một lần), mật khẩu .p12, nội
 * dung tài liệu, toàn bộ `agreementDetails` (dữ liệu cá nhân), và cả
 * `agreementUuid` — xem `clearAgreementUuid`.
 *
 * Bản ghi phiên là NGOẠI LỆ DUY NHẤT, và nó không phải "thông tin của lần ký
 * trước": nó thuộc về một lần ký CHƯA XONG mà tiền đã trả rồi.
 */

const SESSION_KEY = "sign:session:v1";
const AGREEMENT_KEY = "sign:agreement-uuid:v1";

export interface SignSessionRecord {
  sessionId: string;
  materialMode: MaterialMode;
  vendor?: RemoteCaVendor;
  /** Stage lần cuối biết được — quyết định CONTINUE tiếp theo có tốn phí không. */
  status: SignStatus;
  /** Chỉ để hiển thị lại tóm tắt khi khôi phục. */
  fileName?: string;
  expiresAt?: string;
  createdAt: number;
}

/** localStorage có thể ném (private mode / policy) — persist là best-effort. */
function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string): T | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Hết chỗ / bị chặn: không chặn luồng ký, chỉ mất khả năng khôi phục.
  }
}

function remove(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // Xem writeJson.
  }
}

/** Phiên sống 15 phút bên server; quá hạn thì không đề nghị khôi phục nữa. */
export function loadSessionRecord(): SignSessionRecord | null {
  const record = readJson<SignSessionRecord>(SESSION_KEY);
  if (!record?.sessionId) return null;
  if (record.expiresAt && Date.parse(record.expiresAt) < Date.now()) {
    remove(SESSION_KEY);
    return null;
  }
  return record;
}

export function saveSessionRecord(record: SignSessionRecord): void {
  writeJson(SESSION_KEY, record);
}

export function clearSessionRecord(): void {
  remove(SESSION_KEY);
}

/**
 * Xoá `agreementUuid` còn sót trong trình duyệt.
 *
 * Màn ký KHÔNG lưu định danh này nữa — không giữ gì từ lần ký trước là một quyết
 * định có chủ đích, và cái giá của nó đã biết: lần ký sau phải đăng ký chứng thư
 * lại, tức thêm một giao dịch bên FPT.
 *
 * Hàm còn ở đây vì các bản trước CÓ ghi khoá này. Không còn ai đọc nó, nhưng nó
 * gắn với hồ sơ CCCD của người ký nên để nằm lại trong `localStorage` mãi là
 * đúng thứ mà quyết định trên muốn tránh — màn ký dọn nó đúng một lần lúc mở.
 */
export function clearAgreementUuid(): void {
  remove(AGREEMENT_KEY);
}
