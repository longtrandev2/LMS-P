import { useState } from "react";
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
import { FieldError } from "@/components/form-field-error";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { hasRole, useAuthStore } from "@/stores/auth";
import type { ClassSummary } from "@/types/api";
import { ClassSettingsFields, type ClassSettings } from "@/features/classes/class-settings-fields";
import { ClassLecturerField } from "@/features/classes/class-lecturer-field";

interface ClassFormDialogProps {
  onOpenChange: (open: boolean) => void;
  courseId: string;
  /** null = tạo mới */
  clazz: ClassSummary | null;
  onSaved: () => void;
}

const SEMESTER_PATTERN = /^\d{4}\.\d$/;
const dateInput = (value?: string | null) => value?.slice(0, 16) ?? "";

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
  const [settings, setSettings] = useState<ClassSettings>({
    maxStudents: clazz?.max_students?.toString() ?? "", enrollFrom: dateInput(clazz?.enroll_from),
    enrollUntil: dateInput(clazz?.enroll_until), room: clazz?.room ?? "", schedule: clazz?.schedule ?? "",
    status: clazz?.status ?? "active",
  });
  const [lecturerId, setLecturerId] = useState<number | null>(
    clazz?.lecturer_id ?? (isLecturer ? currentUser?.id ?? null : null)
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!code.trim()) next.code = "Vui lòng nhập mã lớp.";
    if (name.trim().length < 3) next.name = "Tên lớp tối thiểu 3 ký tự.";
    if (!SEMESTER_PATTERN.test(semester.trim()))
      next.semester = 'Học kỳ theo dạng "2026.1" hoặc "2026.2".';
    if (lecturerId == null) next.lecturer = "Chọn giảng viên phụ trách.";
    if (settings.maxStudents && (!/^\d+$/.test(settings.maxStudents) || Number(settings.maxStudents) < 1)) next.capacity = "Sĩ số tối đa phải là số nguyên lớn hơn 0.";
    if (settings.enrollFrom && settings.enrollUntil && settings.enrollUntil <= settings.enrollFrom) next.window = "Thời gian đóng ghi danh phải sau thời gian mở.";
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
      max_students: settings.maxStudents ? Number(settings.maxStudents) : null,
      enroll_from: settings.enrollFrom || null,
      enroll_until: settings.enrollUntil || null,
      room: settings.room.trim(),
      schedule: settings.schedule.trim(),
      status: settings.status,
      clear_capacity: !settings.maxStudents,
      clear_enroll_from: !settings.enrollFrom,
      clear_enroll_until: !settings.enrollUntil,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
              placeholder="VD: Nhập môn lập trình — Lớp 1"
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

          <ClassSettingsFields value={settings} onChange={setSettings} />
          {errors.capacity || errors.window ? <FieldError text={errors.capacity ?? errors.window} /> : null}

          <ClassLecturerField isAdmin={isAdmin} lecturerId={lecturerId} fullName={currentUser?.full_name ?? ""}
            error={errors.lecturer} onChange={setLecturerId} />

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
