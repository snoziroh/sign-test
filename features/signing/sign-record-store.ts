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
 * dung tài liệu, và toàn bộ `agreementDetails` (dữ liệu cá nhân). `agreementUuid`
 * được lưu riêng vì nó là định danh dài hạn và việc đăng ký lại tốn một giao
 * dịch bên FPT.
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
 * `agreementUuid` là định danh người ký trên CA, dùng lại cho MỌI lần ký sau.
 * Giữ nó là cách duy nhất để lần ký thứ hai không kích hoạt một lần đăng ký
 * chứng thư mới — mỗi lần đăng ký là một giao dịch bên FPT.
 */
export function loadAgreementUuid(): string | null {
  const value = readJson<string>(AGREEMENT_KEY);
  return typeof value === "string" && value ? value : null;
}

export function saveAgreementUuid(agreementUuid: string): void {
  if (agreementUuid.trim()) writeJson(AGREEMENT_KEY, agreementUuid.trim());
}

export function clearAgreementUuid(): void {
  remove(AGREEMENT_KEY);
}
