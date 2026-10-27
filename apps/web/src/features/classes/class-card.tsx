import { Link } from "react-router-dom";
import { CalendarCheck, FileText, FolderOpen, type LucideIcon } from "lucide-react";
import { UserAvatar } from "@/features/users/user-avatar";
import { useAvatarUrl } from "@/hooks/use-avatar-url";
import { utcDateTimeMillis } from "@/lib/date-time";
import { cn } from "@/lib/utils";
import type { ClassSummary } from "@/types/api";

const DAY_MS = 24 * 60 * 60 * 1000;

/** "16:00 29/10" theo giờ địa phương từ mốc UTC không hậu tố. */
function nextSessionLabel(value: string): string {
  const date = new Date(utcDateTimeMillis(value));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

function StatTile({ icon: Icon, value, label }: { icon: LucideIcon; value: React.ReactNode; label: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-secondary px-2.5 py-2" title={label}>
      <div className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
        <span className="truncate">{value}</span>
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function LecturerChip({ name, avatarPath }: { name: string; avatarPath?: string | null }) {
  const src = useAvatarUrl(avatarPath);
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-foreground/80">
      <UserAvatar name={name} src={src} size="sm" className="size-5 text-[9px]" />
      <span className="truncate">{name}</span>
    </span>
  );
}

/**
 * Thẻ lớp (DESIGN.md v3.1 §4 "Thẻ lớp", kiểu S-Link): `mã lớp • mã học phần` đỏ, tên môn 16/600,
 * 3 ô số liệu, Tiếp theo / Tiến trình + thanh tiến độ, chân thẻ tín chỉ + giảng viên.
 * Các phần lịch học chỉ hiện khi API có trường tương ứng (`GET /me/classes`); thẻ giảng viên giữ dạng gọn.
 */
export function ClassCard({ clazz, href, openCount, meta }: {
  clazz: ClassSummary;
  href: string;
  /** Số bài đang mở (undefined = chưa tải); ưu tiên `open_assignments_count` của API nếu có. */
  openCount?: number;
  /** Dòng meta cuối thẻ (vd. sĩ số) — thay cho giảng viên khi truyền vào. */
  meta?: React.ReactNode;
}) {
  const hasSchedule = clazz.total_sessions != null;
  const total = clazz.total_sessions ?? 0;
  const held = Math.min(clazz.held_sessions ?? 0, total);
  const percent = total > 0 ? Math.round((held / total) * 100) : 0;
  const nextMs = clazz.next_session_at ? utcDateTimeMillis(clazz.next_session_at) : null;
  const soon = nextMs != null && nextMs - Date.now() <= DAY_MS && nextMs >= Date.now() - 2 * 60 * 60 * 1000;
  const open = clazz.open_assignments_count ?? openCount;
  const locked = clazz.status === "locked";

  return (
    <Link to={href}
      className="group relative flex h-full flex-col rounded-xl border bg-card p-4 transition-colors duration-150 outline-none hover:bg-sidebar focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate pt-0.5 text-xs font-medium text-primary">
          <span className="font-mono">{clazz.code}</span>
          <span className="mx-1.5" aria-hidden>•</span>
          <span className="font-mono">{clazz.course_code}</span>
        </p>
        {locked ? <span className="shrink-0 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">Đã khóa</span>
          : soon ? <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground">Sắp tới</span>
          : <span className="shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">{clazz.semester}</span>}
      </div>
      <h3 className="mt-1.5 line-clamp-2 text-base leading-snug font-semibold">{clazz.course_name}</h3>
      <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{clazz.name}</p>

      {hasSchedule ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatTile icon={CalendarCheck} value={`${clazz.attended_sessions ?? 0}/${total}`} label="Buổi đã học" />
            <StatTile icon={FolderOpen} value={clazz.materials_count ?? 0} label="Học liệu" />
            <StatTile icon={FileText} value={open ?? "—"} label="Bài đang mở" />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-3 text-xs">
            <dt className="text-muted-foreground">Tiếp theo</dt>
            <dt className="text-muted-foreground">Tiến trình</dt>
            <dd className={cn("mt-0.5 font-medium tabular-nums", soon && "text-primary")}>
              {clazz.next_session_at ? nextSessionLabel(clazz.next_session_at) : "Hết lịch"}
            </dd>
            <dd className="mt-0.5 font-medium tabular-nums">{held}/{total} buổi</dd>
          </dl>
          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Tiến trình lớp học"
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
            <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{percent}%</span>
          </div>
        </>
      ) : null}

      <div className={cn("mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-muted-foreground", hasSchedule && "mt-4 border-t pt-3")}>
        <span className="flex min-w-0 items-center gap-2">
          {clazz.credits != null ? <span className="shrink-0 tabular-nums">{clazz.credits} tín chỉ</span> : null}
          {meta && clazz.credits != null ? <span aria-hidden>·</span> : null}
          {meta ? <span className="min-w-0 truncate">{meta}</span> : null}
        </span>
        {!meta && clazz.lecturer_name ? <LecturerChip name={clazz.lecturer_name} avatarPath={clazz.lecturer_avatar_url} />
          : !hasSchedule && open !== undefined ? (
            <span className={cn("inline-flex shrink-0 items-center gap-1.5 tabular-nums", open > 0 && "font-medium text-foreground")}>
              {open > 0 ? <span className="size-1.5 rounded-full bg-success" aria-hidden /> : null}
              {open > 0 ? `${open} bài đang mở` : "Không có bài mở"}
            </span>
          ) : null}
      </div>
    </Link>
  );
}
