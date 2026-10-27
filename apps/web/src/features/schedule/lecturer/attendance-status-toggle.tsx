import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ATTENDANCE_LABEL, ATTENDANCE_TONE } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/api";

const ORDER: AttendanceStatus[] = ["present", "late", "excused", "absent"];
const SHORT: Record<AttendanceStatus, string> = { present: "Có mặt", late: "Muộn", excused: "Có phép", absent: "Vắng" };

/** Màu ô đang chọn theo `ATTENDANCE_TONE` (tô nhạt cùng tông chữ, như badge). */
const ON: Record<(typeof ATTENDANCE_TONE)[AttendanceStatus], string> = {
  success: "data-[state=on]:bg-success/14 data-[state=on]:text-success dark:data-[state=on]:bg-success/18",
  warning: "data-[state=on]:bg-warning/16 data-[state=on]:text-warning dark:data-[state=on]:bg-warning/18",
  info: "data-[state=on]:bg-info/12 data-[state=on]:text-info dark:data-[state=on]:bg-info/18",
  destructive: "data-[state=on]:bg-destructive/12 data-[state=on]:text-destructive dark:data-[state=on]:bg-destructive/18",
};

/** Chọn trạng thái điểm danh bằng 4 nút liền (Có mặt / Muộn / Có phép / Vắng). */
export function AttendanceStatusToggle({ value, onChange, disabled, label, className }: {
  value: AttendanceStatus | null; onChange: (value: AttendanceStatus) => void; disabled?: boolean; label: string; className?: string;
}) {
  return (
    <ToggleGroup type="single" size="sm" value={value ?? ""} disabled={disabled} aria-label={label} className={className}
      onValueChange={(v) => { if (v) onChange(v as AttendanceStatus); }}>
      {ORDER.map((status) => (
        <ToggleGroupItem key={status} value={status} title={ATTENDANCE_LABEL[status]}
          className={cn("px-2.5 data-[state=on]:shadow-none", ON[ATTENDANCE_TONE[status]])}>
          {SHORT[status]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
