"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useToast } from "@/components/ui/toast";
import { Dialog } from "@/components/ui/dialog";
import {
  AlertTriangleIcon,
  CheckIcon,
  ClockIcon,
  ConstructionIcon,
  CopyIcon,
  LinkIcon,
  PlusIcon,
  RotateCcwIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n";
import type {
  PublicSigningLink,
  PublicSigningLinkStatus,
} from "@/lib/types/external-signing";
import {
  compareLinksNewestFirst,
  isLinkUsable,
} from "@/lib/types/external-signing";
import type {
  SigningRequestDetail,
  SigningRequestSigner,
} from "@/lib/types/workflow";
import { errorMessage } from "@/features/signing/api";
import { ActorRequiredError } from "../actor";
import {
  createPublicLink,
  isEndpointMissing,
  listPublicLinks,
  revokePublicLink,
} from "../public-link-api";
import { isTurnOf, signerDisplayName } from "../server-request";
import { buildExternalSigningUrl } from "./external-signing-url";

/**
 * Quản trị link ký ngoài hệ thống, một khu vực cho mỗi người ký (§4.1).
 *
 * Chỉ NGƯỜI TẠO yêu cầu thấy khối này. Người ký không phát link cho người khác, và
 * một link của người khác không phải thứ họ được đọc — dù chỉ là `tokenHint`.
 *
 * Ba điều định hình cách khối này hành xử:
 *
 * 1. **`url` chỉ tồn tại một lần.** Backend lưu hash của token, không lưu token.
 *    Nên sau khi tạo, đường dẫn nằm trong state của component này và không đi đâu
 *    khác — không localStorage, không toast (toast nằm lại trên màn hình lâu hơn
 *    người dùng nghĩ), không log. Có một nút ẩn nó đi khi đã gửi xong.
 * 2. **"Tạo link mới" là thao tác PHÁ HUỶ.** Backend thu hồi link đang hoạt động
 *    trước khi tạo, nên nút đó luôn đi qua hộp thoại xác nhận. Người vừa gửi link
 *    cho khách hàng qua email cần biết cú bấm này làm link đó chết.
 * 3. **Nút bị khoá luôn nói vì sao.** Chưa tới lượt, đã ký, đã từ chối, yêu cầu đã
 *    đóng — bốn lý do khác nhau dẫn tới bốn việc khác nhau, và một nút xám không
 *    giải thích gì sẽ bị hiểu thành lỗi.
 */

/** Các lựa chọn hạn link. `undefined` = để backend dùng TTL mặc định của nó. */
const EXPIRY_CHOICES = [
  { id: "default", hours: undefined },
  { id: "h24", hours: 24 },
  { id: "d3", hours: 72 },
  { id: "d7", hours: 168 },
] as const;

type ExpiryChoiceId = (typeof EXPIRY_CHOICES)[number]["id"];

type LinksBySigner = Record<string, PublicSigningLink[]>;

interface DialogState {
  signer: SigningRequestSigner;
  /** Signer đang có link hoạt động — cú bấm này sẽ làm nó mất hiệu lực. */
  replacing: boolean;
}

export function PublicLinkPanel({
  detail,
  actor,
}: {
  detail: SigningRequestDetail;
  actor: string | null;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  const l = t.signRequest.workflows.detail.links;

  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{
    attempt: number;
    links?: LinksBySigner;
    error?: unknown;
  }>();

  /** Đường dẫn vừa phát, theo signer. Chỉ ở đây, và chỉ tới khi người dùng ẩn nó. */
  const [freshUrls, setFreshUrls] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<DialogState>();
  const [busySigner, setBusySigner] = useState<string>();

  const signingRequestId = detail.signingRequestId;
  const isCreator = detail.createdBy === actor;
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const externalSignerIds = useMemo(
    () =>
      detail.signers
        .filter((signer) => signer.accessMode === "EXTERNAL_LINK")
        .map((signer) => signer.signerId),
    [detail.signers],
  );

  const externalSignerKey = externalSignerIds.join("|");

  const detailUrlsBySigner = useMemo(() => {
    const externalLinks = detail.externalSigningLinks ?? [];

    return Object.fromEntries(
      externalLinks
        .filter(
          (link) => typeof link.url === "string" && link.url.trim().length > 0,
        )
        .map((link) => [link.signerId, link.url!.trim()]),
    ) as Record<string, string>;
  }, [detail.externalSigningLinks]);

  /*
   * Đọc danh sách của MỌI người ký song song.
   *
   * API là một endpoint cho mỗi signer (§4.3) nên không có cách gộp; với hai tới
   * bốn người ký thì đó là hai tới bốn lời gọi chỉ-đọc, chấp nhận được. Một lỗi
   * chung cho cả khối chứ không phải mỗi dòng một lỗi: cả bốn lời gọi đi cùng một
   * đường, nên khi hỏng chúng hỏng cùng nhau và bốn thông báo giống nhau chỉ là
   * tiếng ồn.
   */
  useEffect(() => {
    if (!isCreator || !externalSignerKey) return;
    let cancelled = false;

    const signerIds = externalSignerKey.split("|");

    Promise.all(
      signerIds.map(
        async (signerId) =>
          [
            signerId,
            await listPublicLinks(signingRequestId, signerId),
          ] as const,
      ),
    )
      .then((entries) => {
        if (!cancelled) {
          setLoaded({
            attempt,
            links: Object.fromEntries(entries),
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoaded({ attempt, error });
        }
      });

    return () => {
      cancelled = true;
    };
    // `detail.signers` đổi tham chiếu sau mỗi nhịp poll 15 giây nhưng nội dung thì
    // gần như không đổi; bám vào nó là gọi lại toàn bộ danh sách link mỗi 15 giây.
    // Số người ký của một yêu cầu là bất biến sau khi tạo, nên `signingRequestId`
    // đã đủ để nhận ra "đây là một yêu cầu khác".
  }, [signingRequestId, isCreator, attempt, externalSignerKey]);

  const links = useMemo<LinksBySigner>(
    () => (loaded?.attempt === attempt ? (loaded.links ?? {}) : {}),
    [loaded, attempt],
  );

  const loadError = loaded?.attempt !== attempt ? undefined : loaded?.error;
  const loading =
    isCreator &&
    Boolean(externalSignerKey) &&
    loaded?.attempt !== attempt;

  if (!isCreator || externalSignerIds.length === 0) {
    return null;
  }

  async function create(signer: SigningRequestSigner, choice: ExpiryChoiceId) {
    const hours = EXPIRY_CHOICES.find((item) => item.id === choice)?.hours;
    const expiresAt = hours
      ? new Date(Date.now() + hours * 60 * 60_000).toISOString()
      : undefined;

    setBusySigner(signer.signerId);
    try {
      const link = await createPublicLink(signingRequestId, signer.signerId, {
        expiresAt,
      });

      /*
       * `url` là thứ duy nhất không đọc lại được. Nếu backend không trả nó (đời
       * cũ, hoặc cấu hình khác), nói ra ngay thay vì hiện một nút sao chép rỗng.
       */
      const url = link.url;
      if (url) {
        setFreshUrls((current) => ({ ...current, [signer.signerId]: url }));
      } else {
        toast.warning(l.createdWithoutUrl, l.createdWithoutUrlHint);
      }

      reload();
    } catch (error) {
      /*
       * Hiện thông báo của chính dịch vụ, không dịch lại thành một chẩn đoán.
       *
       * Đã thử đoán một lần và đoán sai: `POST …/public-links` trên bản đang chạy
       * trả `500 INTERNAL_ERROR` theo kiểu không phụ thuộc dữ liệu — cả khi signer
       * chưa có link nào — nên mọi câu "hãy thu hồi link cũ trước" đều là suy diễn
       * từ một tương quan tình cờ. Với một mã lỗi vô định như thế, câu trung thực
       * duy nhất là câu backend gửi về.
       */
      toast.warning(l.createFailed, describe(t, error, l.createFailed));
    } finally {
      setBusySigner(undefined);
    }
  }

  async function revoke(signer: SigningRequestSigner, link: PublicSigningLink) {
    setBusySigner(signer.signerId);
    try {
      await revokePublicLink(signingRequestId, signer.signerId, link.id);
      reload();
      // Link vừa thu hồi thì đường dẫn đang hiện trên màn hình cũng chết theo —
      // để nó lại là mời người dùng gửi đi một liên kết không dùng được.
      setFreshUrls((current) => {
        const next = { ...current };
        delete next[signer.signerId];
        return next;
      });
      toast.success(l.revoked, l.revokedHint);
    } catch (error) {
      toast.warning(l.revokeFailed, describe(t, error, l.revokeFailed));
    } finally {
      setBusySigner(undefined);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface shadow-sm">
      <h3 className="flex items-center gap-2 border-b border-border-muted px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-widest text-fg-subtle">
        <LinkIcon size={13} />
        {l.title}
      </h3>

      <p className="px-4 pt-2.5 text-[11px] leading-relaxed text-fg-muted">
        {l.intro}
      </p>

      {loadError ? (
        <div
          className={`mx-3 mt-2.5 flex gap-2 rounded-md border p-2.5 ${
            isEndpointMissing(loadError)
              ? "border-dashed border-warning bg-warning-subtle"
              : "border-danger bg-danger-subtle"
          }`}
        >
          {isEndpointMissing(loadError) ? (
            <ConstructionIcon
              size={13}
              className="mt-0.5 shrink-0 text-warning"
            />
          ) : (
            <AlertTriangleIcon
              size={13}
              className="mt-0.5 shrink-0 text-danger"
            />
          )}
          <div className="min-w-0">
            <p
              className={`text-[11px] font-semibold ${
                isEndpointMissing(loadError) ? "text-warning" : "text-danger"
              }`}
            >
              {isEndpointMissing(loadError) ? l.endpointMissing : l.loadFailed}
            </p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-fg-muted">
              {isEndpointMissing(loadError)
                ? l.endpointMissingHint
                : describe(t, loadError, l.loadFailed)}
            </p>
          </div>
        </div>
      ) : null}

      <ul className="flex flex-col gap-2 p-3">
        {detail.signers
          .filter((signer) => signer.accessMode === "EXTERNAL_LINK")
          .slice()
          /*
           * Cấp ký trước, rồi tới thứ tự hiển thị TRONG cấp: nhiều người có thể
           * cùng một `signingOrder` (ký song song), và `displayOrder` là thứ duy
           * nhất xếp được họ theo đúng thứ tự người tạo đã sắp.
           */
          .sort((a, b) => a.signingOrder - b.signingOrder || a.displayOrder - b.displayOrder)
          .map((signer) => (
            <li key={signer.signerId}>
              <SignerLinkRow
                t={t}
                detail={detail}
                signer={signer}
                links={links[signer.signerId] ?? []}
                freshUrl={freshUrls[signer.signerId]}
                loading={loading}
                detailUrl={detailUrlsBySigner[signer.signerId]}
                busy={busySigner === signer.signerId}
                onCreate={(replacing) => setDialog({ signer, replacing })}
                onRevoke={(link) => void revoke(signer, link)}
              />
            </li>
          ))}
      </ul>



      {dialog ? (
        <CreateLinkDialog
          t={t}
          signer={dialog.signer}
          replacing={dialog.replacing}
          onClose={() => setDialog(undefined)}
          onConfirm={(choice) => {
            setDialog(undefined);
            void create(dialog.signer, choice);
          }}
        />
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Một người ký
 * ------------------------------------------------------------------ */

function SignerLinkRow({
  t,
  detail,
  signer,
  links,
  freshUrl,
  loading,
  detailUrl,
  busy,
  onCreate,
  onRevoke,
}: {
  t: Dictionary;
  detail: SigningRequestDetail;
  signer: SigningRequestSigner;
  links: PublicSigningLink[];
  freshUrl?: string;
  detailUrl?: string;
  loading: boolean;
  busy: boolean;
  onCreate: (replacing: boolean) => void;
  onRevoke: (link: PublicSigningLink) => void;
}) {
  const l = t.signRequest.workflows.detail.links;

  /*
   * Sắp xếp TẠI ĐÂY chứ không tin thứ tự của API: tài liệu không hứa thứ tự nào, và
   * `createdAt` có thể về `null` (đo được trên dịch vụ đang chạy) — nên phép so sánh
   * phải là `compareLinksNewestFirst`, thứ có đường lùi khi thiếu mốc thời gian.
   *
   * Mới nhất là dòng duy nhất còn ý nghĩa thao tác; phần còn lại là lịch sử. Lấy sai
   * dòng đầu nghĩa là nút thu hồi trỏ vào một link đã chết.
   */
  const ordered = useMemo(
    () => [...links].sort(compareLinksNewestFirst),
    [links],
  );
  const current = ordered[0];
  const history = ordered.slice(1);
  const usable = current ? isLinkUsable(current) : false;

  const blocked = createBlockedReason(t, detail, signer);

  const rawDisplayUrl = freshUrl ?? detailUrl;

  const fullDisplayUrl = rawDisplayUrl
    ? buildExternalSigningUrl(rawDisplayUrl)
    : undefined;

  return (
    <div className="rounded-md border border-border-muted bg-surface-2 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className="min-w-0 truncate text-[12px] font-semibold text-fg">
          {signerDisplayName(signer)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
          {l.order(signer.signingOrder)}
        </span>
      </div>

      <p className="mt-0.5 text-[10.5px] text-fg-muted">
        {signer.status === "SIGNED"
          ? l.signerSigned
          : signer.status === "DECLINED"
            ? l.signerDeclined
            : isTurnOf(detail, signer)
              ? l.signerTurn
              : l.signerWaiting}
      </p>

      <div className="mt-2">
        {loading ? (
          <p className="flex items-center gap-1.5 text-[10.5px] text-fg-muted">
            <SpinnerIcon size={12} className="animate-spin" />
            {l.loading}
          </p>
        ) : current ? (
          <LinkState t={t} link={current} />
        ) : (
          <p className="text-[10.5px] text-fg-subtle">{l.noLink}</p>
        )}
      </div>

      {/*
        Đường dẫn vừa phát — khối duy nhất trên cả ứng dụng chở một token thô.
        Biến mất ngay khi link không còn dùng được, bất kể vì sao (thu hồi, hết hạn,
        hoặc người ký đã ký xong và nhịp poll vừa đọc về): một nút sao chép trỏ vào
        một link đã chết là một email gửi đi rồi mới phát hiện sai.
      */}
      {fullDisplayUrl ? (
        <div className="mt-2.5 rounded-md border border-accent bg-accent-subtle p-2.5">
          <p className="text-[10.5px] font-semibold text-accent">
            {l.freshTitle}
          </p>

          <input
            type="text"
            readOnly
            value={fullDisplayUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-1.5 h-8 w-full rounded-md border border-border bg-inset px-2 font-mono text-[10.5px] text-fg"
          />

          <div className="mt-2 flex flex-wrap gap-1.5">
            <CopyUrlButton t={t} url={fullDisplayUrl} />
          </div>

          <p className="mt-1.5 text-[10px] leading-relaxed text-fg-muted">
            {l.freshHint}
          </p>

          <ForeignDomainNote t={t} url={fullDisplayUrl} />
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {/*
          Một nút duy nhất cho cả "tạo" và "tạo lại", đổi nhãn theo trạng thái: hai
          nút cạnh nhau cho cùng một lời gọi API chỉ tạo ra một câu hỏi ("khác nhau
          chỗ nào?") mà giao diện không trả lời được.
        */}
        {signer.status === "PENDING" ? (
          <button
            type="button"
            disabled={Boolean(blocked) || busy || loading}
            onClick={() => onCreate(usable)}
            title={blocked ?? undefined}
            className="inline-flex h-7.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-2.5 text-[11px] font-semibold text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <SpinnerIcon size={12} className="animate-spin" />
            ) : usable ? (
              <RotateCcwIcon size={12} />
            ) : (
              <PlusIcon size={12} />
            )}
            {usable ? l.recreate : l.create}
          </button>
        ) : null}

        {current && usable ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onRevoke(current)}
            className="inline-flex h-7.5 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[11px] font-semibold text-danger hover:bg-danger-subtle disabled:opacity-40"
          >
            <XIcon size={12} />
            {l.revoke}
          </button>
        ) : null}
      </div>

      {blocked ? (
        <p className="mt-1.5 text-[10px] leading-relaxed text-warning">
          {blocked}
        </p>
      ) : null}



      {history.length > 0 ? (
        <details className="mt-2 border-t border-border-muted pt-2">
          <summary className="cursor-pointer text-[10.5px] text-fg-muted">
            {l.history(history.length)}
          </summary>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {history.map((link) => (
              <li key={link.id}>
                <LinkState t={t} link={link} compact />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

/**
 * Trạng thái một link: nhãn, `tokenHint`, và mốc thời gian CÓ NGHĨA với trạng thái
 * đó — hạn dùng khi còn hiệu lực, thời điểm thu hồi khi đã thu hồi, thời điểm ký
 * khi đã dùng. Hiện cả bốn mốc cho mọi trạng thái là bắt người đọc tự tìm mốc nào
 * đang nói về chuyện gì.
 */
function LinkState({
  t,
  link,
  compact = false,
}: {
  t: Dictionary;
  link: PublicSigningLink;
  compact?: boolean;
}) {
  const l = t.signRequest.workflows.detail.links;
  /*
   * Nhãn tự tính lại từ `expiresAt`, không chỉ chép `status`: backend cập nhật
   * `status` khi có ai chạm tới bản ghi, nên một dòng vừa đọc về có thể còn
   * `ACTIVE` trong khi hạn đã ở quá khứ.
   */
  const effective: PublicSigningLinkStatus =
    link.status === "ACTIVE" && !isLinkUsable(link) ? "EXPIRED" : link.status;

  const moment =
    effective === "CONSUMED" && link.consumedAt
      ? l.consumedAt(formatMoment(link.consumedAt))
      : effective === "REVOKED" && link.revokedAt
        ? l.revokedAt(formatMoment(link.revokedAt))
        : effective === "EXPIRED"
          ? l.expiredAt(formatMoment(link.expiresAt))
          : l.expiresAt(formatMoment(link.expiresAt));

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          STATUS_STYLE[effective]
        }`}
      >
        {effective === "CONSUMED" ? (
          <CheckIcon size={10} />
        ) : effective === "ACTIVE" ? (
          <ClockIcon size={10} />
        ) : (
          <XIcon size={10} />
        )}
        {l.status[effective]}
      </span>

      <span
        className="font-mono text-[10px] text-fg-subtle"
        title={l.tokenHintLabel}
      >
        {link.tokenHint}
      </span>

      {!compact ? (
        <span className="text-[10.5px] text-fg-muted">{moment}</span>
      ) : null}
      {compact ? (
        <span className="text-[10px] text-fg-subtle">{moment}</span>
      ) : null}
    </div>
  );
}

/**
 * Link trỏ sang một domain khác trang này.
 *
 * Domain trong `url` do DỊCH VỤ KÝ cấu hình, không phải do trang này dựng — và
 * tài liệu tích hợp còn để ngỏ chính câu "domain thật của trang ký công khai" (§15,
 * mục 1). Trên môi trường thử, giá trị mặc định của dịch vụ (`sign.example.vn`)
 * không trỏ về đâu cả, nên người test sao chép link ra rồi mở sẽ thấy một trang
 * trắng và đi tìm lỗi trong code frontend.
 *
 * Nói ra thay vì tự sửa lại URL: đường dẫn phải là thứ dịch vụ đã phát, không phải
 * thứ trang này đoán — sửa nó ở đây là gửi cho người ký một địa chỉ mà backend
 * không biết tới.
 */
function ForeignDomainNote({ t, url }: { t: Dictionary; url: string }) {
  const l = t.signRequest.workflows.detail.links;

  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return null;
  }
  if (origin === window.location.origin) return null;

  return (
    <p className="mt-1.5 flex gap-1.5 text-[10px] leading-relaxed text-warning">
      <AlertTriangleIcon size={11} className="mt-0.5 shrink-0" />
      {l.foreignDomain(origin)}
    </p>
  );
}

const STATUS_STYLE: Record<PublicSigningLinkStatus, string> = {
  ACTIVE: "bg-accent-subtle text-accent",
  CONSUMED: "bg-success-subtle text-success",
  REVOKED: "bg-danger-subtle text-danger",
  EXPIRED: "bg-inset text-fg-muted",
};

function CopyUrlButton({ t, url }: { t: Dictionary; url: string }) {
  const { toast } = useToast();
  const l = t.signRequest.workflows.detail.links;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      /*
       * Clipboard bị chặn (không phải secure context, hoặc chính sách trình
       * duyệt). KHÔNG đưa đường dẫn vào toast để bù: đường dẫn đã hiện ngay bên
       * trên và chọn tay được, còn một token nằm trong toast là một token nằm trên
       * màn hình ở một chỗ người dùng không kiểm soát được lúc nào nó biến mất.
       */
      toast.warning(l.copyFailed, l.copyFailedHint);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex h-7.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-2.5 text-[11px] font-semibold text-accent-fg hover:opacity-90"
    >
      {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
      {copied ? t.common.copied : l.copy}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Hộp thoại phát link
 * ------------------------------------------------------------------ */

/**
 * Xác nhận trước khi phát link.
 *
 * Bắt buộc với "tạo link mới" (§4.5: backend thu hồi link cũ), và giữ luôn cho lần
 * tạo đầu tiên — vì đó cũng là chỗ duy nhất chọn được hạn link, và một lựa chọn hạn
 * nhét vào panel sẽ chiếm chỗ ở mọi dòng người ký để dùng đúng một lần.
 */
function CreateLinkDialog({
  t,
  signer,
  replacing,
  onClose,
  onConfirm,
}: {
  t: Dictionary;
  signer: SigningRequestSigner;
  replacing: boolean;
  onClose: () => void;
  onConfirm: (choice: ExpiryChoiceId) => void;
}) {
  const l = t.signRequest.workflows.detail.links;
  const [choice, setChoice] = useState<ExpiryChoiceId>("default");
  const title = replacing ? l.recreateTitle : l.createTitle;

  return (
    <Dialog open onClose={onClose} label={title} className="max-w-110">
      <div className="border-b border-border-muted px-5 py-4">
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        <p className="mt-0.5 truncate text-[12px] text-fg-muted">
          {signerDisplayName(signer)}
        </p>
      </div>

      <div className="space-y-3 px-5 py-4">
        {replacing ? (
          <div className="flex gap-2 rounded-md border border-warning bg-warning-subtle p-3">
            <AlertTriangleIcon
              size={14}
              className="mt-0.5 shrink-0 text-warning"
            />
            <p className="text-[11.5px] leading-relaxed text-warning">
              {l.recreateWarning}
            </p>
          </div>
        ) : null}

        <fieldset>
          <legend className="mb-1.5 text-[11px] font-semibold text-fg-muted">
            {l.expiryLabel}
          </legend>
          <div className="flex flex-col gap-1">
            {EXPIRY_CHOICES.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-[12px] ${
                  choice === option.id
                    ? "border-accent bg-accent-subtle text-fg"
                    : "border-border bg-surface text-fg-muted"
                }`}
              >
                <input
                  type="radio"
                  name="link-expiry"
                  checked={choice === option.id}
                  onChange={() => setChoice(option.id)}
                  className="size-3.5 shrink-0"
                />
                {l.expiry[option.id]}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-fg-muted">
            {l.expiryHint}
          </p>
        </fieldset>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border-muted px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8.5 items-center rounded-md border border-border bg-surface px-4 text-[12.5px] font-semibold text-fg"
        >
          {t.common.cancel}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(choice)}
          className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-accent bg-accent px-4 text-[12.5px] font-semibold text-accent-fg"
        >
          <LinkIcon size={14} />
          {replacing ? l.recreateConfirm : l.createConfirm}
        </button>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ *
 * Luật bật/tắt nút phát link (§4.1)
 * ------------------------------------------------------------------ */

/**
 * Vì sao chưa phát được link cho người này — `null` nghĩa là phát được.
 *
 * Frontend chặn dựa trên dữ liệu đang có, nhưng BACKEND vẫn là nơi quyết định cuối
 * cùng: `signingOrder` đọc về có thể đã cũ 15 giây. Vì thế đây là gợi ý cho người
 * dùng, không phải một hàng rào an toàn — và một lời gọi bị backend từ chối vẫn phải
 * hiển thị được (nó đi qua nhánh lỗi thường).
 */
function createBlockedReason(
  t: Dictionary,
  detail: SigningRequestDetail,
  signer: SigningRequestSigner,
): string | null {
  const l = t.signRequest.workflows.detail.links;

  if (detail.status === "COMPLETED" || detail.status === "CANCELLED") {
    return l.blockedRequestClosed;
  }
  if (signer.status === "SIGNED") return l.blockedSigned;
  if (signer.status === "DECLINED") return l.blockedDeclined;
  if (!isTurnOf(detail, signer)) return l.blockedNotTurn;
  return null;
}

function formatMoment(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function describe(t: Dictionary, error: unknown, fallback: string): string {
  if (error instanceof ActorRequiredError)
    return t.signRequest.actor.requiredHint;
  return errorMessage(error, fallback);
}