import { CalendarRange, FilePen, FileCheck2, FolderOpen, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssignmentSummary, ClassSummary } from "@/types/api";
import { shortDateTime } from "./assignment-kind";
import { openDeadlines } from "./class-assignments-query";

function Line({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

/** Panel phụ bên phải tab Tổng quan (giảng viên) — kiểu thẻ "Manage Batch" của Frappe. */
export function ClassSummaryPanel({ clazz, assignments, materialCount, onOpenTab }: {
  clazz?: ClassSummary;
  assignments?: AssignmentSummary[];
  materialCount?: number;
  onOpenTab: (tab: "assignments" | "materials" | "students") => void;
}) {
  const open = assignments ? openDeadlines(assignments).filter((d) => d.state !== "upcoming").length : undefined;
  const drafts = assignments?.filter((a) => !a.is_published).length;
  const seats = clazz?.max_students ? clazz.max_students - (clazz.enrolled_count ?? 0) : null;

  return (
    <aside aria-label="Tóm tắt lớp" className="rounded-xl border p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Tóm tắt lớp</h2>
        {seats != null ? <span className="rounded-md bg-success/12 px-1.5 py-0.5 text-xs font-medium text-success tabular-nums">Còn {seats} chỗ</span> : null}
      </div>
      {!clazz || open === undefined ? (
        <div className="mt-4 space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-40" />)}
        </div>
      ) : (
        <ul className="mt-4 space-y-3 text-sm tabular-nums">
          <Line icon={Users}>{clazz.enrolled_count ?? 0}{clazz.max_students ? `/${clazz.max_students}` : ""} sinh viên</Line>
          <Line icon={FileCheck2}>{open > 0 ? `${open} bài đang mở` : "Không có bài đang mở"}</Line>
          {drafts ? <Line icon={FilePen}>{drafts} bản nháp chưa xuất bản</Line> : null}
          {materialCount != null ? <Line icon={FolderOpen}>{materialCount} học liệu</Line> : null}
          {clazz.enroll_until ? <Line icon={CalendarRange}>Ghi danh đến {shortDateTime(clazz.enroll_until)}</Line> : null}
        </ul>
      )}
      <div className="mt-5 grid gap-2">
        <Button variant="outline" className="w-full" onClick={() => onOpenTab("students")}>Quản lý sinh viên</Button>
        <Button variant="outline" className="w-full" onClick={() => onOpenTab("assignments")}>Xem bài tập</Button>
      </div>
    </aside>
  );
}
