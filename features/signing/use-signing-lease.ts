"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SigningLeaseResponse } from "@/lib/types/signing-lease";

/**
 * MỘT máy trạng thái lease cho cả màn hình ký — không phải một cái cho mỗi
 * phương thức.
 *
 * Lease thuộc về YÊU CẦU KÝ, không thuộc về cách ký: PKCS#12, MPKI, eSign Cloud
 * và USB Token cùng tranh nhau đúng một quyền, và bốn bản sao logic poll/huỷ
 * (mỗi khối một bản) là bốn nhịp poll chạy song song trên cùng một endpoint,
 * cộng bốn cơ hội để một khối tưởng mình còn quyền trong khi khối khác vừa trả
 * lại. Vì vậy hook này được mount ở WORKSPACE — xem `WorkflowSignWorkspace` và
 * `ExternalSigningWorkspace` — rồi truyền xuống.
 *
 * Cắm vào cả hai luồng qua `SigningLeaseTransport`, đúng khuôn
 * `ExternalSigningTransport` đã có: nội bộ nối `X-Username` + `/api/workflow/*`,
 * công khai nối cookie phiên + `/api/public/*`, và hook này không biết cũng
 * không cần biết mình đang ở luồng nào.
 */

export interface SigningLeaseTransport {
  get(signal?: AbortSignal): Promise<SigningLeaseResponse>;
  /**
   * `undefined` là hợp lệ: backend được phép trả `204`. Nơi gọi không suy ra
   * "đã huỷ xong" từ đây — hook luôn đọc lại bằng một lần GET.
   */
  cancel(signal?: AbortSignal): Promise<SigningLeaseResponse | undefined>;
}

/**
 * Nhịp hỏi lại khi đang `LOCKED`.
 *
 * 5 giây, KHÔNG phải `retryAfterSeconds`: giá trị đó là hạn TỐI ĐA của lease
 * đang giữ, còn người ký hiện tại thường xong sớm hơn nhiều và backend giải
 * phóng ngay lúc đó. Chờ hết hạn tối đa mới hỏi lại là bắt người sau ngồi không
 * trong khi lượt ký đã trống từ lâu.
 */
const POLL_INTERVAL_MS = 5_000;

export interface SigningLease {
  /** `undefined` = CHƯA BIẾT. Không bao giờ được đọc như `AVAILABLE`. */
  lease?: SigningLeaseResponse;
  isLeaseLoading: boolean;
  isLeaseCancelling: boolean;
  leaseError?: unknown;
  /** Đọc lại ngay. Trả về trạng thái vừa đọc để nơi gọi rẽ nhánh nếu cần. */
  refreshLease: () => Promise<SigningLeaseResponse | undefined>;
  /** DELETE rồi đọc lại. Không ném — lỗi đi vào `leaseError`. */
  cancelLease: () => Promise<void>;
  /**
   * Điều kiện DUY NHẤT để cho bấm START.
   *
   * `undefined` (chưa đọc xong lần đầu), lỗi mạng, `LOCKED`, `HELD_BY_YOU` —
   * tất cả đều là `false`. Đặc biệt: KHÔNG có nhánh nào coi "chưa biết" là
   * "trống", vì đó chính là hành vi mà lease sinh ra để loại bỏ.
   */
  canStartSigning: boolean;
}

/**
 * Kết quả của MỘT lượt đọc, mang theo khoá của lượt ký sinh ra nó.
 *
 * Gộp `lease` và `error` vào một state cùng `key` thay vì ba state rời: khi
 * `leaseKey` đổi (đổi yêu cầu ký, đổi phiên), trạng thái cũ tự hết hiệu lực vì
 * `key` không khớp — không phải nhớ đặt lại từng thứ, và không có cửa sổ nào mà
 * màn hình hiện lease của lượt ký trước.
 */
interface LeaseSnapshot {
  key: string;
  lease?: SigningLeaseResponse;
  error?: unknown;
}

export function useSigningLease(options: {
  /**
   * PHẢI ổn định qua các lần render (`useMemo`): nó nằm trong mảng phụ thuộc
   * của lượt đọc đầu tiên, và một object dựng mới mỗi render là một vòng gọi
   * mạng vô tận.
   */
  transport: SigningLeaseTransport;
  /**
   * Chỉ đọc khi màn hình THỰC SỰ có thể ký. Tắt ở các màn chặn (chưa tới lượt,
   * đã ký, phiên hỏng) để không gửi một lời gọi chắc chắn 403.
   */
  enabled: boolean;
  /** Đổi giá trị này là bỏ hết trạng thái cũ: yêu cầu ký khác, phiên khác. */
  leaseKey: string;
  pollIntervalMs?: number;
}): SigningLease {
  const {
    transport,
    enabled,
    leaseKey,
    pollIntervalMs = POLL_INTERVAL_MS,
  } = options;

  const [snapshot, setSnapshot] = useState<LeaseSnapshot>();
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<unknown>();

  /**
   * Số hiệu của lượt đọc mới nhất.
   *
   * Mỗi lần đọc tự tăng nó lên; phản hồi về mà số đã đổi thì bị BỎ. Nhờ vậy hai
   * thứ được xử lý bằng cùng một cơ chế: hai lời gọi chồng nhau (nhịp poll chậm
   * gặp một lần bấm "thử lại") và unmount/đổi `leaseKey` giữa chừng — không có
   * setState nào chạy trên một màn hình đã đổi.
   */
  const latest = useRef(0);

  const read = useCallback(async (): Promise<SigningLeaseResponse | undefined> => {
    if (!enabled) return undefined;

    const attempt = (latest.current += 1);
    setLoading(true);
    try {
      const result = await transport.get();
      if (latest.current !== attempt) return result;
      setSnapshot({ key: leaseKey, lease: result });
      setLoading(false);
      return result;
    } catch (error) {
      if (latest.current !== attempt) return undefined;
      /*
       * Lỗi mạng/máy chủ KHÔNG được rơi về `AVAILABLE`, và cũng không được giữ
       * lại `lease` của lượt đọc trước: một giá trị cũ ở đây mở lại nút Ký dựa
       * trên thông tin không còn ai bảo đảm. Bỏ trắng và hiện nút thử lại.
       */
      setSnapshot({ key: leaseKey, error });
      setLoading(false);
      return undefined;
    }
  }, [transport, enabled, leaseKey]);

  /*
   * Lượt đọc đầu tiên — chạy cùng lúc với việc tải ngữ cảnh ký, đúng như §4 của
   * yêu cầu tích hợp: màn hình mở ra là hỏi ngay, và nút Ký đóng cho tới khi có
   * câu trả lời.
   *
   * `read()` đặt `loading` ngay trong thân effect, và đó là điều muốn: cờ đó
   * chính là thứ giữ nút Ký đóng trong lúc lời gọi còn trên đường. Đặt nó ở một
   * vòng render sau là mở một cửa sổ — ngắn, nhưng có thật — mà `isLeaseLoading`
   * đã `false` trong khi lease vẫn chưa biết.
   */
  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- xem chú thích ngay trên
    void read();
    return () => {
      // Bỏ mọi phản hồi còn trên đường của lượt ký/phiên vừa rời đi.
      latest.current += 1;
    };
  }, [read, enabled]);

  const current = snapshot?.key === leaseKey ? snapshot : undefined;
  const state = current?.lease?.state;

  /*
   * Poll CHỈ khi `LOCKED`. `AVAILABLE` và `HELD_BY_YOU` đều là câu trả lời đã
   * xong việc — người ký có nút để bấm, và một nhịp hỏi lại ở đó chỉ tạo tải.
   *
   * Một interval duy nhất, và nó chết theo `state`/`leaseKey`/unmount: đó là
   * toàn bộ cách chặn hai nhịp poll chạy song song trên cùng một endpoint.
   */
  useEffect(() => {
    if (!enabled || state !== "LOCKED") return;

    const timer = window.setInterval(() => {
      void read();
    }, pollIntervalMs);

    return () => window.clearInterval(timer);
  }, [enabled, state, pollIntervalMs, read]);

  /**
   * Huỷ lượt ký đang mở.
   *
   * Luôn đọc lại sau khi DELETE, kể cả khi DELETE đã trả về một `state`: phản
   * hồi của nó là trạng thái tại thời điểm huỷ, và giữa hai lời gọi vẫn có thể
   * có người khác nhận lease. Đây cũng là lý do nó không trả về gì — nơi gọi
   * đọc `lease` mới thay vì tin vào kết quả của chính cú bấm.
   */
  const cancelLease = useCallback(async () => {
    if (!enabled || cancelling) return;

    setCancelling(true);
    setCancelError(undefined);
    try {
      await transport.cancel();
    } catch (error) {
      /*
       * Giữ lỗi huỷ RIÊNG khỏi lỗi đọc: ngay sau đây `read()` vẫn chạy, và nếu
       * nó thành công thì `snapshot.error` bị xoá — gộp hai thứ vào một chỗ là
       * câu "không huỷ được" biến mất đúng lúc người dùng cần đọc nó nhất.
       */
      setCancelError(error);
    } finally {
      setCancelling(false);
    }
    await read();
  }, [transport, enabled, cancelling, read]);

  const leaseError = current?.error ?? cancelError;

  return {
    lease: current?.lease,
    isLeaseLoading: loading || (enabled && !current),
    isLeaseCancelling: cancelling,
    leaseError,
    refreshLease: read,
    cancelLease,
    canStartSigning:
      enabled && !cancelling && !leaseError && current?.lease?.state === "AVAILABLE",
  };
}
