import { Link } from "react-router-dom";
import { Eye, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { questionTypeLabel } from "@/lib/question-types";
import type { QuestionDifficulty, QuestionSummary } from "@/types/api";
import { TYPE_ICON } from "./editor/question-type-picker";
import { DIFFICULTY_LABEL } from "./question-list-filters";

const difficultyClass: Record<QuestionDifficulty, string> = {
  easy: "bg-success/10 text-success",
  medium: "bg-gold/10 text-gold",
  hard: "bg-destructive/10 text-destructive",
};

/** Bỏ ký hiệu Markdown phổ biến để hiện đoạn trích gọn. */
const excerpt = (content: string) => content
  .replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`~]|\[\[(\d+)\]\]/g, (match, n?: string) => n ? `[${n}]` : "")
  .replace(/\s+/g, " ").trim();

export function QuestionListItem({ item, position, canEdit, canDelete, onDelete }: {
  item: QuestionSummary; position: number; canEdit: boolean; canDelete: boolean; onDelete: () => void;
}) {
  const Icon = TYPE_ICON[item.type] ?? Pencil;
  const href = `/questions/${item.id}/edit`;
  return <article className="flex flex-col gap-3 border-b p-4 last:border-b-0 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
    <div className="flex min-w-0 flex-1 items-start gap-3.5">
      <span className="hidden size-9 shrink-0 place-items-center rounded-lg border bg-muted/40 text-muted-foreground sm:grid"><Icon className="size-4" aria-hidden /></span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-mono text-muted-foreground">{String(position).padStart(2, "0")}</span>
          <span className="font-medium">{questionTypeLabel(item.type)}</span>
          <span className={`rounded-md px-1.5 py-0.5 font-medium ${difficultyClass[item.difficulty]}`}>{DIFFICULTY_LABEL[item.difficulty]}</span>
          <span className="text-muted-foreground">Phiên bản {item.version_no}</span>
        </div>
        <h3 className="line-clamp-2 text-sm leading-6 font-medium break-words">
          <Link to={href} tabIndex={-1} className="rounded outline-none hover:underline">{excerpt(item.content) || "(Không có nội dung)"}</Link>
        </h3>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><FolderOpen className="size-3.5" aria-hidden />{item.category_name}</p>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
      <Button asChild variant="outline" size="sm">
        <Link to={href}>{canEdit ? <><Pencil aria-hidden /> Chỉnh sửa</> : <><Eye aria-hidden /> Xem</>}</Link>
      </Button>
      {canDelete ? <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Xóa câu hỏi ${item.id}`} onClick={onDelete}><Trash2 aria-hidden /></Button> : null}
    </div>
  </article>;
}
