"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useToast } from "@/components/ui/toast";
import { Dialog } from "@/components/ui/dialog";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BellIcon,
  CheckIcon,
  ClockIcon,
  ConstructionIcon,
  LockIcon,
  PenLineIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons";
import type {
  SigningRequestDetail,
  SigningRequestSigner,
} from "@/lib/types/workflow";
import { errorMessage } from "@/features/signing/api";
import { useSigningLease } from "@/features/signing/use-signing-lease";
import { PublicLinkPanel } from "./public-link-panel";
import { RequestProgressView } from "./request-progress-view";
import { SlotConfigDialog } from "./slot-config-dialog";
import { ActorRequiredError, useActor } from "../actor";
import { findSlot, type SignRequestRecord } from "../model";
import { saveLeaseToken } from "../signing-lease-token";
import {
  isTurnOf,
  myAssignments,
  recordFromDetail,
  signerDisplayName,
} from "../server-request";
import {
  remindWorkflowSigner,
  WorkflowEndpointMissingError,
  type WorkflowAction,
} from "../workflow-actions";
import {
  acquireInternalSigningLease,
  cancelSigningRequest,
  declineWorkflowSlot,
  fetchPdfAsFile,
  getInternalSigningLease,
  getSigningRequest,
  signingRequestDocumentUrl,
} from "../workflow-api";

/**
 * Một quy trình ký, mở từ danh sách.
 *
 * Dùng LẠI `RequestProgressView` của luồng vừa-tạo-xong thay vì dựng một màn
 * thứ hai: cả hai trả lời đúng một câu hỏi ("bước nào đang chờ ai"), và hai
 * cách trình bày cho cùng một quy trình chỉ tạo thêm việc học cho người dùng và
 * việc sửa cho người viết. Khác biệt duy nhất là NGUỒN của bản ghi — ở đây
 * không có bản nháp nào trong bộ nhớ trang, mọi thứ dựng từ
 * `GET /api/signing-requests/{id}` (xem `recordFromDetail`).
 *
 * Và một khác biệt về vai: màn này người KÝ cũng mở, không chỉ người tạo. Vì
 * thế nó có thêm khối "phần của bạn" — thứ mà luồng vừa-tạo-xong không cần, vì
 * ở đó người dùng vừa mới phát yêu cầu cho người khác.
 */
export function WorkflowDetailWorkspace({
  signingRequestId,
}: {
  signingRequestId: string;
}) {
  const { t } = useLocale();
  const { actor } = useActor();
  const d = t.signRequest.workflows.detail;

  const [detail, setDetail] = useState<SigningRequestDetail>();
  const [loadError, setLoadError] = useState<string>();
  const [openSlotId, setOpenSlotId] = useState<string>();

  /*
   * Lần đọc ĐẦU TIÊN. Những lần sau do `RequestProgressView` thực hiện (nút Làm
   * mới và nhịp poll của nó) và báo về qua `onDetail` — hai đồng hồ cùng gọi
   * một endpoint là gấp đôi lưu lượng mà không thêm thông tin nào.
   *
   * Đọc lại khi `actor` đổi: quyền xem một yêu cầu gắn với `X-Username`, nên
   * đổi danh tính có thể biến màn đang mở thành 403 — và ngược lại. Lần đọc lại
   * đó KHÔNG xoá màn hình trước: nội dung cũ đứng nguyên tới khi có nội dung
   * mới, và chỉ biến mất nếu danh tính mới thật sự không xem được nữa.
   */
  useEffect(() => {
    const controller = new AbortController();

    getSigningRequest(signingRequestId, controller.signal)
      .then((result) => {
        setDetail(result);
        setLoadError(undefined);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setDetail(undefined);
        setLoadError(
          error instanceof ActorRequiredError
            ? t.signRequest.actor.requiredHint
            : errorMessage(error, d.loadFailed),
        );
      });

    return () => controller.abort();
  }, [signingRequestId, actor, d.loadFailed, t.signRequest.actor.requiredHint]);

  const record = useMemo(
    () => (detail ? recordFromDetail(detail) : undefined),
    [detail],
  );

  /*
   * Tài liệu để xem trước trong hộp thoại ô, tải LƯỜI — chỉ khi người dùng mở
   * một ô ra xem. Tải sẵn ngay lúc vào màn là kéo về cả tệp PDF cho một hộp
   * thoại mà phần lớn lượt xem không mở tới.
   */
  const [document, setDocument] = useState<File>();
  useEffect(() => {
    if (!openSlotId || document || !record || record.documentFormat !== "PDF")
      return;

    const controller = new AbortController();
    fetchPdfAsFile(
      signingRequestDocumentUrl(signingRequestId),
      record.documentName,
      true,
      controller.signal,
    )
      .then((file) => setDocument(file))
      .catch(() => {
        // Không mở được tệp thì hộp thoại vẫn hiện cấu hình, chỉ mất khung xem
        // trước. Không chặn cả màn vì một bản preview.
      });

    return () => controller.abort();
  }, [openSlotId, document, record, signingRequestId]);

  const openSlot =
    record && openSlotId ? findSlot(record.steps, openSlotId) : undefined;

  /* Chưa có gì và cũng chưa hỏng = đang đọc lần đầu. */
  if (!record && !loadError) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink label={d.back} />
        <p className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-6 text-[12.5px] text-fg-muted shadow-sm">
          <SpinnerIcon size={15} className="animate-spin" />
          {d.loading}
        </p>
      </div>
    );
  }

  if (!record || !detail) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink label={d.back} />
        <section className="flex items-start gap-2.5 rounded-lg border border-danger bg-danger-subtle px-4 py-3.5">
          <AlertTriangleIcon
            size={15}
            className="mt-0.5 shrink-0 text-danger"
          />
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-danger">
              {d.loadFailed}
            </p>
            {loadError ? (
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-muted">
                {loadError}
              </p>
            ) : null}
            <p className="mt-1.5 text-[11px] leading-relaxed text-fg-subtle">
              {d.loadFailedHint}
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink label={d.back} />

      <RequestProgressView
        t={t}
        record={record}
        /*
         * Bản ghi ở màn này KHÔNG được đắp thêm: nó được dựng lại nguyên vẹn từ
         * `detail` sau mỗi lần làm mới, nên bản đã trộn của `RequestProgressView`
         * chỉ là một bước trung gian bị bỏ đi.
         */
        onRecordChange={() => undefined}
        onDetail={setDetail}
        onOpenSlot={setOpenSlotId}
        showLocalOnlyNote={false}
        headerActions={
          <CancelButton
            signingRequestId={signingRequestId}
            detail={detail}
            onCancelled={setDetail}
          />
        }
        sidebarTop={
          <>
            <AssignmentPanel
              detail={detail}
              record={record}
              actor={actor}
              onDeclined={setDetail}
            />

            {detail.createdBy === actor ? (
              <PublicLinkPanel detail={detail} actor={actor} />
            ) : null}

            <section className="rounded-lg border border-dashed border-border bg-surface-2 p-3.5">
              <h3 className="text-[12.5px] font-semibold text-fg">
                {d.serverOnlyTitle}
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                {d.serverOnlyHint}
              </p>
            </section>
          </>
        }
      />

      {openSlot ? (
        <SlotConfigDialog
          key={openSlot.slot.id}
          t={t}
          open
          readOnly
          onClose={() => setOpenSlotId(undefined)}
          slot={openSlot.slot}
          stepIndex={openSlot.stepIndex}
          steps={record.steps}
          document={document}
          documentFormat={record.documentFormat}
          onPatch={() => undefined}
          onMoveToStep={() => undefined}
          onRemove={() => undefined}
        />
      ) : null}

    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      href="/sign-request/workflows"
      className="inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12px] font-semibold text-fg hover:bg-inset"
    >
      <ArrowLeftIcon size={13} />
      {label}
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 * Phần việc của người đang thao tác
 * ------------------------------------------------------------------ */

/**
 * Tên khung chữ ký của người đang GIỮ lease, tra ra từ chính `detail` đã có —
 * không tin `holderLabel` của response lease (nó do phân hệ lease tự đặt, có
 * thể khác cách quy trình đặt tên cho khung ký của người này).
 *
 * `holderUserId` → tìm đúng `SigningRequestSigner` có `userId` khớp trong
 * `detail.signers` → lấy `title` của khung chữ ký ĐẦU TIÊN có tên (một người có
 * thể có nhiều khung, chỉ cần một cái để gọi tên họ trong câu thông báo).
 * `undefined` khi không tra ra được gì — nơi gọi rơi về câu chung chung.
 */
function holderSlotTitle(
  detail: SigningRequestDetail,
  holderUserId: string | null | undefined,
): string | undefined {
  if (!holderUserId) return undefined;
  const holder = detail.signers.find((item) => item.userId === holderUserId);
  const title = holder?.signatureSlots.find((slot) => slot.title?.trim())?.title;
  return title?.trim() || undefined;
}

/**
 * Việc của NGƯỜI ĐANG XEM trong quy trình này.
 *
 * Đây là lý do tồn tại của màn danh sách đối với người ký: họ vào để tìm việc
 * của mình, nên việc đó phải đứng ở chỗ đọc được đầu tiên, không lẫn vào sơ đồ
 * chung. Một người có thể đứng ở hai bước — mỗi phần việc là một dòng riêng,
 * đúng như hai lượt ký khác nhau.
 *
 * Nút Ký ĐIỀU HƯỚNG sang trang ký riêng, không mở hộp thoại nữa: việc ký cần cả
 * tài liệu nằm trên màn hình (xem `workflow-sign-workspace.tsx`), và một hộp
 * thoại không có chỗ cho nó. `signerId` đi kèm trong query string, vì một người
 * có thể đứng ở hai bước — mỗi dòng dưới đây là một lượt ký khác nhau, và trang
 * ký phải biết nó được mở cho lượt nào.
 *
 * Từ chối có endpoint thật, xem `DeclineButton`. Nút nhắc vẫn chưa có endpoint
 * nào để gọi; xem `workflow-actions.ts`.
 */
function AssignmentPanel({
  detail,
  record,
  actor,
  onDeclined,
}: {
  detail: SigningRequestDetail;
  record: SignRequestRecord;
  actor: string | null;
  onDeclined: (detail: SigningRequestDetail) => void;
}) {
  const { t } = useLocale();
  const a = t.signRequest.workflows.detail.assignment;
  const mine = myAssignments(detail, actor);

  if (mine.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface p-3.5 shadow-sm">
        <h3 className="text-[12.5px] font-semibold text-fg">{a.title}</h3>
        <p className="mt-1 text-[11.5px] text-fg-muted">{a.none}</p>
        {detail.createdBy === actor ? (
          <p className="mt-0.5 text-[11px] text-fg-subtle">{a.noneHint}</p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-accent bg-surface shadow-sm">
      <h3 className="flex items-center gap-2 border-b border-border-muted px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-widest text-accent">
        <PenLineIcon size={13} />
        {a.title}
      </h3>
      <ul className="flex flex-col gap-2.5 p-3.5">
        {mine.map((signer) => (
          <li key={signer.signerId}>
            <AssignmentRow
              detail={detail}
              record={record}
              signer={signer}
              onDeclined={onDeclined}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function AssignmentRow({
  detail,
  record,
  signer,
  onDeclined,
}: {
  detail: SigningRequestDetail;
  record: SignRequestRecord;
  signer: SigningRequestSigner;
  onDeclined: (detail: SigningRequestDetail) => void;
}) {
  const { t } = useLocale();
  const { actor } = useActor();
  const { toast } = useToast();
  const router = useRouter();
  const a = t.signRequest.workflows.detail.assignment;
  const missing = useMissingAction();

  const turn = isTurnOf(detail, signer);
  const stepIndex = record.steps.findIndex((step) =>
    step.slots.some((slot) => slot.id === signer.signerId),
  );

  const signHref = `/sign-request/workflows/${encodeURIComponent(
    detail.signingRequestId,
  )}/sign?signerId=${encodeURIComponent(signer.signerId)}`;

  /*
   * Điều kiện eligibility hiện có (đã tới lượt ký theo thứ tự quy trình) và
   * signing lease là HAI thứ độc lập — xem đầu file. Lease chỉ đọc khi cả hai
   * điều kiện còn lại đều đúng: đã tới lượt, lượt còn `PENDING`. Đọc GET ngay
   * khi mở Workflow Detail là ĐÚNG spec ("kết hợp hai điều kiện độc lập"); chỉ
   * POST acquire mới đợi tới lúc người dùng thực sự bấm.
   */
  /*
   * Không có `cancel` thật: Workflow Detail không huỷ lượt ký của ai — huỷ chỉ
   * có ở chính màn ký (`workflow-sign-workspace.tsx`, sau khi đã giành lease).
   * `useSigningLease` vẫn đòi đủ hình dạng `SigningLeaseTransport`, nên đây là
   * một no-op không bao giờ được gọi tới (không có nút huỷ nào render ở đây).
   */
  const leaseTransport = useMemo(
    () => ({
      get: (signal?: AbortSignal) => getInternalSigningLease(detail.signingRequestId, signal),
      cancel: async () => undefined,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `actor` đổi thì phải đọc lại lease dưới danh tính mới
    [detail.signingRequestId, actor],
  );

  const lease = useSigningLease({
    transport: leaseTransport,
    enabled: turn && signer.status === "PENDING",
    leaseKey: `${detail.signingRequestId}:${signer.signerId}:${actor}`,
  });

  const [acquiring, setAcquiring] = useState(false);

  const canClickSign = turn && lease.canStartSigning && !acquiring;

  /**
   * Bấm "Ký ngay": KHÔNG điều hướng ngay. `POST` giành lease trước — đây là lớp
   * chống race condition cuối cùng, `GET` phía trên chỉ là ảnh chụp. Thất bại
   * (người khác vừa giành, hoặc chính mình đã có lượt đang mở) thì KHÔNG điều
   * hướng, chỉ đọc lại lease để nút tự cập nhật.
   */
  const handleSign = async () => {
    if (!canClickSign) return;
    setAcquiring(true);
    try {
      const acquired = await acquireInternalSigningLease(detail.signingRequestId);
      saveLeaseToken(detail.signingRequestId, acquired.leaseToken);
      router.push(signHref);
    } catch (error) {
      toast.danger(
        a.signFailed,
        error instanceof ActorRequiredError
          ? t.signRequest.actor.requiredHint
          : errorMessage(error, a.signFailed),
      );
      void lease.refreshLease();
    } finally {
      setAcquiring(false);
    }
  };

  return (
    <div className="rounded-md border border-border-muted bg-surface-2 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] uppercase tracking-widest text-fg-subtle">
          {a.stepLabel(stepIndex + 1)}
          {` · ${signerDisplayName(signer)}`}
        </span>
        {signer.status === "SIGNED" ? (
          <CheckIcon size={13} className="text-success" />
        ) : signer.status === "DECLINED" ? (
          <XIcon size={13} className="text-danger" />
        ) : (
          <ClockIcon
            size={13}
            className={turn ? "text-warning" : "text-fg-subtle"}
          />
        )}
      </div>

      <p className="mt-1 text-[12px] font-semibold text-fg">
        {signer.status === "SIGNED"
          ? a.signed(
              signer.signedAt
                ? new Date(signer.signedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "",
            )
          : signer.status === "DECLINED"
            ? a.declined
            : turn
              ? a.waiting
              : a.notYourTurn}
      </p>

      {signer.status === "PENDING" ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {/*
            Nút gọi `onClick`, không còn là `Link`: giành lease (`POST`) phải
            THÀNH CÔNG trước khi điều hướng, nên không thể trỏ thẳng `href` vào
            màn ký nữa — mất khả năng mở tab mới bằng chuột giữa là đánh đổi cố
            ý cho đúng luồng "giành trước, điều hướng sau" (xem `handleSign`).
            Chưa tới lượt hoặc lease không `AVAILABLE` thì disable, không ẩn hẳn:
            người ký cần thấy nút này tồn tại để biết vì sao mình chưa ký được.
          */}
          {turn ? (
            <button
              type="button"
              disabled={!canClickSign}
              onClick={() => void handleSign()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-accent bg-accent px-3 text-[12px] font-semibold text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {acquiring ? (
                <SpinnerIcon size={13} className="animate-spin" />
              ) : (
                <PenLineIcon size={13} />
              )}
              {a.sign}
            </button>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-md border border-accent bg-accent px-3 text-[12px] font-semibold text-accent-fg opacity-40"
            >
              <PenLineIcon size={13} />
              {a.sign}
            </span>
          )}
          <DeclineButton
            detail={detail}
            signer={signer}
            turn={turn}
            onDeclined={onDeclined}
          />
          <button
            type="button"
            onClick={() =>
              missing.run("remind", () =>
                remindWorkflowSigner(detail.signingRequestId, signer.signerId),
              )
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12px] font-semibold text-fg-muted hover:bg-inset"
          >
            <BellIcon size={13} />
            {t.signRequest.workflows.detail.remind}
          </button>
        </div>
      ) : null}

      {/*
       * Đã tới lượt nhưng lease đang `LOCKED` — một lượt ký khác đang chạy
       * thật, không phải lỗi. Tên hiện ra là TÊN KHUNG CHỮ KÝ của người đang
       * giữ, tra từ `detail` (`holderSlotTitle`) chứ không phải `holderLabel`
       * của response lease — xem chú thích ở hàm đó. Đây là màn NỘI BỘ nên
       * được phép hiện thông tin này — xem ranh giới riêng tư ở
       * `SigningLeasePanel`.
       */}
      {turn && signer.status === "PENDING" && lease.lease?.state === "LOCKED" ? (
        <div className="mt-2.5 flex items-start gap-2 rounded-md border border-dashed border-warning bg-warning-subtle px-2.5 py-2">
          <LockIcon size={13} className="mt-0.5 shrink-0 text-warning" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-warning">{a.lockedTitle}</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-fg-muted">
              {(() => {
                const title = holderSlotTitle(detail, lease.lease?.holderUserId);
                return title ? a.lockedByBody(title) : a.lockedBody;
              })()}
            </p>
          </div>
        </div>
      ) : null}

      {missing.notice ? <MissingNotice action={missing.notice} /> : null}
    </div>
  );
}

/**
 * Từ chối MỘT lượt ký — chỉ hiện cho chính người ký lượt đó.
 *
 * Có endpoint thật nên KHÔNG đi qua `useMissingAction`: lỗi ở đây là lỗi
 * nghiệp vụ thật (403 không phải đúng người, 404 hết tồn tại, 409 đã ký/đã từ
 * chối/chưa tới lượt/quy trình đã đóng), không phải "chưa nối API".
 *
 * Khoá nút khi lượt không còn `PENDING`, chưa tới lượt (`turn`), quy trình đã
 * `COMPLETED`/`CANCELLED`, hoặc lượt không phải `INTERNAL` — bốn luật này
 * backend cũng tự áp, khoá ở đây chỉ để không gửi một lời gọi chắc chắn hỏng.
 * Xác nhận trước khi gọi vì từ chối kéo theo huỷ CẢ quy trình, không chỉ phần
 * của người bấm — một thao tác một chiều.
 */
function DeclineButton({
  detail,
  signer,
  turn,
  onDeclined,
}: {
  detail: SigningRequestDetail;
  signer: SigningRequestSigner;
  turn: boolean;
  onDeclined: (detail: SigningRequestDetail) => void;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  const { actor } = useActor();
  const a = t.signRequest.workflows.detail.assignment;
  const c = t.signRequest.workflows.detail;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const finished =
    detail.status === "COMPLETED" || detail.status === "CANCELLED";
  const canDecline =
    Boolean(actor) &&
    signer.status === "PENDING" &&
    signer.accessMode === "INTERNAL" &&
    turn &&
    !finished;

  const confirmDecline = async () => {
    if (!actor) return;
    setPending(true);
    try {
      const updated = await declineWorkflowSlot(
        detail.signingRequestId,
        signer.signerId,
        actor,
      );
      onDeclined(updated);
      setConfirmOpen(false);
      toast.success(c.declineDone);
    } catch (error) {
      toast.danger(
        c.declineFailed,
        error instanceof ActorRequiredError
          ? t.signRequest.actor.requiredHint
          : errorMessage(error, c.declineFailed),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={!canDecline}
        onClick={() => setConfirmOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12px] font-semibold text-fg hover:bg-inset disabled:cursor-not-allowed disabled:opacity-40"
      >
        <XIcon size={13} />
        {a.decline}
      </button>

      <Dialog
        open={confirmOpen}
        onClose={() => {
          if (!pending) setConfirmOpen(false);
        }}
        label={c.declineConfirmTitle}
      >
        <div className="p-4">
          <h2 className="text-[13px] font-semibold text-fg">
            {c.declineConfirmTitle}
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">
            {c.declineConfirmBody}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
              className="inline-flex h-8.5 items-center rounded-md border border-border bg-surface px-3 text-[12.5px] font-semibold text-fg hover:bg-inset disabled:cursor-not-allowed disabled:opacity-40"
            >
              {c.declineConfirmDismiss}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirmDecline}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-danger bg-danger px-3 text-[12.5px] font-semibold text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? (
                <SpinnerIcon size={13} className="animate-spin" />
              ) : (
                <XIcon size={13} />
              )}
              {c.declineConfirmAction}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/**
 * Huỷ cả quy trình — chỉ hiện cho NGƯỜI TẠO.
 *
 * Người ký không huỷ được việc của người khác, và một nút luôn hỏng theo cùng
 * một cách với mọi người sẽ không nói được điều gì về quyền.
 *
 * Có endpoint thật nên KHÔNG đi qua `useMissingAction` như ba nút còn lại: lỗi
 * ở đây là lỗi nghiệp vụ thật (403 không phải người tạo, 409 đã đóng…), không
 * phải "chưa nối API". Xác nhận trước khi gọi vì đây là thao tác một chiều —
 * không có đường đưa `CANCELLED` quay lại `IN_PROGRESS`.
 */
function CancelButton({
  signingRequestId,
  detail,
  onCancelled,
}: {
  signingRequestId: string;
  detail: SigningRequestDetail;
  onCancelled: (detail: SigningRequestDetail) => void;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  const { actor } = useActor();
  const c = t.signRequest.workflows.detail;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const finished =
    detail.status === "COMPLETED" || detail.status === "CANCELLED";
  if (detail.createdBy !== actor || finished || !actor) return null;

  const confirmCancel = async () => {
    setPending(true);
    try {
      const updated = await cancelSigningRequest(signingRequestId, actor);
      onCancelled(updated);
      setConfirmOpen(false);
      toast.success(c.cancelDone);
    } catch (error) {
      toast.danger(
        c.cancelFailed,
        error instanceof ActorRequiredError
          ? t.signRequest.actor.requiredHint
          : errorMessage(error, c.cancelFailed),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12.5px] font-semibold text-danger hover:bg-danger-subtle"
      >
        <XIcon size={14} />
        {c.cancel}
      </button>

      <Dialog
        open={confirmOpen}
        onClose={() => {
          if (!pending) setConfirmOpen(false);
        }}
        label={c.cancelConfirmTitle}
      >
        <div className="p-4">
          <h2 className="text-[13px] font-semibold text-fg">
            {c.cancelConfirmTitle}
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">
            {c.cancelConfirmBody}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
              className="inline-flex h-8.5 items-center rounded-md border border-border bg-surface px-3 text-[12.5px] font-semibold text-fg hover:bg-inset disabled:cursor-not-allowed disabled:opacity-40"
            >
              {c.cancelConfirmDismiss}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirmCancel}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-danger bg-danger px-3 text-[12.5px] font-semibold text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? (
                <SpinnerIcon size={13} className="animate-spin" />
              ) : (
                <XIcon size={13} />
              )}
              {c.cancelConfirmAction}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Thao tác chưa có endpoint
 * ------------------------------------------------------------------ */

/**
 * Chạy một thao tác và xử lý riêng trường hợp "chưa có API".
 *
 * Còn lại đúng một nút ở tình trạng này (nhắc — xem `workflow-actions.ts`), và
 * cách nói ra vẫn là một dải cảnh báo NGAY CẠNH nút vừa bấm cộng một toast, chứ
 * không phải một lỗi mạng chung chung khiến người test đi kiểm tra backend.
 *
 * Khi endpoint được nối vào (`ENDPOINTS` trong `workflow-actions.ts`), hàm chạy
 * thật và nhánh này im lặng — không phải sửa gì ở đây.
 */
function useMissingAction() {
  const { t } = useLocale();
  const { toast } = useToast();
  const m = t.signRequest.workflows.detail.missing;
  const [notice, setNotice] = useState<WorkflowAction>();

  const run = useCallback(
    async (action: WorkflowAction, call: () => Promise<void>) => {
      try {
        await call();
        setNotice(undefined);
      } catch (error) {
        if (error instanceof WorkflowEndpointMissingError) {
          setNotice(action);
          toast.warning(m.title, m[action]);
          return;
        }
        toast.warning(
          m.title,
          error instanceof ActorRequiredError
            ? t.signRequest.actor.requiredHint
            : errorMessage(error, m.title),
        );
      }
    },
    [m, t.signRequest.actor.requiredHint, toast],
  );

  return { notice, run };
}

function MissingNotice({ action }: { action: WorkflowAction }) {
  const { t } = useLocale();
  const m = t.signRequest.workflows.detail.missing;

  return (
    <div className="mt-2.5 flex items-start gap-2 rounded-md border border-dashed border-warning bg-warning-subtle px-2.5 py-2">
      <ConstructionIcon size={13} className="mt-0.5 shrink-0 text-warning" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-warning">{m.title}</p>
        <p className="mt-0.5 text-[10.5px] leading-relaxed text-fg-muted">
          {m[action]}
        </p>
      </div>
    </div>
  );
}
