import { Link, useNavigate } from "react-router-dom";
import { Eye, FolderOpen, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { questionTypeLabel } from "@/lib/question-types";
import type { QuestionDifficulty, QuestionSummary } from "@/types/api";
import { TYPE_ICON } from "./editor/question-type-picker";
import { DIFFICULTY_LABEL } from "./question-list-filters";

const difficultyVariant: Record<QuestionDifficulty, "success" | "warning" | "destructive"> = {
  easy: "success",
  medium: "warning",
  hard: "destructive",
};

/** Bỏ ký hiệu Markdown phổ biến để hiện đoạn trích gọn. */
const excerpt = (content: string) => content
  .replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`~]|\[\[(\d+)\]\]/g, (match, n?: string) => n ? `[${n}]` : "")
  .replace(/\s+/g, " ").trim();

/** Một hàng câu hỏi: trích nội dung + meta; hành động phụ trong menu `…`. */
export function QuestionListItem({ item, position, canEdit, canDelete, onDelete }: {
  item: QuestionSummary; position: number; canEdit: boolean; canDelete: boolean; onDelete: () => void;
}) {
  const navigate = useNavigate();
  const Icon = TYPE_ICON[item.type] ?? Pencil;
  const href = `/questions/${item.id}/edit`;
  return <article className="flex items-start gap-3 border-b px-4 py-3 transition-colors duration-150 last:border-b-0 hover:bg-muted/40">
    <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-xs text-muted-foreground tabular-nums">{position}</span>
    <div className="min-w-0 flex-1 space-y-1.5">
      <h3 className="line-clamp-2 text-sm leading-6 font-medium break-words">
        <Link to={href} className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
          {excerpt(item.content) || "(Không có nội dung)"}
        </Link>
      </h3>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 text-foreground"><Icon className="size-3.5 text-muted-foreground" aria-hidden />{questionTypeLabel(item.type)}</span>
        <Badge variant={difficultyVariant[item.difficulty]}>{DIFFICULTY_LABEL[item.difficulty]}</Badge>
        <span className="inline-flex min-w-0 items-center gap-1.5"><FolderOpen className="size-3.5 shrink-0" aria-hidden /><span className="truncate">{item.category_name}</span></span>
        <span className="tabular-nums">Phiên bản {item.version_no}</span>
      </div>
    </div>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với câu hỏi ${item.id}`}><MoreHorizontal aria-hidden /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigate(href)}>
          {canEdit ? <><Pencil aria-hidden /> Chỉnh sửa</> : <><Eye aria-hidden /> Xem</>}
        </DropdownMenuItem>
        {canDelete ? <>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2 aria-hidden /> Xóa câu hỏi</DropdownMenuItem>
        </> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  </article>;
}
