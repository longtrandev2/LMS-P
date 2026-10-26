import { Link, useNavigate } from "react-router-dom";
import { BarChart3, MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatUtcDateTime } from "@/lib/date-time";
import { assignmentWindow } from "@/features/assignments/submission-window";
import { categoryLabel, formatPoints } from "./labels";
import type { AssignmentSummary } from "@/types/api";

const WINDOW_LABEL = { upcoming: "Chưa mở", open: "Đang mở", late: "Đang nhận nộp muộn", closed: "Đã đóng" } as const;
const WINDOW_VARIANT = { upcoming: "secondary", open: "success", late: "warning", closed: "secondary" } as const;

/** Hàng bài trong tab "Bài tập & Quiz" của lớp — dùng cho cả giảng viên và sinh viên; hành động phụ trong menu `…`. */
export function AssignmentListItem({ item, classId, canManage, canTake, busy, onPublish, onDelete }: {
  item: AssignmentSummary; classId: string; canManage: boolean; canTake: boolean; busy: boolean;
  onPublish: () => void; onDelete: () => void;
}) {
  const navigate = useNavigate();
  const phase = assignmentWindow(item);
  const base = `/classes/${classId}/assignments/${item.id}`;
  const draft = !canTake && !item.is_published;
  return <article className="flex flex-col gap-3 px-4 py-4 transition-colors duration-150 hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4">
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{item.title}</h3>
        <Badge variant="outline">{categoryLabel(item.category)}</Badge>
        {draft ? <Badge variant="secondary">Bản nháp</Badge> : <Badge variant={WINDOW_VARIANT[phase]}>{WINDOW_LABEL[phase]}</Badge>}
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
    <div className="flex shrink-0 items-center gap-1.5">
      {canTake ? (phase === "upcoming"
        ? <Button size="sm" variant="outline" disabled>Chưa mở</Button>
        : <Button size="sm" asChild><Link to={`/me/classes/${classId}/assignments/${item.id}`}>Mở bài</Link></Button>)
        : item.is_published
          ? <Button size="sm" variant="outline" asChild><Link to={`${base}/results`}><BarChart3 aria-hidden />Kết quả</Link></Button>
          : canManage ? <Button size="sm" variant="outline" asChild><Link to={`${base}/edit`}><Pencil aria-hidden />Sửa</Link></Button> : null}
      {!canTake && canManage ? <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={busy} aria-label={`Thao tác với ${item.title}`}><MoreHorizontal aria-hidden /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {item.is_published
            ? <DropdownMenuItem onClick={() => navigate(`${base}/edit`)}><Pencil aria-hidden /> Điều chỉnh</DropdownMenuItem>
            : <>
              <DropdownMenuItem disabled={item.question_count === 0} onClick={onPublish}>
                <Send aria-hidden /> {item.question_count === 0 ? "Xuất bản (cần thêm câu hỏi)" : "Xuất bản"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2 aria-hidden /> Xóa bản nháp</DropdownMenuItem>
            </>}
        </DropdownMenuContent>
      </DropdownMenu> : null}
      {busy ? <span role="status" className="sr-only">Đang xử lý</span> : null}
    </div>
  </article>;
}
