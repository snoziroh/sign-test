/**
 * Contract của luồng verify — độc lập với contract ký trong `signing.ts`.
 *
 * Hai bên KHÔNG dùng chung enum dù chữ giống nhau: bên ký nói định dạng tài liệu
 * (`DocumentFormat` = PDF/XML/WORD/EXCEL/POWERPOINT), bên verify nói chuẩn chữ ký
 * (PADES/XADES/OOXML) và loại tệp theo đuôi (DOCX/XLSX/PPTX). Gộp lại là mời gọi
 * một lần map sai enum ở đúng chỗ khó phát hiện nhất.
 *
 * `SignatureMode` là ngoại lệ có chủ đích: cùng một khái niệm co-sign/counter-sign,
 * và màn verify hiển thị lại chính giá trị mà màn ký gửi lên.
 */

import type { SignatureMode } from "@/lib/types/signing";

/** Chuẩn chữ ký mà báo cáo verify trả về. */
export type RealSignatureStandard = "PADES" | "XADES" | "OOXML";

export type VerificationContentType = "PDF" | "XML" | "DOCX" | "XLSX" | "PPTX";
export type VerificationStatus = "VALID" | "INVALID" | "INDETERMINATE";
export type BaselineLevel = "B" | "T" | "LT" | "LTA";
export type IssueSeverity = "ERROR" | "WARNING" | "INFO";
export type ChainNodeRole = "ROOT" | "INTERMEDIATE" | "LEAF" | "TSA";
export type ChainNodeStatus = "VALID" | "EXPIRED" | "NOT_YET_VALID";

// V2 API types
export type MainIndication = "TOTAL_PASSED" | "TOTAL_FAILED" | "INDETERMINATE";
export type SubIndicationV2 =
  | "VALID"
  | "CHAIN_CONSTRAINTS_FAILURE"
  | "CRYPTO_CONSTRAINTS_FAILURE"
  | "SIGNATURE_CONSTRAINTS_FAILURE"
  | "NOT_YET_VALID"
  | "EXPIRED"
  | "REVOKED"
  | "OUT_OF_BOUNDS_NOT_REVOKED"
  | "POLICY_PROCESSING_ERROR"
  | "TIMESTAMP_OUT_OF_BOUNDS"
  | "BEST_SIGNATURE_NOT_FOUND"
  | "TRY_LATER"
  | "OUT_OF_BOUNDS_NO_POE"
  | "NO_SIGNED_DATA_FOUND";

export type CheckOutcome = "PASSED" | "FAILED" | "INDETERMINATE" | "NOT_PERFORMED" | "NOT_APPLICABLE";

export interface SignatureCheckV2 {
  name: string;
  outcome: CheckOutcome;
  evidenceCode?: string | null;
}

export interface SignatureAlgorithmV2 {
  name: string;
  identifier: string;
  keyAlgorithm: string;
  keySize: number;
}

export interface SignatureEvidenceV2 {
  mode?: SignatureMode | null;
  targetSignatureId?: string | null;
  digest: { algorithm: string; value: string; matched: boolean | null };
  canonicalizationMethod?: string | null;
  references: SignatureReference[];
  certificateChain?: CertificateChain | null;
  revocation?: SignatureRevocationV2 | null;
  timestamp?: SignatureTimestamp | null;
}

export interface SignatureRevocationV2 {
  status: VerificationStatus;
  certificates?: CertificateRevocation[] | null;
  issues: VerificationIssue[];
}

export interface SignatureV2 {
  index: number;
  id?: string | null;
  format: RealSignatureStandard;
  algorithm: SignatureAlgorithmV2;
  detectedBaselineLevel: BaselineLevel;
  validatedBaselineLevel?: BaselineLevel | null;
  mainIndication: MainIndication;
  subIndication?: SubIndicationV2 | null;
  signingTime?: string | null;
  signer?: { commonName: string; distinguishedName: string } | null;
  evidence?: SignatureEvidenceV2 | null;
  checks: SignatureCheckV2[];
  reportedSignedObjectCount?: number | null;
  issues: VerificationIssue[];
}

export interface ValidationPolicyV2 {
  id: string;
  version: string;
  sha256: string;
}

export interface TrustDomainV2 {
  version: string;
  sha256: string;
  signerAnchorCount: number;
  tsaAnchorCount: number;
}

export interface CoverageV2 {
  detectedSignatureCount: number;
  processedSignatureCount: number;
  complete: boolean;
}

export interface VerificationReportV2 {
  runId: string;
  schemaVersion: string;
  engine: string;
  mainIndication: MainIndication;
  subIndication?: SubIndicationV2 | null;
  validationTime: string;
  artifact: {
    contentType: VerificationContentType;
    fileName: string;
    size: number;
    sha256: string;
  };
  coverage: CoverageV2;
  policy: ValidationPolicyV2;
  trustDomain: TrustDomainV2;
  signatures: SignatureV2[];
  issues: VerificationIssue[];
}

export interface VerificationIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  detail?: string | null;
}

export interface ChainNode {
  position: number;
  role: ChainNodeRole;
  status: ChainNodeStatus;
  trustAnchor: boolean;
  subject: { dn: string; commonName: string };
  issuer: { dn: string; commonName: string };
  serialNumberHex: string;
  validFrom: string;
  validTo: string;
  sha256Fingerprint: string;
  publicKey: { algorithm: string; size: number };
  keyUsage: string[];
  selfSigned: boolean;
}

export interface CertificateChain {
  trusted: boolean;
  trustAnchor?: string | null;
  nodes: ChainNode[];
}

export interface SignatureReference {
  index: number;
  uri: string;
  type: string;
  digestAlgorithm: string;
  digestValue: string;
  /** null = không đối chiếu được (khác với false = digest sai). */
  matched: boolean | null;
}

export interface SignatureTimestamp {
  status: string;
  type: string;
  tsaName?: string | null;
  policyOid?: string | null;
  genTime: string;
  accuracy?: string | null;
  messageImprint: { algorithm: string; value: string };
  certificate?: ChainNode | null;
  issues: VerificationIssue[];
}

/**
 * Một chứng thư trong kết quả kiểm tra thu hồi. Đây **không** phải `ChainNode` — backend trả trạng
 * thái thu hồi kèm nguồn bằng chứng (OCSP/CRL), không trả lại mô tả chứng thư.
 */
export interface CertificateRevocation {
  subject: string;
  serialNumberHex: string;
  certificateStatus: string;
  protocol?: string | null;
  source?: string | null;
  producedAt?: string | null;
  thisUpdate?: string | null;
  nextUpdate?: string | null;
  revocationTime?: string | null;
}

export interface SignatureRevocation {
  status: VerificationStatus;
  certificates?: CertificateRevocation[] | null;
  issues: VerificationIssue[];
}

export interface VerificationSignature {
  index: number;
  id?: string | null;
  status: VerificationStatus;
  standard: RealSignatureStandard;
  baselineLevel: BaselineLevel;
  mode?: SignatureMode | null;
  targetSignatureId?: string | null;
  signingTime?: string | null;
  signer?: { commonName: string; distinguishedName: string } | null;
  digest: { algorithm: string; value: string; matched: boolean | null };
  signatureAlgorithm: {
    name: string;
    oid: string;
    keyAlgorithm: string;
    keySize: number;
  };
  canonicalizationMethod?: string | null;
  certificateChain?: CertificateChain | null;
  revocation?: SignatureRevocation | null;
  timestamp?: SignatureTimestamp | null;
  references: SignatureReference[];
  issues: VerificationIssue[];
}

export interface VerificationReport {
  status: VerificationStatus;
  contentType: VerificationContentType;
  fileName: string;
  fileSize: number;
  sha256: string;
  signatureCount: number;
  validSignatureCount: number;
  detectedSignatureCount: number;
  verifiedAt: string;
  signatures: VerificationSignature[];
  issues: VerificationIssue[];
}

// Utility: check schema version compatibility
export function checkSchemaVersionCompatible(schemaVersion: string): void {
  const [major] = schemaVersion.split(".").map(Number);
  if (major !== 2) {
    throw new Error(`Unsupported schema version: ${schemaVersion}. Expected v2.x.x`);
  }
}

// Adapter: convert v2 API response to v1 shape
export function adaptV2ReportToV1(report: VerificationReportV2): VerificationReport {
  checkSchemaVersionCompatible(report.schemaVersion);

  const mainToStatus: Record<MainIndication, VerificationStatus> = {
    TOTAL_PASSED: "VALID",
    TOTAL_FAILED: "INVALID",
    INDETERMINATE: "INDETERMINATE",
  };

  const signatures = report.signatures.map((sig): VerificationSignature => ({
    index: sig.index,
    id: sig.id,
    status: sig.mainIndication === "TOTAL_PASSED" ? "VALID" : sig.mainIndication === "TOTAL_FAILED" ? "INVALID" : "INDETERMINATE",
    standard: sig.format,
    baselineLevel: sig.detectedBaselineLevel,
    mode: sig.evidence?.mode,
    targetSignatureId: sig.evidence?.targetSignatureId,
    signingTime: sig.signingTime,
    signer: sig.signer,
    digest: sig.evidence?.digest ?? { algorithm: "", value: "", matched: null },
    signatureAlgorithm: {
      name: sig.algorithm.name,
      oid: sig.algorithm.identifier,
      keyAlgorithm: sig.algorithm.keyAlgorithm,
      keySize: sig.algorithm.keySize,
    },
    canonicalizationMethod: sig.evidence?.canonicalizationMethod,
    certificateChain: sig.evidence?.certificateChain,
    revocation: sig.evidence?.revocation,
    timestamp: sig.evidence?.timestamp,
    references: sig.evidence?.references ?? [],
    issues: sig.issues,
  }));

  const validSignatureCount = signatures.filter((s) => s.status === "VALID").length;

  return {
    status: mainToStatus[report.mainIndication],
    contentType: report.artifact.contentType,
    fileName: report.artifact.fileName,
    fileSize: report.artifact.size,
    sha256: report.artifact.sha256,
    signatureCount: report.coverage.processedSignatureCount,
    validSignatureCount,
    detectedSignatureCount: report.coverage.detectedSignatureCount,
    verifiedAt: report.validationTime,
    signatures,
    issues: report.issues,
  };
}
