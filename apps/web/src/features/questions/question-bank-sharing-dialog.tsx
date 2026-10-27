import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { QuestionBank } from "@/types/api";
import type { QuestionBankPermission } from "@/types/questions";

type Lecturer = { id: number; full_name: string; email: string };

const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();

/** Chia sẻ ngân hàng: phạm vi (segmented) · cấp quyền cho giảng viên cùng học phần · danh sách người có quyền. */
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

  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="gap-6 sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Chia sẻ “{bank.name}”</DialogTitle>
      <DialogDescription>Chỉ giảng viên được phân công vào học phần này mới nhận được quyền.</DialogDescription>
    </DialogHeader>
    <section className="space-y-2" aria-labelledby="bank-sharing-visibility">
      <h3 id="bank-sharing-visibility" className="text-sm font-medium">Phạm vi mặc định</h3>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" aria-labelledby="bank-sharing-visibility" value={visibility}
          onValueChange={(value) => value && setVisibility(value as "private" | "shared")}>
          <ToggleGroupItem value="private">Riêng tư</ToggleGroupItem>
          <ToggleGroupItem value="shared">Cả học phần được xem</ToggleGroupItem>
        </ToggleGroup>
        {visibility !== bank.visibility ? <Button type="button" size="sm" disabled={busy} onClick={() => void saveVisibility()}>Lưu phạm vi</Button> : null}
      </div>
    </section>
    <section className="space-y-2" aria-labelledby="bank-sharing-grant">
      <h3 id="bank-sharing-grant" className="text-sm font-medium">Cấp quyền cho giảng viên</h3>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={lecturerId != null ? String(lecturerId) : ""} onValueChange={(value) => setLecturerId(value ? Number(value) : null)}>
          <SelectTrigger aria-labelledby="bank-sharing-grant" className="w-full min-w-0 sm:flex-1"><SelectValue placeholder="Chọn giảng viên" /></SelectTrigger>
          <SelectContent>{lecturers.length ? lecturers.map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.full_name} · {person.email}</SelectItem>)
            : <p className="px-2 py-1.5 text-sm text-muted-foreground">Không có giảng viên nào khác trong học phần.</p>}</SelectContent>
        </Select>
        <Select value={permission} onValueChange={(value) => setPermission(value as "view" | "edit")}>
          <SelectTrigger aria-label="Quyền được cấp" className="w-full sm:w-28"><SelectValue /></SelectTrigger>
          <SelectContent align="end"><SelectItem value="view">Chỉ xem</SelectItem><SelectItem value="edit">Được sửa</SelectItem></SelectContent>
        </Select>
        <Button type="button" disabled={busy || !lecturerId} onClick={() => void grant()}>Cấp quyền</Button>
      </div>
    </section>
    <section className="space-y-1" aria-labelledby="bank-sharing-people">
      <h3 id="bank-sharing-people" className="text-sm font-medium">Người có quyền riêng</h3>
      {permissions.length === 0 ? <p className="py-2 text-sm text-muted-foreground">Chưa cấp quyền riêng cho ai.</p> : <ul className="divide-y">
        {permissions.map((row) => {
          const person = lecturers.find((item) => item.id === row.lecturer_id);
          const name = person?.full_name ?? `Giảng viên #${row.lecturer_id}`;
          return <li key={row.lecturer_id} className="flex items-center gap-3 py-2.5">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">{initials(name)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{name}</span>
              {person ? <span className="block truncate text-xs text-muted-foreground">{person.email}</span> : null}
            </span>
            <Badge variant={row.permission === "edit" ? "info" : "secondary"}>{row.permission === "edit" ? "Được sửa" : "Chỉ xem"}</Badge>
            <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" disabled={busy} onClick={() => void revoke(row.lecturer_id)}>Thu hồi</Button>
          </li>;
        })}
      </ul>}
    </section>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Xong</Button></DialogFooter>
  </DialogContent></Dialog>;
}
