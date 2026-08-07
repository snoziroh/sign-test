/**
 * Contract của luồng verify — độc lập với contract ký trong `signing.ts`.
 *
 * Hai bên KHÔNG dùng chung enum dù chữ giống nhau: bên ký nói định dạng tài liệu
 * (`DocumentFormat` = PDF/XML/WORD/EXCEL/POWERPOINT), bên verify nói chuẩn chữ ký
 * (PAdES/XAdES/OOXML) và loại tệp phát hiện được. Gộp lại là mời gọi một lần map
 * sai enum ở đúng chỗ khó phát hiện nhất.
 *
 * File này giữ HAI shape:
 *
 * - `VerificationReportV6` — đúng những gì `POST /api/v1/verify` của
 *   verification-service trả về (schema 6.x, root phẳng — không còn envelope
 *   `{ data, meta }` như schema 5).
 * - `VerificationReport` — view model mà giao diện đọc.
 *
 * `adaptV6ReportToView` là cầu nối duy nhất giữa hai shape đó.
 *
 * ## Vì sao view model không còn phẳng như thời schema 4
 *
 * Schema 5/6 tách báo cáo thành bốn lớp — dữ liệu đọc từ tệp, kết quả sau khi áp
 * policy, danh sách vấn đề, và hành động khắc phục — rồi để ba lớp sau **tham
 * chiếu lẫn nhau bằng ID** thay vì nhúng lặp nội dung. Adapter ở đây làm đúng một
 * việc: giải các tham chiếu đó thành object để giao diện không phải tự dựng map.
 *
 * Ba thứ tuyệt đối không được làm phẳng khi đi qua đây, vì làm phẳng là nói dối:
 *
 * 1. `INDETERMINATE` **không phải** "không hợp lệ". Nó nghĩa là chưa đủ căn cứ kết
 *    luận — thường vì verifier chưa nạp trust anchor, tức lỗi của bên kiểm tra chứ
 *    không phải của tệp.
 * 2. `NOT_EVALUATED` **không phải** `INDETERMINATE`. Cái đầu nghĩa là *chưa đi tìm*
 *    (tiền đề bị chặn — xem `blockedByCheckIds`), cái sau nghĩa là *đã tìm và không
 *    rõ*. Gộp chúng lại là xoá đúng thông tin người dùng cần để biết phải sửa ở đâu.
 * 3. `cryptographicallyValid` tách khỏi `totalPassed`. Một tệp lành lặn chạy trên
 *    server chưa cấu hình trust sẽ có 1 chữ ký đúng mật mã và 0 chữ ký "đạt".
 *    Hiển thị một con số duy nhất ở đây là báo động giả.
 */

/** Chuẩn chữ ký mà báo cáo verify trả về. Tập mở — backend có thể thêm chuẩn mới. */
export type RealSignatureStandard = "PADES" | "XADES" | "OOXML" | "CADES" | (string & {});

export type VerificationContentType =
  | "PDF"
  | "XML"
  | "OOXML"
  | "ASIC"
  | "DOCX"
  | "XLSX"
  | "PPTX"
  | "UNKNOWN";

export type VerificationStatus = "VALID" | "INVALID" | "INDETERMINATE";

/**
 * `(string & {})` ở cuối các union dưới đây là có chủ đích: giữ gợi ý IDE cho
 * những giá trị đã biết nhưng KHÔNG vỡ khi backend thêm mã mới trong cùng
 * schema 6.x. Báo cáo verify là dữ liệu để đọc, không phải giá trị để rẽ nhánh
 * bắt buộc — một mã lạ phải hiện ra nguyên văn chứ không được làm hỏng màn hình.
 */
export type MainIndication = "TOTAL_PASSED" | "TOTAL_FAILED" | "INDETERMINATE";

export type SubIndication =
  | "PROCESSING_LIMIT_EXCEEDED"
  | "FORMAT_FAILURE"
  | "HASH_FAILURE"
  | "SIG_CRYPTO_FAILURE"
  | "REVOKED"
  | "EXPIRED"
  | "NOT_YET_VALID"
  | "NO_CERTIFICATE_CHAIN_FOUND"
  | "CHAIN_CONSTRAINTS_FAILURE"
  | "CRYPTO_CONSTRAINTS_FAILURE"
  | "POLICY_PROCESSING_ERROR"
  | "SIGNED_DATA_NOT_FOUND"
  | "TRY_LATER"
  | "OUT_OF_BOUNDS_NO_POE"
  | "DUPLICATE_ID"
  | "TRUST_STORE_EMPTY"
  | "REVOCATION_STATUS_UNDETERMINED"
  | "NO_SIGNED_DATA_FOUND"
  | (string & {});

/**
 * Bảy trạng thái của schema 6 — KHÔNG phải boolean, và không rút gọn được về
 * boolean. Xem ghi chú (2) ở đầu file về `NOT_EVALUATED` vs `INDETERMINATE`.
 */
export type CheckOutcome =
  | "PASS"
  | "FAIL"
  | "INDETERMINATE"
  | "WARNING"
  | "NOT_APPLICABLE"
  | "NOT_EVALUATED"
  | "UNSUPPORTED";

export type ValidationCompleteness = "COMPLETE" | "PARTIAL" | "NOT_PERFORMED";

export type IssueSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export type IssueCategory =
  | "VERIFIER_CONFIGURATION"
  | "VALIDATION_MATERIAL"
  | "DOCUMENT_FORMAT"
  | "SIGNATURE_SCOPE"
  | "CRYPTOGRAPHY"
  | "CERTIFICATE"
  | "REVOCATION"
  | "TIMESTAMP"
  | "POLICY"
  | "PROCESSING_LIMIT"
  | "WORKFLOW"
  | "DEPENDENT_CHECK"
  | (string & {});

export type RemediationStage =
  | "VERIFIER_CONFIGURATION"
  | "DOCUMENT_GENERATION"
  | "SIGNATURE_CREATION"
  | "TIMESTAMP_CREATION"
  | "VALIDATION_MATERIAL"
  | "WORKFLOW_CONFIGURATION"
  | "USER_ACTION"
  | (string & {});

export type SignatureKind =
  | "APPROVAL_SIGNATURE"
  | "CERTIFICATION_SIGNATURE"
  | "DOCUMENT_TIMESTAMP"
  | "COUNTERSIGNATURE"
  | "UNKNOWN";

export type SignaturePackaging =
  | "ENVELOPED_IN_PDF"
  | "ENVELOPED_IN_XML"
  | "ENVELOPING_XML"
  | "DETACHED"
  | "ENVELOPED_IN_OOXML_PACKAGE"
  | "UNKNOWN";

export type SignatureRelationType =
  | "FIRST_SIGNATURE"
  | "SEQUENTIAL_APPROVAL"
  | "PARALLEL_SIGNATURE"
  | "COUNTERSIGNATURE";

export type CertificateRole =
  | "SIGNER"
  | "TSA"
  | "INTERMEDIATE"
  | "ROOT"
  | "OCSP_RESPONDER"
  | "UNKNOWN";

export type CertificateSource =
  | "EMBEDDED_IN_SIGNATURE"
  | "EMBEDDED_IN_TIMESTAMP"
  | "EMBEDDED_IN_DOCUMENT"
  | "DOWNLOADED_VIA_AIA"
  | "TRUST_STORE"
  | "OCSP_RESPONSE"
  | "UNKNOWN";

export type ScopeType = "PDF_BYTE_RANGE" | "XML_REFERENCES" | "OOXML_PACKAGE_REFERENCES";
export type DetectedType = "PDF" | "XML" | "OOXML" | "ASIC" | "UNKNOWN";
export type NetworkMode = "OFFLINE" | "ONLINE_ALLOWED" | "ONLINE_REQUIRED";
/**
 * `MASKED` (mặc định) — mọi DN trong response đã bị che (CCCD/MST/email/SĐT chỉ
 * còn vài ký tự cuối). Đừng coi giá trị đã che là dữ liệu đối soát định danh gốc.
 */
export type PiiExposureMode = "MASKED" | "FULL";
export type NetworkRequirement = "NOT_REQUIRED" | "REQUIRED" | "CONDITIONAL";
export type TrustDomainStatus = "READY" | "NOT_CONFIGURED" | "STALE" | "ERROR";
export type ModificationStatus = "NONE" | "PRESENT_ALLOWED" | "PRESENT_FORBIDDEN" | "UNKNOWN";
export type ModificationPolicyResult = "ALLOWED" | "FORBIDDEN" | "UNKNOWN" | "NOT_APPLICABLE";
export type LongTermStatus = "ACHIEVED" | "NOT_ACHIEVED" | "NOT_EVALUATED";
export type PathBuildStatus = "COMPLETE" | "INCOMPLETE" | "REJECTED";
export type SubjectType = "NATURAL_PERSON" | "LEGAL_PERSON" | "SEAL" | "UNKNOWN";
export type ReferenceTimeType = "VALIDATION_TIME" | "BEST_SIGNATURE_TIME" | "USER_PROVIDED_TIME";
export type ReferenceTimeSource =
  | "SYSTEM_CLOCK"
  | "TRUSTED_TIMESTAMP"
  | "EXTERNAL_AUTHORITY"
  | "USER_INPUT";

export type ValidationCheckType =
  | "PDF_BYTE_RANGE"
  | "XML_REFERENCE_RESOLUTION"
  | "SIGNED_OBJECT_INTEGRITY"
  | "SIGNATURE_CRYPTOGRAPHY"
  | "SIGNED_ATTRIBUTES"
  | "ALGORITHM_POLICY"
  | "CERTIFICATE_PATH"
  | "REVOCATION"
  | "SIGNATURE_TIMESTAMP"
  | "DOCUMENT_MODIFICATION"
  | "BASELINE_PROFILE"
  | "LONG_TERM_VALIDATION"
  | (string & {});

/** Nhóm kiểm tra trong `signatures[].validation` — dùng làm khoá i18n và thứ tự hiển thị. */
export type ValidationGroup =
  | "cryptographicIntegrity"
  | "signedScope"
  | "certificatePath"
  | "revocation"
  | "trustedTime"
  | "signaturePolicy"
  | "longTermValidation";

export const VALIDATION_GROUPS: ValidationGroup[] = [
  "cryptographicIntegrity",
  "signedScope",
  "certificatePath",
  "revocation",
  "trustedTime",
  "signaturePolicy",
  "longTermValidation",
];

/* ------------------------------------------------------------------ *
 * Schema 6.x — đúng shape của POST /api/v1/verify
 *
 * `@JsonInclude(NON_NULL)` đã bị gỡ khỏi toàn bộ contract kể từ 6.0.0, trừ
 * đúng một record: `Scope` (nhánh PDF vs XML/OOXML là `oneOf`, không phải field
 * chưa có giá trị — xem `ScopeV6`). Mọi field khác ở schema 6 LUÔN có mặt trong
 * JSON, mang `null` khi chưa xác định — không còn khái niệm "vắng key". Type ở
 * đây vẫn giữ `?`/`| null` cho an toàn (phòng khi backend đi trước schema), và
 * mọi chỗ đọc vẫn phải dùng optional chaining — đừng phân biệt "thiếu key" với
 * "null", với schema 6 chúng đồng nhất.
 *
 * Root response KHÔNG còn envelope `{ data, meta }` như schema 5:
 * `schemaVersion`/`run`/`data` nằm thẳng ở root, và `run.correlationId` thay
 * cho `meta.correlationId`.
 * ------------------------------------------------------------------ */

export interface EtsiV6 {
  mainIndication: MainIndication;
  subIndications?: SubIndication[] | null;
  /** Nguyên nhân nội bộ khi không có sub-indication ETSI tương ứng. Mới ở 6.0.0. */
  internalReasonCodes?: string[] | null;
}

export interface DigestV6 {
  algorithm?: string | null;
  declaredValue?: string | null;
  computedValue?: string | null;
  matched?: boolean | null;
}

export interface DocumentInfoV6 {
  documentId: string;
  fileName?: string;
  fileSize: number;
  hashes?: { algorithm: string; value: string }[];
  format?: {
    declaredExtension?: string;
    detectedMediaType?: string;
    detectedType?: DetectedType;
    pdfVersion?: string;
    standardsDetected?: string[];
  };
  parser?: {
    outcome: CheckOutcome;
    repairModeUsed?: boolean;
    crossReferenceValid?: boolean;
    trailingDataDetected?: boolean;
    ambiguousObjectsDetected?: boolean;
    warnings?: string[];
  };
  signatureInventory?: {
    /** Đổi tên từ `detected` ở schema 5. */
    signaturesDetected: number;
    /** Mới ở 6.0.0 — tách khỏi `signaturesDetected`: 1 chữ ký mang timestamp KHÔNG phải 2 chữ ký. */
    timestampsDetected: number;
    processed: number;
    unsupported: number;
  };
  securityObservations?: {
    activeContentDetected?: boolean;
    embeddedFilesDetected?: boolean;
    suspiciousIncrementalUpdatesDetected?: boolean;
  };
}

export interface TrustDomainRefV6 {
  id: string;
  version?: string | null;
  sha256?: string | null;
  anchorCount: number;
  status: TrustDomainStatus;
}

export interface ValidationContextV6 {
  policy?: { id: string; version: string; sha256?: string };
  cryptographicPolicy?: { id: string; version: string; sha256?: string };
  referenceTime?: {
    value: string;
    type: ReferenceTimeType;
    source: ReferenceTimeSource;
    trustedForProofOfExistence: boolean;
  } | null;
  trustDomain?: { signer?: TrustDomainRefV6 | null; tsa?: TrustDomainRefV6 | null } | null;
  network?: {
    mode: NetworkMode;
    externalAccessAttempted: boolean;
    reasonNotAttempted?: string;
    timeoutMs?: number;
  };
  /** Mới ở 6.0.0 — response này đã che PII hay chưa. */
  piiExposureMode?: PiiExposureMode | null;
}

export interface SummaryV6 {
  etsi: EtsiV6;
  validationCompleteness?: ValidationCompleteness | null;
  signatureStatistics?: {
    detected: number;
    processed: number;
    cryptographicallyValid: number;
    totalPassed: number;
    totalFailed: number;
    indeterminate: number;
    notProcessed: number;
  } | null;
  documentState?: {
    latestRevisionCoveredBySignature?: boolean | null;
    modificationsAfterLastSignature?: boolean | null;
    modificationPolicyResult?: ModificationPolicyResult | null;
  } | null;
  rootIssueIds?: string[];
}

export interface RevisionV6 {
  revisionNumber: number;
  startOffset: number;
  endOffset: number;
  length: number;
  introducedSignatureIds?: string[];
  changeCategories?: string[] | null;
  sha256?: string | null;
}

export interface XmlReferenceV6 {
  referenceId?: string;
  uri?: string;
  type?: string;
  resolution?: {
    status?: string;
    targetKind?: string;
    targetPath?: string;
    matchedNodeCount?: number;
    duplicateIdDetected?: boolean;
    external?: boolean;
  };
  transforms?: { order: number; algorithm: string; policyResult: string }[];
  digest?: DigestV6;
}

export interface ScopeV6 {
  type?: ScopeType;
  byteRange?: number[];
  includedRanges?: { offset: number; length: number }[];
  excludedRanges?: { offset: number; length: number; purpose?: string | null; valid?: boolean }[];
  signedRevisionNumber?: number;
  signedRevisionEnd?: number;
  currentFileEnd?: number;
  coversWholeSignedRevision?: boolean;
  coversCurrentDocument?: boolean;
  unsignedTrailingBytes?: number;
  signatureElementPath?: string;
  references?: XmlReferenceV6[];
  allRequiredBusinessObjectsCovered?: boolean;
  wrappingAttackIndicators?: string[];
}

export interface CryptographyV6 {
  container?: {
    filter?: string;
    subFilter?: string;
    cmsParseStatus?: CheckOutcome;
    detachedContent?: boolean;
    canonicalizationMethod?: string;
    /**
     * Mới ở 6.0.0 — bằng chứng cho quan hệ countersignature. `kind` chỉ trả
     * `COUNTERSIGNATURE` khi giá trị này > 0 (unsigned attribute id-countersignature
     * thật sự có trong container CMS), không còn suy từ khoá quy trình nghiệp vụ.
     */
    cmsCountersignatureCount?: number | null;
  };
  contentDigest?: DigestV6;
  signatureValue?: { algorithm?: string; oid?: string; valid?: boolean };
  key?: { algorithm?: string; size?: number; parameters?: string };
  signedAttributes?: {
    contentTypePresent?: boolean;
    messageDigestPresent?: boolean;
    signingCertificateV2Present?: boolean;
    signingCertificateBindingValid?: boolean;
    duplicateAttributesDetected?: boolean;
    unknownCriticalAttributes?: string[];
  };
  algorithmPolicy?: {
    digestAlgorithm?: CheckOutcome | null;
    signatureAlgorithm?: CheckOutcome | null;
    keySize?: CheckOutcome | null;
    proofOfExistenceRequired?: boolean;
  } | null;
}

export interface CandidatePathV6 {
  pathId: string;
  /** Thứ tự leaf → intermediate → root. */
  certificateIds?: string[];
  completeToKnownTrustAnchor?: boolean;
  selected?: boolean;
  buildStatus?: PathBuildStatus;
  failureReasons?: string[];
}

export interface CertificateRevocationV6 {
  certificateId?: string;
  status: CheckOutcome;
  certificateStatus?: string;
  blockedByCheckIds?: string[];
  reason?: string;
  embeddedEvidenceIds?: string[];
  onlineLookupAttempted?: boolean;
  revocationTime?: string;
}

export interface TimestampV6 {
  timestampId: string;
  type?: string;
  tokenParseStatus?: CheckOutcome;
  messageImprint?: DigestV6 & { protectedObject?: string };
  tokenSignatureValid?: boolean;
  tsaCertificateId?: string;
  policyOid?: string;
  serialNumber?: string;
  genTime?: string;
  accuracy?: { seconds?: number; milliseconds?: number; microseconds?: number } | null;
  ordering?: boolean;
  noncePresent?: boolean;
  tsaPathStatus?: CheckOutcome;
  tsaRevocationStatus?: CheckOutcome;
  trustedTime?: boolean;
  usableAsProofOfExistence?: boolean;
  issueIds?: string[];
}

export type ChangeAnalysisStatus = "PERFORMED" | "NOT_PERFORMED";

export interface ModificationsAfterSigningV6 {
  /**
   * `UNKNOWN` là trạng thái BÌNH THƯỜNG ở 6.0.0 khi `changeAnalysis` chưa chạy —
   * KHÔNG phải lỗi. `PRESENT_ALLOWED` giờ chỉ được trả khi engine đã thực sự đối
   * chiếu nội dung (`changeAnalysis: "PERFORMED"`).
   */
  status?: ModificationStatus;
  laterRevisionNumbers?: number[];
  categories?: string[];
  /** Mới ở 6.0.0 — engine đã đối chiếu nội dung giữa các revision hay chưa. */
  changeAnalysis?: ChangeAnalysisStatus | null;
  docMdp?: { present: boolean; permissionLevel?: number; result?: CheckOutcome };
  fieldMdp?: { present: boolean; result?: CheckOutcome | null } | null;
  pageContentChanged?: boolean;
  formFieldsChanged?: boolean;
  annotationsChanged?: boolean;
  attachmentsChanged?: boolean;
}

export interface CheckV6 {
  checkId: string;
  type?: ValidationCheckType;
  outcome: CheckOutcome;
  component?: string;
  expected?: string;
  actual?: string;
  blockedByCheckIds?: string[];
  issueIds?: string[];
}

export interface SignatureValidationV6 {
  etsi: EtsiV6;
  cryptographicIntegrity?: CheckOutcome | null;
  signedScope?: CheckOutcome | null;
  certificatePath?: CheckOutcome | null;
  revocation?: CheckOutcome | null;
  trustedTime?: CheckOutcome | null;
  signaturePolicy?: CheckOutcome | null;
  longTermValidation?: CheckOutcome | null;
}

export interface SignatureV6 {
  signatureId: string;
  index: number;
  kind?: SignatureKind;
  standard?: string;
  packaging?: SignaturePackaging;
  relation?: {
    type: SignatureRelationType;
    coversPriorSignatureIds?: string[];
    workflowTargetSignatureId?: string;
  };
  field?: {
    name?: string;
    page?: number;
    visible?: boolean;
    locked?: boolean;
    rectangle?: { x: number; y: number; width: number; height: number } | null;
  };
  profile?: {
    /** Mức phát hiện được — chỉ mang tính mô tả. KHÔNG hiển thị đây như "đạt profile X". */
    detected?: string;
    claimed?: string;
    conformanceStatus?: CheckOutcome;
    /** "Đạt" thật sự dùng field này (hoặc `conformanceStatus`), không phải `detected`. */
    achieved?: string;
    missingForNextLevel?: string[];
    /** Mới ở 6.0.0 — mức chắc chắn của việc nhận dạng `detected`/`claimed`. */
    detectionStatus?: string | null;
    detectionEvidence?: string[] | null;
    missingDetectionEvidence?: string[] | null;
    /** Mới ở 6.0.0 — mức kế tiếp, tách khỏi yêu cầu lưu trữ dài hạn (`missingForLta`). */
    nextTarget?: string | null;
    missingForLta?: string[] | null;
  };
  validation: SignatureValidationV6;
  scope?: ScopeV6;
  claimedProperties?: {
    signingTime?: {
      value: string;
      source?: string;
      cryptographicallyProtected?: boolean;
      independentlyTrusted?: boolean;
    };
    reason?: string;
    location?: string;
    contactInfo?: string;
    /**
     * Đổi tên + đổi hình dạng ở 6.0.0: trước là `signerName` (string), nay là object
     * có nguồn gốc và độ tin cậy. Đây là lời khai của PDF (`/Name` trong dictionary
     * chữ ký) — KHÔNG dùng làm danh tính hiển thị, danh tính lấy từ `signerIdentity.displayName`.
     */
    pdfSignerName?: {
      value?: string | null;
      source?: string | null;
      cryptographicallyProtected?: boolean | null;
      identityVerified?: boolean | null;
    } | null;
  };
  signerIdentity?: {
    signingCertificateId?: string;
    displayName?: string;
    distinguishedName?: string;
    subjectType?: SubjectType;
    normalizedIdentifiers?: { scheme: string; value: string; source: string }[];
    organization?: string;
    country?: string;
    workflowIdentityMatch?: { status: CheckOutcome; expectedSignerId?: string | null };
  };
  cryptography?: CryptographyV6;
  certificateValidation?: {
    signingCertificateId?: string;
    embeddedCertificateIds?: string[];
    candidatePaths?: CandidatePathV6[];
    selectedPathId?: string;
    trustStatus?: CheckOutcome;
  };
  revocation?: { overall: CheckOutcome; certificateResults?: CertificateRevocationV6[] };
  timestamps?: TimestampV6[];
  timeValidation?: {
    claimedSigningTime?: string;
    bestSignatureTime?: string;
    bestSignatureTimeSource?: string;
    certificateEvaluationTime?: string;
    certificateEvaluationTimeType?: ReferenceTimeType;
    proofsOfExistence?: { timestampId: string; protectedObject: string; at: string }[];
  };
  modificationsAfterSigning?: ModificationsAfterSigningV6;
  longTermValidation?: {
    embeddedCertificateValues?: boolean;
    embeddedRevocationValues?: boolean;
    documentTimestampPresent?: boolean;
    ltStatus?: LongTermStatus;
    ltaStatus?: LongTermStatus;
    missingMaterial?: string[];
  };
  qualification?: {
    status: CheckOutcome;
    signatureOrSeal?: string;
    certificateType?: string;
    qualifiedCertificate?: boolean;
    qualifiedCreationDevice?: boolean;
  };
  checks?: CheckV6[];
  issueIds?: string[];
  remediationIds?: string[];
}

export interface CertificateV6 {
  certificateId: string;
  role?: CertificateRole;
  source?: CertificateSource;
  subject?: { dn?: string; commonName?: string; organization?: string; country?: string };
  issuer?: { dn?: string; commonName?: string };
  serialNumberHex?: string;
  sha256Fingerprint?: string;
  validity?: {
    notBefore?: string | null;
    notAfter?: string | null;
    evaluatedAt?: string | null;
    status?: CheckOutcome | null;
  } | null;
  publicKey?: { algorithm?: string; size?: number };
  keyUsage?: string[];
  extendedKeyUsage?: string[];
  basicConstraints?: { ca: boolean; pathLength?: number };
  policyOids?: string[];
  qcStatements?: string[];
  accessLocations?: {
    issuerCertificateUrls?: string[] | null;
    ocspUrls?: string[] | null;
    crlUrls?: string[] | null;
  } | null;
  validation?: {
    parse?: CheckOutcome | null;
    timeValidity?: CheckOutcome | null;
    issuerSignature?: CheckOutcome | null;
    constraints?: CheckOutcome | null;
    revocation?: CheckOutcome | null;
    trust?: CheckOutcome | null;
    overall?: CheckOutcome | null;
  } | null;
}

export interface RevocationEvidenceV6 {
  evidenceId: string;
  type?: string;
  source?: string;
  subjectCertificateId?: string;
  producedAt?: string;
  thisUpdate?: string;
  nextUpdate?: string;
  status?: string;
}

export interface IssueV6 {
  issueId: string;
  severity?: IssueSeverity;
  code: string;
  standardCode?: string | null;
  rootCause?: boolean;
  category?: IssueCategory;
  component?: string;
  message?: string;
  detail?: string;
  causedByIssueIds?: string[];
  affectedSignatureIds?: string[];
  retryable?: boolean;
  fileNeedsResigning?: boolean;
}

export interface RemediationV6 {
  remediationId: string;
  priority: number;
  stage?: RemediationStage;
  actionCode?: string;
  title?: string;
  description?: string;
  resolvesIssueIds?: string[];
  requiresResigning?: boolean;
  /** Đổi tên + đổi hình dạng ở 6.0.0: trước là `requiresNetwork` (boolean). */
  networkRequirement?: NetworkRequirement | null;
}

export interface ReportDataV6 {
  document: DocumentInfoV6;
  validationContext?: ValidationContextV6;
  summary: SummaryV6;
  revisions?: RevisionV6[];
  signatures?: SignatureV6[];
  certificates?: CertificateV6[];
  revocationEvidence?: RevocationEvidenceV6[];
  issues?: IssueV6[];
  remediations?: RemediationV6[];
}

export interface VerificationReportV6 {
  schemaVersion: string;
  run: {
    runId: string;
    /** Mới ở 6.0.0 — cùng giá trị với header `X-Correlation-Id`, giữ được khi báo cáo rời khỏi response. */
    correlationId?: string | null;
    verifiedAt: string;
    durationMs?: number;
    engine: { name: string; version: string; build?: string | null };
  };
  data: ReportDataV6;
}

/* ------------------------------------------------------------------ *
 * View model — shape mà giao diện đọc
 * ------------------------------------------------------------------ */

export type ChainNodeRole = CertificateRole | "LEAF";
export type ChainNodeStatus = "VALID" | "EXPIRED" | "NOT_YET_VALID" | "INVALID" | "UNKNOWN";

/** `matched: null` = không đối chiếu được. KHÁC `false` = digest sai. */
export interface DigestMatch {
  algorithm: string;
  value: string;
  matched: boolean | null;
}

export interface VerificationIssue {
  issueId: string;
  severity: IssueSeverity;
  code: string;
  /** Sub-indication ETSI tương ứng, `null` khi không map được. */
  standardCode?: string | null;
  /**
   * Cùng một lỗi thường được phát hiện lại ở nhiều tầng. Backend đã gộp và đánh
   * dấu nguyên nhân gốc — màn tổng quan chỉ hiện `rootCause`, phần còn lại nằm ở
   * chi tiết, lồng dưới nguyên nhân qua `causedBy`.
   */
  rootCause: boolean;
  category?: IssueCategory | null;
  component?: string | null;
  message: string;
  detail?: string | null;
  causedByIssueIds: string[];
  affectedSignatureIds: string[];
  retryable: boolean;
  /**
   * Quyết định CTA. Trust store rỗng là lỗi cấu hình verifier và `false` — hiện
   * "vui lòng ký lại tài liệu" ở ca đó là sai và làm mất bằng chứng gốc.
   */
  fileNeedsResigning: boolean;
}

export interface VerificationRemediation {
  remediationId: string;
  /** 1 = làm trước. Danh sách đã sắp sẵn — KHÔNG sort lại ở giao diện. */
  priority: number;
  stage?: RemediationStage | null;
  actionCode?: string | null;
  title: string;
  description?: string | null;
  resolvesIssueIds: string[];
  requiresResigning: boolean;
  /** Đổi tên + đổi hình dạng ở 6.0.0: trước là `requiresNetwork` (boolean). */
  networkRequirement: NetworkRequirement;
}

export interface SignatureCheck {
  checkId: string;
  type?: ValidationCheckType | null;
  outcome: CheckOutcome;
  component?: string | null;
  expected?: string | null;
  actual?: string | null;
  /**
   * Lý do bước này chưa chạy. `revocation: NOT_EVALUATED` kèm `["check-004"]`
   * nghĩa là *chưa kiểm tra thu hồi vì certificate path chưa neo được trust* —
   * KHÔNG phải "chứng thư không bị thu hồi".
   */
  blockedByCheckIds: string[];
  issues: VerificationIssue[];
}

export interface ChainNode {
  certificateId: string;
  position: number;
  role: ChainNodeRole;
  status: ChainNodeStatus;
  trustAnchor: boolean;
  subject: { dn: string; commonName: string; organization?: string | null; country?: string | null };
  issuer: { dn: string; commonName: string };
  serialNumberHex: string;
  validFrom?: string | null;
  validTo?: string | null;
  sha256Fingerprint: string;
  publicKey: { algorithm: string; size: number | null };
  keyUsage: string[];
  selfSigned: boolean;
  policyOids?: string[] | null;
  /** Kết luận của engine cho chính chứng thư này — tách khỏi trạng thái hiệu lực. */
  validation?: CertificateV6["validation"];
}

export interface CertificateChain {
  pathId?: string | null;
  /** `PASS` mới là "neo được trust". `INDETERMINATE` là chưa đủ căn cứ, không phải mất tin cậy. */
  trustStatus: CheckOutcome;
  trusted: boolean;
  trustAnchor?: string | null;
  buildStatus?: PathBuildStatus | null;
  failureReasons: string[];
  nodes: ChainNode[];
}

export interface SignatureReference {
  index: number;
  /** Rỗng/khuyết với reference trỏ vào toàn bộ tài liệu. */
  uri: string;
  type?: string | null;
  digestAlgorithm: string;
  digestValue: string;
  matched: boolean | null;
  external: boolean;
  duplicateIdDetected: boolean;
}

export interface CertificateRevocation {
  certificateId?: string | null;
  subject: string;
  serialNumberHex: string;
  status: CheckOutcome;
  certificateStatus?: string | null;
  reason?: string | null;
  blockedByCheckIds: string[];
  onlineLookupAttempted: boolean;
  revocationTime?: string | null;
  evidence: RevocationEvidenceV6[];
}

export interface SignatureRevocation {
  status: CheckOutcome;
  certificates: CertificateRevocation[];
}

export interface VerificationTimestamp {
  timestampId: string;
  type: string;
  status: CheckOutcome;
  tsaName?: string | null;
  policyOid?: string | null;
  serialNumber?: string | null;
  genTime?: string | null;
  accuracy?: string | null;
  messageImprint: DigestMatch;
  tokenSignatureValid?: boolean | null;
  tsaPathStatus?: CheckOutcome | null;
  tsaRevocationStatus?: CheckOutcome | null;
  /** Chuỗi tin cậy của CHÍNH TSA — khác biệt giữa "có timestamp" và "timestamp dùng được". */
  chain?: CertificateChain | null;
  trustedTime: boolean;
  usableAsProofOfExistence: boolean;
  issues: VerificationIssue[];
}

export interface SignatureScope {
  type?: ScopeType | null;
  byteRange?: number[] | null;
  coversWholeSignedRevision?: boolean | null;
  coversCurrentDocument?: boolean | null;
  unsignedTrailingBytes?: number | null;
  signedRevisionNumber?: number | null;
  signatureElementPath?: string | null;
  allRequiredBusinessObjectsCovered?: boolean | null;
  wrappingAttackIndicators: string[];
}

export interface VerificationSignature {
  signatureId: string;
  index: number;
  kind: SignatureKind;
  status: VerificationStatus;
  mainIndication: MainIndication;
  /** Đã xếp sẵn theo mức nghiêm trọng — lấy phần tử đầu nếu chỉ hiện một dòng. */
  subIndications: SubIndication[];
  standard: RealSignatureStandard;
  packaging?: SignaturePackaging | null;
  /** Baseline phát hiện được, ví dụ `"B-LT"`. Có thể khuyết. */
  baselineLevel?: string | null;
  achievedBaselineLevel?: string | null;
  missingForNextLevel: string[];
  relation?: SignatureV6["relation"] | null;
  signingTime?: string | null;
  /** Thời điểm ký chỉ đáng tin khi có timestamp neo được — đừng hiện nó như sự thật. */
  signingTimeTrusted: boolean;
  signer?: {
    commonName: string;
    distinguishedName: string;
    organization?: string | null;
    country?: string | null;
  } | null;
  /** Bảy nhóm kiểm tra, mỗi nhóm một `CheckOutcome`. `null` = backend không trả. */
  validation: Record<ValidationGroup, CheckOutcome | null>;
  digest: DigestMatch;
  signatureAlgorithm: { name: string; oid: string; keyAlgorithm: string; keySize: number | null };
  canonicalizationMethod?: string | null;
  certificateChain?: CertificateChain | null;
  candidatePaths: CertificateChain[];
  revocation?: SignatureRevocation | null;
  timestamps: VerificationTimestamp[];
  references: SignatureReference[];
  scope?: SignatureScope | null;
  longTermValidation?: SignatureV6["longTermValidation"] | null;
  modificationsAfterSigning?: ModificationsAfterSigningV6 | null;
  checks: SignatureCheck[];
  issues: VerificationIssue[];
  remediations: VerificationRemediation[];
}

export interface SignatureStatistics {
  detected: number;
  processed: number;
  /**
   * Đúng về mật mã. Cố ý TÁCH khỏi `totalPassed`: chữ ký đúng mật mã nhưng chưa
   * neo được trust được đếm ở đây, không được đếm ở kia.
   */
  cryptographicallyValid: number;
  totalPassed: number;
  totalFailed: number;
  indeterminate: number;
  notProcessed: number;
}

export interface VerificationEngine {
  name: string;
  version: string;
  build?: string | null;
}

export interface ValidationPolicy {
  id: string;
  version: string;
  sha256?: string | null;
}

export interface TrustDomain {
  signer?: TrustDomainRefV6 | null;
  tsa?: TrustDomainRefV6 | null;
}

export interface VerificationReport {
  schemaVersion: string;
  status: VerificationStatus;
  mainIndication: MainIndication;
  subIndications: SubIndication[];
  /** `PARTIAL` = có bước chưa chạy hết. Một chữ ký `TOTAL_FAILED` vẫn có thể `COMPLETE`. */
  completeness?: ValidationCompleteness | null;
  contentType: VerificationContentType;
  fileName: string;
  fileSize: number;
  sha256: string;
  signatureStatistics: SignatureStatistics;
  documentState?: SummaryV6["documentState"];
  verifiedAt: string;
  durationMs?: number | null;
  runId: string;
  engine: VerificationEngine;
  policy?: ValidationPolicy | null;
  trustDomain: TrustDomain;
  network?: ValidationContextV6["network"] | null;
  referenceTime?: ValidationContextV6["referenceTime"];
  signatures: VerificationSignature[];
  /** Toàn bộ vấn đề, phẳng. Màn tổng quan dùng `rootIssues`. */
  issues: VerificationIssue[];
  /** `summary.rootIssueIds` đã resolve, đã lọc bỏ severity `INFO`. */
  rootIssues: VerificationIssue[];
  /** Đã gộp theo `actionCode` và sắp sẵn theo `priority`. */
  remediations: VerificationRemediation[];
  revisions: RevisionV6[];
}

/* ------------------------------------------------------------------ *
 * Adapter
 * ------------------------------------------------------------------ */

/**
 * Schema major mà bàn thử này đọc được.
 *
 * Chỉ so major: minor/patch của schema 6 được cam kết backward-compatible (chỉ
 * thêm field), nên khoá chặt `=== "6.0.0"` sẽ làm giao diện vỡ vô cớ ở `6.1.0`.
 * KHÔNG gate bằng `run.engine.version` — đó là version của engine, không phải của
 * hợp đồng JSON.
 */
export const SUPPORTED_SCHEMA_MAJOR = 6;

export function checkSchemaVersionCompatible(schemaVersion: string): void {
  const [major] = String(schemaVersion ?? "").split(".").map(Number);
  if (major !== SUPPORTED_SCHEMA_MAJOR) {
    throw new Error(
      `Unsupported schema version: ${schemaVersion}. Expected v${SUPPORTED_SCHEMA_MAJOR}.x.x`,
    );
  }
}

const MAIN_TO_STATUS: Record<MainIndication, VerificationStatus> = {
  TOTAL_PASSED: "VALID",
  TOTAL_FAILED: "INVALID",
  INDETERMINATE: "INDETERMINATE",
};

function statusOf(main: MainIndication): VerificationStatus {
  return MAIN_TO_STATUS[main] ?? "INDETERMINATE";
}

/** Mọi thứ trong schema 6 tham chiếu nhau bằng ID — dựng map một lần thay vì tìm tuyến tính. */
function indexReport(data: ReportDataV6) {
  return {
    certById: new Map((data.certificates ?? []).map((c) => [c.certificateId, c])),
    issueById: new Map((data.issues ?? []).map((i) => [i.issueId, i])),
    remedById: new Map((data.remediations ?? []).map((r) => [r.remediationId, r])),
    evidenceById: new Map((data.revocationEvidence ?? []).map((e) => [e.evidenceId, e])),
  };
}

type ReportIndex = ReturnType<typeof indexReport>;

function adaptIssue(issue: IssueV6): VerificationIssue {
  return {
    issueId: issue.issueId,
    severity: issue.severity ?? "INFO",
    code: issue.code,
    standardCode: issue.standardCode ?? null,
    rootCause: issue.rootCause ?? false,
    category: issue.category ?? null,
    component: issue.component ?? null,
    // `code` là tập mở (~60 mã và còn thêm). Khi backend không kèm câu chữ thì
    // hiện thẳng mã — để trống là mất luôn thông tin duy nhất còn lại.
    message: issue.message ?? issue.detail ?? issue.code,
    detail: issue.detail ?? null,
    causedByIssueIds: issue.causedByIssueIds ?? [],
    affectedSignatureIds: issue.affectedSignatureIds ?? [],
    retryable: issue.retryable ?? false,
    fileNeedsResigning: issue.fileNeedsResigning ?? false,
  };
}

function adaptRemediation(remediation: RemediationV6): VerificationRemediation {
  return {
    remediationId: remediation.remediationId,
    priority: remediation.priority,
    stage: remediation.stage ?? null,
    actionCode: remediation.actionCode ?? null,
    title: remediation.title ?? remediation.actionCode ?? remediation.remediationId,
    description: remediation.description ?? null,
    resolvesIssueIds: remediation.resolvesIssueIds ?? [],
    requiresResigning: remediation.requiresResigning ?? false,
    networkRequirement: remediation.networkRequirement ?? "NOT_REQUIRED",
  };
}

function resolveIssues(ids: string[] | undefined, index: ReportIndex): VerificationIssue[] {
  return (ids ?? [])
    .map((id) => index.issueById.get(id))
    .filter((issue): issue is IssueV6 => Boolean(issue))
    .map(adaptIssue);
}

/**
 * Trạng thái hiệu lực của chứng thư tại thời điểm engine đánh giá.
 *
 * `validity.status` chỉ nói PASS/FAIL, không nói *vì sao* — nên khi không PASS thì
 * đối chiếu mốc thời gian để phân biệt hết hạn với chưa tới hạn.
 */
function chainNodeStatus(validity: CertificateV6["validity"]): ChainNodeStatus {
  if (!validity) return "UNKNOWN";
  if (validity.status === "PASS") return "VALID";

  const at = validity.evaluatedAt ? Date.parse(validity.evaluatedAt) : Date.now();
  if (!Number.isNaN(at)) {
    const notAfter = validity.notAfter ? Date.parse(validity.notAfter) : NaN;
    const notBefore = validity.notBefore ? Date.parse(validity.notBefore) : NaN;
    if (!Number.isNaN(notAfter) && notAfter < at) return "EXPIRED";
    if (!Number.isNaN(notBefore) && notBefore > at) return "NOT_YET_VALID";
  }

  return validity.status === "FAIL" ? "INVALID" : "UNKNOWN";
}

function toChainNode(cert: CertificateV6, position: number): ChainNode {
  const subjectDn = cert.subject?.dn ?? "";
  const issuerDn = cert.issuer?.dn ?? "";

  return {
    certificateId: cert.certificateId,
    position,
    // Nhánh signer hiển thị là "chứng thư ký"; các vai còn lại giữ nguyên tên của backend.
    role: cert.role === "SIGNER" ? "LEAF" : cert.role ?? "UNKNOWN",
    status: chainNodeStatus(cert.validity),
    trustAnchor: cert.source === "TRUST_STORE",
    subject: {
      dn: subjectDn,
      commonName: cert.subject?.commonName ?? subjectDn,
      organization: cert.subject?.organization ?? null,
      country: cert.subject?.country ?? null,
    },
    issuer: { dn: issuerDn, commonName: cert.issuer?.commonName ?? issuerDn },
    serialNumberHex: cert.serialNumberHex ?? "",
    validFrom: cert.validity?.notBefore ?? null,
    validTo: cert.validity?.notAfter ?? null,
    sha256Fingerprint: cert.sha256Fingerprint ?? "",
    publicKey: {
      algorithm: cert.publicKey?.algorithm ?? "",
      size: cert.publicKey?.size ?? null,
    },
    keyUsage: cert.keyUsage ?? [],
    selfSigned: Boolean(subjectDn) && subjectDn === issuerDn,
    policyOids: cert.policyOids ?? null,
    validation: cert.validation,
  };
}

function toChain(
  path: CandidatePathV6,
  trustStatus: CheckOutcome,
  index: ReportIndex,
): CertificateChain {
  const nodes = (path.certificateIds ?? [])
    .map((id) => index.certById.get(id))
    .filter((cert): cert is CertificateV6 => Boolean(cert))
    .map(toChainNode);

  const anchor = path.completeToKnownTrustAnchor ? nodes[nodes.length - 1] : undefined;

  return {
    pathId: path.pathId,
    trustStatus,
    // "Trusted" chỉ khi engine chốt PASS. `INDETERMINATE` (thiếu anchor) KHÔNG
    // phải là mất tin cậy, nhưng cũng không được hiện thành đã tin cậy.
    trusted: trustStatus === "PASS",
    trustAnchor: anchor?.subject.commonName ?? null,
    buildStatus: path.buildStatus ?? null,
    failureReasons: path.failureReasons ?? [],
    nodes,
  };
}

/**
 * Chuỗi chứng thư của một chữ ký. Không có `candidatePaths` (ví dụ chỉ có mỗi
 * chứng thư nhúng) thì dựng một chuỗi giả từ `embeddedCertificateIds` để màn
 * chuỗi vẫn có gì đó xem — thà hiện chứng thư đơn lẻ còn hơn một khung trống.
 */
function adaptCertificateChains(
  signature: SignatureV6,
  index: ReportIndex,
): { selected: CertificateChain | null; candidates: CertificateChain[] } {
  const cv = signature.certificateValidation;
  const trustStatus = cv?.trustStatus ?? "NOT_EVALUATED";
  const paths = cv?.candidatePaths ?? [];

  if (paths.length === 0) {
    const embedded = cv?.embeddedCertificateIds ?? [];
    if (embedded.length === 0) return { selected: null, candidates: [] };

    const fallback = toChain(
      { pathId: "path-embedded", certificateIds: embedded, completeToKnownTrustAnchor: false },
      trustStatus,
      index,
    );
    return { selected: fallback, candidates: [fallback] };
  }

  const candidates = paths.map((path) => toChain(path, trustStatus, index));
  const selected =
    candidates.find((chain) => chain.pathId === cv?.selectedPathId) ??
    candidates.find((_, i) => paths[i].selected) ??
    candidates[0];

  return { selected, candidates };
}

function adaptTimestamp(
  timestamp: TimestampV6,
  index: ReportIndex,
): VerificationTimestamp {
  const tsaCert = timestamp.tsaCertificateId
    ? index.certById.get(timestamp.tsaCertificateId)
    : undefined;

  return {
    timestampId: timestamp.timestampId,
    type: timestamp.type ?? "TIMESTAMP",
    // Một timestamp chỉ dùng được làm mốc khi CHÍNH nó neo được trust; trạng thái
    // hiển thị vì vậy lấy theo đường dẫn của TSA, không theo việc token parse được.
    status: timestamp.tsaPathStatus ?? timestamp.tokenParseStatus ?? "NOT_EVALUATED",
    tsaName: tsaCert?.subject?.commonName ?? null,
    policyOid: timestamp.policyOid ?? null,
    serialNumber: timestamp.serialNumber ?? null,
    genTime: timestamp.genTime ?? null,
    accuracy: formatAccuracy(timestamp.accuracy),
    messageImprint: {
      algorithm: timestamp.messageImprint?.algorithm ?? "",
      value:
        timestamp.messageImprint?.computedValue ?? timestamp.messageImprint?.declaredValue ?? "",
      matched: timestamp.messageImprint?.matched ?? null,
    },
    tokenSignatureValid: timestamp.tokenSignatureValid ?? null,
    tsaPathStatus: timestamp.tsaPathStatus ?? null,
    tsaRevocationStatus: timestamp.tsaRevocationStatus ?? null,
    chain: tsaCert
      ? toChain(
          {
            pathId: `path-${timestamp.timestampId}`,
            certificateIds: [tsaCert.certificateId],
            completeToKnownTrustAnchor: timestamp.tsaPathStatus === "PASS",
          },
          timestamp.tsaPathStatus ?? "NOT_EVALUATED",
          index,
        )
      : null,
    trustedTime: timestamp.trustedTime ?? false,
    usableAsProofOfExistence: timestamp.usableAsProofOfExistence ?? false,
    issues: resolveIssues(timestamp.issueIds, index),
  };
}

function formatAccuracy(accuracy: TimestampV6["accuracy"]): string | null {
  if (!accuracy) return null;
  const parts: string[] = [];
  if (accuracy.seconds) parts.push(`${accuracy.seconds}s`);
  if (accuracy.milliseconds) parts.push(`${accuracy.milliseconds}ms`);
  if (accuracy.microseconds) parts.push(`${accuracy.microseconds}µs`);
  return parts.length > 0 ? parts.join(" ") : null;
}

function adaptRevocation(
  signature: SignatureV6,
  index: ReportIndex,
): SignatureRevocation | null {
  const revocation = signature.revocation;
  if (!revocation) return null;

  return {
    status: revocation.overall,
    certificates: (revocation.certificateResults ?? []).map((result) => {
      const cert = result.certificateId ? index.certById.get(result.certificateId) : undefined;

      return {
        certificateId: result.certificateId ?? null,
        subject: cert?.subject?.commonName ?? cert?.subject?.dn ?? result.certificateId ?? "",
        serialNumberHex: cert?.serialNumberHex ?? "",
        status: result.status,
        certificateStatus: result.certificateStatus ?? null,
        reason: result.reason ?? null,
        blockedByCheckIds: result.blockedByCheckIds ?? [],
        onlineLookupAttempted: result.onlineLookupAttempted ?? false,
        revocationTime: result.revocationTime ?? null,
        evidence: (result.embeddedEvidenceIds ?? [])
          .map((id) => index.evidenceById.get(id))
          .filter((evidence): evidence is RevocationEvidenceV6 => Boolean(evidence)),
      };
    }),
  };
}

/**
 * Manifest tham chiếu. PDF dùng `byteRange` nên nhánh này rỗng; XML/OOXML dùng
 * `references[]`. Rẽ theo `scope.type`, đừng đoán từ `document.format`.
 */
function adaptReferences(scope: ScopeV6 | undefined): SignatureReference[] {
  return (scope?.references ?? []).map((reference, i) => ({
    index: i,
    uri: reference.uri ?? "",
    type: reference.type ?? null,
    digestAlgorithm: reference.digest?.algorithm ?? "",
    digestValue: reference.digest?.computedValue ?? reference.digest?.declaredValue ?? "",
    matched: reference.digest?.matched ?? null,
    external: reference.resolution?.external ?? false,
    duplicateIdDetected: reference.resolution?.duplicateIdDetected ?? false,
  }));
}

function adaptSignature(signature: SignatureV6, index: ReportIndex): VerificationSignature {
  const { selected, candidates } = adaptCertificateChains(signature, index);
  const crypto = signature.cryptography;
  const signerCertId =
    signature.signerIdentity?.signingCertificateId ??
    signature.certificateValidation?.signingCertificateId;
  const signerCert = signerCertId ? index.certById.get(signerCertId) : undefined;
  const timestamps = (signature.timestamps ?? []).map((ts) => adaptTimestamp(ts, index));

  // `claimedProperties.pdfSignerName` là lời khai của PDF (`/Name` trong dictionary
  // chữ ký), KHÔNG được mật mã bảo vệ — schema 6 tách hẳn nó khỏi danh tính đã xác
  // thực để không ai lỡ hiển thị một cái tên tự khai như thể đã được xác minh.
  const displayName = signature.signerIdentity?.displayName ?? signerCert?.subject?.commonName;
  const distinguishedName =
    signature.signerIdentity?.distinguishedName ?? signerCert?.subject?.dn ?? "";

  return {
    signatureId: signature.signatureId,
    index: signature.index,
    kind: signature.kind ?? "UNKNOWN",
    status: statusOf(signature.validation.etsi.mainIndication),
    mainIndication: signature.validation.etsi.mainIndication,
    subIndications: signature.validation.etsi.subIndications ?? [],
    standard: normalizeStandard(signature.standard),
    packaging: signature.packaging ?? null,
    baselineLevel: signature.profile?.detected ?? signature.profile?.claimed ?? null,
    achievedBaselineLevel: signature.profile?.achieved ?? null,
    missingForNextLevel: signature.profile?.missingForNextLevel ?? [],
    relation: signature.relation ?? null,
    signingTime:
      signature.timeValidation?.bestSignatureTime ??
      signature.claimedProperties?.signingTime?.value ??
      signature.timeValidation?.claimedSigningTime ??
      null,
    signingTimeTrusted:
      signature.claimedProperties?.signingTime?.independentlyTrusted ??
      timestamps.some((ts) => ts.trustedTime),
    signer: displayName
      ? {
          commonName: displayName,
          distinguishedName,
          organization: signature.signerIdentity?.organization ?? null,
          country: signature.signerIdentity?.country ?? null,
        }
      : null,
    validation: {
      cryptographicIntegrity: signature.validation.cryptographicIntegrity ?? null,
      signedScope: signature.validation.signedScope ?? null,
      certificatePath: signature.validation.certificatePath ?? null,
      revocation: signature.validation.revocation ?? null,
      trustedTime: signature.validation.trustedTime ?? null,
      signaturePolicy: signature.validation.signaturePolicy ?? null,
      longTermValidation: signature.validation.longTermValidation ?? null,
    },
    digest: {
      algorithm: crypto?.contentDigest?.algorithm ?? "",
      value: crypto?.contentDigest?.computedValue ?? crypto?.contentDigest?.declaredValue ?? "",
      matched: crypto?.contentDigest?.matched ?? null,
    },
    signatureAlgorithm: {
      name: crypto?.signatureValue?.algorithm ?? "",
      oid: crypto?.signatureValue?.oid ?? "",
      keyAlgorithm: crypto?.key?.algorithm ?? "",
      keySize: crypto?.key?.size ?? null,
    },
    canonicalizationMethod: crypto?.container?.canonicalizationMethod ?? null,
    certificateChain: selected,
    candidatePaths: candidates,
    revocation: adaptRevocation(signature, index),
    timestamps,
    references: adaptReferences(signature.scope),
    scope: signature.scope
      ? {
          type: signature.scope.type ?? null,
          byteRange: signature.scope.byteRange ?? null,
          coversWholeSignedRevision: signature.scope.coversWholeSignedRevision ?? null,
          coversCurrentDocument: signature.scope.coversCurrentDocument ?? null,
          unsignedTrailingBytes: signature.scope.unsignedTrailingBytes ?? null,
          signedRevisionNumber: signature.scope.signedRevisionNumber ?? null,
          signatureElementPath: signature.scope.signatureElementPath ?? null,
          allRequiredBusinessObjectsCovered:
            signature.scope.allRequiredBusinessObjectsCovered ?? null,
          wrappingAttackIndicators: signature.scope.wrappingAttackIndicators ?? [],
        }
      : null,
    longTermValidation: signature.longTermValidation ?? null,
    modificationsAfterSigning: signature.modificationsAfterSigning ?? null,
    checks: (signature.checks ?? []).map((check) => ({
      checkId: check.checkId,
      type: check.type ?? null,
      outcome: check.outcome,
      component: check.component ?? null,
      expected: check.expected ?? null,
      actual: check.actual ?? null,
      blockedByCheckIds: check.blockedByCheckIds ?? [],
      issues: resolveIssues(check.issueIds, index),
    })),
    issues: resolveIssues(signature.issueIds, index),
    remediations: (signature.remediationIds ?? [])
      .map((id) => index.remedById.get(id))
      .filter((remediation): remediation is RemediationV6 => Boolean(remediation))
      .map(adaptRemediation),
  };
}

function normalizeStandard(standard: string | undefined): RealSignatureStandard {
  if (!standard) return "UNKNOWN" as RealSignatureStandard;
  return standard.toUpperCase() as RealSignatureStandard;
}

/**
 * Loại tệp để hiển thị. `detectedType` chỉ nói tới mức "OOXML"; đuôi tệp khai báo
 * là thứ duy nhất phân biệt được DOCX với XLSX, nên ưu tiên nó ở nhánh đó.
 */
function contentTypeOf(document: DocumentInfoV6): VerificationContentType {
  const detected = document.format?.detectedType;
  const extension = document.format?.declaredExtension?.replace(/^\./, "").toUpperCase();

  if (detected === "OOXML" && (extension === "DOCX" || extension === "XLSX" || extension === "PPTX")) {
    return extension;
  }

  return detected ?? "UNKNOWN";
}

function primaryHash(document: DocumentInfoV6): string {
  const hashes = document.hashes ?? [];
  const sha256 = hashes.find((hash) => hash.algorithm?.toUpperCase().replace("-", "") === "SHA256");
  return sha256?.value ?? hashes[0]?.value ?? "";
}

/** Chuyển báo cáo schema 6.x thành view model. */
export function adaptV6ReportToView(report: VerificationReportV6): VerificationReport {
  checkSchemaVersionCompatible(report?.schemaVersion);

  const data = report.data;
  const index = indexReport(data);
  const summary = data.summary;
  const inventory = data.document.signatureInventory;

  const signatures = (data.signatures ?? []).map((signature) => adaptSignature(signature, index));
  const issues = (data.issues ?? []).map(adaptIssue);

  // Backend đã đếm sẵn. Đếm lại từ danh sách chỉ khi khối thống kê khuyết — và khi
  // đó vẫn phải giữ `cryptographicallyValid` tách khỏi `totalPassed`.
  const stats = summary.signatureStatistics ?? {
    detected: inventory?.signaturesDetected ?? signatures.length,
    processed: inventory?.processed ?? signatures.length,
    cryptographicallyValid: signatures.filter(
      (s) => s.validation.cryptographicIntegrity === "PASS",
    ).length,
    totalPassed: signatures.filter((s) => s.mainIndication === "TOTAL_PASSED").length,
    totalFailed: signatures.filter((s) => s.mainIndication === "TOTAL_FAILED").length,
    indeterminate: signatures.filter((s) => s.mainIndication === "INDETERMINATE").length,
    notProcessed: Math.max(0, (inventory?.signaturesDetected ?? 0) - (inventory?.processed ?? 0)),
  };

  // `rootIssueIds` đã lọc bỏ INFO ở backend; lọc lại ở đây để một bản minor thêm
  // mã mới không làm màn tổng quan đầy tiếng ồn.
  const rootIssues = (summary.rootIssueIds ?? [])
    .map((id) => index.issueById.get(id))
    .filter((issue): issue is IssueV6 => Boolean(issue) && issue!.severity !== "INFO")
    .map(adaptIssue);

  return {
    schemaVersion: report.schemaVersion,
    status: statusOf(summary.etsi.mainIndication),
    mainIndication: summary.etsi.mainIndication,
    subIndications: summary.etsi.subIndications ?? [],
    completeness: summary.validationCompleteness ?? null,
    contentType: contentTypeOf(data.document),
    fileName: data.document.fileName ?? "",
    fileSize: data.document.fileSize,
    sha256: primaryHash(data.document),
    signatureStatistics: stats,
    documentState: summary.documentState ?? null,
    verifiedAt: report.run.verifiedAt,
    durationMs: report.run.durationMs ?? null,
    runId: report.run.runId,
    engine: report.run.engine,
    policy: data.validationContext?.policy ?? null,
    trustDomain: {
      signer: data.validationContext?.trustDomain?.signer ?? null,
      tsa: data.validationContext?.trustDomain?.tsa ?? null,
    },
    network: data.validationContext?.network ?? null,
    referenceTime: data.validationContext?.referenceTime ?? null,
    signatures,
    issues,
    rootIssues,
    remediations: (data.remediations ?? []).map(adaptRemediation),
    revisions: data.revisions ?? [],
  };
}
