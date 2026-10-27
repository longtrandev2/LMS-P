import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorText } from "@/lib/error-messages";
import { GRADE_COMPONENTS, GRADE_COMPONENT_LABEL } from "@/lib/grades";
import { cn } from "@/lib/utils";
import type { GradeComponent, GradePolicy } from "@/types/api";
import { useGradeMutations } from "./use-gradebook";

type PenaltyKey = "absent_penalty" | "late_penalty" | "excused_penalty";
const PENALTIES: { key: PenaltyKey; label: string }[] = [
  { key: "absent_penalty", label: "Trừ mỗi buổi vắng" },
  { key: "late_penalty", label: "Trừ mỗi buổi muộn" },
  { key: "excused_penalty", label: "Trừ mỗi buổi có phép" },
];
const toText = (n: number) => String(n).replace(".", ",");
const toNum = (s: string) => Number(s.replace(",", "."));

/** Cấu hình trọng số (tổng realtime phải = 100) và chính sách chuyên cần của lớp (spec §5.1, §5.3). */
export function GradePolicyDialog({ classId, policy, onOpenChange }: {
  classId: string; policy: GradePolicy; onOpenChange: (open: boolean) => void;
}) {
  const { savePolicy } = useGradeMutations(classId);
  const [weights, setWeights] = useState<Record<GradeComponent, string>>(
    () => Object.fromEntries(GRADE_COMPONENTS.map((c) => [c, String(policy.weights[c])])) as Record<GradeComponent, string>);
  const [maxAbsences, setMaxAbsences] = useState(policy.attendance.max_absences == null ? "" : String(policy.attendance.max_absences));
  const [penalties, setPenalties] = useState<Record<PenaltyKey, string>>({
    absent_penalty: toText(policy.attendance.absent_penalty), late_penalty: toText(policy.attendance.late_penalty),
    excused_penalty: toText(policy.attendance.excused_penalty),
  });

  const weightValues = GRADE_COMPONENTS.map((c) => Number(weights[c]));
  const sum = weightValues.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  const weightsOk = weightValues.every((w) => Number.isInteger(w) && w >= 0 && w <= 100) && sum === 100;
  const penaltyOk = PENALTIES.every(({ key }) => { const v = toNum(penalties[key]); return penalties[key] !== "" && v >= 0 && v <= 10 && Number.isInteger(v * 4); });
  const maxOk = maxAbsences === "" || (/^\d+$/.test(maxAbsences) && Number(maxAbsences) <= 200);
  const valid = weightsOk && penaltyOk && maxOk;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    try {
      await savePolicy.mutateAsync({
        weights: Object.fromEntries(GRADE_COMPONENTS.map((c) => [c, Number(weights[c])])) as Record<GradeComponent, number>,
        attendance: {
          max_absences: maxAbsences === "" ? null : Number(maxAbsences),
          absent_penalty: toNum(penalties.absent_penalty), late_penalty: toNum(penalties.late_penalty), excused_penalty: toNum(penalties.excused_penalty),
        },
      });
      toast.success("Đã lưu cấu hình điểm.");
      onOpenChange(false);
    } catch (e) { toast.error(errorText(e)); }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cấu hình điểm</DialogTitle>
          <DialogDescription>Trọng số áp dụng cho mọi sinh viên của lớp; thay đổi được ghi nhật ký.</DialogDescription>
        </DialogHeader>
        <form id="policy-form" onSubmit={submit} className="space-y-6" noValidate>
          <fieldset className="space-y-3">
            <legend className="mb-3 flex w-full items-center justify-between text-sm font-medium">
              Trọng số (%)
              <span className={cn("tabular-nums", sum === 100 ? "text-success" : "text-destructive")} aria-live="polite">Tổng {sum}/100</span>
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {GRADE_COMPONENTS.map((c) => (
                <div key={c} className="space-y-1.5">
                  <Label htmlFor={`w-${c}`} className="text-xs text-muted-foreground">{GRADE_COMPONENT_LABEL[c]}</Label>
                  <Input id={`w-${c}`} type="number" min={0} max={100} step={1} className="tabular-nums" value={weights[c]}
                    onChange={(e) => setWeights((w) => ({ ...w, [c]: e.target.value }))} />
                </div>
              ))}
            </div>
            {!weightsOk ? <p className="text-xs text-destructive">Mỗi trọng số là số nguyên 0–100 và tổng phải đúng 100.</p> : null}
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-sm font-medium">Chính sách chuyên cần</legend>
            <div className="space-y-1.5">
              <Label htmlFor="max-absences" className="text-xs text-muted-foreground">Số buổi nghỉ cho phép (vắng + có phép)</Label>
              <Input id="max-absences" inputMode="numeric" className="tabular-nums sm:w-40" value={maxAbsences} placeholder="20% số buổi"
                onChange={(e) => setMaxAbsences(e.target.value.trim())} aria-invalid={!maxOk} />
              <p className="text-xs text-muted-foreground">Để trống = 20% số buổi không hủy. Vượt quá → không đủ điều kiện dự thi.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {PENALTIES.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key} className="text-xs text-muted-foreground">{label}</Label>
                  <Input id={key} inputMode="decimal" className="tabular-nums" value={penalties[key]}
                    onChange={(e) => setPenalties((p) => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            {!penaltyOk ? <p className="text-xs text-destructive">Điểm trừ trong khoảng 0–10, bước 0,25.</p> : null}
          </fieldset>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button type="submit" form="policy-form" disabled={!valid || savePolicy.isPending}>{savePolicy.isPending ? "Đang lưu…" : "Lưu cấu hình"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
