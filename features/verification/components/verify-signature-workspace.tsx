"use client";

import { useRef, useState } from "react";
import {
  addToAllowlistAndReverify,
  FileTooLargeError,
  VerifyApiClientError,
  verifyFile,
} from "@/features/verification/api";
import type { VerificationReport } from "@/lib/types/verification";
import { useLocale } from "@/components/i18n/locale-provider";
import { AdvancedSection, Phase, VerificationView } from "./verification-config";
import { ArtifactUpload, SignatureList } from "./verification-sidebar";
import { EmptyVerificationState, NoSignaturesState, VerificationErrorState, VerificationProgress, VerificationResultHeader } from "./verification-states";
import { VerificationInspector } from "./verification-inspector";

export function VerifySignatureWorkspace({
  canManageAllowlist = false,
}: {
  canManageAllowlist?: boolean;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);

  const [artifact, setArtifact] = useState<File>();
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [view, setView] = useState<VerificationView>("overview");
  const [advancedSection, setAdvancedSection] = useState<AdvancedSection>("technical");
  const [error, setError] = useState<VerifyApiClientError | FileTooLargeError | Error | null>(null);

  const selectedSignature = report?.signatures[selectedIndex];

  async function handleFile(file?: File) {
    if (!file) return;

    setArtifact(file);
    setPhase("verifying");
    setReport(null);
    setError(null);
    setSelectedIndex(0);
    setView("overview");
    setAdvancedSection("technical");

    try {
      const result = await verifyFile(file);
      setReport(result);
      setPhase("done");
    } catch (err) {
      setError(err as VerifyApiClientError | FileTooLargeError | Error);
      setPhase("error");
    }
  }

  async function handleAllowlistReverify(host: string) {
    if (!artifact) return;
    const result = await addToAllowlistAndReverify(host, artifact);
    setReport(result);
  }

  function clearArtifact() {
    setArtifact(undefined);
    setPhase("idle");
    setReport(null);
    setError(null);
    setSelectedIndex(0);
    setView("overview");
    setAdvancedSection("technical");

    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <ArtifactUpload
          t={t}
          artifact={artifact}
          dragging={dragging}
          inputRef={inputRef}
          phase={phase}
          onDraggingChange={setDragging}
          onSelect={handleFile}
          onClear={clearArtifact}
        />

        {phase === "done" && report ? (
          <SignatureList
            t={t}
            signatures={report.signatures}
            selectedIndex={selectedIndex}
            onSelect={(index) => {
              setSelectedIndex(index);
              setView("overview");
              setAdvancedSection("technical");
            }}
          />
        ) : null}
      </aside>

      <main className="min-w-0 space-y-4">
        {phase === "idle" ? <EmptyVerificationState t={t} /> : null}
        {phase === "verifying" ? <VerificationProgress t={t} /> : null}
        {phase === "error" && error ? <VerificationErrorState t={t} error={error} /> : null}

        {phase === "done" && report ? (
          <VerificationResultHeader t={t} report={report} />
        ) : null}

        {phase === "done" && report && report.signatures.length === 0 ? (
          <NoSignaturesState
            t={t}
            report={report}
            canManageAllowlist={canManageAllowlist}
            onAllowlistReverify={handleAllowlistReverify}
          />
        ) : null}

        {phase === "done" && report && selectedSignature ? (
          <VerificationInspector
            t={t}
            report={report}
            signature={selectedSignature}
            view={view}
            onViewChange={setView}
            advancedSection={advancedSection}
            onAdvancedSectionChange={setAdvancedSection}
            canManageAllowlist={canManageAllowlist}
            onAllowlistReverify={handleAllowlistReverify}
          />
        ) : null}
      </main>
    </div>
  );
}