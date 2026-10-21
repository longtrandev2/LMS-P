"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { errorText } from "@/lib/error-messages";
import type { Material } from "./types";
import { useDeleteMaterial } from "./use-materials";

interface DeleteMaterialButtonProps {
  classId: string;
  material: Material;
}

/** DELETE /materials/{id} — xác nhận bằng AlertDialog (FR-MAT-03) */
export function DeleteMaterialButton({ classId, material }: DeleteMaterialButtonProps) {
  const [open, setOpen] = useState(false);
  const remove = useDeleteMaterial(classId);

  async function handleDelete() {
    try {
      await remove.mutateAsync(material.id);
      toast.success(`Đã xóa học liệu "${material.title}".`);
      setOpen(false);
    } catch (error) {
      toast.error(errorText(error));
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Xóa học liệu ${material.title}`}
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 aria-hidden />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Xóa học liệu này?</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${material.title}" sẽ bị gỡ khỏi lớp. Sinh viên không thể tải lại học liệu đã xóa.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {remove.isPending ? "Đang xóa…" : "Xóa học liệu"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
