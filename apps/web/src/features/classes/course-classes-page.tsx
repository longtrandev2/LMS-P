import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { DataTablePagination } from "@/components/data-table-pagination";
import { SortSelect } from "@/components/sort-select";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { ClassFormDialog } from "@/features/classes/class-form-dialog";
import { CourseClassesTable } from "@/features/classes/course-classes-table";
import { ClassSearchField } from "@/features/classes/class-search-field";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { hasRole, useAuthStore } from "@/stores/auth";
import type { ClassSummary, Course, Paginated } from "@/types/api";

export function CourseClassesPage({ courseId }: { courseId: string }) {
  const { status: guard } = useAuthGuard(["admin", "lecturer"]);
  const isAdmin = hasRole(useAuthStore((state) => state.user), "admin");
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSummary | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassSummary | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("code");
  useEffect(() => setPage(1), [search]);

  const courseQuery = useQuery({
    queryKey: queryKeys.courses.detail(courseId),
    queryFn: ({ signal }) => api.get<Course>(`/courses/${courseId}`, undefined, signal),
    enabled: guard === "ok",
  });
  const classesQuery = useQuery({
    queryKey: queryKeys.classes.list({ course_id: courseId, page, limit: 20, q: search.trim() || undefined, sort }),
    queryFn: ({ signal }) =>
      api.get<Paginated<ClassSummary>>("/classes", { course_id: courseId, page, limit: 20, q: search.trim() || undefined, sort }, signal),
    enabled: guard === "ok",
  });

  if (guard !== "ok") return null;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
  }

  async function handleDelete() {
    if (!deletingClass) return;
    try {
      await api.delete(`/classes/${deletingClass.id}`);
      toast.success(`Đã xóa lớp ${deletingClass.code}.`);
      setDeletingClass(null);
      invalidate();
    } catch (error) {
      toast.error(errorText(error));
    }
  }

  const course = courseQuery.data;
  const classes = classesQuery.data?.items;

  return (
    <div className="space-y-6">
      <Link
        to={isAdmin ? "/admin/academics" : "/courses"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> {isAdmin ? "Quản lý học phần" : "Lớp được giao"}
      </Link>

      <PageHeader
        title={course ? course.name : "Học phần"}
        description={
          course
            ? `Mã học phần ${course.code} — ${isAdmin ? "quản lý các lớp theo từng học kỳ." : "các lớp học phần được phân công cho bạn."}`
            : "Đang tải thông tin học phần…"
        }
        actions={isAdmin ? <Button onClick={() => { setEditingClass(null); setFormOpen(true); }}>
            <Plus aria-hidden /> Tạo lớp học phần
          </Button> : undefined}
      />

      <div className="flex flex-wrap gap-3"><ClassSearchField value={search} onChange={setSearch} />
        <SortSelect value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={[{ value: "code", label: "Theo mã lớp" }, { value: "name", label: "Theo tên" }, { value: "created_at", label: "Theo ngày tạo" }]} />
      </div>

      <Card>
        <CardContent className="p-0">
          {classesQuery.isPending ? (
            <TableSkeleton cols={6} />
          ) : classesQuery.isError ? (
            <ErrorState error={classesQuery.error} onRetry={() => classesQuery.refetch()} />
          ) : classes && classes.length === 0 ? (
            <EmptyState
              title="Chưa có lớp học phần nào"
              description={isAdmin ? "Tạo lớp đầu tiên cho học phần này." : "Bạn chưa được phân công vào lớp nào thuộc học phần này."}
              action={isAdmin ? (
                <Button onClick={() => { setEditingClass(null); setFormOpen(true); }}>
                  <Plus aria-hidden /> Tạo lớp học phần
                </Button>
              ) : undefined}
            />
          ) : classes ? (
            <>
              <CourseClassesTable
                classes={classes}
                isAdmin={isAdmin}
                onEdit={(clazz) => { setEditingClass(clazz); setFormOpen(true); }}
                onDelete={setDeletingClass}
              />
              {classesQuery.data ? <DataTablePagination page={classesQuery.data.page} limit={classesQuery.data.limit} total={classesQuery.data.total} onPageChange={setPage} /> : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      {isAdmin && formOpen ? (
        <ClassFormDialog
          key={editingClass?.id ?? "new"}
          onOpenChange={setFormOpen}
          courseId={courseId}
          clazz={editingClass}
          onSaved={invalidate}
        />
      ) : null}

      <AlertDialog open={!!deletingClass} onOpenChange={(o) => !o && setDeletingClass(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Xóa lớp học phần?</AlertDialogTitle>
            <AlertDialogDescription>
              Lớp <span className="font-mono">{deletingClass?.code}</span> — {deletingClass?.name}{" "}
              và toàn bộ ghi danh sẽ bị xóa. Hành động không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Xóa lớp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
