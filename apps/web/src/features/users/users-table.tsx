import { MoreHorizontal, Pencil, KeyRound, Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleBadge, StatusBadge } from "@/components/role-status-badges";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { User } from "@/types/api";

interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onChanged: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function UsersTable({ users, onEdit, onResetPassword, onChanged }: UsersTableProps) {
  async function toggleStatus(user: User) {
    const action = user.status === "active" ? "khóa" : "mở";
    try {
      await api.patch(`/users/${user.id}`, {
        status: user.status === "active" ? "locked" : "active",
      });
      toast.success(`Đã ${action} tài khoản ${user.email}.`);
      onChanged();
    } catch (error) {
      toast.error(errorText(error));
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead>Người dùng</TableHead>
          <TableHead>Mã SV</TableHead>
          <TableHead>Vai trò</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Ngày tạo</TableHead>
          <TableHead className="w-12 text-right">
            <span className="sr-only">Thao tác</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <p className="font-medium">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </TableCell>
            <TableCell className="font-mono text-xs">
              {user.student_code ?? "—"}
            </TableCell>
            <TableCell>
              <span className="flex flex-wrap gap-1">
                {user.roles.map((role) => (
                  <RoleBadge key={role} role={role} />
                ))}
              </span>
            </TableCell>
            <TableCell>
              <StatusBadge status={user.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(user.created_at)}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${user.full_name}`}>
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEdit(user)}>
                    <Pencil aria-hidden /> Chỉnh sửa
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onResetPassword(user)}>
                    <KeyRound aria-hidden /> Đặt lại mật khẩu
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => toggleStatus(user)}
                    className={user.status === "active" ? "text-destructive" : "text-success"}
                  >
                    {user.status === "active" ? (
                      <>
                        <Lock aria-hidden /> Khóa tài khoản
                      </>
                    ) : (
                      <>
                        <LockOpen aria-hidden /> Mở tài khoản
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
