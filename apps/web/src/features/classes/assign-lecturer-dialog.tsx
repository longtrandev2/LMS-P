import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClassLecturerField } from "@/features/classes/class-lecturer-field";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { ClassSummary } from "@/types/api";

export function AssignLecturerDialog({ clazz, onOpenChange, onSaved }: {
  clazz: ClassSummary; onOpenChange: (open: boolean) => void; onSaved: () => void;
}) {
  const [lecturerId, setLecturerId] = useState<number | null>(clazz.lecturer_id);
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    if (lecturerId == null || lecturerId === clazz.lecturer_id) return;
    setSubmitting(true);
    try {
      await api.patch(`/classes/${clazz.id}`, { lecturer_id: lecturerId });
      toast.success(`Đã cập nhật giảng viên phụ trách lớp ${clazz.code}.`);
      onSaved(); onOpenChange(false);
    } catch (error) { toast.error(errorText(error)); }
    finally { setSubmitting(false); }
  }

  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-heading">Phân công giảng viên</DialogTitle>
        <DialogDescription>{clazz.course_name} · lớp {clazz.code} · học kỳ {clazz.semester}</DialogDescription>
      </DialogHeader>
      <ClassLecturerField lecturerId={lecturerId} initialName={clazz.lecturer_name} onChange={setLecturerId} />
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
        <Button onClick={() => void save()} disabled={submitting || lecturerId == null || lecturerId === clazz.lecturer_id}>
          {submitting ? "Đang lưu…" : "Lưu phân công"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
