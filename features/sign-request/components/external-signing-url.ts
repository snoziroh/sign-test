const EXTERNAL_SIGN_PATH = "/external-sign";

/**
 * Dựng URL public signing từ token backend trả về.
 *
 * Local:
 * http://localhost:3000/external-sign#t=<token>
 *
 * Production:
 * https://fptca.click/external-sign#t=<token>
 */
export function buildExternalSigningUrl(value: string): string {
  const raw = value.trim();

  if (!raw) return "";

  const token = extractExternalSigningToken(raw);

  if (!token) {
    return raw;
  }

  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_FRONTEND_BASE_URL
      ?.trim()
      .replace(/\/+$/, "");

  const browserOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : "";

  const baseUrl = configuredBaseUrl || browserOrigin;

  const relativeUrl =
    `${EXTERNAL_SIGN_PATH}#t=${encodeURIComponent(token)}`;

  return baseUrl
    ? `${baseUrl}${relativeUrl}`
    : relativeUrl;
}

function extractExternalSigningToken(
  value: string,
): string | undefined {
  /*
   * Hỗ trợ trường hợp backend cũ đã trả URL đầy đủ:
   *
   * https://abc.com/external-sign#t=TOKEN
   */
  const hashIndex = value.indexOf("#");

  if (hashIndex >= 0) {
    const hash = value.slice(hashIndex + 1);

    const token =
      new URLSearchParams(hash)
        .get("t")
        ?.trim();

    if (token) {
      return token;
    }
  }

  /*
   * Contract hiện tại:
   *
   * {
   *   "url": "VsOuwNQc3H_..."
   * }
   *
   * Tức `url` thực chất là raw token.
   */
  if (
    !/^https?:\/\//i.test(value) &&
    !value.startsWith("/")
  ) {
    return value;
  }

  return undefined;
}