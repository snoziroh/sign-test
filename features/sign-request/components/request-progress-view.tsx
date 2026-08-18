"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { SigningRequestDetail } from "@/lib/types/workflow";
import { useToast } from "@/components/ui/toast";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  LayersIcon,
  LinkIcon,
  PlusIcon,
  RotateCcwIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons";
import { formatBytes } from "@/features/signing/document-format";
import { errorMessage } from "@/features/signing/api";
import { FlowCanvas } from "./flow-canvas";
import {
  activeStepIndex,
  countSigned,
  isStepComplete,
  mergeServerSigners,
  requestStatus,
  totalSlots,
  type RequestStatus,
  type SignRequestRecord,
} from "../model";
import { downloadSigningRequestDocument, getSigningRequest } from "../workflow-api";

/**
 * Màn theo dõi một yêu cầu ký đã phát đi.
 *
 * Sơ đồ ở giữa là ĐÚNG component của lúc soạn (`FlowCanvas`), chỉ bỏ phần kéo
 * thả: người soạn đã đọc quen bố cục đó rồi, và một cách trình bày thứ hai cho
 * cùng một quy trình chỉ tạo thêm việc học. Mỗi ô đổi thành một chỉ báo trạng
 * thái — bước nào đang chờ ai là câu hỏi duy nhất người ta mở màn này để hỏi.
 *
 * Trạng thái đến từ `GET /api/signing-requests/{id}`, không từ state của trang.
 * Yêu cầu ký chạy trong nhiều ngày và người ký ngồi ở máy khác, nên bản trong bộ
 * nhớ trình duyệt này CHẮC CHẮN cũ — chỉ có máy chủ biết ai vừa ký. Xem
 * `usePolledRequest` để biết vì sao nó tự làm mới và vì sao nó dừng.
 */
export function RequestProgressView({
  t,
  record,
  onRecordChange,
  onOpenSlot,
  onNewRequest,
  onDetail,
  headerActions,
  sidebarTop,
  showLocalOnlyNote = true,
}: {
  t: Dictionary;
  record: SignRequestRecord;
  onRecordChange: (record: SignRequestRecord) => void;
  /**
   * Phản hồi THÔ của mỗi lần làm mới.
   *
   * Màn mở từ danh sách dựng lại toàn bộ bản ghi từ phản hồi này thay vì đắp
   * trạng thái lên một bản nháp — nó không có bản nháp nào — và nó còn cần
   * những trường mà `SignRequestRecord` không chở: `signerId`, `required`, và
   * trạng thái từng người ký để biết đã tới lượt ai.
   */
  onDetail?: (detail: SigningRequestDetail) => void;
  onOpenSlot: (slotId: string) => void;
  /** Vắng mặt ở màn mở từ danh sách: ở đó "tạo yêu cầu mới" là việc của trang khác. */
  onNewRequest?: () => void;
  /** Nút riêng của lối vào đang dùng, đặt cạnh Làm mới và Tải tài liệu. */
  headerActions?: ReactNode;
  /** Khối đứng đầu cột phải — chỗ của phần việc người ký phải làm. */
  sidebarTop?: ReactNode;
  /**
   * Ghi chú "không lưu trên máy chủ" chỉ đúng khi bản ghi ĐẾN TỪ bản nháp còn
   * trong bộ nhớ trang. Mở từ danh sách thì mọi thứ hiện ra đều đọc từ máy chủ,
   * và cảnh báo đó sẽ nói về những trường không hề hiển thị ở đó.
   */
  showLocalOnlyNote?: boolean;
}) {
  const p = t.signRequest.progress;
  const { toast } = useToast();
  const { refreshing, refreshError, refresh } = usePolledRequest(t, record, onRecordChange, onDetail);
  const [downloading, setDownloading] = useState(false);

  const status = requestStatus(record);
  const total = totalSlots(record.steps);
  const signed = countSigned(record.steps);
  const percent = total === 0 ? 0 : Math.round((signed / total) * 100);
  const active = activeStepIndex(record.steps);
  const linkSigners = record.steps.flatMap((step) =>
    step.slots.filter((slot) => slot.signer?.kind === "link"),
  );

  async function download() {
    setDownloading(true);
    try {
      await downloadSigningRequestDocument(record.signingRequestId, record.documentName);
    } catch (error) {
      toast.warning(p.downloadFailed, errorMessage(error, p.downloadFailed));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------- Thẻ tiêu đề ---------------- */}
      <section className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-start gap-3 border-b border-border-muted px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[16px] font-semibold text-fg">{record.name}</h2>
              <StatusPill t={t} status={status} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-fg-subtle">
              {/* UUID đầy đủ trong `title`: đó là thứ dán vào lệnh curl khi báo
                  lỗi, và dịch vụ không sinh mã ngắn nào thay thế được. */}
              <span title={record.signingRequestId} className="max-w-60 truncate">
                {record.signingRequestId}
              </span>
              <span>
                {p.createdAt(new Date(record.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }))}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12.5px] font-semibold text-fg hover:bg-inset disabled:opacity-50"
            >
              {refreshing ? (
                <SpinnerIcon size={14} className="animate-spin" />
              ) : (
                <RotateCcwIcon size={14} />
              )}
              {p.refresh}
            </button>
            <button
              type="button"
              onClick={download}
              disabled={downloading}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12.5px] font-semibold text-fg hover:bg-inset disabled:opacity-50"
            >
              {downloading ? (
                <SpinnerIcon size={14} className="animate-spin" />
              ) : (
                <DownloadIcon size={14} />
              )}
              {p.download}
            </button>
            {headerActions}
            {onNewRequest ? (
              <button
                type="button"
                onClick={onNewRequest}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-3 text-[12.5px] font-semibold text-accent-fg hover:opacity-90"
              >
                <PlusIcon size={14} />
                {p.newRequest}
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[12.5px] font-semibold text-fg">
                {active === -1 ? p.allSigned : p.waitingOnStep(active + 1)}
              </span>
              <span className="font-mono text-[11.5px] text-fg-muted">
                {p.progressLabel(signed, total)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-inset">
              <div
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{ width: `${percent}%` }}
                className={`h-full rounded-full transition-[width] duration-300 ${
                  status === "completed" ? "bg-success" : "bg-accent"
                }`}
              />
            </div>
          </div>

          <dl className="flex flex-wrap gap-x-6 gap-y-1.5 text-[11.5px] sm:justify-end">
            <div className="flex items-center gap-1.5">
              <dt className="text-fg-subtle">
                <FileTextIcon size={13} />
                <span className="sr-only">{p.documentLabel}</span>
              </dt>
              <dd className="max-w-52 truncate font-medium text-fg">
                {record.documentName}
                <span className="ml-1.5 font-mono text-[10.5px] text-fg-subtle">
                  {record.documentSize > 0 ? formatBytes(record.documentSize) : ""}
                </span>
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="text-fg-subtle">
                <CalendarIcon size={13} />
                <span className="sr-only">{p.deadlineLabel}</span>
              </dt>
              <dd className="font-medium text-fg">
                {record.deadline
                  ? new Date(record.deadline).toLocaleDateString(undefined, { dateStyle: "medium" })
                  : p.noDeadline}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------------- Sơ đồ + diễn biến ---------------- */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <FlowCanvas t={t} steps={record.steps} onOpenSlot={onOpenSlot} />

        <div className="flex flex-col gap-4">
          {sidebarTop}

          {/* Yêu cầu dựng từ mẫu: giữ lại mẫu nào và điền gì. Ba tháng sau, câu
              hỏi "vì sao hợp đồng này ghi con số đó" chỉ trả lời được ở đây. */}
          {record.templateName ? (
            <section className="rounded-lg border border-border bg-surface shadow-sm">
              <h3 className="flex items-center gap-2 border-b border-border-muted px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-widest text-fg-subtle">
                <LayersIcon size={13} />
                {t.signRequest.template.review.section}
              </h3>
              <p className="px-4 pt-3 text-[12.5px] font-semibold text-fg">
                {record.templateName}
              </p>
              {record.variableValues && Object.keys(record.variableValues).length > 0 ? (
                <dl className="flex flex-col gap-1 px-4 pb-3 pt-2">
                  {Object.entries(record.variableValues)
                    .filter(([, value]) => value.trim())
                    .map(([key, value]) => (
                      <div key={key} className="flex items-baseline gap-2">
                        <dt className="shrink-0 font-mono text-[10.5px] text-fg-subtle">{key}</dt>
                        <dd className="min-w-0 flex-1 truncate text-right text-[11.5px] font-medium text-fg">
                          {value}
                        </dd>
                      </div>
                    ))}
                </dl>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-lg border border-border bg-surface shadow-sm">
            <h3 className="border-b border-border-muted px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-widest text-fg-subtle">
              {p.timelineTitle}
            </h3>
            <Timeline t={t} record={record} />
          </section>

          {/*
           * Người ký ngoài hệ thống.
           *
           * Khối này CỐ Ý không có nút sao chép link. Link ký thật được phát bằng
           * `POST …/signers/{signerId}/public-links`, và lời gọi đó cần `signerId`
           * của máy chủ — thứ chỉ có ở màn chi tiết (`recordFromDetail`), không có
           * ở bản ghi vừa soạn trong bộ nhớ trang này, nơi mỗi ô còn mang một id
           * sinh ở client. Trước đây chỗ này dựng sẵn một URL từ id cục bộ; nó trỏ
           * vào một route không tồn tại và không đổi được thành phiên ký nào, nên
           * một đường dẫn ĐI ĐÚNG CHỖ có ích hơn một nút sao chép đi sai chỗ.
           */}
          {linkSigners.length > 0 ? (
            <section className="rounded-lg border border-border bg-surface shadow-sm">
              <h3 className="border-b border-border-muted px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-widest text-fg-subtle">
                {t.signRequest.flow.palette.linkGroup}
              </h3>
              <ul className="flex flex-col gap-1.5 px-3 pt-3">
                {linkSigners.map((slot) => (
                  <li
                    key={slot.id}
                    className="flex items-center gap-2 rounded-md border border-border-muted bg-surface-2 px-2.5 py-2"
                  >
                    <LinkIcon size={13} className="shrink-0 text-accent" />
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-fg">
                      {slot.signer?.name || slot.signer?.email}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="px-4 pb-3 pt-2.5 text-[11px] leading-relaxed text-fg-muted">
                {p.linkIssuedInDetail}
              </p>
              <div className="px-3 pb-3">
                <Link
                  href={`/sign-request/workflows/${encodeURIComponent(record.signingRequestId)}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-accent bg-accent px-3 text-[12px] font-semibold text-accent-fg hover:opacity-90"
                >
                  <LinkIcon size={13} />
                  {p.linkOpenDetail}
                </Link>
              </div>
            </section>
          ) : null}

          {/* Cảnh báo lúc dựng tài liệu từ mẫu: biến thiếu, biến thừa. Chúng nói
              về chính tờ giấy mọi người sắp ký, nên không nuốt. */}
          {record.previewWarnings && record.previewWarnings.length > 0 ? (
            <section className="rounded-lg border border-warning bg-warning-subtle p-3.5">
              <h3 className="flex items-center gap-2 text-[12.5px] font-semibold text-warning">
                <AlertTriangleIcon size={14} />
                {p.previewWarnings}
              </h3>
              <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4">
                {record.previewWarnings.map((warning, index) => (
                  <li key={index} className="text-[11px] leading-relaxed text-fg-muted">
                    {warning}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {refreshError ? (
            <section className="rounded-lg border border-danger bg-danger-subtle p-3.5">
              <h3 className="flex items-center gap-2 text-[12.5px] font-semibold text-danger">
                <AlertTriangleIcon size={14} />
                {p.refreshFailed}
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">{refreshError}</p>
            </section>
          ) : null}

          {/*
           * Nói rõ phần nào của màn này KHÔNG đến từ máy chủ.
           *
           * Hạn ký, lời nhắn, cờ nhắc nhở và cấu hình ký của từng ô không có
           * trường nào trong `POST /api/signing-requests`, nên chúng chỉ sống ở
           * trình duyệt này. Người dùng nhìn thấy chúng nằm cạnh dữ liệu thật thì
           * mặc định coi cả hai như nhau — trừ khi có người nói ra.
           */}
          {showLocalOnlyNote ? (
            <section className="rounded-lg border border-dashed border-border bg-surface-2 p-3.5">
              <h3 className="text-[12.5px] font-semibold text-fg">{p.localOnlyTitle}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">{p.localOnlyHint}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Đồng bộ với máy chủ
 * ------------------------------------------------------------------ */

/**
 * Khoảng cách giữa hai lần tự làm mới.
 *
 * 15 giây là đủ để một chữ ký vừa xong hiện ra trong lúc người dùng còn đang
 * nhìn màn hình, và đủ thưa để mở tab này cả buổi không thành một cơn lũ request.
 * `GET /api/signing-requests/{id}` chỉ đọc — nó không tạo giao dịch và không trừ
 * lượt ký nào, khác hẳn `POST .../enrollments/{id}/status` của eSign Cloud vốn
 * tuyệt đối không được poll.
 */
const POLL_INTERVAL_MS = 15_000;

/**
 * Giữ bản ghi khớp với máy chủ.
 *
 * DỪNG khi yêu cầu đã kết thúc (`COMPLETED`/`CANCELLED`): trạng thái không đổi
 * được nữa, nên hỏi lại chỉ là tiếng ồn. Cũng dừng khi tab bị ẩn — không ai đọc
 * một màn hình không nhìn thấy, và làm mới lại ngay lúc tab hiện lên là thứ
 * người dùng thật sự cần.
 *
 * Lỗi làm mới KHÔNG xoá dữ liệu đang hiện. Một lần mạng chập không phải lý do để
 * biến màn theo dõi thành màn trắng; nó hiện thành một dải cảnh báo bên cạnh
 * trạng thái cũ, và trạng thái cũ vẫn đúng hơn là không có gì.
 */
function usePolledRequest(
  t: Dictionary,
  record: SignRequestRecord,
  onRecordChange: (record: SignRequestRecord) => void,
  onDetail?: (detail: SigningRequestDetail) => void,
) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string>();
  const p = t.signRequest.progress;

  const signingRequestId = record.signingRequestId;
  const finished =
    record.serverStatus === "COMPLETED" || record.serverStatus === "CANCELLED";

  /*
   * Bản ghi mới nhất trong một ref: hàm làm mới phải đọc được cây bước hiện tại
   * để đắp trạng thái lên, nhưng nếu nó phụ thuộc vào `record` thì mỗi lần làm
   * mới lại dựng một hàm mới và effect dưới đây khởi động lại đồng hồ — nhịp
   * poll sẽ trôi mãi mà không bao giờ chạy đủ một chu kỳ.
   */
  const latest = useRef(record);
  useEffect(() => {
    latest.current = record;
  }, [record]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const detail = await getSigningRequest(signingRequestId);
      onDetail?.(detail);
      const current = latest.current;
      onRecordChange({
        ...current,
        serverStatus: detail.status,
        documentName: detail.document.fileName,
        documentSize: detail.document.sizeBytes,
        steps: mergeServerSigners(current.steps, detail.signers),
      });
      setRefreshError(undefined);
    } catch (error) {
      setRefreshError(errorMessage(error, p.refreshFailed));
    } finally {
      setRefreshing(false);
    }
  }, [signingRequestId, onRecordChange, onDetail, p.refreshFailed]);

  useEffect(() => {
    if (finished) return;

    let timer = 0;

    function tick() {
      if (window.document.visibilityState !== "visible") return;
      void refresh();
    }

    function start() {
      window.clearInterval(timer);
      timer = window.setInterval(tick, POLL_INTERVAL_MS);
    }

    function onVisibility() {
      if (window.document.visibilityState === "visible") {
        void refresh();
        start();
      } else {
        window.clearInterval(timer);
      }
    }

    start();
    window.document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      window.document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [finished, refresh]);

  return { refreshing, refreshError, refresh };
}

/* ------------------------------------------------------------------ *
 * Diễn biến
 * ------------------------------------------------------------------ */

interface TimelineEntry {
  id: string;
  label: string;
  detail?: string;
  tone: "done" | "active" | "queued";
}

function Timeline({ t, record }: { t: Dictionary; record: SignRequestRecord }) {
  const p = t.signRequest.progress;
  const entries: TimelineEntry[] = [
    {
      id: "created",
      label: p.timelineCreated,
      detail: new Date(record.createdAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
      tone: "done",
    },
  ];

  const active = activeStepIndex(record.steps);

  record.steps.forEach((step, index) => {
    for (const slot of step.slots) {
      if (!slot.signedAt) continue;
      entries.push({
        id: slot.id,
        label: p.timelineSigned(slot.signer?.name || slot.signer?.email || "—"),
        detail: new Date(slot.signedAt).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
        tone: "done",
      });
    }
    if (isStepComplete(step)) {
      entries.push({ id: `${step.id}-done`, label: p.timelineStepDone(index + 1), tone: "done" });
    }
  });

  if (active === -1) {
    entries.push({ id: "completed", label: p.timelineCompleted, tone: "done" });
  } else {
    const waiting = record.steps[active].slots.find((slot) => !slot.signedAt && !slot.declinedAt);
    entries.push({
      id: "waiting",
      label: waiting
        ? p.timelineWaiting(waiting.signer?.name || waiting.signer?.email || "—")
        : p.waitingOnStep(active + 1),
      tone: "active",
    });
  }

  return (
    <ol className="relative flex flex-col gap-3.5 py-4 pl-9 pr-4">
      <span
        aria-hidden="true"
        className="absolute bottom-5 left-[1.45rem] top-5 w-0.5 rounded-full bg-border-muted"
      />
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            aria-hidden="true"
            className={`absolute left-[-1.05rem] top-0.5 flex size-3.5 items-center justify-center rounded-full ring-3 ring-surface ${
              entry.tone === "done"
                ? "bg-success text-success"
                : entry.tone === "active"
                  ? "bg-warning"
                  : "bg-border"
            }`}
          />
          <p className="text-[12px] font-semibold text-fg">{entry.label}</p>
          {entry.detail ? (
            <p className="font-mono text-[10.5px] text-fg-subtle">{entry.detail}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function StatusPill({ t, status }: { t: Dictionary; status: RequestStatus }) {
  const labels = t.signRequest.progress.status;
  const style: Record<RequestStatus, string> = {
    running: "bg-warning-subtle text-warning",
    completed: "bg-success-subtle text-success",
    declined: "bg-danger-subtle text-danger",
    cancelled: "bg-inset text-fg-muted",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${style[status]}`}
    >
      {status === "completed" ? (
        <CheckIcon size={12} />
      ) : status === "running" ? (
        <ClockIcon size={12} />
      ) : (
        <XIcon size={12} />
      )}
      {labels[status]}
    </span>
  );
}
