import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SESSION_MODE_LABEL, WEEKDAY_LABEL, periodRange } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import type { SessionMode } from "@/types/api";
import { PERIODS } from "./schedule-utils";

interface NumberSelectProps { value: number; onChange: (value: number) => void; label: string; className?: string; id?: string }

/** Chọn tiết 1–14, kèm giờ bắt đầu (hoặc kết thúc) để dễ đối chiếu. */
export function PeriodSelect({ value, onChange, label, className, id, edge = "start" }: NumberSelectProps & { edge?: "start" | "end" }) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger id={id} aria-label={label} className={cn("w-full tabular-nums", className)}><SelectValue /></SelectTrigger>
      <SelectContent>
        {PERIODS.map((p) => {
          const [start, end] = periodRange(p, p).split(" – ");
          return <SelectItem key={p} value={String(p)} className="tabular-nums">Tiết {p} <span className="text-muted-foreground">{edge === "start" ? start : end}</span></SelectItem>;
        })}
      </SelectContent>
    </Select>
  );
}

export function WeekdaySelect({ value, onChange, label, className, id }: NumberSelectProps) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger id={id} aria-label={label} className={cn("w-full", className)}><SelectValue /></SelectTrigger>
      <SelectContent>
        {WEEKDAY_LABEL.slice(1).map((name, i) => <SelectItem key={name} value={String(i + 1)}>{name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function ModeSelect({ value, onChange, label, className, id }: {
  value: SessionMode; onChange: (value: SessionMode) => void; label: string; className?: string; id?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SessionMode)}>
      <SelectTrigger id={id} aria-label={label} className={cn("w-full", className)}><SelectValue /></SelectTrigger>
      <SelectContent>
        {(Object.keys(SESSION_MODE_LABEL) as SessionMode[]).map((mode) => <SelectItem key={mode} value={mode}>{SESSION_MODE_LABEL[mode]}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
