export type Phase = "idle" | "verifying" | "done" | "error";

export type VerificationView = "overview" | "advanced";

export type AdvancedSection =
  | "technical"
  | "checks"
  | "certificate"
  | "timestamp"
  | "scope"
  | "issues"
  | "raw";

export const ADVANCED_SECTIONS: AdvancedSection[] = [
  "technical",
  "checks",
  "certificate",
  "timestamp",
  "scope",
  "issues",
  "raw",
];

export const ALLOWLIST_ISSUE_CODES = new Set([
  "OCSP_URL_NOT_ALLOWED",
  "CRL_URL_NOT_ALLOWED",
  "REVOCATION_ENDPOINT_NOT_ALLOWED",
]);