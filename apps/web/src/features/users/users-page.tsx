import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Download, Upload, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ListToolbar, SearchField } from "@/components/list-toolbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { UsersTable } from "@/features/users/users-table";
import { UserFormDialog } from "@/features/users/user-form-dialog";
import { ResetPasswordDialog } from "@/features/users/reset-password-dialog";
import { ImportUsersPreviewDialog } from "@/features/users/import-users-preview-dialog";
import { UserSortSelect } from "@/features/users/user-sort-select";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import type { Paginated, User } from "@/types/api";

const PAGE_SIZE = 20;

export function UsersPage() {
  const { status: guard } = useAuthGuard(["admin"]);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState("-created_at");
  useEffect(() => { const timer=setTimeout(()=>{setSearchQuery(search);setPage(1);},300); return ()=>clearTimeout(timer); },[search]);

  const filters = {
    page,
    limit: PAGE_SIZE,
    role: roleFilter === "all" ? undefined : roleFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    q: searchQuery.trim() || undefined,
    sort,
  };
  async function exportCsv() {
    try {
      const { blob, filename } = await api.download("/users/export", { role: filters.role, status: filters.status, q: filters.q, sort });
      const url=URL.createObjectURL(blob); const anchor=document.createElement("a"); anchor.href=url; anchor.download=filename??"users.csv"; anchor.click(); URL.revokeObjectURL(url);
    } catch(error) { toast.error(error instanceof Error ? error.message : "Không thể xuất CSV."); }
  }

  const query = useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: ({ signal }) => api.get<Paginated<User>>("/users", filters, signal),
    placeholderData: keepPreviousData,
    enabled: guard === "ok",
  });

  if (guard !== "ok") return null;

  const data = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Người dùng"
        description="Tài khoản sinh viên, giảng viên và quản trị trong hệ thống."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}><Download aria-hidden /> Xuất CSV</Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload aria-hidden /> Nhập CSV
            </Button>
            <Button
              onClick={() => {
                setEditingUser(null);
                setFormOpen(true);
              }}
            >
              <UserPlus aria-hidden /> Thêm người dùng
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-card">
          <ListToolbar search={<SearchField value={search} onChange={setSearch} placeholder="Tìm theo tên, email hoặc mã SV" />}>
            {query.isFetching && !query.isPending ? (
              <span className="text-xs text-muted-foreground" aria-live="polite">Đang tải…</span>
            ) : null}
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-36" aria-label="Lọc theo vai trò">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">Mọi vai trò</SelectItem>
                <SelectItem value="student">Sinh viên</SelectItem>
                <SelectItem value="lecturer">Giảng viên</SelectItem>
                <SelectItem value="admin">Quản trị</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-40" aria-label="Lọc theo trạng thái">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">Mọi trạng thái</SelectItem>
                <SelectItem value="active">Đang hoạt động</SelectItem>
                <SelectItem value="locked">Đã khóa</SelectItem>
              </SelectContent>
            </Select>
            <UserSortSelect value={sort} onChange={setSort} />
          </ListToolbar>

          {query.isPending ? (
            <TableSkeleton />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : data && data.items.length === 0 ? (
            <EmptyState
              icon={Users}
              title={filters.q || filters.role || filters.status ? "Không có người dùng phù hợp" : "Chưa có người dùng nào"}
              description={filters.q || filters.role || filters.status ? "Thử đổi từ khóa hoặc bộ lọc." : "Thêm từng người dùng hoặc nhập danh sách từ tệp CSV."}
              action={filters.q || filters.role || filters.status ? undefined : (
                <Button size="sm" onClick={() => { setEditingUser(null); setFormOpen(true); }}>
                  <UserPlus aria-hidden /> Thêm người dùng
                </Button>
              )}
            />
          ) : data ? (
            <>
              <UsersTable
                users={data.items}
                onEdit={(user) => {
                  setEditingUser(user);
                  setFormOpen(true);
                }}
                onResetPassword={setResettingUser}
                onChanged={() => query.refetch()}
              />
              <DataTablePagination
                page={data.page}
                limit={data.limit}
                total={data.total}
                onPageChange={setPage}
              />
            </>
          ) : null}
      </section>

      {formOpen ? (
        <UserFormDialog
          key={editingUser?.id ?? "new"}
          onOpenChange={setFormOpen}
          user={editingUser}
          onSaved={() => query.refetch()}
        />
      ) : null}
      <ResetPasswordDialog
        user={resettingUser}
        onOpenChange={(o) => !o && setResettingUser(null)}
        onDone={() => query.refetch()}
      />
      <ImportUsersPreviewDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => query.refetch()}
      />
    </div>
  );
}
