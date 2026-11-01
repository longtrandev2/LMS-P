import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FieldError } from "@/components/form-field-error";
import { errorText } from "@/lib/error-messages";
import type { ClassSession, ClassSummary, SessionPattern } from "@/types/api";
import { ModeSelect, PeriodSelect, WeekdaySelect } from "./schedule-fields";
import { MAX_SESSIONS, countGenerated, isoDate, patternsFromSchedule } from "./schedule-utils";
import { useScheduleMutations } from "./use-schedule";

const BLANK: SessionPattern = { weekday: 1, start_period: 1, end_period: 3, room: "", mode: "in_person" };

/** Dialog "Sinh lịch học": khoảng ngày + 1–7 mẫu tuần, tùy chọn thay thế buổi chưa điểm danh, xem trước số buổi. */
export function GenerateSessionsDialog({ classId, clazz, sessions, onOpenChange }: {
  classId: string; clazz?: ClassSummary; sessions: ClassSession[]; onOpenChange: (open: boolean) => void;
}) {
  const { generate } = useScheduleMutations(classId);
  const [from, setFrom] = useState(isoDate());
  const [to, setTo] = useState(isoDate(15 * 7));
  const [patterns, setPatterns] = useState<SessionPattern[]>(() => {
    const parsed = patternsFromSchedule(clazz?.schedule, clazz?.room);
    return parsed.length ? parsed : [{ ...BLANK, room: clazz?.room ?? "" }];
  });
  const [replace, setReplace] = useState(false);

  const created = countGenerated(from, to, patterns);
  const removable = replace ? sessions.filter((s) => !s.attendance_taken_at && !s.is_cancelled).length : 0;
  const after = sessions.length - removable + created;
  const error = !from || !to || to < from ? "Ngày kết thúc phải sau ngày bắt đầu."
    : patterns.some((p) => p.end_period < p.start_period) ? "Tiết kết thúc phải từ tiết bắt đầu trở đi."
    : created === 0 ? "Không có ngày nào khớp các mẫu đã chọn."
    : after > MAX_SESSIONS ? `Lớp sẽ có ${after} buổi, vượt giới hạn ${MAX_SESSIONS}.` : null;

  const update = (index: number, patch: Partial<SessionPattern>) =>
    setPatterns((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  async function submit() {
    try {
      const payload = patterns.map((p) => ({ ...p, room: p.room?.trim() || null }));
      const result = await generate.mutateAsync({ from, to, patterns: payload, replace_unmarked: replace });
      toast.success(`Đã tạo ${result.created} buổi${result.removed ? `, thay ${result.removed} buổi cũ` : ""}.`);
      onOpenChange(false);
    } catch (e) { toast.error(errorText(e)); }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sinh lịch học</DialogTitle>
          <DialogDescription>Tạo một buổi cho mỗi ngày trong khoảng khớp với mẫu tuần. Buổi được đánh số theo thời gian.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="gen-from">Từ ngày</Label><Input id="gen-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="gen-to">Đến ngày</Label><Input id="gen-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Mẫu tuần <span className="font-normal text-muted-foreground">({patterns.length}/7)</span></legend>
            <div className="hidden grid-cols-[7rem_1fr_1fr_1fr_7rem_2rem] gap-2 text-xs text-muted-foreground sm:grid">
              <span>Thứ</span><span>Từ tiết</span><span>Đến tiết</span><span>Phòng</span><span>Hình thức</span><span />
            </div>
            {patterns.map((p, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 border-b pb-2 last:border-0 sm:grid-cols-[7rem_1fr_1fr_1fr_7rem_2rem] sm:border-0 sm:pb-0">
                <WeekdaySelect label={`Thứ của mẫu ${i + 1}`} value={p.weekday} onChange={(weekday) => update(i, { weekday })} />
                <PeriodSelect label={`Tiết bắt đầu mẫu ${i + 1}`} value={p.start_period} onChange={(v) => update(i, { start_period: v, end_period: Math.max(v, p.end_period) })} />
                <PeriodSelect edge="end" label={`Tiết kết thúc mẫu ${i + 1}`} value={p.end_period} onChange={(end_period) => update(i, { end_period })} />
                <Input aria-label={`Phòng mẫu ${i + 1}`} placeholder="Phòng" value={p.room ?? ""} onChange={(e) => update(i, { room: e.target.value })} />
                <ModeSelect label={`Hình thức mẫu ${i + 1}`} value={p.mode} onChange={(mode) => update(i, { mode })} />
                <Button variant="ghost" size="icon" aria-label={`Xóa mẫu ${i + 1}`} disabled={patterns.length === 1}
                  onClick={() => setPatterns((list) => list.filter((_, j) => j !== i))}><X aria-hidden /></Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" disabled={patterns.length >= 7} onClick={() => setPatterns((list) => [...list, { ...BLANK, room: clazz?.room ?? "" }])}>
              <Plus aria-hidden /> Thêm mẫu
            </Button>
          </fieldset>
          <label className="flex items-start justify-between gap-4 text-sm">
            <span className="space-y-0.5">
              <span className="block font-medium">Thay thế các buổi chưa điểm danh</span>
              <span className="block text-muted-foreground">Tắt để thêm vào lịch hiện có. Buổi đã điểm danh luôn được giữ.</span>
            </span>
            <Switch checked={replace} onCheckedChange={setReplace} />
          </label>
          <p className="rounded-lg bg-secondary px-3 py-2.5 text-sm tabular-nums" aria-live="polite">
            Sẽ tạo <strong>{created}</strong> buổi
            {replace ? <> · thay tối đa <strong>{removable}</strong> buổi chưa điểm danh</> : null}
            {" "}· lớp có khoảng <strong>{Math.max(after, 0)}</strong> buổi sau khi sinh.
          </p>
          {error ? <FieldError text={error} /> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button disabled={!!error || generate.isPending} onClick={submit}>{generate.isPending ? "Đang sinh…" : `Sinh ${created} buổi`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
