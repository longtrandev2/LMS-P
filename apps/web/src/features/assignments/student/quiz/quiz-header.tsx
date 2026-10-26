import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

function Progress({ answered, total, className }: { answered: number; total: number; className?: string }) {
  const percent = total ? Math.round((answered / total) * 100) : 0;
  return <div className={className}>
    <p className="text-xs font-medium tabular-nums">Đã làm {answered}/{total}</p>
    <div role="progressbar" aria-label="Tiến độ làm bài" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}
      className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-foreground transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
    </div>
  </div>;
}

/** Header cố định của trang làm quiz: tiêu đề, tiến độ, nút nộp. Tràn hết chiều ngang vùng nội dung. */
export function QuizHeader({ title, subtitle, backTo, answered, total, onSubmit, submitting }: {
  title: string; subtitle: string; backTo: string; answered: number; total: number; onSubmit: () => void; submitting: boolean;
}) {
  return <div className="sticky top-14 z-20 -mx-4 -mt-6 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mt-8 sm:px-6">
    <div className="flex items-center gap-3">
      <Button asChild variant="ghost" size="icon-sm">
        <Link to={backTo} aria-label="Về trang bài (nháp vẫn được lưu)"><ArrowLeft aria-hidden /></Link>
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold sm:text-base">{title}</h1>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Progress answered={answered} total={total} className="hidden w-44 sm:block" />
      <Button variant="cta" onClick={onSubmit} disabled={submitting}>{submitting ? "Đang nộp…" : "Nộp bài"}</Button>
    </div>
    <Progress answered={answered} total={total} className="mt-2 sm:hidden" />
  </div>;
}
