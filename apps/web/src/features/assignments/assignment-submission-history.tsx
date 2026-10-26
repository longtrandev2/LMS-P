import { Clock3, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatUtcDateTime } from "@/lib/date-time";
import type { AssignmentSubmission, GradingVerdict } from "@/types/api";

const verdictLabels: Record<GradingVerdict, string> = {
  AC: "AC · Đạt", WA: "WA · Sai kết quả", CE: "CE · Lỗi biên dịch",
  TLE: "TLE · Quá thời gian", MLE: "MLE · Vượt bộ nhớ", RE: "RE · Lỗi khi chạy",
  SYSTEM_ERROR: "Lỗi hệ thống",
};

export function AssignmentSubmissionHistory({ attempts }: { attempts: AssignmentSubmission[] }) {
  const recent = [...attempts].sort((left, right) => right.attempt_no - left.attempt_no);
  if (!recent.length) return null;
  return <section aria-label="Lịch sử nộp câu hỏi" className="rounded-xl border bg-background/70 p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><History className="size-4 text-primary" aria-hidden />Lịch sử nộp</h3>
      <Badge variant="secondary">{recent.length} lượt</Badge>
    </div>
    <ol className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {recent.map((attempt) => <li key={attempt.id} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-muted text-sm font-semibold tabular-nums">{attempt.attempt_no}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">Lượt {attempt.attempt_no}</span>
            <Badge variant="outline" className={resultTone(attempt)}>{resultLabel(attempt)}</Badge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground"><Clock3 className="size-3" aria-hidden />{formatUtcDateTime(attempt.submitted_at)}{attempt.is_late ? " · Nộp muộn" : ""}</p>
        </div>
        {attempt.type === "code" && attempt.language ? <Badge variant="secondary" className="font-mono">{attempt.language}</Badge> : null}
      </li>)}
    </ol>
  </section>;
}

function resultLabel(attempt: AssignmentSubmission): string {
  if (attempt.verdict) return verdictLabels[attempt.verdict];
  if (attempt.score != null) return `${attempt.score} điểm`;
  if (attempt.status === "pending") return "Đang chờ chấm";
  if (attempt.status === "grading") return "Đang chấm";
  return attempt.status === "failed" ? "Chấm lỗi" : "Đã nộp";
}

function resultTone(attempt: AssignmentSubmission): string {
  if (attempt.verdict === "AC" || (attempt.score != null && attempt.score > 0))
    return "border-success/30 bg-success/10 text-success";
  if (attempt.status === "pending" || attempt.status === "grading")
    return "border-primary/30 bg-primary/10 text-primary";
  if (attempt.status === "failed" || attempt.verdict)
    return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-border bg-muted/50 text-muted-foreground";
}
