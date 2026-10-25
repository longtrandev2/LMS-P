import { Code2, FolderOpen, ListChecks, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuestionDifficulty, QuestionSummary } from "@/types/api";

const difficulty: Record<QuestionDifficulty, { label: string; className: string }> = {
  easy: { label: "Dễ", className: "bg-success/10 text-success" },
  medium: { label: "Trung bình", className: "bg-gold/10 text-gold" },
  hard: { label: "Khó", className: "bg-destructive/10 text-destructive" },
};

export function QuestionListItem({ item, position, busy, onEdit, onDelete }: {
  item: QuestionSummary; position: number; busy: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const Icon = item.type === "mcq" ? ListChecks : Code2;
  const level = difficulty[item.difficulty];
  return <article className="flex flex-col gap-4 border-b p-5 last:border-b-0 sm:flex-row sm:items-start sm:gap-5">
    <div className="flex min-w-0 flex-1 items-start gap-4">
      <span className="hidden size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary sm:grid"><Icon className="size-5" aria-hidden /></span>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs"><span className="mr-1 font-mono text-muted-foreground">{String(position).padStart(2, "0")}</span><span className="font-medium text-primary">{item.type === "mcq" ? "Trắc nghiệm" : "Lập trình"}</span><span className={`rounded-md px-2 py-0.5 font-medium ${level.className}`}>{level.label}</span><span className="text-muted-foreground">Phiên bản {item.version_no}</span></div>
        <h3 className="line-clamp-3 whitespace-pre-wrap break-words text-sm font-medium leading-6">{item.content}</h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><FolderOpen className="size-3.5" aria-hidden />{item.category_name}</span>{item.topic ? <span className="rounded-md bg-muted px-2 py-0.5">{item.topic}</span> : null}</div>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
      <Button variant="outline" size="sm" disabled={busy} onClick={onEdit}><Pencil aria-hidden />{busy ? "Đang mở…" : "Chỉnh sửa"}</Button>
      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Xóa câu hỏi ${item.id}`} onClick={onDelete}><Trash2 aria-hidden /></Button>
    </div>
  </article>;
}
