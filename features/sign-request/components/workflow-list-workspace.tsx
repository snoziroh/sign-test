"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  LayersIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SpinnerIcon,
  UserPlusIcon,
  XIcon,
} from "@/components/ui/icons";
import type {
  SigningRequestListItem,
  SigningRequestStatus,
  SigningRequestUserRelation,
} from "@/lib/types/workflow";
import { errorMessage } from "@/features/signing/api";
import { ActorRequiredError, useActor } from "../actor";
import { listSigningRequests } from "../workflow-api";

/**
 * Danh sách quy trình ký của người đang thao tác.
 *
 * `GET /api/signing-requests` trả về CẢ hai vai: yêu cầu do người này tạo và
 * yêu cầu người này phải ký, trong cùng một danh sách, phân biệt bằng
 * `userRelation`. Đó là lý do màn này phục vụ được cả hai người dùng — người
 * phát yêu cầu vào để theo dõi, người ký vào để tìm việc của mình — mà không
 * cần hai màn.
 *
 * ------------------------------------------------------------------
 * LỌC Ở ĐÂU
 * ------------------------------------------------------------------
 *
 * `search` và `status` là tham số của API, nên chúng lọc trên TOÀN BỘ dữ liệu.
 * `userRelation` thì không có tham số nào cả — lọc nó chỉ làm được trong trang
 * đang tải về, và giao diện phải nói ra điều đó thay vì để người dùng tin rằng
 * "Tôi ký" đã quét hết mọi trang.
 *
 * Danh sách KHÔNG tự làm mới theo chu kỳ, khác màn chi tiết. Một trang danh
 * sách đang đứng yên không phải chỗ người ta chờ một chữ ký xuất hiện, và nhịp
 * poll ở đây nhân lên theo số người mở tab chứ không theo số việc thật.
 */

const PAGE_SIZE = 20;

const STATUSES: readonly SigningRequestStatus[] = [
  "DRAFT",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const RELATIONS: readonly SigningRequestUserRelation[] = [
  "SIGNER",
  "CREATOR",
  "CREATOR_AND_SIGNER",
];

export function WorkflowListWorkspace() {
  const { t } = useLocale();
  const { actor } = useActor();
  const l = t.signRequest.workflows.list;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SigningRequestStatus | "">("");
  const [relation, setRelation] = useState<SigningRequestUserRelation | "">("");
  const [page, setPage] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);

  /*
   * Đổi bộ lọc là đổi hẳn tập kết quả, nên số trang phải về 0 CÙNG LÚC — giữ
   * nguyên trang 3 của tập cũ là hỏi máy chủ một trang thường không tồn tại
   * trong tập mới, và người dùng nhận về một danh sách rỗng khó hiểu.
   */
  function filterBy(next: { search?: string; status?: SigningRequestStatus | "" }) {
    if (next.search !== undefined) setSearch(next.search);
    if (next.status !== undefined) setStatus(next.status);
    setPage(0);
  }

  const [items, setItems] = useState<SigningRequestListItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  /** Chưa có danh tính là một trạng thái RIÊNG, không phải một lỗi tải. */
  const [actorMissing, setActorMissing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(undefined);
      setActorMissing(false);

      listSigningRequests({
        page,
        size: PAGE_SIZE,
        search,
        status: status || undefined,
        signal: controller.signal,
      })
        .then((result) => {
          setItems(result.items);
          setTotalElements(result.totalElements);
          setTotalPages(result.totalPages);
        })
        .catch((cause) => {
          if (controller.signal.aborted) return;
          setItems([]);
          setTotalElements(0);
          setTotalPages(0);
          if (cause instanceof ActorRequiredError) setActorMissing(true);
          else setError(errorMessage(cause, l.loadFailed));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, search ? 300 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [actor, page, search, status, reloadToken, l.loadFailed]);

  const visible = useMemo(
    () =>
      relation
        ? items.filter((item) =>
            relation === "CREATOR_AND_SIGNER"
              ? item.userRelation === "CREATOR_AND_SIGNER"
              : item.userRelation === relation || item.userRelation === "CREATOR_AND_SIGNER",
          )
        : items,
    [items, relation],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------- Thanh lọc ---------------- */}
      <section className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
        <div className="relative min-w-60 flex-1">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => filterBy({ search: event.target.value })}
            aria-label={l.searchLabel}
            placeholder={l.searchPlaceholder}
            className="h-8.5 w-full rounded-md border border-border bg-surface pl-8 pr-2.5 text-[12.5px] text-fg"
          />
        </div>

        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted">
          {l.statusLabel}
          <select
            value={status}
            onChange={(event) =>
              filterBy({ status: event.target.value as SigningRequestStatus | "" })
            }
            className="h-8.5 rounded-md border border-border bg-surface px-2 text-[12px] font-normal text-fg"
          >
            <option value="">{l.allStatuses}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {l.status[value]}
              </option>
            ))}
          </select>
        </label>

        <label
          title={l.relationFilterNote}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted"
        >
          {l.relationLabel}
          <select
            value={relation}
            onChange={(event) => setRelation(event.target.value as SigningRequestUserRelation | "")}
            className="h-8.5 rounded-md border border-border bg-surface px-2 text-[12px] font-normal text-fg"
          >
            <option value="">{l.allRelations}</option>
            {RELATIONS.map((value) => (
              <option key={value} value={value}>
                {l.relation[value]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setReloadToken((token) => token + 1)}
          disabled={loading}
          className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12.5px] font-semibold text-fg hover:bg-inset disabled:opacity-50"
        >
          {loading ? (
            <SpinnerIcon size={14} className="animate-spin" />
          ) : (
            <RotateCcwIcon size={14} />
          )}
          {l.refresh}
        </button>

        <Link
          href="/sign-request/create"
          className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-3 text-[12.5px] font-semibold text-accent-fg hover:opacity-90"
        >
          <PlusIcon size={14} />
          {l.create}
        </Link>
      </section>

      {/* ---------------- Trạng thái không có dữ liệu ---------------- */}
      {actorMissing ? (
        <section className="flex items-start gap-2.5 rounded-lg border border-warning bg-warning-subtle px-4 py-3.5">
          <UserPlusIcon size={15} className="mt-0.5 shrink-0 text-warning" />
          <div>
            <p className="text-[12.5px] font-semibold text-warning">{l.actorRequired}</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-muted">
              {l.actorRequiredHint}
            </p>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="flex items-start gap-2.5 rounded-lg border border-danger bg-danger-subtle px-4 py-3.5">
          <AlertTriangleIcon size={15} className="mt-0.5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-danger">{l.loadFailed}</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-muted">{error}</p>
            <button
              type="button"
              onClick={() => setReloadToken((token) => token + 1)}
              className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12px] font-semibold text-fg hover:bg-inset"
            >
              <RotateCcwIcon size={13} />
              {l.retry}
            </button>
          </div>
        </section>
      ) : null}

      {/* ---------------- Danh sách ---------------- */}
      {!actorMissing && !error ? (
        visible.length === 0 && !loading ? (
          <section className="rounded-lg border border-dashed border-border bg-surface-2 px-4 py-10 text-center">
            <LayersIcon size={22} className="mx-auto text-fg-subtle" />
            <p className="mt-2.5 text-[13px] font-semibold text-fg">
              {items.length === 0 && !search && !status ? l.empty : l.noResults}
            </p>
            <p className="mx-auto mt-1 max-w-[60ch] text-[11.5px] leading-relaxed text-fg-muted">
              {items.length === 0 && !search && !status ? l.emptyHint : l.noResultsHint}
            </p>
          </section>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((item) => (
              <li key={item.signingRequestId}>
                <WorkflowCard item={item} />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {/* ---------------- Phân trang ---------------- */}
      {!actorMissing && !error && totalPages > 0 ? (
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 shadow-sm">
          <p className="font-mono text-[11px] text-fg-subtle">
            {l.count(totalElements)}
            {relation ? ` · ${l.relationFilterNote}` : ""}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0 || loading}
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
              className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-[12px] font-semibold text-fg hover:bg-inset disabled:cursor-not-allowed disabled:opacity-40"
            >
              {l.prev}
            </button>
            <span className="font-mono text-[11px] text-fg-muted">
              {l.pageOf(page + 1, Math.max(totalPages, 1))}
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-[12px] font-semibold text-fg hover:bg-inset disabled:cursor-not-allowed disabled:opacity-40"
            >
              {l.next}
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

/**
 * Một dòng trong danh sách.
 *
 * Cả thẻ là vùng bấm chứ không phải một liên kết nhỏ trong thẻ: mở quy trình là
 * việc duy nhất làm được ở đây, nên đích bấm nên to bằng đúng thứ nó đại diện.
 */
function WorkflowCard({ item }: { item: SigningRequestListItem }) {
  const { t } = useLocale();
  const l = t.signRequest.workflows.list;

  return (
    <Link
      href={`/sign-request/workflows/${encodeURIComponent(item.signingRequestId)}`}
      className="group flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm transition-colors hover:border-accent hover:bg-accent-subtle"
    >
      <div className="min-w-60 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-semibold text-fg">{item.title}</span>
          <StatusBadge status={item.status} />
          <RelationBadge relation={item.userRelation} />
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10.5px] text-fg-subtle">
          {/* UUID đầy đủ trong `title`: đó là thứ dán vào lệnh curl khi báo lỗi. */}
          <span title={item.signingRequestId} className="max-w-52 truncate">
            {item.signingRequestId}
          </span>
          <span className="inline-flex items-center gap-1">
            {item.sourceType === "TEMPLATE_PREVIEW" ? (
              <LayersIcon size={11} />
            ) : (
              <FileTextIcon size={11} />
            )}
            {l.source[item.sourceType]}
          </span>
          <span>{l.createdBy(item.createdBy)}</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-[10.5px] text-fg-subtle">
          {l.updatedAt(
            new Date(item.updatedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          )}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent">
          {l.open}
          <ArrowRightIcon size={14} />
        </span>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: SigningRequestStatus }) {
  const { t } = useLocale();
  const labels = t.signRequest.workflows.list.status;
  const style: Record<SigningRequestStatus, string> = {
    DRAFT: "bg-inset text-fg-muted",
    IN_PROGRESS: "bg-warning-subtle text-warning",
    COMPLETED: "bg-success-subtle text-success",
    CANCELLED: "bg-danger-subtle text-danger",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${style[status]}`}
    >
      {status === "COMPLETED" ? (
        <CheckIcon size={11} />
      ) : status === "CANCELLED" ? (
        <XIcon size={11} />
      ) : (
        <ClockIcon size={11} />
      )}
      {labels[status]}
    </span>
  );
}

/**
 * Quan hệ của người đang thao tác với quy trình.
 *
 * Đây là thứ trả lời câu hỏi đầu tiên của người mở danh sách — "cái nào là việc
 * TÔI phải làm" — nên nó đứng ngang hàng với trạng thái, không nằm dưới dạng
 * một dòng phụ.
 */
function RelationBadge({ relation }: { relation: SigningRequestUserRelation }) {
  const { t } = useLocale();
  const labels = t.signRequest.workflows.list.relation;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
        relation === "CREATOR"
          ? "border-border text-fg-muted"
          : "border-accent text-accent"
      }`}
    >
      {labels[relation]}
    </span>
  );
}
