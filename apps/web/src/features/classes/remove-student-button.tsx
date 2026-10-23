import { useState } from "react";
import { UserMinus } from "lucide-react";
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
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { ClassStudent } from "@/types/api";

interface RemoveStudentButtonProps {
  classId: string;
  student: ClassStudent;
  onRemoved: () => void;
}

/** DELETE /classes/{id}/enrollments/{studentId} */
export function RemoveStudentButton({ classId, student, onRemoved }: RemoveStudentButtonProps) {
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      await api.delete(`/classes/${classId}/enrollments/${student.user_id}`);
      toast.success(`Đã xóa ${student.full_name} khỏi lớp.`);
      setOpen(false);
      onRemoved();
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Xóa ${student.full_name} khỏi lớp`}
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <UserMinus aria-hidden />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Xóa sinh viên khỏi lớp?</AlertDialogTitle>
            <AlertDialogDescription>
              {student.full_name}
              {student.student_code ? ` (${student.student_code})` : ""} sẽ mất quyền truy cập toàn
              bộ hoạt động của lớp này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={removing}
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
            >
              {removing ? "Đang xóa…" : "Xóa khỏi lớp"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
