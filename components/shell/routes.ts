import type { ComponentType, SVGProps } from "react";
import { PenLineIcon, SendIcon, ShieldCheckIcon } from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

/**
 * Ba màn con của bàn thử, đứng ngang hàng nhau dưới `/`.
 *
 * Một chỗ khai báo duy nhất cho cả thanh tab (`ScreenNav`) lẫn bảng điều hướng ở
 * `/`: hai nơi cùng liệt kê ba màn này, và để chúng tự khai báo riêng thì thêm
 * màn thứ tư sẽ sửa được một nơi mà quên nơi kia.
 *
 * `key` trỏ vào `t.routes` chứ không mang sẵn nhãn — nhãn phụ thuộc ngôn ngữ
 * đang chọn, thứ chỉ biết được lúc render.
 */
export type ScreenRoute = {
  href: string;
  key: keyof Pick<Dictionary["routes"], "sign" | "signRequest" | "verify">;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
};

export const SCREEN_ROUTES: readonly ScreenRoute[] = [
  { href: "/sign", key: "sign", icon: PenLineIcon },
  { href: "/sign-request", key: "signRequest", icon: SendIcon },
  { href: "/verify", key: "verify", icon: ShieldCheckIcon },
];
