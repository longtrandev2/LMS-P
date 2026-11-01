import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClassLecturerField } from "@/features/classes/class-lecturer-field";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { ClassLecturer, ClassSummary } from "@/types/api";

export function AssignLecturerDialog({ clazz, onOpenChange, onSaved }: {
  clazz: ClassSummary; onOpenChange: (open: boolean) => void; onSaved: () => void;
}) {
  const [lecturers, setLecturers] = useState<ClassLecturer[]>(clazz.lecturers);
  const [submitting, setSubmitting] = useState(false);
  const changed = lecturers.length !== clazz.lecturers.length
    || lecturers.some((user) => !clazz.lecturers.some((previous) => previous.id === user.id));

  async function save() {
    if (submitting || lecturers.length === 0 || !changed) return;
    setSubmitting(true);
    try {
      await api.patch(`/classes/${clazz.id}`, { lecturer_ids: lecturers.map((user) => user.id) });
      toast.success(`Đã cập nhật giảng viên phụ trách lớp ${clazz.code}.`);
      onSaved(); onOpenChange(false);
    } catch (error) { toast.error(errorText(error)); }
    finally { setSubmitting(false); }
  }

  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Phân công giảng viên</DialogTitle>
        <DialogDescription>{clazz.course_name} · lớp {clazz.code} · học kỳ {clazz.semester}</DialogDescription>
      </DialogHeader>
      <ClassLecturerField lecturers={lecturers} onChange={setLecturers} />
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
        <Button onClick={() => void save()} disabled={submitting || lecturers.length === 0 || !changed}>
          {submitting ? "Đang lưu…" : "Lưu phân công"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
