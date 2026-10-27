import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Eye, MonitorDot, MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORY_ICON } from "@/features/assignments/lecturer/labels";
import { ExamMeta, ExamPhaseBadge, examPhase } from "@/features/exams/shared/exam-status";
import type { AssignmentSummary } from "@/types/api";

/**
 * Hàng kỳ thi phía giảng viên (DESIGN.md §4 "Danh sách"): icon · tên + meta (thời lượng, chế độ đề, khung giờ) ·
 * trạng thái · hành động. Nháp: Sửa + Xem trước đề; đã xuất bản: Giám sát + Kết quả; còn lại trong menu `…`.
 */
export function ExamListItem({ item, classId, busy, onPublish, onDelete }: {
  item: AssignmentSummary; classId: string; busy: boolean; onPublish: () => void; onDelete: () => void;
}) {
  const navigate = useNavigate();
  const phase = examPhase(item);
  const base = `/classes/${classId}/assignments/${item.id}`;
  const Icon = CATEGORY_ICON[item.category];
  const draft = !item.is_published;
  const href = draft ? `${base}/edit` : `${base}/monitor`;

  return <li className="relative flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 sm:flex-nowrap border-b px-2 py-2.5 transition-colors duration-150 last:border-b-0 hover:bg-secondary/50">
    <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
    <div className="min-w-0 flex-1 basis-[calc(100%-1.75rem)] sm:basis-auto">
      <h3 className="truncate text-sm font-medium">
        <Link to={href} className="rounded-sm outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring">{item.title}</Link>
      </h3>
      <ExamMeta item={item} showMode />
    </div>
    <span className="ml-7 sm:ml-0"><ExamPhaseBadge phase={phase} /></span>
    <div className="relative z-[1] flex flex-1 items-center justify-end gap-1 sm:w-[15.5rem] sm:flex-none sm:shrink-0">
      {draft ? <>
        <Button size="sm" variant="secondary" asChild><Link to={`${base}/edit`}><Pencil aria-hidden />Sửa</Link></Button>
        <Button size="sm" variant="secondary" asChild><Link to={`${base}/papers`}><Eye aria-hidden />Xem trước đề</Link></Button>
      </> : <>
        <Button size="sm" variant="secondary" asChild><Link to={`${base}/monitor`}><MonitorDot aria-hidden />Giám sát</Link></Button>
        <Button size="sm" variant="secondary" asChild><Link to={`${base}/results`}><BarChart3 aria-hidden />Kết quả</Link></Button>
      </>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={busy} aria-label={`Thao tác với ${item.title}`}><MoreHorizontal aria-hidden /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {draft ? <>
            <DropdownMenuItem disabled={item.question_count === 0} onClick={onPublish}>
              <Send aria-hidden /> {item.question_count === 0 ? "Xuất bản (cần thêm câu hỏi)" : "Xuất bản"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2 aria-hidden /> Xóa bản nháp</DropdownMenuItem>
          </> : <>
            <DropdownMenuItem onClick={() => navigate(`${base}/papers`)}><Eye aria-hidden /> Xem trước đề</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`${base}/edit`)}><Pencil aria-hidden /> Điều chỉnh</DropdownMenuItem>
          </>}
        </DropdownMenuContent>
      </DropdownMenu>
      {busy ? <span role="status" className="sr-only">Đang xử lý</span> : null}
    </div>
  </li>;
}
