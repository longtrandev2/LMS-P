import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, StatusBadge } from "@/components/role-status-badges";
import { UserIdentity } from "@/features/users/user-avatar";
import { api } from "@/lib/api";
import type { User, UserDetail } from "@/types/api";

function ClassList({ title, items }: { title: string; items: UserDetail["enrolled_classes"] }) {
  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold">{title} <span className="font-normal text-muted-foreground tabular-nums">{items.length}</span></h3>
      {items.length ? (
        <ul>{items.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-3 border-b py-2 last:border-b-0">
            <span className="min-w-0"><span className="block truncate font-medium">{item.name}</span><span className="block truncate text-xs text-muted-foreground">{item.course_name} · {item.semester}</span></span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.code}</span>
          </li>
        ))}</ul>
      ) : <p className="py-2 text-sm text-muted-foreground">Chưa có lớp.</p>}
    </section>
  );
}

export function UserDetailsDialog({ user, onOpenChange }: { user: User | null; onOpenChange: (open: boolean) => void }) {
  const query = useQuery({ queryKey: ["users", "detail", user?.id], queryFn: () => api.get<UserDetail>(`/users/${user!.id}`), enabled: !!user });
  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Thông tin người dùng</DialogTitle><DialogDescription className="sr-only">{user?.email}</DialogDescription></DialogHeader>
        {query.isPending ? <p className="text-sm text-muted-foreground">Đang tải…</p> : query.data ? <div className="space-y-6">
          <div className="space-y-4">
            <UserIdentity name={query.data.user.full_name} email={query.data.user.email} />
            <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Mã sinh viên</dt><dd className="font-mono text-xs leading-5">{query.data.user.student_code ?? "—"}</dd>
              <dt className="text-muted-foreground">Điện thoại</dt><dd>{query.data.user.phone ?? "—"}</dd>
              <dt className="text-muted-foreground">Vai trò</dt><dd className="flex flex-wrap gap-1">{query.data.user.roles.map((role) => <Badge key={role}>{ROLE_LABELS[role]}</Badge>)}</dd>
              <dt className="text-muted-foreground">Trạng thái</dt><dd><StatusBadge status={query.data.user.status} /></dd>
            </dl>
          </div>
          <ClassList title="Lớp đang học" items={query.data.enrolled_classes} /><ClassList title="Lớp đang dạy" items={query.data.teaching_classes} />
        </div> : <p className="text-sm text-destructive">Không tải được chi tiết người dùng.</p>}
      </DialogContent>
    </Dialog>
  );
}
