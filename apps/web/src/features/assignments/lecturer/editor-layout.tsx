import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Một mục của trang soạn đề: tiêu đề + mô tả bên trái (desktop), nội dung bên phải. */
export function EditorSection({ id, title, description, children, className }: {
  id: string; title: string; description?: string; children: React.ReactNode; className?: string;
}) {
  return <section id={id} aria-labelledby={`${id}-title`} className={cn("rounded-xl border bg-card", className)}>
    <header className="border-b px-5 py-4">
      <h2 id={`${id}-title`} className="font-heading text-base font-semibold">{title}</h2>
      {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
    </header>
    <div className="space-y-5 p-5">{children}</div>
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
