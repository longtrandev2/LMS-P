import { Eye, MoreHorizontal, Pencil, KeyRound, Lock, LockOpen, MonitorSmartphone } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, StatusBadge } from "@/components/role-status-badges";
import { formatUtcDateTime } from "@/lib/date-time";
import type { User } from "@/types/api";
import { formatRelativeTime } from "@/features/notifications/relative-time";
import { UserIdentity } from "@/features/users/user-avatar";
import { UserDetailsDialog } from "@/features/users/user-details-dialog";
import { UserLockDialog } from "@/features/users/user-lock-dialog";
import { UserSessionsSheet } from "@/features/users/user-sessions-sheet";

interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onChanged: () => void;
}

function LastLogin({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground/70">Chưa đăng nhập</span>;
  return <time dateTime={value} title={formatUtcDateTime(value)}>{formatRelativeTime(value)}</time>;
}

export function UsersTable({ users, onEdit, onResetPassword, onChanged }: UsersTableProps) {
  const [lockingUser, setLockingUser] = useState<User | null>(null);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const [sessionsUser, setSessionsUser] = useState<User | null>(null);

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Người dùng</TableHead>
          <TableHead className="hidden md:table-cell">Mã SV</TableHead>
          <TableHead className="hidden sm:table-cell">Vai trò</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="hidden lg:table-cell">Đăng nhập cuối</TableHead>
          <TableHead className="w-px">
            <span className="sr-only">Thao tác</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id} className="hover:bg-secondary/60">
            <TableCell className="h-14">
              <UserIdentity name={user.full_name} email={user.email} />
            </TableCell>
            <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
              {user.student_code ?? "—"}
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <span className="flex flex-wrap gap-1">
                {user.roles.map((role) => (
                  <Badge key={role}>{ROLE_LABELS[role]}</Badge>
                ))}
              </span>
            </TableCell>
            <TableCell>
              <StatusBadge status={user.status} />
            </TableCell>
            <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
              <LastLogin value={user.last_login_at} />
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Thao tác với ${user.full_name}`}>
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
                  <DropdownMenuItem onClick={() => setSessionsUser(user)}>
                    <MonitorSmartphone aria-hidden /> Phiên đăng nhập
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
    <UserSessionsSheet user={sessionsUser} onOpenChange={(open) => !open && setSessionsUser(null)} />
    </>
  );
}
