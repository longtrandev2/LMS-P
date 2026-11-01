import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { Course, QuestionBank } from "@/types/api";

/** Tạo ngân hàng trong học phần đang chọn. */
export function BankCreateDialog({ course, onClose, onCreated }: {
  course: Course; onClose: () => void; onCreated: (bank: QuestionBank) => void;
}) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "shared">("private");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const bank = await api.post<QuestionBank>("/question-banks", { course_id: course.id, name: name.trim(), visibility });
      onCreated(bank); onClose(); toast.success("Đã tạo ngân hàng câu hỏi.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Tạo ngân hàng câu hỏi</DialogTitle>
        <DialogDescription>Thuộc học phần <span className="font-medium text-foreground">{course.code} · {course.name}</span>. Có thể đổi phạm vi chia sẻ sau.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="question-bank-name">Tên ngân hàng</Label>
          <Input id="question-bank-name" value={name} maxLength={100} autoFocus placeholder="Ví dụ: Chương 1 – Socket TCP"
            onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <span id="question-bank-visibility" className="block text-sm font-medium">Phạm vi ban đầu</span>
          <ToggleGroup type="single" aria-labelledby="question-bank-visibility" value={visibility}
            onValueChange={(value) => value && setVisibility(value as "private" | "shared")}>
            <ToggleGroupItem value="private">Riêng tư</ToggleGroupItem>
            <ToggleGroupItem value="shared">Chia sẻ trong học phần</ToggleGroupItem>
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">{visibility === "shared" ? "Giảng viên cùng học phần được xem và dùng câu hỏi." : "Chỉ bạn và người được cấp quyền thấy ngân hàng này."}</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button disabled={busy || !name.trim()}>{busy ? "Đang tạo…" : "Tạo ngân hàng"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
