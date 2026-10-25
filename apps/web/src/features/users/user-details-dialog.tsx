import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RoleBadge, StatusBadge } from "@/components/role-status-badges";
import { api } from "@/lib/api";
import type { User, UserDetail } from "@/types/api";

function ClassList({ title, items }: { title: string; items: UserDetail["enrolled_classes"] }) {
  return <section className="space-y-2"><h3 className="text-sm font-medium">{title}</h3>{items.length ? <ul className="space-y-2">{items.map((item) => <li key={item.id} className="rounded-md border px-3 py-2"><p className="font-medium">{item.name} <span className="font-mono text-xs text-muted-foreground">{item.code}</span></p><p className="text-xs text-muted-foreground">{item.course_name} · {item.semester}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">Chưa có lớp.</p>}</section>;
}

export function UserDetailsDialog({ user, onOpenChange }: { user: User | null; onOpenChange: (open: boolean) => void }) {
  const query = useQuery({ queryKey: ["users", "detail", user?.id], queryFn: () => api.get<UserDetail>(`/users/${user!.id}`), enabled: !!user });
  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Thông tin người dùng</DialogTitle><DialogDescription>{user?.email}</DialogDescription></DialogHeader>
        {query.isPending ? <p className="text-sm text-muted-foreground">Đang tải…</p> : query.data ? <div className="space-y-5">
          <div className="grid gap-2 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Họ tên: </span>{query.data.user.full_name}</p><p><span className="text-muted-foreground">Mã SV: </span>{query.data.user.student_code ?? "—"}</p><p><span className="text-muted-foreground">Điện thoại: </span>{query.data.user.phone ?? "—"}</p><p><span className="text-muted-foreground">Trạng thái: </span><StatusBadge status={query.data.user.status} /></p><div className="flex flex-wrap gap-1 sm:col-span-2">{query.data.user.roles.map((role) => <RoleBadge key={role} role={role} />)}</div></div>
          <ClassList title="Lớp đang học" items={query.data.enrolled_classes} /><ClassList title="Lớp đang dạy" items={query.data.teaching_classes} />
        </div> : <p className="text-sm text-destructive">Không tải được chi tiết người dùng.</p>}
      </DialogContent>
    </Dialog>
  );
}
