import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Một mục của trang soạn đề (DESIGN.md §5 "Trang soạn"): tiêu đề + mô tả bên trái trên desktop (1/3),
 * panel nội dung bên phải (2/3); xếp dọc trên màn hẹp.
 */
export function EditorSection({ id, title, description, children, className }: {
  id: string; title: string; description?: string; children: React.ReactNode; className?: string;
}) {
  return <section id={id} aria-labelledby={`${id}-title`}
    className={cn("grid scroll-mt-32 gap-x-8 gap-y-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]", className)}>
    <header className="space-y-1 lg:pt-1">
      <h2 id={`${id}-title`} className="text-base font-semibold tracking-tight">{title}</h2>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </header>
    <div className="min-w-0 space-y-5 rounded-xl border bg-card p-4 sm:p-5">{children}</div>
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
