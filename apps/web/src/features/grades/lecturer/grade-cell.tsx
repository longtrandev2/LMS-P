import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { errorText } from "@/lib/error-messages";
import { GRADE_COMPONENT_LABEL, formatScore } from "@/lib/grades";
import { cn } from "@/lib/utils";
import type { ComponentGrade, GradeComponent, GradeRow } from "@/types/api";
import { useGradeMutations } from "./use-gradebook";

const SOURCE: Record<string, string> = { manual: "Giảng viên nhập", csv: "Nhập từ CSV", exam: "Điểm kỳ thi" };

function tooltipText(grade: ComponentGrade): string {
  const parts: string[] = [];
  if (grade.override) {
    parts.push(SOURCE[grade.override.source ?? "manual"] ?? "Giảng viên nhập");
    if (grade.override.reason) parts.push(`Lý do: ${grade.override.reason}`);
    parts.push(`Điểm hệ thống: ${formatScore(grade.system_score, 2)}`);
  }
  if (grade.status === "provisional") parts.push("Tạm tính — còn bài đang mở hoặc đang chấm");
  if (grade.status === "missing") parts.push("Chưa có điểm");
  return parts.join(" · ");
}

/** Ô điểm thành phần: bấm mở popover ghi đè (0–10, bước 0,1, lý do bắt buộc); ô ghi đè có chấm + tooltip nguồn/lý do. */
export function GradeCell({ classId, row, component }: { classId: string; row: GradeRow; component: GradeComponent }) {
  const grade = row.components[component];
  const { override } = useGradeMutations(classId);
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState("");
  const [reason, setReason] = useState("");
  const parsed = Number(score.replace(",", "."));
  const invalid = score.trim() === "" || !Number.isFinite(parsed) || parsed < 0 || parsed > 10 || Math.abs(Math.round(parsed * 10) - parsed * 10) > 1e-9;
  const tip = tooltipText(grade);

  function onOpenChange(next: boolean) {
    if (next) { setScore(grade.score != null ? String(grade.score).replace(".", ",") : ""); setReason(grade.override?.reason ?? ""); }
    setOpen(next);
  }
  async function submit(clear = false) {
    try {
      await override.mutateAsync({ studentId: row.student_id, component, score: clear ? null : parsed, reason: clear ? null : reason.trim() });
      toast.success(clear ? "Đã dùng lại điểm hệ thống." : "Đã cập nhật điểm.");
      setOpen(false);
    } catch (e) { toast.error(errorText(e)); }
  }

  const trigger = (
    <button type="button" aria-label={`${GRADE_COMPONENT_LABEL[component]} của ${row.full_name}: ${formatScore(grade.score, 2)}. Bấm để sửa`}
      className={cn("inline-flex h-7 min-w-12 items-center justify-end gap-1.5 rounded-md px-2 tabular-nums transition-colors duration-150 outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring aria-expanded:bg-secondary",
        grade.status !== "final" && "text-muted-foreground")}>
      {grade.override ? <span className="size-1.5 shrink-0 rounded-full bg-info" aria-hidden /> : null}
      {formatScore(grade.score, 2)}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {tip ? (
        <Tooltip>
          <TooltipTrigger asChild><PopoverTrigger asChild>{trigger}</PopoverTrigger></TooltipTrigger>
          <TooltipContent>{tip}</TooltipContent>
        </Tooltip>
      ) : <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
      <PopoverContent align="end" className="w-72 space-y-3">
        <div>
          <p className="text-sm font-semibold">{GRADE_COMPONENT_LABEL[component]} · {row.full_name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">Điểm hệ thống: {formatScore(grade.system_score, 2)}</p>
        </div>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!invalid && reason.trim()) void submit(); }}>
          <div className="space-y-1.5">
            <Label htmlFor={`score-${row.student_id}-${component}`}>Điểm (0–10)</Label>
            <Input id={`score-${row.student_id}-${component}`} inputMode="decimal" className="tabular-nums" value={score} autoFocus
              onChange={(e) => setScore(e.target.value)} aria-invalid={score !== "" && invalid} placeholder="VD: 8,5" />
            {score !== "" && invalid ? <p className="text-xs text-destructive">Nhập số 0–10, bước 0,1.</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`reason-${row.student_id}-${component}`}>Lý do</Label>
            <Textarea id={`reason-${row.student_id}-${component}`} rows={2} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bắt buộc, ví dụ: phúc khảo" />
          </div>
          <div className="flex items-center justify-between gap-2">
            {grade.override ? <Button type="button" variant="secondary" size="sm" disabled={override.isPending} onClick={() => submit(true)}>Dùng điểm hệ thống</Button> : <span />}
            <Button type="submit" size="sm" disabled={invalid || !reason.trim() || override.isPending}>Lưu</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
