import { Badge } from "@/components/ui/badge";
import type { Role, UserStatus } from "@/types/api";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Quản trị",
  lecturer: "Giảng viên",
  student: "Sinh viên",
};

/** DESIGN.md §6 — vai trò: Admin đen đặc, Giảng viên viền, Sinh viên muted. */
const ROLE_VARIANT = { admin: "solid", lecturer: "outline", student: "secondary" } as const;

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={ROLE_VARIANT[role]}>{ROLE_LABELS[role]}</Badge>;
}

export function RoleLabels() {
  return ROLE_LABELS;
}

export function StatusBadge({ status }: { status: UserStatus }) {
  return status === "active" ? (
    <Badge variant="success">Hoạt động</Badge>
  ) : (
    <Badge variant="destructive">Đã khóa</Badge>
  );
}

export { ROLE_LABELS };
