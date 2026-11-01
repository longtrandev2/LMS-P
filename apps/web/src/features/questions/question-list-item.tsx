import { Link, useNavigate } from "react-router-dom";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { questionTypeLabel } from "@/lib/question-types";
import type { QuestionSummary } from "@/types/api";
import { DIFFICULTY_LABEL, DIFFICULTY_VARIANT, plainExcerpt, TYPE_ICON } from "./question-labels";

/**
 * Một hàng câu hỏi (DESIGN.md §4 Danh sách): icon loại · nội dung rút gọn + meta xám · badge độ khó · menu `…`.
 * Cả hàng bấm được (link phủ), menu nằm trên lớp phủ.
 */
export function QuestionListItem({ item, canEdit, canDelete, onDelete }: {
  item: QuestionSummary; canEdit: boolean; canDelete: boolean; onDelete: () => void;
}) {
  const navigate = useNavigate();
  const Icon = TYPE_ICON[item.type] ?? Pencil;
  const href = `/questions/${item.id}/edit`;
  return <li className="group relative flex items-start gap-3 border-b px-3 py-3 transition-colors duration-150 hover:bg-secondary/60">
    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-foreground" strokeWidth={1.75} aria-hidden />
    <div className="min-w-0 flex-1 space-y-1">
      <Link to={href} className="line-clamp-2 text-sm leading-5 font-medium break-words outline-none after:absolute after:inset-0 after:rounded-sm focus-visible:after:ring-2 focus-visible:after:ring-ring">
        {plainExcerpt(item.content) || "(Không có nội dung)"}
      </Link>
      <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">#{item.id}</span><span aria-hidden>·</span>
        <span>{questionTypeLabel(item.type)}</span><span aria-hidden>·</span>
        <span className="max-w-56 truncate">{item.category_name}</span><span aria-hidden>·</span>
        <span className="tabular-nums" title={`Phiên bản ${item.version_no}`}>v{item.version_no}</span>
      </p>
    </div>
    <Badge variant={DIFFICULTY_VARIANT[item.difficulty]} className="mt-0.5">{DIFFICULTY_LABEL[item.difficulty]}</Badge>
    <div className="relative z-10 inline-flex items-center gap-0.5">
      <Button variant="ghost" size="icon-xs" title={canEdit ? "Chỉnh sửa câu hỏi" : "Xem câu hỏi"} aria-label={canEdit ? `Sửa #${item.id}` : `Xem #${item.id}`} onClick={() => navigate(href)}>
        {canEdit ? <Pencil className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
      </Button>
      {canDelete ? (
        <Button variant="ghost" size="icon-xs" title="Xóa câu hỏi" aria-label={`Xóa câu hỏi #${item.id}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      ) : null}
    </div>
  </li>;
}
