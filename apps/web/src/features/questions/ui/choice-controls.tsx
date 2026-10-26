import { Checkbox as CheckboxPrimitive, RadioGroup as RadioPrimitive } from "radix-ui";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Checkbox / radio cục bộ cho trang soạn câu hỏi (radix, có focus ring, dùng được bằng bàn phím).
 * Đề xuất chuyển vào `components/ui` khi được phép sửa thư mục đó.
 */
export function CheckBox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return <CheckboxPrimitive.Root className={cn(
    "peer grid size-4.5 shrink-0 place-items-center rounded-[5px] border border-input bg-card outline-none transition-colors",
    "focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60",
    "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
    "aria-invalid:border-destructive", className)} {...props}>
    <CheckboxPrimitive.Indicator><CheckIcon className="size-3.5" strokeWidth={3} aria-hidden /></CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>;
}

export const RadioGroup = RadioPrimitive.Root;

export function RadioDot({ className, ...props }: React.ComponentProps<typeof RadioPrimitive.Item>) {
  return <RadioPrimitive.Item className={cn(
    "grid size-4.5 shrink-0 place-items-center rounded-full border border-input bg-card outline-none transition-colors",
    "focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60",
    "data-[state=checked]:border-primary aria-invalid:border-destructive", className)} {...props}>
    <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-primary" />
  </RadioPrimitive.Item>;
}

/** Nhóm nút bật/tắt dạng segmented (độ khó, Mẫu/Ẩn…). */
export function SegmentedToggle<T extends string>({ value, options, onChange, label, size = "default", disabled }: {
  value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string;
  size?: "sm" | "default"; disabled?: boolean;
}) {
  return <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border bg-muted/40 p-0.5">
    {options.map((option) => {
      const active = option.value === value;
      return <button key={option.value} type="button" role="radio" aria-checked={active} disabled={disabled}
        onClick={() => onChange(option.value)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          const index = options.findIndex((item) => item.value === value);
          const next = options[(index + (event.key === "ArrowRight" ? 1 : options.length - 1)) % options.length];
          onChange(next.value);
          (event.currentTarget.parentElement?.querySelectorAll("button")[options.indexOf(next)] as HTMLButtonElement | undefined)?.focus();
        }}
        tabIndex={active ? 0 : -1}
        className={cn("rounded-md font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60",
          size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3.5 text-sm",
          active ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground")}>
        {option.label}
      </button>;
    })}
  </div>;
}
