import { ArrowRight, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { blankCount, type QuestionDraft } from "../question-draft";

const answerTag = "rounded-md bg-success/10 px-1.5 py-0.5 font-mono text-[11px] text-success";
const bar = "rounded-lg bg-secondary px-4 py-3 text-sm";

/** Thanh lựa chọn như khung quiz Frappe: nút tròn/vuông + nội dung; đáp án đúng tô xanh nhạt khi `show`. */
function Choice({ text, multi, correct, show }: { text: string; multi: boolean; correct: boolean; show: boolean }) {
  const mark = show && correct;
  return <li className={cn("flex items-start gap-3", bar, mark && "bg-success/10")}>
    <span aria-hidden className={cn("mt-0.5 grid size-4 shrink-0 place-items-center border border-foreground/25 bg-background", multi ? "rounded-[4px]" : "rounded-full",
      mark && "border-success bg-success text-background")}>{mark ? <Check className="size-3" strokeWidth={3} /> : null}</span>
    <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{text || <span className="text-muted-foreground">(trống)</span>}</span>
    {mark ? <span className="sr-only">(đáp án đúng)</span> : null}
  </li>;
}

function Accepted({ values }: { values: string[] }) {
  return <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">Đáp án: {values.length
    ? values.map((value) => <span key={value} className={answerTag}>{value}</span>) : "—"}</p>;
}

/** Ô trả lời của câu khách quan ở trạng thái disabled; `showAnswers` đánh dấu đáp án đúng (chế độ xem). */
export function AnswerPreview({ draft, showAnswers }: { draft: QuestionDraft; showAnswers: boolean }) {
  switch (draft.type) {
    case "mcq": case "multiple_choice":
      return <ul className="space-y-2">{draft.options.map((option) => <Choice key={option.key} text={option.content}
        multi={draft.type === "multiple_choice"} correct={option.is_correct} show={showAnswers} />)}</ul>;
    case "true_false":
      return <ul className="grid grid-cols-2 gap-2">{[true, false].map((value) => <Choice key={String(value)} text={value ? "Đúng" : "Sai"}
        multi={false} correct={draft.true_false === value} show={showAnswers} />)}</ul>;
    case "short_answer":
      return <div className="space-y-2"><Input disabled placeholder="Nhập câu trả lời" aria-label="Câu trả lời" />{showAnswers ? <Accepted values={draft.accepted} /> : null}</div>;
    case "numeric":
      return <div className="space-y-2"><Input disabled inputMode="decimal" placeholder="Nhập một số" aria-label="Đáp số" className="max-w-48" />
        {showAnswers ? <p className="text-xs text-muted-foreground">Đáp án: <span className={answerTag}>{draft.numeric.value || "—"}</span> ± {draft.numeric.tolerance || 0}</p> : null}</div>;
    case "fill_blank":
      return <ol className="grid gap-3 sm:grid-cols-2">{Array.from({ length: blankCount(draft.content) }, (_, index) => <li key={index} className="space-y-1.5">
        <span className="text-xs text-muted-foreground">Ô {index + 1}</span>
        <Input disabled aria-label={`Ô ${index + 1}`} />
        {showAnswers ? <Accepted values={draft.blanks[index]?.accepted ?? []} /> : null}
      </li>)}</ol>;
    case "matching": {
      const rights = [...draft.pairs.map((pair) => pair.right), ...draft.distractors.map((item) => item.text)].filter(Boolean);
      return <div className="space-y-3">
        <ul className="space-y-2">{draft.pairs.map((pair) => <li key={pair.key} className="grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-2 text-sm">
          <span className={cn(bar, "py-2.5 break-words")}>{pair.left || "—"}</span>
          <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
          <span className={cn("truncate rounded-lg border border-dashed px-4 py-2.5 text-muted-foreground", showAnswers && "border-transparent bg-success/10 text-success")}>{showAnswers ? pair.right || "—" : "Chọn…"}</span>
        </li>)}</ul>
        <p className="text-xs text-muted-foreground">Cột phải ({rights.length} mục) được trộn khi sinh viên làm bài.</p>
      </div>;
    }
    case "ordering":
      return <div className="space-y-2">
        <ol className="space-y-2">{draft.items.map((item, index) => <li key={item.key} className={cn("flex items-center gap-3", bar, "py-2.5")}>
          <span className="w-4 font-mono text-xs text-muted-foreground tabular-nums">{index + 1}</span><span className="min-w-0 break-words">{item.text || "—"}</span>
        </li>)}</ol>
        <p className="text-xs text-muted-foreground">{showAnswers ? "Đây là thứ tự đúng." : "Thứ tự đúng ở trên; sinh viên thấy danh sách đã trộn."}</p>
      </div>;
    default:
      return null;
  }
}
