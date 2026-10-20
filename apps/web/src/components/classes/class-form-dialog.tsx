"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldError } from "@/components/users/user-form-dialog";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import { hasRole, useAuthStore } from "@/stores/auth";
import type { ClassSummary, Paginated, User } from "@/types/api";

interface ClassFormDialogProps {
  onOpenChange: (open: boolean) => void;
  courseId: string;
  /** null = tạo mới */
  clazz: ClassSummary | null;
  onSaved: () => void;
}

const SEMESTER_PATTERN = /^\d{4}\.\d$/;

/**
 * State khởi tạo từ props — mount có điều kiện kèm `key`, không cần effect sync.
 * lecturer_id bắt buộc theo ClassCreateIn (BE): lecturer mặc định là chính mình;
 * admin chọn từ danh sách giảng viên (GET /users?role=lecturer — admin-only).
 */
export function ClassFormDialog({ onOpenChange, courseId, clazz, onSaved }: ClassFormDialogProps) {
  const isEdit = !!clazz;
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = hasRole(currentUser, "admin");
  const isLecturer = hasRole(currentUser, "lecturer");

  const [code, setCode] = useState(clazz?.code ?? "");
  const [name, setName] = useState(clazz?.name ?? "");
  const [semester, setSemester] = useState(clazz?.semester ?? "");
  const [lecturerId, setLecturerId] = useState<number | null>(
    clazz?.lecturer_id ?? (isLecturer ? currentUser?.id ?? null : null)
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const lecturersQuery = useQuery({
    queryKey: queryKeys.users.list({ page: 1, limit: 100, role: "lecturer" }),
    queryFn: ({ signal }) =>
      api.get<Paginated<User>>("/users", { page: 1, limit: 100, role: "lecturer" }, signal),
    enabled: isAdmin, // GET /users là admin-only — lecturer dùng chính mình
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!code.trim()) next.code = "Vui lòng nhập mã lớp.";
    if (name.trim().length < 3) next.name = "Tên lớp tối thiểu 3 ký tự.";
    if (!SEMESTER_PATTERN.test(semester.trim()))
      next.semester = 'Học kỳ theo dạng "2026.1" hoặc "2026.2".';
    if (lecturerId == null) next.lecturer = "Chọn giảng viên phụ trách.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const payload = {
      code: code.trim(),
      name: name.trim(),
      semester: semester.trim(),
      course_id: Number(courseId),
      lecturer_id: lecturerId as number,
    };
    try {
      if (isEdit) {
        await api.patch(`/classes/${clazz.id}`, payload);
        toast.success("Đã cập nhật lớp học phần.");
      } else {
        await api.post("/classes", payload);
        toast.success("Đã tạo lớp học phần.");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEdit ? "Sửa lớp học phần" : "Tạo lớp học phần"}
          </DialogTitle>
          <DialogDescription>Lớp thuộc khóa học hiện tại, theo học kỳ.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="class-code">Mã lớp</Label>
            <Input
              id="class-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono"
              placeholder="VD: MMT1010.1"
              aria-invalid={!!errors.code}
            />
            {errors.code ? <FieldError text={errors.code} /> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-name">Tên lớp</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Lập trình mạng — Lớp 1"
              aria-invalid={!!errors.name}
            />
            {errors.name ? <FieldError text={errors.name} /> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-semester">Học kỳ</Label>
            <Input
              id="class-semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="font-mono"
              placeholder="2026.1"
              aria-invalid={!!errors.semester}
            />
            {errors.semester ? <FieldError text={errors.semester} /> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="class-lecturer">Giảng viên phụ trách</Label>
            {isAdmin ? (
              lecturersQuery.isPending ? (
                <Skeleton className="h-9 w-full" />
              ) : lecturersQuery.isError ? (
                <FieldError text="Không tải được danh sách giảng viên." />
              ) : (
                <Select
                  value={lecturerId != null ? String(lecturerId) : undefined}
                  onValueChange={(v) => setLecturerId(Number(v))}
                >
                  <SelectTrigger id="class-lecturer" aria-invalid={!!errors.lecturer}>
                    <SelectValue placeholder="Chọn giảng viên" />
                  </SelectTrigger>
                  <SelectContent>
                    {lecturersQuery.data?.items.map((lecturer) => (
                      <SelectItem key={lecturer.id} value={String(lecturer.id)}>
                        {lecturer.full_name} ({lecturer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            ) : (
              <Input
                id="class-lecturer"
                value={currentUser?.full_name ?? ""}
                disabled
                aria-describedby="class-lecturer-hint"
              />
            )}
            {!isAdmin ? (
              <p id="class-lecturer-hint" className="text-xs text-muted-foreground">
                Bạn là giảng viên phụ trách lớp này.
              </p>
            ) : null}
            {errors.lecturer ? <FieldError text={errors.lecturer} /> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo lớp"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
