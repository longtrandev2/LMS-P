import { useId } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface RadioCardOption<T extends string> { id: T; label: string; description?: string; disabled?: boolean }

const GRID = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 xl:grid-cols-4" } as const;

/**
 * Nhóm radio dạng thẻ (DESIGN.md §6: lựa chọn ≤ 4 dùng radio) dựng trên `ui/radio-group`:
 * phím mũi tên đổi lựa chọn, cả thẻ là `<label>` của radio.
 */
export function RadioCards<T extends string>({ value, onChange, options, label, columns = 2, disabled }: {
  value: T; onChange: (value: T) => void; options: RadioCardOption<T>[]; label: string; columns?: 2 | 3 | 4; disabled?: boolean;
}) {
  const base = useId();
  return <RadioGroup aria-label={label} value={value} disabled={disabled} onValueChange={(next) => onChange(next as T)}
    className={cn("gap-2", GRID[columns])}>
    {options.map((option) => {
      const id = `${base}-${option.id}`;
      const off = disabled || option.disabled;
      return <label key={option.id} htmlFor={id} className={cn(
        "flex h-full items-start gap-3 rounded-lg border p-3 transition-colors duration-150",
        "has-[[data-state=checked]]:border-foreground/40 has-[[data-state=checked]]:bg-accent",
        off ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/40")}>
        <RadioGroupItem id={id} value={option.id} disabled={option.disabled} className="mt-0.5" />
        <span className="min-w-0 space-y-0.5">
          <span className="block text-sm font-medium">{option.label}</span>
          {option.description ? <span className="block text-xs leading-5 text-muted-foreground">{option.description}</span> : null}
        </span>
      </label>;
    })}
  </RadioGroup>;
}

/** Hàng bật/tắt (DESIGN.md §6: bật/tắt dùng Switch) có nhãn + mô tả; nhãn gắn với công tắc. */
export function SwitchRow({ id, label, description, checked, onChange, disabled }: {
  id: string; label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean;
}) {
  return <div className="flex items-start justify-between gap-4">
    <label htmlFor={id} className={cn("min-w-0 space-y-0.5", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
      <span className="block text-sm font-medium">{label}</span>
      {description ? <span className="block text-xs leading-5 text-muted-foreground">{description}</span> : null}
    </label>
    <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5" />
  </div>;
}
