import type { DirectoryUser } from "./model";

/**
 * Danh bạ người ký của bản dựng giao diện.
 *
 * Dịch vụ ký đang test không có xác thực nên cũng không có danh bạ — màn hình
 * thật sẽ đọc từ endpoint quản lý tài khoản. Dữ liệu ở đây tồn tại để phần kéo
 * thả có thứ để kéo, và cố ý đủ đa dạng để lộ ra các ca trình bày dễ vỡ: tên
 * dài, hai người trùng họ tên viết tắt, phòng ban dài hơn ô chứa.
 */
export const DIRECTORY: readonly DirectoryUser[] = [
  {
    id: "u-01",
    name: "Nguyễn Thị Minh Khai",
    email: "khai.ntm@sigil.vn",
    department: "Ban Tài chính",
    credential: "MPKI · CN=Nguyen Thi Minh Khai",
  },
  {
    id: "u-02",
    name: "Trần Quốc Bảo",
    email: "bao.tq@sigil.vn",
    department: "Phòng Pháp chế",
    credential: "eSign Cloud · CN=Tran Quoc Bao",
  },
  {
    id: "u-03",
    name: "Lê Hoàng Anh",
    email: "anh.lh@sigil.vn",
    department: "Phòng Kế toán",
    credential: "USB Token · CN=Le Hoang Anh",
  },
  {
    id: "u-04",
    name: "Phạm Thu Hà",
    email: "ha.pt@sigil.vn",
    department: "Ban Kiểm soát nội bộ",
    credential: "MPKI · CN=Pham Thu Ha",
  },
  {
    id: "u-05",
    name: "Đỗ Nhật Trường",
    email: "truong.dn@sigil.vn",
    department: "Khối Công nghệ",
    credential: "eSign Cloud · CN=Do Nhat Truong",
  },
  {
    id: "u-06",
    name: "Vũ Khánh Linh",
    email: "linh.vk@sigil.vn",
    department: "Phòng Nhân sự",
    credential: "MPKI · CN=Vu Khanh Linh",
  },
  {
    id: "u-07",
    name: "Hoàng Minh Đức",
    email: "duc.hm@sigil.vn",
    department: "Ban Tổng giám đốc",
    credential: "USB Token · CN=Hoang Minh Duc",
  },
  {
    id: "u-08",
    name: "Bùi Diệu Linh",
    email: "linh.bd@sigil.vn",
    department: "Phòng Mua sắm",
    credential: "MPKI · CN=Bui Dieu Linh",
  },
];

/**
 * Chữ viết tắt cho avatar. Lấy hai âm tiết CUỐI chứ không phải hai âm tiết đầu:
 * tên Việt đặt họ trước, và "Nguyễn Thị" thì viết tắt thành "NT" cho cả nửa
 * công ty.
 */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Màu avatar suy từ chính chuỗi định danh nên nó ổn định qua mỗi lần render và
 * qua cả reload — người dùng nhận ra một người bằng vệt màu trước khi kịp đọc
 * tên. Sáu tông đủ tách bạch trên cả nền sáng lẫn nền tối.
 */
const AVATAR_TONES = [
  "bg-accent-subtle text-accent",
  "bg-success-subtle text-success",
  "bg-warning-subtle text-warning",
  "bg-danger-subtle text-danger",
  "bg-inset text-fg-muted",
  "bg-accent-subtle text-accent",
] as const;

export function avatarTone(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function searchDirectory(query: string): DirectoryUser[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...DIRECTORY];
  return DIRECTORY.filter((user) =>
    `${user.name} ${user.email} ${user.department}`.toLowerCase().includes(needle),
  );
}
