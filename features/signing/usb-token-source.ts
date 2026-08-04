import type { SignCapabilities, SignatureSource } from "@/lib/types/signing";

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

export const USB_TOKEN_SOURCE: SignatureSource = {
  id: USB_TOKEN_SOURCE_ID,
  materialMode: "USB_TOKEN",
  vendor: null,
  label: "FPT USB Token (FPT-CA Signing Agent)",
  // Chỉ PDF: endpoint tạo job dựng digest theo container PAdES.
  documentFormats: ["PDF"],
  // Agent ký bằng RSACryptoServiceProvider.SignHash → PKCS#1 v1.5, và backend
  // dựng digest SHA-256. Không có lựa chọn nào khác để bày ra.
  algorithms: ["RSA_PKCS1_SHA256"],
  defaultAlgorithm: "RSA_PKCS1_SHA256",
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

/**
 * Ghép nguồn USB Token vào danh sách của backend. Backend đã khai một nguồn cùng
 * id thì giữ bản của backend — nó luôn đúng hơn bản chép tay ở đây.
 */
export function mergeUsbTokenSource(capabilities: SignCapabilities): SignCapabilities {
  const declared = capabilities.sources.some(
    (source) => source.id === USB_TOKEN_SOURCE_ID || source.materialMode === "USB_TOKEN",
  );
  if (declared) return capabilities;
  return { ...capabilities, sources: [...capabilities.sources, USB_TOKEN_SOURCE] };
}
