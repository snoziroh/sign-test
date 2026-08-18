"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicSignaturePlan } from "@/lib/types/external-signing";
import { ExternalSigningError, type ExternalSigningTransport } from "./api";

/**
 * Tải tài liệu cần ký và signature plan của phiên.
 *
 * Hai lời gọi đi CÙNG NHAU vì màn hình không dùng được khi thiếu một trong hai:
 * có tài liệu mà không có plan thì không biết chỉ chỗ nào để ký, có plan mà không
 * có tài liệu thì không có gì để chỉ. Gộp lại cũng gộp luôn một trạng thái tải và
 * một trạng thái lỗi thay vì hai cặp lệch pha nhau.
 *
 * Tài liệu về dưới dạng `File` chứ không phải object URL: `ExternalSigningDocumentView`
 * dựng PDF bằng pdf.js từ `arrayBuffer()`, nên KHÔNG có `URL.createObjectURL` nào
 * được tạo ở đây — và không có gì phải thu hồi lúc unmount. Object URL duy nhất
 * trong cả luồng nằm ở nút tải bản đã ký, nơi nó bị thu hồi ngay sau cú bấm.
 *
 * Không cache: không service worker, không IndexedDB, không `localStorage`. Tệp chỉ
 * sống trong bộ nhớ của tab này, đúng bằng thời gian tab còn mở.
 */

export interface ExternalSigningDocument {
  file?: File;
  plan?: PublicSignaturePlan;
  loading: boolean;
  error?: ExternalSigningError;
  reload: () => void;
}

/**
 * Kết quả của MỘT lượt tải, mang theo số lượt sinh ra nó.
 *
 * Gộp `file`/`plan`/`error` vào một state cùng `attempt` thay vì bốn state rời:
 * "đang tải" và "lỗi cũ đã hết hiệu lực" khi đó là những thứ SUY RA được
 * (`loaded.attempt !== attempt`), không phải những thứ phải nhớ đặt lại. Bốn state
 * rời thì mỗi lần bấm tải lại phải nhớ xoá lỗi cũ — và quên đúng một lần là màn
 * hình hiện lỗi của lượt trước bên cạnh tài liệu vừa tải được.
 */
interface LoadResult {
  attempt: number;
  file?: File;
  plan?: PublicSignaturePlan;
  error?: ExternalSigningError;
}

export function useExternalSigningDocument(
  transport: ExternalSigningTransport,
  /** Chỉ tải khi phiên đã sẵn sàng — tải sớm hơn là một lời gọi chắc chắn 401. */
  enabled: boolean,
  fileName: string | undefined,
): ExternalSigningDocument {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<LoadResult>();

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  /*
   * `fileName` chỉ là nhãn đặt cho `File`. Trong ref chứ không trong mảng phụ
   * thuộc: một tên đổi (ví dụ backend trả lại ngữ cảnh sau khi ký) không đáng để
   * tải lại cả tệp PDF.
   */
  const label = useRef(fileName);
  useEffect(() => {
    label.current = fileName;
  }, [fileName]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    Promise.all([transport.loadDocument(), transport.loadSignaturePlan()])
      .then(([blob, plan]) => {
        if (cancelled) return;
        setLoaded({
          attempt,
          plan,
          file: new File([blob], label.current || plan.fileName || "document.pdf", {
            type: blob.type || "application/pdf",
          }),
        });
      })
      .catch((cause) => {
        if (cancelled) return;
        setLoaded({
          attempt,
          error:
            cause instanceof ExternalSigningError
              ? cause
              : new ExternalSigningError(0, "EXTERNAL_SIGNING_UNKNOWN_ERROR"),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [transport, enabled, attempt]);

  const settled = loaded?.attempt === attempt;

  return {
    file: settled ? loaded?.file : undefined,
    plan: settled ? loaded?.plan : undefined,
    error: settled ? loaded?.error : undefined,
    loading: enabled && !settled,
    reload,
  };
}
