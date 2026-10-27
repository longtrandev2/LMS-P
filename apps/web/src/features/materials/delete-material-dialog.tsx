import { toast } from "sonner";
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
import { errorText } from "@/lib/error-messages";
import type { Material } from "./types";
import { useDeleteMaterial } from "./use-materials";

interface DeleteMaterialDialogProps {
  classId: string;
  /** null = đóng */
  material: Material | null;
  onOpenChange: (open: boolean) => void;
}

/** DELETE /materials/{id} — xác nhận bằng AlertDialog (FR-MAT-03); mở từ menu `…` của hàng. */
export function DeleteMaterialDialog({ classId, material, onOpenChange }: DeleteMaterialDialogProps) {
  const remove = useDeleteMaterial(classId);

  async function handleDelete() {
    if (!material) return;
    try {
      await remove.mutateAsync(material.id);
      toast.success(`Đã xóa học liệu "${material.title}".`);
      onOpenChange(false);
    } catch (error) {
      toast.error(errorText(error));
    }
  }

  return (
    <AlertDialog open={material != null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa học liệu này?</AlertDialogTitle>
          <AlertDialogDescription>
            {`"${material?.title ?? ""}" sẽ bị gỡ khỏi lớp. Sinh viên không thể tải lại học liệu đã xóa.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
          >
            {remove.isPending ? "Đang xóa…" : "Xóa học liệu"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
