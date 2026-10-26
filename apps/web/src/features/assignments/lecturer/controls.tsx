import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive, RadioGroup as RadioPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/*
 * Điều khiển form dựa trên Radix (bàn phím + ARIA sẵn có). `components/ui` chưa có
 * checkbox/switch/radio nên đặt tạm ở đây; lead có thể chuyển lên `components/ui`.
 */

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return <SwitchPrimitive.Root className={cn(
    "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-input transition-colors outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary", className)} {...props}>
    <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5" />
  </SwitchPrimitive.Root>;
}

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return <CheckboxPrimitive.Root className={cn(
    "peer grid size-4 shrink-0 place-items-center rounded-[4px] border border-input bg-background transition-colors outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
    "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className)} {...props}>
    <CheckboxPrimitive.Indicator><CheckIcon className="size-3" strokeWidth={3} aria-hidden /></CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>;
}

export interface RadioCardOption<T extends string> { id: T; label: string; description?: string; disabled?: boolean }

/** Nhóm radio dạng thẻ: chọn bằng phím mũi tên, có mô tả ngắn cho từng lựa chọn. */
export function RadioCards<T extends string>({ value, onChange, options, label, columns = 2, disabled }: {
  value: T; onChange: (value: T) => void; options: RadioCardOption<T>[]; label: string; columns?: 2 | 3 | 4; disabled?: boolean;
}) {
  const grid = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return <RadioPrimitive.Root aria-label={label} value={value} disabled={disabled}
    onValueChange={(next) => onChange(next as T)} className={cn("grid gap-2", grid)}>
    {options.map((option) => <RadioPrimitive.Item key={option.id} value={option.id} disabled={option.disabled}
      className={cn(
        "group flex h-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors outline-none",
        "hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary/5")}>
      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-input group-data-[state=checked]:border-primary">
        <RadioPrimitive.Indicator className="size-2 rounded-full bg-primary" />
      </span>
      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-medium">{option.label}</span>
        {option.description ? <span className="block text-xs leading-5 text-muted-foreground">{option.description}</span> : null}
      </span>
    </RadioPrimitive.Item>)}
  </RadioPrimitive.Root>;
}

/** Hàng bật/tắt có nhãn + mô tả; bấm cả hàng đều đổi trạng thái. */
export function SwitchRow({ id, label, description, checked, onChange, disabled }: {
  id: string; label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean;
}) {
  return <div className="flex items-start justify-between gap-4">
    <label htmlFor={id} className="min-w-0 cursor-pointer space-y-0.5">
      <span className="block text-sm font-medium">{label}</span>
      {description ? <span className="block text-xs leading-5 text-muted-foreground">{description}</span> : null}
    </label>
    <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5" />
  </div>;
}
