import { useEffect, useState } from "react";
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

export function ClassFormDialog({ onOpenChange, courseId, clazz, onSaved }: ClassFormDialogProps) {
  const isEdit = !!clazz;

  const [code, setCode] = useState(clazz?.code ?? "");
  const [name, setName] = useState(clazz?.name ?? "");
  const [semester, setSemester] = useState(clazz?.semester ?? "");
  const [settings, setSettings] = useState<ClassSettings>({
    room: clazz?.room ?? "", schedule: clazz?.schedule ?? "",
    status: clazz?.status ?? "active",
  });
  const [lecturerId, setLecturerId] = useState<number | null>(clazz?.lecturer_id ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    async function autoFill() {
      try {
        const [course, classRes] = await Promise.all([
          api.get<{ code: string; name: string }>(`/courses/${courseId}`),
          api.get<{ items: Array<{ code: string; name: string; semester?: string }> }>(`/classes`, { course_id: courseId, limit: 100 }),
        ]);
        if (cancelled) return;
        const classes = classRes.items ?? [];
        let maxNo = 0;
        for (const c of classes) {
          const mCode = c.code.match(/(\d+)$/);
          const mName = c.name.match(/(\d+)$/);
          if (mCode) maxNo = Math.max(maxNo, parseInt(mCode[1], 10));
          if (mName) maxNo = Math.max(maxNo, parseInt(mName[1], 10));
        }
        const nextNo = maxNo + 1;
        const pad = String(nextNo).padStart(2, "0");
        setCode((prev) => prev || `${course.code}.${pad}`);
        setName((prev) => prev || `Nhóm ${pad}`);
        if (classes.length > 0 && classes[0].semester) {
          setSemester((prev) => prev || classes[0].semester || "");
        }
      } catch { /* người dùng nhập tay nếu tải lỗi */ }
    }
    void autoFill();
    return () => { cancelled = true; };
  }, [courseId, isEdit]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!code.trim()) next.code = "Vui lòng nhập mã lớp.";
    if (name.trim().length < 2) next.name = "Tên nhóm tối thiểu 2 ký tự.";
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
      room: settings.room.trim(),
      schedule: settings.schedule.trim(),
      status: settings.status,
    };
    try {
      if (isEdit) {
        await api.patch(`/classes/${clazz.id}`, payload);
        toast.success("Đã cập nhật lớp học phần.");
      } else {
        await api.post("/classes", payload);
        toast.success("Đã mở lớp và phân công giảng viên.");
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
          <DialogTitle>
            {isEdit ? "Sửa lớp học phần" : "Mở lớp & phân công giảng viên"}
          </DialogTitle>
          <DialogDescription>Nhập thông tin lớp và chọn giảng viên phụ trách trước khi lưu.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="class-code">Mã lớp</Label>
            <Input
              id="class-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono"
              placeholder="VD: MMT1010.01"
              aria-invalid={!!errors.code}
            />
            {errors.code ? <FieldError text={errors.code} /> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-name">Tên nhóm</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nhóm 01"
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

          <div className="rounded-lg border bg-muted/40 p-3">
            <ClassLecturerField lecturerId={lecturerId} initialName={clazz?.lecturer_name ?? ""}
              error={errors.lecturer} onChange={setLecturerId} />
          </div>

          <ClassSettingsFields value={settings} onChange={setSettings} />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Mở lớp"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}