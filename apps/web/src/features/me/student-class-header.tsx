import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/features/users/user-avatar";
import { useAvatarUrl } from "@/hooks/use-avatar-url";
import type { ClassSummary } from "@/types/api";

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-center gap-2 text-sm font-semibold">{children}</dd>
    </div>
  );
}

/**
 * Đầu trang lớp của sinh viên (DESIGN.md v3.1 §4 "Khung thông tin lớp", kiểu S-Link):
 * tiêu đề lớp đỏ 24/600 + "• n tín chỉ" + badge trạng thái; dưới là khối `bg-brand-soft` nhãn xám + giá trị đậm.
 */
export function StudentClassHeader({ clazz, loading }: { clazz?: ClassSummary; loading?: boolean }) {
  const avatar = useAvatarUrl(clazz?.lecturer_avatar_url);
  if (!clazz) {
    return loading ? (
      <div className="space-y-4" aria-busy="true" aria-label="Đang tải thông tin lớp">
        <Skeleton className="h-7 w-80 max-w-full" />
        <Skeleton className="h-[72px] w-full rounded-xl" />
      </div>
    ) : <h1 className="text-2xl font-semibold tracking-tight">Lớp học</h1>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-balance text-primary">{clazz.name}</h1>
        {clazz.credits != null ? (
          <span className="text-base font-medium text-muted-foreground tabular-nums">• {clazz.credits} tín chỉ</span>
        ) : null}
        {clazz.status === "locked" ? <Badge variant="destructive">Đã khóa</Badge> : <Badge variant="success">Đang học</Badge>}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-brand-soft px-5 py-4 md:grid-cols-4">
        <InfoItem label="Nhóm lớp"><span className="truncate font-mono">{clazz.code}</span></InfoItem>
        <InfoItem label="Kỳ học"><span className="tabular-nums">HK {clazz.semester}</span></InfoItem>
        <InfoItem label="Học phần">
          <span className="truncate" title={`${clazz.course_code} — ${clazz.course_name}`}>{clazz.course_name}</span>
        </InfoItem>
        <InfoItem label="Giảng viên">
          {clazz.lecturer_name ? (
            <>
              <UserAvatar name={clazz.lecturer_name} src={avatar} size="sm" className="bg-background" />
              <span className="truncate">{clazz.lecturer_name}</span>
            </>
          ) : <span className="font-normal text-muted-foreground">Chưa phân công</span>}
        </InfoItem>
      </dl>
    </div>
  );
}
