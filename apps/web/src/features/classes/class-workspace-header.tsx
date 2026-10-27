import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClassSummary } from "@/types/api";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts.at(-2)?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-sm font-semibold">{children}</dd>
    </div>
  );
}

/**
 * Đầu trang lớp (DESIGN.md §4 — "Khung thông tin lớp" kiểu S-Link): tên lớp đỏ 24/600 + "• n tín chỉ" + badge trạng thái,
 * hành động bên phải; dưới là khối `bg-brand-soft` 4 cột nhãn xám + giá trị đậm.
 */
export function ClassWorkspaceHeader({ clazz, loading, showCapacity = true, actions }: {
  clazz?: ClassSummary;
  loading?: boolean;
  /** Ô cuối: sĩ số/phòng (giảng viên) — tắt thì hiện số tín chỉ (sinh viên). */
  showCapacity?: boolean;
  /** Giữ để tương thích; khung thông tin luôn có ô Giảng viên. */
  showLecturer?: boolean;
  actions?: React.ReactNode;
}) {
  if (!clazz) {
    return loading ? (
      <div className="space-y-4" aria-busy="true" aria-label="Đang tải thông tin lớp">
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-[4.5rem] w-full rounded-xl" />
      </div>
    ) : (
      <h1 className="text-2xl font-semibold tracking-tight">Lớp học</h1>
    );
  }

  const size = `${clazz.enrolled_count ?? 0}${clazz.max_students ? `/${clazz.max_students}` : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 space-y-1">
          <h1 className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-2xl font-semibold tracking-tight text-balance">
            <span className="text-primary">{clazz.name}</span>
            {clazz.credits ? <span className="text-base font-normal text-muted-foreground tabular-nums">• {clazz.credits} tín chỉ</span> : null}
            {clazz.status === "locked"
              ? <Badge variant="destructive">Đã khóa</Badge>
              : <Badge variant="success">Đang học</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono text-[13px]">{clazz.course_code}</span> · {clazz.course_name}
            {clazz.schedule ? <> · Lịch {clazz.schedule}</> : null}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-brand-soft px-5 py-4 md:grid-cols-4">
        <InfoCell label="Nhóm lớp"><span className="truncate font-mono text-[13px]">{clazz.code}</span></InfoCell>
        <InfoCell label="Kỳ học"><span className="tabular-nums">HK {clazz.semester}</span></InfoCell>
        <InfoCell label="Giảng viên">
          <Avatar size="sm" className="size-5">
            {clazz.lecturer_avatar_url ? <AvatarImage src={clazz.lecturer_avatar_url} alt="" /> : null}
            <AvatarFallback className="bg-background text-[10px]">{initials(clazz.lecturer_name)}</AvatarFallback>
          </Avatar>
          <span className="truncate">{clazz.lecturer_name}</span>
        </InfoCell>
        {showCapacity ? (
          <InfoCell label="Sĩ số / Phòng">
            <span className="truncate tabular-nums">{size} SV{clazz.room ? ` · ${clazz.room}` : ""}</span>
          </InfoCell>
        ) : (
          <InfoCell label="Số tín chỉ"><span className="tabular-nums">{clazz.credits ?? "—"}</span></InfoCell>
        )}
      </dl>
    </div>
  );
}
