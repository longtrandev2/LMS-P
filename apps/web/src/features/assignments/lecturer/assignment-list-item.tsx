import { Link, useNavigate } from "react-router-dom";
import { BarChart3, MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { assignmentWindow } from "@/features/assignments/submission-window";
import { CATEGORY_ICON, categoryLabel, formatPoints, shortDateTime } from "./labels";
import type { AssignmentSummary } from "@/types/api";

const WINDOW_LABEL = { upcoming: "Chưa mở", open: "Đang mở", late: "Nộp muộn", closed: "Đã đóng" } as const;
const WINDOW_VARIANT = { upcoming: "info", open: "success", late: "warning", closed: "secondary" } as const;

/**
 * Hàng bài trong tab "Bài tập" của lớp (DESIGN.md §4 "Danh sách"): icon loại · tên 14/500 + meta xám ·
 * badge trạng thái tô nhạt · hành động (giảng viên: "Kết quả" + menu `…`; sinh viên: "Mở bài").
 */
export function AssignmentListItem({ item, classId, canManage, canTake, busy, onPublish, onDelete }: {
  item: AssignmentSummary; classId: string; canManage: boolean; canTake: boolean; busy: boolean;
  onPublish: () => void; onDelete: () => void;
}) {
  const navigate = useNavigate();
  const phase = assignmentWindow(item);
  const base = `/classes/${classId}/assignments/${item.id}`;
  const draft = !canTake && !item.is_published;
  const Icon = CATEGORY_ICON[item.category];
  const href = canTake ? (phase === "upcoming" ? null : `/me/classes/${classId}/assignments/${item.id}`)
    : item.is_published ? `${base}/results` : canManage ? `${base}/edit` : null;
  const late = item.allow_late && item.late_due_at;

  return <li className="relative flex min-h-14 items-center gap-3 border-b px-2 py-2.5 transition-colors duration-150 last:border-b-0 hover:bg-secondary/50">
    <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
    <div className="min-w-0 flex-1">
      <h3 className="truncate text-sm font-medium">
        {href ? <Link to={href} className="rounded-sm outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring">{item.title}</Link> : item.title}
      </h3>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground tabular-nums">
        <span>{categoryLabel(item.category)}</span>
        <span aria-hidden>·</span><span>{item.question_count} câu</span>
        <span aria-hidden>·</span><span>{formatPoints(item.total_points)} điểm</span>
        {item.time_limit_minutes ? <><span aria-hidden>·</span><span>{item.time_limit_minutes} phút</span></> : null}
        {phase === "upcoming" && item.available_from ? <><span aria-hidden>·</span><span>Mở {shortDateTime(item.available_from)}</span></> : null}
        <span aria-hidden>·</span><span>Hạn {shortDateTime(item.due_at)}</span>
        {late ? <><span aria-hidden>·</span><span>muộn đến {shortDateTime(item.late_due_at)} (−{item.late_penalty_percent}%)</span></> : null}
        <span aria-hidden>·</span><span>{item.max_attempts ? `${item.max_attempts} lượt` : "Không giới hạn lượt"}</span>
      </p>
    </div>
    {draft ? <Badge>Nháp</Badge> : <Badge variant={WINDOW_VARIANT[phase]}>{WINDOW_LABEL[phase]}</Badge>}
    <div className="relative z-[1] flex w-[7.5rem] shrink-0 items-center justify-end gap-1">
      {canTake ? (phase === "upcoming"
        ? <Button size="sm" variant="secondary" disabled>Chưa mở</Button>
        : <Button size="sm" variant="secondary" asChild><Link to={href ?? "#"}>Mở bài</Link></Button>)
        : item.is_published
          ? <Button size="sm" variant="secondary" asChild><Link to={`${base}/results`}><BarChart3 aria-hidden />Kết quả</Link></Button>
          : canManage ? <Button size="sm" variant="secondary" asChild><Link to={`${base}/edit`}><Pencil aria-hidden />Soạn</Link></Button> : null}
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
  </li>;
}
