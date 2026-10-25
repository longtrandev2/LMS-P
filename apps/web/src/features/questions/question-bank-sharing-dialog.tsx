import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { QuestionBank } from "@/types/api";
import type { QuestionBankPermission } from "@/types/questions";

type Lecturer = { id: number; full_name: string; email: string };

export function QuestionBankSharingDialog({ bank, onClose, onChanged }: {
  bank: QuestionBank; onClose: () => void; onChanged: () => void;
}) {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [permissions, setPermissions] = useState<QuestionBankPermission[]>([]);
  const [lecturerId, setLecturerId] = useState<number | null>(null);
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [visibility, setVisibility] = useState(bank.visibility);
  const [busy, setBusy] = useState(false);
  const base = `/question-banks/${bank.id}`;

  useEffect(() => {
    void Promise.all([
      api.get<Lecturer[]>(`${base}/eligible-lecturers`),
      api.get<QuestionBankPermission[]>(`${base}/permissions`),
    ]).then(([people, grants]) => { setLecturers(people); setPermissions(grants); })
      .catch((error) => toast.error(errorText(error)));
  }, [base]);

  async function saveVisibility() {
    setBusy(true);
    try {
      await api.patch(`${base}/visibility`, { visibility });
      onChanged(); toast.success("Đã cập nhật phạm vi ngân hàng.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }
  async function grant() {
    if (!lecturerId) return; setBusy(true);
    try {
      await api.put(`${base}/permissions/${lecturerId}`, { permission });
      setPermissions((rows) => [...rows.filter((row) => row.lecturer_id !== lecturerId), { lecturer_id: lecturerId, permission }]);
      setLecturerId(null); toast.success("Đã cấp quyền cho giảng viên.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }
  async function revoke(id: number) {
    setBusy(true);
    try {
      await api.delete(`${base}/permissions/${id}`);
      setPermissions((rows) => rows.filter((row) => row.lecturer_id !== id));
      toast.success("Đã thu hồi quyền.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="sm:max-w-xl">
    <DialogHeader><DialogTitle>Chia sẻ ngân hàng {bank.name}</DialogTitle><DialogDescription>Chỉ giảng viên được phân công vào học phần này mới có thể nhận quyền.</DialogDescription></DialogHeader>
    <div className="space-y-4">
      <div className="space-y-2"><Label htmlFor="bank-sharing-visibility">Phạm vi mặc định</Label><div className="flex gap-2"><select id="bank-sharing-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as "private" | "shared")} className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm"><option value="private">Riêng tư</option><option value="shared">Giảng viên cùng học phần được xem</option></select><Button type="button" variant="outline" disabled={busy || visibility === bank.visibility} onClick={() => void saveVisibility()}>Lưu</Button></div></div>
      <div className="space-y-2"><Label htmlFor="bank-sharing-lecturer">Cấp quyền cụ thể</Label><div className="flex flex-wrap gap-2"><select id="bank-sharing-lecturer" value={lecturerId ?? ""} onChange={(event) => setLecturerId(event.target.value ? Number(event.target.value) : null)} className="h-10 min-w-48 flex-1 rounded-lg border bg-background px-3 text-sm"><option value="">Chọn giảng viên</option>{lecturers.map((person) => <option key={person.id} value={person.id}>{person.full_name} · {person.email}</option>)}</select><select aria-label="Quyền được cấp" value={permission} onChange={(event) => setPermission(event.target.value as "view" | "edit")} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="view">Chỉ xem</option><option value="edit">Được sửa</option></select><Button type="button" disabled={busy || !lecturerId} onClick={() => void grant()}>Cấp quyền</Button></div></div>
      <div className="space-y-2"><p className="text-sm font-medium">Đã cấp quyền</p>{permissions.length === 0 ? <p className="text-sm text-muted-foreground">Chưa cấp quyền riêng.</p> : permissions.map((row) => <div key={row.lecturer_id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"><span>{lecturers.find((person) => person.id === row.lecturer_id)?.full_name ?? `Giảng viên #${row.lecturer_id}`} · {row.permission === "edit" ? "Được sửa" : "Chỉ xem"}</span><Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void revoke(row.lecturer_id)}>Thu hồi</Button></div>)}</div>
    </div>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Đóng</Button></DialogFooter>
  </DialogContent></Dialog>;
}
