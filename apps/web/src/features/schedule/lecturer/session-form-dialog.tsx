import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/form-field-error";
import { errorText } from "@/lib/error-messages";
import { periodRange } from "@/lib/schedule";
import type { ClassSession, ClassSummary, SessionMode } from "@/types/api";
import { ModeSelect, PeriodSelect } from "./schedule-fields";
import { isoDate } from "./schedule-utils";
import { SessionMaterialsField, useSessionMaterials } from "./session-materials-field";
import { useScheduleMutations } from "./use-schedule";

/** Thêm/sửa một buổi; gắn học liệu của lớp vào buổi qua PATCH /materials/{id} `session_id`. */
export function SessionFormDialog({ classId, clazz, session, onOpenChange }: {
  classId: string; clazz?: ClassSummary; session: ClassSession | null; onOpenChange: (open: boolean) => void;
}) {
  const { save, linkMaterials, invalidate } = useScheduleMutations(classId);
  const [date, setDate] = useState(session?.date ?? isoDate());
  const [start, setStart] = useState(session?.start_period ?? 1);
  const [end, setEnd] = useState(session?.end_period ?? 3);
  const [room, setRoom] = useState(session?.room ?? clazz?.room ?? "");
  const [mode, setMode] = useState<SessionMode>(session?.mode ?? "in_person");
  const [title, setTitle] = useState(session?.title ?? "");
  const [note, setNote] = useState(session?.note ?? "");
  const materials = useSessionMaterials(classId, session?.id ?? null);
  const busy = save.isPending || linkMaterials.isPending;
  const error = !date ? "Chọn ngày học." : end < start ? "Tiết kết thúc phải từ tiết bắt đầu trở đi." : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (error) return;
    try {
      const saved = await save.mutateAsync({
        id: session?.id,
        input: { date, start_period: start, end_period: end, room: room.trim() || null, mode, title: title.trim() || null, note: note.trim() || null },
      });
      const changes = materials.changes(saved.id);
      if (changes.length) await linkMaterials.mutateAsync(changes);
      toast.success(session ? "Đã cập nhật buổi học." : "Đã thêm buổi học.");
      onOpenChange(false);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      void invalidate();
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{session ? `Sửa buổi ${session.session_no}` : "Thêm buổi học"}</DialogTitle>
          <DialogDescription className="tabular-nums">Tiết {start}–{end} · {periodRange(start, Math.max(start, end))}</DialogDescription>
        </DialogHeader>
        <form id="session-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-2"><Label htmlFor="ss-date">Ngày học</Label><Input id="ss-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="ss-mode">Hình thức</Label><ModeSelect id="ss-mode" label="Hình thức" value={mode} onChange={setMode} /></div>
          <div className="space-y-2"><Label htmlFor="ss-start">Từ tiết</Label>
            <PeriodSelect id="ss-start" label="Từ tiết" value={start} onChange={(v) => { setStart(v); setEnd((e) => Math.max(e, v)); }} /></div>
          <div className="space-y-2"><Label htmlFor="ss-end">Đến tiết</Label><PeriodSelect id="ss-end" edge="end" label="Đến tiết" value={end} onChange={setEnd} /></div>
          <div className="space-y-2"><Label htmlFor="ss-room">Phòng</Label><Input id="ss-room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="VD: A1.1 hoặc Online" /></div>
          <div className="space-y-2"><Label htmlFor="ss-title">Tiêu đề <span className="text-muted-foreground">(tùy chọn)</span></Label>
            <Input id="ss-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Socket TCP" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="ss-note">Ghi chú <span className="text-muted-foreground">(tùy chọn)</span></Label>
            <Textarea id="ss-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <SessionMaterialsField className="sm:col-span-2" state={materials} />
          {error ? <div className="sm:col-span-2"><FieldError text={error} /></div> : null}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button type="submit" form="session-form" disabled={busy || !!error}>{busy ? "Đang lưu…" : session ? "Lưu thay đổi" : "Thêm buổi"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
