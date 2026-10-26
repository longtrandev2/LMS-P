import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClassSummary } from "@/types/api";

/**
 * Header workspace lớp (DESIGN.md §5): mã lớp mono · tên · học phần, rồi dòng meta
 * học kỳ · giảng viên · sĩ số · phòng · lịch. Dùng chung cho trang lớp GV và SV.
 */
export function ClassWorkspaceHeader({ clazz, loading, showCapacity = true, actions }: {
  clazz?: ClassSummary;
  loading?: boolean;
  showCapacity?: boolean;
  actions?: React.ReactNode;
}) {
  if (!clazz) {
    return loading ? (
      <div className="space-y-2" aria-busy="true" aria-label="Đang tải thông tin lớp">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>
    ) : (
      <h1 className="text-2xl font-semibold tracking-tight">Lớp học</h1>
    );
  }

  const meta = [
    { label: "Học kỳ", value: <span className="font-mono">{clazz.semester}</span> },
    clazz.lecturer_name ? { label: "Giảng viên", value: clazz.lecturer_name } : null,
    showCapacity
      ? { label: "Sĩ số", value: <span className="tabular-nums">{clazz.enrolled_count ?? 0}{clazz.max_students ? ` / ${clazz.max_students}` : ""}</span> }
      : null,
    clazz.room ? { label: "Phòng", value: clazz.room } : null,
    clazz.schedule ? { label: "Lịch", value: clazz.schedule } : null,
  ].filter((item) => item != null);

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 space-y-1.5">
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{clazz.code}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{clazz.course_name}</span>
          {clazz.status === "locked" ? <Badge variant="destructive">Đã khóa</Badge> : null}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{clazz.name}</h1>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {meta.map((item) => (
            <div key={item.label} className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="font-medium">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
