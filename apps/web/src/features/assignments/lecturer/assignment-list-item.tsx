import { Link } from "react-router-dom";
import { BarChart3, Pencil, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUtcDateTime } from "@/lib/date-time";
import { assignmentWindow } from "@/features/assignments/submission-window";
import { categoryLabel, formatPoints } from "./labels";
import type { AssignmentSummary } from "@/types/api";

const WINDOW_LABEL = { upcoming: "Chưa mở", open: "Đang mở", late: "Đang nhận nộp muộn", closed: "Đã đóng" } as const;

/** Thẻ bài trong tab "Bài tập & Quiz" của lớp — dùng cho cả giảng viên và sinh viên. */
export function AssignmentListItem({ item, classId, canManage, canTake, busy, onPublish, onDelete }: {
  item: AssignmentSummary; classId: string; canManage: boolean; canTake: boolean; busy: boolean;
  onPublish: () => void; onDelete: () => void;
}) {
  const phase = assignmentWindow(item);
  const base = `/classes/${classId}/assignments/${item.id}`;
  return <article className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-heading text-base font-semibold">{item.title}</h3>
        <Badge variant="outline">{categoryLabel(item.category)}</Badge>
        {canTake ? <Badge variant="secondary">{WINDOW_LABEL[phase]}</Badge>
          : <Badge variant={item.is_published ? "default" : "secondary"} className={item.is_published ? "border-success/30 bg-success/10 text-success" : undefined}>
            {item.is_published ? WINDOW_LABEL[phase] : "Bản nháp"}
          </Badge>}
      </div>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex gap-1"><dt className="sr-only">Số câu</dt><dd><span className="font-medium text-foreground tabular-nums">{item.question_count}</span> câu</dd></div>
        <div className="flex gap-1"><dt className="sr-only">Tổng điểm</dt><dd><span className="font-medium text-foreground tabular-nums">{formatPoints(item.total_points)}</span> điểm</dd></div>
        {item.available_from ? <div className="flex gap-1"><dt>Mở</dt><dd className="tabular-nums">{formatUtcDateTime(item.available_from)}</dd></div> : null}
        <div className="flex gap-1"><dt>Hạn</dt><dd className="tabular-nums">{formatUtcDateTime(item.due_at)}</dd></div>
        {item.allow_late && item.late_due_at ? <div className="flex gap-1"><dt>Muộn đến</dt><dd className="tabular-nums">{formatUtcDateTime(item.late_due_at)} (−{item.late_penalty_percent}%)</dd></div> : null}
        <div className="flex gap-1"><dt className="sr-only">Số lượt</dt><dd>{item.max_attempts ? `${item.max_attempts} lượt` : "Không giới hạn lượt"}</dd></div>
      </dl>
    </div>
    <div className="flex shrink-0 flex-wrap gap-2">
      {canTake ? (phase === "upcoming"
        ? <Button size="sm" variant="outline" disabled>Chưa mở</Button>
        : <Button size="sm" asChild><Link to={`/me/classes/${classId}/assignments/${item.id}`}>Mở bài</Link></Button>)
        : item.is_published ? <>
          {canManage ? <Button size="sm" variant="outline" asChild><Link to={`${base}/edit`}><Pencil aria-hidden />Điều chỉnh</Link></Button> : null}
          <Button size="sm" variant="outline" asChild><Link to={`${base}/results`}><BarChart3 aria-hidden />Kết quả</Link></Button>
        </> : canManage ? <>
          <Button size="sm" variant="outline" asChild><Link to={`${base}/edit`}><Pencil aria-hidden />Sửa</Link></Button>
          <Button size="sm" disabled={busy || item.question_count === 0} title={item.question_count === 0 ? "Thêm câu hỏi trước khi xuất bản" : undefined} onClick={onPublish}>
            <Send aria-hidden />{busy ? "Đang xuất bản…" : "Xuất bản"}
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={`Xóa bản nháp ${item.title}`} disabled={busy}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}><Trash2 aria-hidden /></Button>
        </> : null}
    </div>
  </article>;
}
