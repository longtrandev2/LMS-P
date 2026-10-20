"use client";

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
import { FieldError } from "@/components/users/user-form-dialog";
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
    if (!code.trim()) next.code = "Vui lòng nhập mã khóa học.";
    if (name.trim().length < 3) next.name = "Tên khóa học tối thiểu 3 ký tự.";
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
        toast.success("Đã cập nhật khóa học.");
      } else {
        await api.post("/courses", payload);
        toast.success("Đã tạo khóa học mới.");
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
            {isEdit ? "Sửa khóa học" : "Tạo khóa học"}
          </DialogTitle>
          <DialogDescription>Khóa học là nơi chứa các lớp học phần.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="course-code">Mã khóa học</Label>
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
            <Label htmlFor="course-name">Tên khóa học</Label>
            <Input
              id="course-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Lập trình mạng"
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
              placeholder="Giới thiệu ngắn về nội dung khóa học"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo khóa học"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
