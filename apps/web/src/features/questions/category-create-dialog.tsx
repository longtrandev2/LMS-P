import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { QuestionCategory } from "@/types/api";

/** Thêm danh mục vào ngân hàng đang chọn. */
export function CategoryCreateDialog({ bankId, onClose, onCreated }: {
  bankId: number; onClose: () => void; onCreated: (category: QuestionCategory) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const category = await api.post<QuestionCategory>(`/question-banks/${bankId}/categories`, { name: name.trim() });
      onCreated(category); onClose(); toast.success("Đã tạo danh mục.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Thêm danh mục</DialogTitle>
        <DialogDescription>Sắp xếp câu hỏi theo chương hoặc chủ đề học tập.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="question-category-name">Tên danh mục</Label>
          <Input id="question-category-name" value={name} maxLength={100} autoFocus placeholder="Ví dụ: Chương 2 – UDP"
            onChange={(event) => setName(event.target.value)} required />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button disabled={busy || !name.trim()}>{busy ? "Đang tạo…" : "Tạo danh mục"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
