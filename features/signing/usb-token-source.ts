import type { SignCapabilities, SignatureSource } from "@/lib/types/signing";
import { describeAlgorithm, type AlgorithmCatalog } from "./signature-algorithm";

/**
 * Nguồn "FPT USB Token" do CLIENT khai, không đến từ `GET /capabilities`.
 *
 * Vì sao phải phá lệ ở đúng chỗ này: `/capabilities` mô tả các nguồn của
 * `POST /sign`, mà luồng USB Token KHÔNG đi qua `/sign` — nó là cặp endpoint
 * riêng `/usb-token/signing-jobs` → `.../complete`, cộng thêm một agent chạy
 * trên máy người ký. Backend hiện không liệt kê nó ở đâu cả, nên hoặc khai ở
 * đây, hoặc màn hình không có cách nào hiện lựa chọn này.
 *
 * Hệ quả phải chấp nhận: mọi con số dưới đây là ĐƯỢC CHÉP TAY từ hợp đồng API,
 * không phải đọc từ dịch vụ. Backend đổi ràng buộc mà quên sửa file này thì lỗi
 * chỉ lộ ra lúc gọi thật. Ngày `/capabilities` khai nguồn này, `mergeUsbTokenSource`
 * tự nhường chỗ cho bản của backend.
 */
export const USB_TOKEN_SOURCE_ID = "USB_TOKEN";

/**
 * Backend chuẩn bị được job USB Token cho cả 9 thuật toán, nhưng FPT-CA Signing
 * Agent 1.3.1 thì không: `/SignHash` chỉ có tham số `algDigest` (hàm băm), còn
 * scheme ký là PKCS#1 v1.5 cố định — nó gọi `RSACryptoServiceProvider.SignHash`.
 * KHÔNG có trường nào để yêu cầu PSS hay ECDSA.
 *
 * Chọn PSS ở luồng này là hỏng câm: backend khai `RSASSA-PSS` trong CMS, agent
 * ký PKCS#1, và bước complete trả `422 USB_TOKEN_SIGNATURE_INVALID`. Chữ ký sai
 * không bị nhét vào PDF — hỏng ở đây là hỏng an toàn — nhưng người dùng vẫn
 * không ký được và không có gì trên màn hình giải thích tại sao.
 *
 * Nên dropdown của riêng luồng này bị giới hạn còn 3 lựa chọn PKCS#1. Ngày lên
 * bản agent có tham số chọn scheme: nới mảng này, và nối
 * `job.jcaSignatureAlgorithm` xuống `signHash()` — hai chỗ, đã đánh dấu sẵn.
 */
export const USB_TOKEN_AGENT_SCHEMES = ["RSA_PKCS1_V1_5"] as const;

export const USB_TOKEN_ALGORITHMS = [
  "RSA_PKCS1_SHA256",
  "RSA_PKCS1_SHA384",
  "RSA_PKCS1_SHA512",
];

export const USB_TOKEN_SOURCE: SignatureSource = {
  id: USB_TOKEN_SOURCE_ID,
  materialMode: "USB_TOKEN",
  vendor: null,
  label: "FPT USB Token (FPT-CA Signing Agent)",
  // Chỉ PDF: endpoint tạo job dựng digest theo container PAdES.
  documentFormats: ["PDF"],
  algorithms: USB_TOKEN_ALGORITHMS,
  defaultAlgorithm: "RSA_PKCS1_SHA256",
  algorithmsByFormat: { PDF: USB_TOKEN_ALGORITHMS },
  defaultAlgorithmByFormat: { PDF: "RSA_PKCS1_SHA256" },
  baselineLevels: ["B", "T"],
  signatureModes: ["CO_SIGN", "COUNTER_SIGN"],
  visibleSignature: true,
  requiresUploadedKeyFile: false,
  requiresCredentialSelection: false,
  // PDF được dựng TRƯỚC khi người dùng chọn chứng thư nên chưa có CN để lấy tên.
  requiresSignerDisplayName: true,
  requiresEnrollment: false,
  interactionModel: "LOCAL_AGENT",
  // Job hết hạn sau 15 phút — cùng mốc với đồng hồ đếm ngược trong hộp thoại ký.
  expectedWaitSeconds: 900,
};

export function isUsbTokenSource(source?: SignatureSource): boolean {
  return source?.materialMode === "USB_TOKEN";
}

/** Agent hiện tại ký được scheme của thuật toán này không. */
export function agentCanSign(algorithm: string, catalog?: AlgorithmCatalog): boolean {
  const scheme = describeAlgorithm(algorithm, catalog).scheme;
  return (USB_TOKEN_AGENT_SCHEMES as readonly string[]).includes(scheme);
}

/**
 * Cắt danh sách thuật toán của một nguồn USB Token xuống phần agent ký được.
 *
 * Chạy cả với nguồn do backend khai: backend nói đúng về việc NÓ chuẩn bị được
 * job gì, nhưng nó không biết máy người ký đang chạy agent bản nào. Bày ra một
 * lựa chọn chắc chắn hỏng thì tệ hơn là giấu nó đi.
 */
function constrainToAgent(source: SignatureSource, catalog?: AlgorithmCatalog): SignatureSource {
  const keep = (ids: string[]) => ids.filter((id) => agentCanSign(id, catalog));

  const algorithms = keep(source.algorithms ?? []);
  const algorithmsByFormat = source.algorithmsByFormat
    ? Object.fromEntries(
        Object.entries(source.algorithmsByFormat).map(([format, ids]) => [format, keep(ids)]),
      )
    : undefined;

  // Mặc định của backend là PSS/SHA-256 — không còn nằm trong danh sách sau khi
  // cắt, nên phải hạ xuống phần tử đầu tiên còn lại thay vì giữ một id đã bị bỏ.
  const defaultFor = (ids: string[], preferred?: string | null) =>
    preferred && ids.includes(preferred) ? preferred : ids[0];

  return {
    ...source,
    algorithms,
    defaultAlgorithm: defaultFor(algorithms, source.defaultAlgorithm),
    ...(algorithmsByFormat ? { algorithmsByFormat } : {}),
    ...(algorithmsByFormat
      ? {
          defaultAlgorithmByFormat: Object.fromEntries(
            Object.entries(algorithmsByFormat).flatMap(([format, ids]) => {
              const chosen = defaultFor(ids, source.defaultAlgorithmByFormat?.[format]);
              return chosen ? [[format, chosen] as const] : [];
            }),
          ),
        }
      : {}),
  };
}

/**
 * Ghép nguồn USB Token vào danh sách của backend. Backend đã khai một nguồn cùng
 * id thì giữ bản của backend — nó luôn đúng hơn bản chép tay ở đây — nhưng vẫn
 * đi qua `constrainToAgent`, vì giới hạn scheme thuộc về agent chứ không thuộc
 * về dịch vụ ký.
 */
export function mergeUsbTokenSource(capabilities: SignCapabilities): SignCapabilities {
  const catalog: AlgorithmCatalog = new Map(
    (capabilities.algorithmCatalog ?? []).map((item) => [item.id, item]),
  );

  const declaredIndex = capabilities.sources.findIndex(
    (source) => source.id === USB_TOKEN_SOURCE_ID || source.materialMode === "USB_TOKEN",
  );

  if (declaredIndex >= 0) {
    const sources = [...capabilities.sources];
    sources[declaredIndex] = constrainToAgent(sources[declaredIndex], catalog);
    return { ...capabilities, sources };
  }

  return {
    ...capabilities,
    sources: [...capabilities.sources, constrainToAgent(USB_TOKEN_SOURCE, catalog)],
  };
}
