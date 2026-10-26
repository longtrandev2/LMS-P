import { Eye, MoreHorizontal, Pencil, KeyRound, Lock, LockOpen } from "lucide-react";
import { useState } from "react";
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
import type { User } from "@/types/api";
import { UserDetailsDialog } from "@/features/users/user-details-dialog";
import { UserLockDialog } from "@/features/users/user-lock-dialog";

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
  const [lockingUser, setLockingUser] = useState<User | null>(null);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Người dùng</TableHead>
          <TableHead className="hidden md:table-cell">Mã SV</TableHead>
          <TableHead>Vai trò</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="hidden lg:table-cell">Ngày tạo</TableHead>
          <TableHead className="w-px">
            <span className="sr-only">Thao tác</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <p className="font-medium">{user.full_name}</p>
              <p className="max-w-56 truncate text-xs text-muted-foreground">{user.email}</p>
            </TableCell>
            <TableCell className="hidden font-mono text-xs md:table-cell">
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
            <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
              {formatDate(user.created_at)}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${user.full_name}`}>
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDetailsUser(user)}><Eye aria-hidden /> Xem chi tiết</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(user)}>
                    <Pencil aria-hidden /> Chỉnh sửa
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onResetPassword(user)}>
                    <KeyRound aria-hidden /> Đặt lại mật khẩu
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setLockingUser(user)}
                    variant={user.status === "active" ? "destructive" : "default"}
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
    <UserLockDialog user={lockingUser} onOpenChange={(open) => !open && setLockingUser(null)} onDone={onChanged} />
    <UserDetailsDialog user={detailsUser} onOpenChange={(open) => !open && setDetailsUser(null)} />
    </>
  );
}
