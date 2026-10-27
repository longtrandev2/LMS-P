import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { errorText } from "@/lib/error-messages";
import type { AssignmentQuestion } from "@/types/api";
import { answerProgress, type DraftAnswer } from "../answers/answer-model";

function QuestionGroup({ label, indexes, onJump, tone }: { label: string; indexes: number[]; onJump: (index: number) => void; tone?: string }) {
  if (!indexes.length) return null;
  return <div>
    <p className={`text-xs font-medium ${tone ?? "text-muted-foreground"}`}>{label} ({indexes.length})</p>
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {indexes.map((index) => <button key={index} type="button" onClick={() => onJump(index)}
        className="rounded-md bg-secondary px-2 py-1 text-xs tabular-nums transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        Câu {index + 1}
      </button>)}
    </div>
  </div>;
}

/** Xác nhận nộp: số câu bỏ trống, làm dở, đã đánh dấu; lỗi nộp hiện ngay trong hộp thoại để thử lại. */
export function QuizSubmitDialog({ open, onOpenChange, questions, answers, flagged, onJump, onConfirm, pending, error, latePenalty, remainingAfter }: {
  open: boolean; onOpenChange: (open: boolean) => void; questions: AssignmentQuestion[]; answers: Record<number, DraftAnswer>;
  flagged: number[]; onJump: (index: number) => void; onConfirm: () => void; pending: boolean; error: unknown;
  latePenalty: number | null; remainingAfter: number | null;
}) {
  const progress = questions.map((question) => answerProgress(question, answers[question.question_id]));
  const pick = (test: (index: number) => boolean) => questions.map((_, index) => index).filter(test);
  const blank = pick((index) => progress[index] === "empty");
  const partial = pick((index) => progress[index] === "partial");
  const marked = pick((index) => flagged.includes(questions[index].question_id));
  const answered = questions.length - blank.length;

  return <AlertDialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Nộp bài?</AlertDialogTitle>
        <AlertDialogDescription>
          Bạn đã trả lời <span className="tabular-nums">{answered}/{questions.length}</span> câu. Sau khi nộp, lượt này được chấm ngay và không sửa được nữa.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="space-y-3 text-sm">
        <QuestionGroup label="Bỏ trống — tính 0 điểm" indexes={blank} onJump={onJump} tone="text-destructive" />
        <QuestionGroup label="Trả lời chưa đủ" indexes={partial} onJump={onJump} />
        <QuestionGroup label="Đã đánh dấu xem lại" indexes={marked} onJump={onJump} tone="text-warning" />
        {latePenalty != null ? <p className="text-xs text-warning">Bạn đang nộp muộn — điểm lượt này bị trừ {latePenalty}%.</p> : null}
        {remainingAfter != null ? <p className="text-xs text-muted-foreground">
          {remainingAfter === 0 ? "Đây là lượt cuối cùng của bạn." : `Sau lượt này bạn còn ${remainingAfter} lượt.`}
        </p> : null}
        {error ? <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorText(error)} Bài làm vẫn được giữ — bạn có thể thử nộp lại.
        </p> : null}
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Làm tiếp</AlertDialogCancel>
        <Button variant="cta" onClick={onConfirm} disabled={pending}>{pending ? "Đang nộp…" : error ? "Thử nộp lại" : "Nộp bài"}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
