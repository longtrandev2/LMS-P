import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Một mục của trang soạn đề (DESIGN.md §4 "Trang soạn"): tiêu đề 16/600 + mô tả xám, nội dung ngay dưới,
 * không bọc khung. Các mục ngăn nhau bằng `divide-y` của cột chính.
 */
export function EditorSection({ id, title, description, children, className }: {
  id: string; title: string; description?: string; children: React.ReactNode; className?: string;
}) {
  return <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-32 space-y-5 py-8", className)}>
    <header className="space-y-1">
      <h2 id={`${id}-title`} className="text-base font-semibold">{title}</h2>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </header>
    {children}
  </section>;
}

/** Trường có nhãn, gợi ý và lỗi gắn `aria-describedby`. */
export function Field({ id, label, hint, error, children, className }: {
  id: string; label: string; hint?: React.ReactNode; error?: string; children: React.ReactNode; className?: string;
}) {
  return <div className={cn("space-y-1.5", className)}>
    <Label htmlFor={id}>{label}</Label>
    {children}
    {error ? <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p>
      : hint ? <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p> : null}
  </div>;
}

/** Thuộc tính ARIA cho input trong `Field`. */
export function fieldAria(id: string, error?: string, hint?: boolean) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

/** Thanh lựa chọn kiểu quiz Frappe: nền xám, chọn = `bg-accent` + viền 1px foreground. */
export const CHOICE_BAR = cn(
  "flex items-start gap-3 rounded-lg border border-transparent bg-secondary px-3.5 py-3 transition-colors duration-150",
  "has-[[data-state=checked]]:border-foreground has-[[data-state=checked]]:bg-accent",
);
