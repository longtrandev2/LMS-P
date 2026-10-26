import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { AdminCourseSection } from "@/features/courses/admin-course-section";
import { AdminClassSection } from "@/features/classes/admin-class-section";
import { CourseFormDialog } from "@/features/courses/course-form-dialog";
import { ClassFormDialog } from "@/features/classes/class-form-dialog";
import { AssignLecturerDialog } from "@/features/classes/assign-lecturer-dialog";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import type { ClassSummary, Course } from "@/types/api";

export function AdminAcademicsPage() {
  const { status } = useAuthGuard(["admin"]);
  const queryClient = useQueryClient();
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [classCourseId, setClassCourseId] = useState<number | null>(null);
  const [editingClass, setEditingClass] = useState<ClassSummary | null>(null);
  const [assigningClass, setAssigningClass] = useState<ClassSummary | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassSummary | null>(null);

  if (status !== "ok") return null;

  function refreshClasses() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
  }

  async function confirmDelete() {
    try {
      if (deletingClass) {
        await api.delete(`/classes/${deletingClass.id}`);
        toast.success(`Đã xóa lớp ${deletingClass.code}.`);
        setDeletingClass(null); refreshClasses();
      } else if (deletingCourse) {
        await api.delete(`/courses/${deletingCourse.id}`);
        toast.success(`Đã xóa học phần ${deletingCourse.code}.`);
        setDeletingCourse(null);
        void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
        refreshClasses();
      }
    } catch (error) { toast.error(errorText(error)); }
  }

  const deletionLabel = deletingClass ? `lớp ${deletingClass.code}` : `học phần ${deletingCourse?.code}`;
  return <div className="space-y-8">
    <PageHeader title="Học phần & lớp" description="Tạo học phần, mở lớp theo học kỳ và phân công giảng viên. Sinh viên được thêm trong trang của từng lớp."
      actions={<Button onClick={() => { setEditingCourse(null); setCourseFormOpen(true); }}><Plus aria-hidden /> Tạo học phần</Button>} />
    <AdminCourseSection onCreate={() => { setEditingCourse(null); setCourseFormOpen(true); }}
      onOpenClass={(course) => { setClassCourseId(course.id); setEditingClass(null); }}
      onEdit={(course) => { setEditingCourse(course); setCourseFormOpen(true); }} onDelete={setDeletingCourse} />
    <AdminClassSection onAssign={setAssigningClass}
      onEdit={(clazz) => { setEditingClass(clazz); setClassCourseId(clazz.course_id); }}
      onDelete={setDeletingClass} />

    {courseFormOpen ? <CourseFormDialog key={editingCourse?.id ?? "new"} course={editingCourse} onOpenChange={setCourseFormOpen}
      onSaved={() => void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })} /> : null}
    {classCourseId != null ? <ClassFormDialog key={editingClass?.id ?? `new-${classCourseId}`} courseId={String(classCourseId)} clazz={editingClass}
      onOpenChange={(open) => { if (!open) { setClassCourseId(null); setEditingClass(null); } }} onSaved={refreshClasses} /> : null}
    {assigningClass ? <AssignLecturerDialog key={assigningClass.id} clazz={assigningClass}
      onOpenChange={(open) => { if (!open) setAssigningClass(null); }} onSaved={refreshClasses} /> : null}

    <AlertDialog open={!!(deletingCourse || deletingClass)} onOpenChange={(open) => { if (!open) { setDeletingCourse(null); setDeletingClass(null); } }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa {deletionLabel}?</AlertDialogTitle>
        <AlertDialogDescription>Dữ liệu liên quan đến {deletionLabel} cũng có thể bị ảnh hưởng. Hành động không thể hoàn tác.</AlertDialogDescription>
      </AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel>
        <AlertDialogAction variant="destructive" onClick={() => void confirmDelete()}>Xóa</AlertDialogAction>
      </AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}
