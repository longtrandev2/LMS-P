import type { Role } from "@/types/api";

/** Mã định danh hiển thị theo vai trò ưu tiên: quản trị viên → giảng viên → sinh viên. */
export function userCodeLabel(roles: readonly Role[]): string {
  if (roles.includes("admin")) return "Mã quản trị viên";
  if (roles.includes("lecturer")) return "Mã giảng viên";
  if (roles.includes("student")) return "Mã sinh viên";
  return "Mã người dùng";
}
