"use client";

import { useState } from "react";
import Link from "next/link";
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
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { ClassFormDialog } from "@/components/classes/class-form-dialog";
import { CourseClassesTable } from "@/components/classes/course-classes-table";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import type { ClassSummary, Course, Paginated } from "@/types/api";

export function CourseClassesPage({ courseId }: { courseId: string }) {
  const { status: guard } = useAuthGuard(["admin", "lecturer"]);
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSummary | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassSummary | null>(null);

  const courseQuery = useQuery({
    queryKey: queryKeys.courses.detail(courseId),
    queryFn: ({ signal }) => api.get<Course>(`/courses/${courseId}`, undefined, signal),
    enabled: guard === "ok",
  });
  const classesQuery = useQuery({
    queryKey: queryKeys.classes.list({ course_id: courseId }),
    queryFn: ({ signal }) =>
      api.get<Paginated<ClassSummary>>("/classes", { course_id: courseId, page: 1, limit: 50 }, signal),
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
        href="/courses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Tất cả khóa học
      </Link>

      <PageHeader
        title={course ? course.name : "Khóa học"}
        description={
          course
            ? `Mã ${course.code} — quản lý các lớp học phần của khóa.`
            : "Đang tải thông tin khóa học…"
        }
        actions={
          <Button onClick={() => { setEditingClass(null); setFormOpen(true); }}>
            <Plus aria-hidden /> Tạo lớp học phần
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {classesQuery.isPending ? (
            <TableSkeleton cols={4} />
          ) : classesQuery.isError ? (
            <ErrorState error={classesQuery.error} onRetry={() => classesQuery.refetch()} />
          ) : classes && classes.length === 0 ? (
            <EmptyState
              title="Chưa có lớp học phần nào"
              description="Tạo lớp đầu tiên cho khóa học này để bắt đầu ghi danh sinh viên."
              action={
                <Button onClick={() => { setEditingClass(null); setFormOpen(true); }}>
                  <Plus aria-hidden /> Tạo lớp học phần
                </Button>
              }
            />
          ) : classes ? (
            <CourseClassesTable
              classes={classes}
              onEdit={(clazz) => { setEditingClass(clazz); setFormOpen(true); }}
              onDelete={setDeletingClass}
            />
          ) : null}
        </CardContent>
      </Card>

      {formOpen ? (
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
