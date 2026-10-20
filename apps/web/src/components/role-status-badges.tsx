import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Role, UserStatus } from "@/types/api";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Quản trị",
  lecturer: "Giảng viên",
  student: "Sinh viên",
};

const ROLE_CLASS: Record<Role, string> = {
  admin: "bg-primary text-primary-foreground border-transparent",
  lecturer: "border-primary/40 text-primary",
  student: "bg-muted text-muted-foreground border-transparent",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant="outline" className={cn("cursor-default", ROLE_CLASS[role])}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}

export function RoleLabels() {
  return ROLE_LABELS;
}

export function StatusBadge({ status }: { status: UserStatus }) {
  return status === "active" ? (
    <Badge variant="outline" className="cursor-default border-success/40 text-success">
      Hoạt động
    </Badge>
  ) : (
    <Badge variant="outline" className="cursor-default border-destructive/40 text-destructive">
      Đã khóa
    </Badge>
  );
}

export { ROLE_LABELS };
