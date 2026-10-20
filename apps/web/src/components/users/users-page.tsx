"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Upload, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { UsersTable } from "@/components/users/users-table";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { ResetPasswordDialog } from "@/components/users/reset-password-dialog";
import { ImportUsersDialog } from "@/components/users/import-users-dialog";
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

  const filters = {
    page,
    limit: PAGE_SIZE,
    role: roleFilter === "all" ? undefined : roleFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  };

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
        title="Quản lý người dùng"
        description="Tài khoản sinh viên, giảng viên và quản trị trong hệ thống."
        actions={
          <>
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

      <Card>
        <CardContent className="space-y-0 p-0">
          {/* Bộ lọc */}
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40" aria-label="Lọc theo vai trò">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
              <SelectTrigger className="w-40" aria-label="Lọc theo trạng thái">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mọi trạng thái</SelectItem>
                <SelectItem value="active">Đang hoạt động</SelectItem>
                <SelectItem value="locked">Đã khóa</SelectItem>
              </SelectContent>
            </Select>
            {query.isFetching ? (
              <span className="text-xs text-muted-foreground">Đang tải…</span>
            ) : null}
          </div>

          {query.isPending ? (
            <TableSkeleton />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : data && data.items.length === 0 ? (
            <EmptyState
              title="Chưa có người dùng nào"
              description="Thêm từng người dùng hoặc nhập danh sách từ tệp CSV."
              action={
                <Button onClick={() => { setEditingUser(null); setFormOpen(true); }}>
                  <UserPlus aria-hidden /> Thêm người dùng
                </Button>
              }
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
        </CardContent>
      </Card>

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
      <ImportUsersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => query.refetch()}
      />
    </div>
  );
}
