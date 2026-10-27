import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FieldHelp } from "./settings-section";

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  defaultText?: string;
  hint?: string;
  error?: string;
  changed?: boolean;
  decimal?: boolean;
  placeholder?: string;
  className?: string;
}

/** Ô số có đơn vị bên phải; đánh dấu chấm nhỏ khi giá trị khác bản đã lưu. */
export function NumberField({ id, label, value, onChange, unit, defaultText, hint, error, changed, decimal, placeholder, className }: NumberFieldProps) {
  const helpId = `${id}-help`;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="flex items-center gap-1.5">
        {label}
        {changed ? <><span className="size-1.5 rounded-full bg-primary" aria-hidden /><span className="sr-only">(đã sửa)</span></> : null}
      </Label>
      <div className="relative w-full max-w-44">
        <Input id={id} inputMode={decimal ? "decimal" : "numeric"} value={value} placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={helpId}
          className={cn("tabular-nums", unit && "pr-11")} />
        {unit ? <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span> : null}
      </div>
      <FieldHelp id={helpId} defaultText={defaultText} hint={hint} error={error} />
    </div>
  );
}
