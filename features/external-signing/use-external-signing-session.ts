"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicSigningContext } from "@/lib/types/external-signing";
import { isSessionFatal } from "@/lib/types/external-signing";
import { ExternalSigningError, liveTransport, type ExternalSigningTransport } from "./api";
import { demoTransport } from "./demo-session";
import {
  clearExternalSigningSession,
  clearExternalSigningToken,
  getExternalSigningCsrf,
  getExternalSigningExpiry,
  readDemoFlag,
  readExternalSigningToken,
  saveExternalSigningSession,
} from "./session-store";

/**
 * Khởi tạo phiên ký công khai — bước duy nhất trong luồng có chạm tới link token.
 *
 * Ba đường vào, theo đúng §6 của tài liệu tích hợp:
 *
 * ```
 * Có token trong fragment  → exchange → xoá fragment → lưu CSRF → hiển thị.
 * Không token, có CSRF     → GET /signing-session → tiếp tục phiên.
 * Không token, không CSRF  → màn "link không dùng được".
 * ```
 *
 * Và một trạng thái thứ tư mà tài liệu nói tới nhưng không nằm trong sơ đồ:
 * **cookie còn sống nhưng CSRF đã mất** (mở lại URL ở tab khác, `sessionStorage`
 * bị xoá). Khi đó người ký VẪN xem được tài liệu nhưng không ký được — đó là lý do
 * `csrfMissing` là một cờ riêng chứ không bị gộp vào lỗi phiên. Gộp lại thì người
 * ký thấy "link hỏng" trong khi link của họ không hỏng.
 */

export type SessionPhase = "initializing" | "ready" | "unavailable";

export interface ExternalSigningSession {
  phase: SessionPhase;
  context?: PublicSigningContext;
  /** Hạn của phiên, chỉ biết được ở đường exchange. */
  expiresAt?: string;
  /** Lỗi làm phiên không dùng được — đi kèm `phase === "unavailable"`. */
  error?: ExternalSigningError;
  /** Cookie còn nhưng CSRF đã mất: xem được, không ký được. */
  csrfMissing: boolean;
  transport: ExternalSigningTransport;
  demo: boolean;
  /** Phiên chết giữa luồng ký (401/403/410) — chuyển hẳn sang màn link không dùng được. */
  invalidate: (error: ExternalSigningError) => void;
  /** Người ký vừa hoàn tất: bỏ mọi trạng thái nhạy cảm, giữ ngữ cảnh để hiện trang kết quả. */
  forgetCredentials: () => void;
}

/** Không có token và cũng không có phiên nào để khôi phục. */
const NO_SESSION = new ExternalSigningError(401, "EXTERNAL_SIGNING_NO_SESSION");

export function useExternalSigningSession(): ExternalSigningSession {
  const [phase, setPhase] = useState<SessionPhase>("initializing");
  const [context, setContext] = useState<PublicSigningContext>();
  const [expiresAt, setExpiresAt] = useState<string>();
  const [error, setError] = useState<ExternalSigningError>();
  const [csrfMissing, setCsrfMissing] = useState(false);
  const [demo, setDemo] = useState(false);
  const [transport, setTransport] = useState<ExternalSigningTransport>(() => liveTransport);

  /**
   * StrictMode chạy effect setup → cleanup → setup trên cùng một instance. Một
   * lần exchange thừa là một lần link token bị tiêu: backend đánh dấu link
   * `CONSUMED` hoặc phát hành phiên thứ hai và vô hiệu phiên đầu, và người ký thấy
   * "link đã được dùng" ở ngay lần mở đầu tiên.
   */
  const bootstrapped = useRef(false);

  const invalidate = useCallback((cause: ExternalSigningError) => {
    clearExternalSigningSession();
    setError(cause);
    setCsrfMissing(false);
    setPhase("unavailable");
  }, []);

  const forgetCredentials = useCallback(() => {
    clearExternalSigningSession();
    setExpiresAt(undefined);
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const isDemo = readDemoFlag();
    const active = isDemo ? demoTransport : liveTransport;
    setDemo(isDemo);
    setTransport(() => active);

    const token = readExternalSigningToken();

    async function bootstrap() {
      if (token) {
        const result = await active.exchange(token);
        /*
         * Xoá fragment NGAY, trước cả khi vẽ gì lên màn hình: từ đây trở đi không
         * lời gọi nào cần token nữa, và một token còn nằm trên thanh địa chỉ là
         * thứ người ký vô tình sao chép, chụp màn hình hoặc chia sẻ.
         */
        clearExternalSigningToken();
        saveExternalSigningSession({
          csrfToken: result.csrfToken,
          sessionExpiresAt: result.sessionExpiresAt,
        });
        setContext(result.context);
        setExpiresAt(result.sessionExpiresAt);
        setCsrfMissing(false);
        setPhase("ready");
        return;
      }

      const csrf = getExternalSigningCsrf();
      /*
       * Bản mô phỏng bắt đầu từ `#demo=1` trần cũng phải ký được, nên nó tự dựng
       * một phiên. Nhánh này KHÔNG tồn tại ở luồng thật: không có token và không
       * có CSRF thì không có gì để dựng.
       */
      if (!csrf && !isDemo) throw NO_SESSION;

      const restored = await active.getContext();
      setContext(restored);
      setExpiresAt(getExternalSigningExpiry());
      setCsrfMissing(!csrf && !isDemo);
      setPhase("ready");
    }

    bootstrap().catch((cause) => {
      const failure =
        cause instanceof ExternalSigningError
          ? cause
          : new ExternalSigningError(0, "EXTERNAL_SIGNING_UNKNOWN_ERROR");

      // Chỉ 401/403/410 mới là "phiên chết"; các mã khác (409 chưa tới lượt, 409
      // tài liệu đã đổi) cũng dừng luồng nhưng KHÔNG được xoá phiên của người
      // khác — dù ở đây phiên vừa mở nên hai đường trùng nhau, giữ đúng luật vẫn
      // rẻ hơn là nhớ ngoại lệ.
      if (isSessionFatal(failure.status)) clearExternalSigningSession();
      setError(failure);
      setPhase("unavailable");
    });
  }, []);

  return {
    phase,
    context,
    expiresAt,
    error,
    csrfMissing,
    transport,
    demo,
    invalidate,
    forgetCredentials,
  };
}
