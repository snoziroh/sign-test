import type {
  AlgorithmDescriptor,
  DocumentFormat,
  SignCapabilities,
  SignatureScheme,
  SignatureSource,
} from "@/lib/types/signing";

/**
 * Nguồn sự thật cho mọi chỗ hiển thị hay kiểm thuật toán ký.
 *
 * Hai luật của file này, và cả hai đều là ca hỏng chắc chắn xảy ra nếu vi phạm:
 *
 * 1. Danh sách chọn được dựng từ `source.algorithmsByFormat[format]`, KHÔNG từ
 *    `source.algorithms`. Trường sau là HỢP của mọi định dạng — với PKCS12 nó là
 *    cả 9 — nên dựng dropdown từ nó cho phép chọn `RSA_PSS_SHA256` với file
 *    `.docx`, và server trả `422 ALGORITHM_NOT_SUPPORTED`. OOXML chỉ chở được
 *    3 × PKCS#1 vì ECMA-376 Part 2 chỉ định nghĩa RSA cho chữ ký gói.
 *
 * 2. Nhãn lấy từ `capabilities.algorithmCatalog[].label`. Bảng nhãn hardcode ở
 *    client lệch pha ngay lần backend thêm thuật toán tiếp theo, và lệch theo
 *    kiểu tệ nhất: người dùng thấy một tên, file ký ra mang một thuật toán khác.
 *
 * `deriveDescriptor` tồn tại CHỈ để màn hình không trắng khi gọi một backend đời
 * cũ chưa trả `algorithmCatalog`. Nó suy từ chính id nên không bao giờ mâu thuẫn
 * với id — nhưng nó cũng không biết gì về thuật toán backend mới thêm, nên nhãn
 * thật vẫn phải đến từ catalog.
 */

/** Thứ tự nhóm khi backend không nói gì khác: PSS → PKCS#1 → ECDSA. */
export const SCHEME_ORDER: readonly SignatureScheme[] = [
  "RSASSA_PSS",
  "RSA_PKCS1_V1_5",
  "ECDSA",
];

export type AlgorithmCatalog = ReadonlyMap<string, AlgorithmDescriptor>;

export function buildAlgorithmCatalog(capabilities?: SignCapabilities): AlgorithmCatalog {
  return new Map((capabilities?.algorithmCatalog ?? []).map((item) => [item.id, item]));
}

/**
 * Đường ưu tiên của id trong `algorithmsByFormat` khi backend đời cũ không gửi
 * catalog. Chỉ đọc được 9 id hiện có; id lạ rơi về nhánh cuối và giữ nguyên văn.
 */
function deriveDescriptor(id: string): AlgorithmDescriptor {
  const digest = /SHA(256|384|512)$/.exec(id)?.[1];
  const digestAlgorithm = digest ? `SHA-${digest}` : id;

  if (id.startsWith("RSA_PSS_") && digest) {
    return {
      id,
      label: `RSA-PSS/${digestAlgorithm}`,
      scheme: "RSASSA_PSS",
      keyAlgorithm: "RSA",
      namedCurve: null,
      digestAlgorithm,
    };
  }
  if (id.startsWith("RSA_PKCS1_") && digest) {
    return {
      id,
      label: `RSA PKCS#1 v1.5/${digestAlgorithm}`,
      scheme: "RSA_PKCS1_V1_5",
      keyAlgorithm: "RSA",
      namedCurve: null,
      digestAlgorithm,
    };
  }
  if (id.startsWith("ECDSA_") && digest) {
    // P-521 đi với SHA-512 — KHÔNG phải P-512; sai chỗ này là hiện một đường
    // cong không tồn tại.
    const namedCurve = digest === "512" ? "P-521" : `P-${digest}`;
    return {
      id,
      label: `ECDSA/${digestAlgorithm} (${namedCurve})`,
      scheme: "ECDSA",
      keyAlgorithm: "EC",
      namedCurve,
      digestAlgorithm,
    };
  }

  /*
    Thuật toán backend mới thêm mà bản client này chưa biết. Nhãn giữ nguyên id
    — thà thô còn hơn sai. `scheme`/`keyAlgorithm` thì buộc phải điền gì đó, và
    RSA/PKCS#1 là lựa chọn ÍT hại nhất: nó gom id lạ vào nhóm "tương thích rộng
    nhất" và KHÔNG dán nhãn "cần chứng thư khoá EC" lên một thuật toán có thể
    dùng khoá RSA — cảnh báo sai chỗ đó sẽ đuổi người dùng khỏi một lựa chọn
    đúng. Chỉ chạy khi backend chưa trả `algorithmCatalog`; có catalog thì nhánh
    này không bao giờ tới.
  */
  return {
    id,
    label: id,
    scheme: "RSA_PKCS1_V1_5",
    keyAlgorithm: "RSA",
    namedCurve: null,
    digestAlgorithm,
  };
}

export function describeAlgorithm(id: string, catalog?: AlgorithmCatalog): AlgorithmDescriptor {
  return catalog?.get(id) ?? deriveDescriptor(id);
}

export function algorithmLabel(id: string, catalog?: AlgorithmCatalog): string {
  if (!id) return "—";
  return describeAlgorithm(id, catalog).label;
}

/**
 * Thuật toán dùng được của cặp (nguồn, định dạng), theo đúng thứ tự backend trả.
 *
 * Chưa biết định dạng (chưa chọn tệp) thì rơi về `algorithms` — đó là lúc duy
 * nhất trường hợp-hợp ấy có nghĩa. Biết định dạng mà nó không có trong
 * `algorithmsByFormat` nghĩa là nguồn KHÔNG ký được định dạng đó: trả mảng rỗng
 * chứ không âm thầm rơi về danh sách rộng hơn.
 */
export function algorithmsFor(source: SignatureSource, format?: DocumentFormat): string[] {
  const byFormat = source.algorithmsByFormat;
  if (format && byFormat) return byFormat[format] ?? [];
  return source.algorithms ?? [];
}

/**
 * Giá trị chọn sẵn. Ba mức, giảm dần độ chính xác: mặc định theo định dạng →
 * mặc định chung của nguồn (chỉ khi nó còn hợp lệ với định dạng này) → phần tử
 * đầu tiên, vốn là mặc định của backend theo tài liệu.
 */
export function defaultAlgorithmFor(
  source: SignatureSource,
  format?: DocumentFormat,
): string | undefined {
  const allowed = algorithmsFor(source, format);
  const scoped = format ? source.defaultAlgorithmByFormat?.[format] : undefined;
  if (scoped && allowed.includes(scoped)) return scoped;
  if (source.defaultAlgorithm && allowed.includes(source.defaultAlgorithm)) {
    return source.defaultAlgorithm;
  }
  return allowed[0];
}

/**
 * Lựa chọn hiện tại còn dùng được với định dạng này không, và nếu không thì
 * dùng gì. Trả `undefined` khi không phải đổi — người gọi dựa vào đó để không
 * ghi đè lựa chọn người dùng vừa đặt.
 */
export function reselectAlgorithm(
  source: SignatureSource,
  format: DocumentFormat | undefined,
  current: string,
): string | undefined {
  const allowed = algorithmsFor(source, format);
  if (current && allowed.includes(current)) return undefined;
  const next = defaultAlgorithmFor(source, format);
  return next && next !== current ? next : undefined;
}

export interface AlgorithmGroup {
  scheme: SignatureScheme;
  options: AlgorithmDescriptor[];
}

/**
 * Gom theo `scheme` để dropdown đọc được, GIỮ NGUYÊN thứ tự backend trả: nhóm
 * xuất hiện theo lần gặp đầu tiên, và các phần tử trong nhóm giữ thứ tự gốc.
 * Sắp xếp lại là phá thứ tự ưu tiên mà backend đã cân nhắc.
 */
export function groupAlgorithms(ids: string[], catalog?: AlgorithmCatalog): AlgorithmGroup[] {
  const groups: AlgorithmGroup[] = [];
  const index = new Map<SignatureScheme, AlgorithmGroup>();

  for (const id of ids) {
    const descriptor = describeAlgorithm(id, catalog);
    let group = index.get(descriptor.scheme);
    if (!group) {
      group = { scheme: descriptor.scheme, options: [] };
      index.set(descriptor.scheme, group);
      groups.push(group);
    }
    group.options.push(descriptor);
  }

  return groups;
}

/**
 * Nhóm ECDSA cần chứng thư khoá EC, và điều đó KHÔNG lọc trước được: backend
 * chỉ biết một file `.p12` chứa khoá gì sau khi mở nó bằng mật khẩu — tức là sau
 * khi người dùng đã bấm Ký. Tương tự với credential MPKI và với USB token. Nên
 * cả 9 lựa chọn vẫn hiện, kèm ghi chú, và luồng UX dựa vào mã lỗi
 * `ALGORITHM_KEY_TYPE_MISMATCH` để hướng dẫn.
 */
export function requiresEcKey(id: string, catalog?: AlgorithmCatalog): boolean {
  return describeAlgorithm(id, catalog).keyAlgorithm === "EC";
}
