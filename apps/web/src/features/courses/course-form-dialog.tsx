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
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/form-field-error";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { Course } from "@/types/api";

interface CourseFormDialogProps {
  onOpenChange: (open: boolean) => void;
  course: Course | null; // null = tạo mới
  onSaved: () => void;
}

/** State khởi tạo từ props — mount có điều kiện kèm `key`, không cần effect sync */
export function CourseFormDialog({ onOpenChange, course, onSaved }: CourseFormDialogProps) {
  const isEdit = !!course;
  const [code, setCode] = useState(course?.code ?? "");
  const [name, setName] = useState(course?.name ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!code.trim()) next.code = "Vui lòng nhập mã học phần.";
    if (name.trim().length < 3) next.name = "Tên học phần tối thiểu 3 ký tự.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const payload = { code: code.trim(), name: name.trim(), description: description.trim() || null };
    try {
      if (isEdit) {
        await api.patch(`/courses/${course.id}`, payload);
        toast.success("Đã cập nhật học phần.");
      } else {
        await api.post("/courses", payload);
        toast.success("Đã tạo học phần mới.");
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
            {isEdit ? "Sửa học phần" : "Tạo học phần"}
          </DialogTitle>
          <DialogDescription>Học phần là môn học; mỗi học phần có thể mở nhiều lớp theo từng học kỳ.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="course-code">Mã học phần</Label>
            <Input
              id="course-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono"
              placeholder="VD: MMT1010"
              aria-invalid={!!errors.code}
            />
            {errors.code ? <FieldError text={errors.code} /> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-name">Tên học phần</Label>
            <Input
              id="course-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cấu trúc dữ liệu và giải thuật"
              aria-invalid={!!errors.name}
            />
            {errors.name ? <FieldError text={errors.name} /> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-desc">
              Mô tả <span className="text-muted-foreground">(tùy chọn)</span>
            </Label>
            <Textarea
              id="course-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Giới thiệu ngắn về học phần"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo học phần"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
