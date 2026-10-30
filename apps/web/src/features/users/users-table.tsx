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
import { cn } from "@/lib/utils";
import { usePresence } from "./use-presence";
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
  const { isOnline } = usePresence();

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
              <UserIdentity name={user.full_name} email={user.email} isOnline={isOnline(user.id)} />
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
              <div className="flex flex-col items-start gap-1">
                <StatusBadge status={user.status} />
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("size-2 rounded-full", isOnline(user.id) ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                  {isOnline(user.id) ? "Trực tuyến" : "Ngoại tuyến"}
                </span>
              </div>
            </TableCell>
            <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
              <LastLogin value={user.last_login_at} />
            </TableCell>
            <TableCell className="text-right">
              <div className="inline-flex items-center gap-0.5">
                <Button variant="ghost" size="icon-xs" title="Xem chi tiết" aria-label={`Xem chi tiết ${user.full_name}`} onClick={() => setDetailsUser(user)}>
                  <Eye className="size-3.5" aria-hidden />
                </Button>
                <Button variant="ghost" size="icon-xs" title="Chỉnh sửa" aria-label={`Chỉnh sửa ${user.full_name}`} onClick={() => onEdit(user)}>
                  <Pencil className="size-3.5" aria-hidden />
                </Button>
                <Button variant="ghost" size="icon-xs" title="Đặt lại mật khẩu" aria-label={`Đặt lại mật khẩu ${user.full_name}`} onClick={() => onResetPassword(user)}>
                  <KeyRound className="size-3.5" aria-hidden />
                </Button>
                <Button variant="ghost" size="icon-xs" title="Phiên đăng nhập" aria-label={`Phiên đăng nhập ${user.full_name}`} onClick={() => setSessionsUser(user)}>
                  <MonitorSmartphone className="size-3.5" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  title={user.status === "active" ? "Khóa tài khoản" : "Mở tài khoản"}
                  aria-label={user.status === "active" ? `Khóa ${user.full_name}` : `Mở khóa ${user.full_name}`}
                  className={user.status === "active" ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"}
                  onClick={() => setLockingUser(user)}
                >
                  {user.status === "active" ? <Lock className="size-3.5" aria-hidden /> : <LockOpen className="size-3.5" aria-hidden />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <UserLockDialog user={lockingUser} onOpenChange={(open) => !open && setLockingUser(null)} onDone={onChanged} />
    <UserDetailsDialog user={detailsUser} isOnline={detailsUser ? isOnline(detailsUser.id) : false} onOpenChange={(open) => !open && setDetailsUser(null)} />
    <UserSessionsSheet user={sessionsUser} onOpenChange={(open) => !open && setSessionsUser(null)} />
    </>
  );
}
