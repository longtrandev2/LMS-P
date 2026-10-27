import { BookOpen, CalendarDays, Clock, Hash, MapPin, UserRound, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClassSummary } from "@/types/api";
import { MetaRow, type MetaItem } from "./meta-row";

/**
 * Đầu trang lớp (DESIGN.md §4): tên lớp 24/600, dưới là hàng meta icon·chữ
 * (mã mono · học phần · học kỳ · giảng viên · sĩ số · phòng · lịch), hành động bên phải. Không khung.
 */
export function ClassWorkspaceHeader({ clazz, loading, showCapacity = true, showLecturer = false, actions }: {
  clazz?: ClassSummary;
  loading?: boolean;
  showCapacity?: boolean;
  showLecturer?: boolean;
  actions?: React.ReactNode;
}) {
  if (!clazz) {
    return loading ? (
      <div className="space-y-3" aria-busy="true" aria-label="Đang tải thông tin lớp">
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>
    ) : (
      <h1 className="text-2xl font-semibold tracking-tight">Lớp học</h1>
    );
  }

  const items: (MetaItem | null)[] = [
    { key: "code", icon: Hash, label: "Mã lớp", content: <span className="font-mono">{clazz.code}</span> },
    { key: "course", icon: BookOpen, label: "Học phần", content: clazz.course_name },
    { key: "semester", icon: CalendarDays, label: "Học kỳ", content: <span className="tabular-nums">HK {clazz.semester}</span> },
    showLecturer && clazz.lecturer_name ? { key: "lecturer", icon: UserRound, label: "Giảng viên", content: clazz.lecturer_name } : null,
    showCapacity ? {
      key: "size", icon: Users, label: "Sĩ số",
      content: <span className="tabular-nums">{clazz.enrolled_count ?? 0}{clazz.max_students ? `/${clazz.max_students}` : ""} sinh viên</span>,
    } : null,
    clazz.room ? { key: "room", icon: MapPin, label: "Phòng", content: clazz.room } : null,
    clazz.schedule ? { key: "schedule", icon: Clock, label: "Lịch", content: clazz.schedule } : null,
  ];

  return (
    // Màn rộng: tiêu đề + hành động cùng hàng, meta trải cả chiều ngang; màn hẹp: tiêu đề → meta → hành động.
    <div className="grid grid-cols-1 gap-y-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6">
      <h1 className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-semibold tracking-tight text-balance sm:col-start-1 sm:row-start-1">
        {clazz.name}
        {clazz.status === "locked" ? <Badge variant="destructive">Đã khóa</Badge> : null}
      </h1>
      <MetaRow className="sm:col-span-2 sm:row-start-2" items={items.filter((item): item is MetaItem => item != null)} />
      {actions ? <div className="flex flex-wrap items-center gap-2 pt-1 sm:col-start-2 sm:row-start-1 sm:justify-end sm:pt-0">{actions}</div> : null}
    </div>
  );
}
