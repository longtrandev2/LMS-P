import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="bank-sharing-visibility">Phạm vi mặc định</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={visibility} onValueChange={(value) => setVisibility(value as "private" | "shared")}>
            <SelectTrigger id="bank-sharing-visibility" className="w-full min-w-0 sm:flex-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="private">Riêng tư</SelectItem><SelectItem value="shared">Giảng viên cùng học phần được xem</SelectItem></SelectContent>
          </Select>
          <Button type="button" variant="outline" disabled={busy || visibility === bank.visibility} onClick={() => void saveVisibility()}>Lưu phạm vi</Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bank-sharing-lecturer">Cấp quyền cụ thể</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={lecturerId != null ? String(lecturerId) : ""} onValueChange={(value) => setLecturerId(value ? Number(value) : null)}>
            <SelectTrigger id="bank-sharing-lecturer" className="w-full min-w-0 sm:flex-1"><SelectValue placeholder="Chọn giảng viên" /></SelectTrigger>
            <SelectContent>{lecturers.map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.full_name} · {person.email}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={permission} onValueChange={(value) => setPermission(value as "view" | "edit")}>
            <SelectTrigger aria-label="Quyền được cấp" className="w-full sm:w-32"><SelectValue /></SelectTrigger>
            <SelectContent align="end"><SelectItem value="view">Chỉ xem</SelectItem><SelectItem value="edit">Được sửa</SelectItem></SelectContent>
          </Select>
          <Button type="button" disabled={busy || !lecturerId} onClick={() => void grant()}>Cấp quyền</Button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Đã cấp quyền</p>
        {permissions.length === 0 ? <p className="text-sm text-muted-foreground">Chưa cấp quyền riêng.</p> : <ul className="divide-y rounded-lg border">
          {permissions.map((row) => <li key={row.lecturer_id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="min-w-0 truncate">{lecturers.find((person) => person.id === row.lecturer_id)?.full_name ?? `Giảng viên #${row.lecturer_id}`}</span>
            <span className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary">{row.permission === "edit" ? "Được sửa" : "Chỉ xem"}</Badge>
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void revoke(row.lecturer_id)}>Thu hồi</Button>
            </span>
          </li>)}
        </ul>}
      </div>
    </div>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Đóng</Button></DialogFooter>
  </DialogContent></Dialog>;
}
