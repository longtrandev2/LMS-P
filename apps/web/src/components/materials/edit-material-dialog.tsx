"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/users/user-form-dialog";
import { errorText } from "@/lib/error-messages";
import { MATERIAL_TYPE_OPTIONS, type Material, type MaterialType } from "./types";
import { useUpdateMaterial } from "./use-materials";

interface EditMaterialDialogProps {
  material: Material;
  onOpenChange: (open: boolean) => void;
  classId: string;
}

/** PATCH /materials/{id} — chỉ sửa metadata (FR-MAT-03). Mount mới theo key={id} ở nơi dùng. */
export function EditMaterialDialog({ material, onOpenChange, classId }: EditMaterialDialogProps) {
  const update = useUpdateMaterial(classId);
  const [title, setTitle] = useState(material.title);
  const [description, setDescription] = useState(material.description ?? "");
  const [type, setType] = useState<MaterialType>(material.type);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Nhập tiêu đề học liệu.");
      return;
    }
    try {
      await update.mutateAsync({ id: material.id, title: title.trim(), description: description.trim(), type });
      toast.success("Đã cập nhật học liệu.");
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Sửa học liệu</DialogTitle>
          <DialogDescription>Chỉnh sửa tiêu đề, mô tả và phân loại.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="edit-material-title">Tiêu đề</Label>
            <Input
              id="edit-material-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={!!error}
            />
            {error ? <FieldError text={error} /> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-material-description">Mô tả</Label>
            <Textarea
              id="edit-material-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Phân loại</Label>
            <Select value={type} onValueChange={(v) => setType(v as MaterialType)}>
              <SelectTrigger className="w-full" aria-label="Phân loại học liệu">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
              {update.isPending ? "Đang lưu…" : "Lưu"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
