import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { PageHeader } from "@/components/page-header";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/state-blocks";
import { CourseFormDialog } from "@/features/courses/course-form-dialog";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import type { Course, Paginated } from "@/types/api";

export function CoursesPage() {
  const { status: guard } = useAuthGuard(["admin", "lecturer"]);
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  const query = useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: ({ signal }) =>
      api.get<Paginated<Course>>("/courses", { page: 1, limit: 50 }, signal),
    enabled: guard === "ok",
  });

  if (guard !== "ok") return null;

  async function handleDelete() {
    if (!deletingCourse) return;
    try {
      await api.delete(`/courses/${deletingCourse.id}`);
      toast.success(`Đã xóa khóa học ${deletingCourse.code}.`);
      setDeletingCourse(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    } catch (error) {
      toast.error(errorText(error));
    }
  }

  const courses = query.data?.items;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Khóa học"
        description="Các khóa học bạn phụ trách — mỗi khóa chứa nhiều lớp học phần."
        actions={
          <Button onClick={() => { setEditingCourse(null); setFormOpen(true); }}>
            <Plus aria-hidden /> Tạo khóa học
          </Button>
        }
      />

      {query.isPending ? (
        <CardGridSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : courses && courses.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="Chưa có khóa học nào"
              description="Tạo khóa học đầu tiên để bắt đầu mở lớp học phần."
              action={
                <Button onClick={() => { setEditingCourse(null); setFormOpen(true); }}>
                  <Plus aria-hidden /> Tạo khóa học
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses?.map((course) => (
            <Card
              key={course.id}
              className="group relative flex flex-col justify-between gap-4 transition-colors duration-200 hover:border-primary/40"
            >
              <Link
                to={`/courses/${course.id}`}
                className="space-y-2 outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring"
              >
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <BookOpen className="size-3.5" aria-hidden />
                  <span className="font-mono normal-case">{course.code}</span>
                </p>
                <h3 className="font-heading text-lg font-bold leading-snug group-hover:text-primary">
                  {course.name}
                </h3>
                <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {course.description ?? "Chưa có mô tả."}
                </p>
              </Link>
              <div className="relative z-10 flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Sửa khóa học ${course.code}`}
                  onClick={() => { setEditingCourse(course); setFormOpen(true); }}
                >
                  <Pencil aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Xóa khóa học ${course.code}`}
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeletingCourse(course)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {formOpen ? (
        <CourseFormDialog
          key={editingCourse?.id ?? "new"}
          onOpenChange={setFormOpen}
          course={editingCourse}
          onSaved={() => queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })}
        />
      ) : null}

      <AlertDialog open={!!deletingCourse} onOpenChange={(o) => !o && setDeletingCourse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Xóa khóa học?</AlertDialogTitle>
            <AlertDialogDescription>
              Khóa học <span className="font-mono">{deletingCourse?.code}</span> —{" "}
              {deletingCourse?.name} sẽ bị xóa vĩnh viễn. Hành động không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Xóa khóa học
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
