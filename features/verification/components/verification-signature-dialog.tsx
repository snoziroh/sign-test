"use client";

import type {
  VerificationReport,
  VerificationSignature,
} from "@/lib/types/verification";
import { XIcon } from "@/components/ui/icons";
import { Dialog } from "@/components/ui/dialog";
import type { Dictionary } from "@/lib/i18n";
import type { AdvancedSection, VerificationView } from "./verification-config";
import { VerificationInspector } from "./verification-inspector";
import { VerdictIcon, statusBadgeClass, verdictMeta } from "./verification-ui";

/**
 * Chi tiết của MỘT chữ ký — cả tab Tổng quan lẫn tab Thông tin nâng cao — sống
 * trong modal này, mở ra từ `SignatureList`. Trang chính vì thế chỉ còn phần
 * kết luận ở cấp tài liệu, không bị một chữ ký bất kỳ chiếm chỗ.
 *
 * `view` / `advancedSection` do workspace giữ chứ không phải state nội bộ: đóng
 * modal rồi mở lại chữ ký khác thì cả hai được đặt lại về mặc định ở đúng chỗ
 * đã đặt lại `selectedIndex`.
 */
export function SignatureDetailDialog({
  t,
  report,
  signature,
  open,
  onClose,
  view,
  onViewChange,
  advancedSection,
  onAdvancedSectionChange,
  canManageAllowlist,
  onAllowlistReverify,
}: {
  t: Dictionary;
  report: VerificationReport;
  signature?: VerificationSignature;
  open: boolean;
  onClose: () => void;
  view: VerificationView;
  onViewChange: (view: VerificationView) => void;
  advancedSection: AdvancedSection;
  onAdvancedSectionChange: (section: AdvancedSection) => void;
  canManageAllowlist: boolean;
  onAllowlistReverify: (host: string) => Promise<void>;
}) {
  if (!open || !signature) return null;

  const meta = verdictMeta(t, signature.status);

  return (
    <Dialog
      open
      onClose={onClose}
      label={t.verify.ux.signatureDetailTitle}
      className="flex max-w-6xl! flex-col"
    >
      <header className="flex items-start gap-3 border-b border-border-muted px-5 py-3.5">
        <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${meta.background} ${meta.color}`}>
          <VerdictIcon status={signature.status} size={16} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            {t.verify.ux.signatureDetailTitle}
          </p>
          <h2 className="mt-0.5 truncate text-[15px] font-semibold text-fg">
            {signature.signer?.commonName ?? t.verify.banner2.unknownSigner}
          </h2>
        </div>

        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${statusBadgeClass(signature.status)}`}>
          ● {meta.title}
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="shrink-0 rounded-md p-1 text-fg-muted hover:bg-inset hover:text-fg"
        >
          <XIcon size={16} />
        </button>
      </header>

      {/*
        Khung ngoài KHÔNG cuộn: chiều cao do modal ấn định, phần cuộn nằm sâu
        bên trong (thân tab Tổng quan, hoặc riêng cột nội dung bên phải của tab
        nâng cao) để thanh tab và menu trái luôn đứng yên.
      */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <VerificationInspector
          t={t}
          report={report}
          signature={signature}
          view={view}
          onViewChange={onViewChange}
          advancedSection={advancedSection}
          onAdvancedSectionChange={onAdvancedSectionChange}
          canManageAllowlist={canManageAllowlist}
          onAllowlistReverify={onAllowlistReverify}
        />
      </div>
    </Dialog>
  );
}
