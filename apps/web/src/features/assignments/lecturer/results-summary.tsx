import { Loader2 } from "lucide-react";
import { formatPoints } from "./labels";
import { isGrading } from "@/features/assignments/submission/submission-status";
import type { AssignmentSubmission, StudentResultRow } from "@/types/api";

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return <div className="min-w-0 px-6 first:pl-0">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 flex items-baseline gap-1.5 text-xl font-semibold tabular-nums">
      <span>{value}</span>{hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </dd>
  </div>;
}

/** Dải số liệu dạng chữ (DESIGN.md §4): đã nộp · đang chấm · điểm trung bình — không ô màu. */
export function ResultsSummary({ rows, submissions, maxScore }: {
  rows: StudentResultRow[] | undefined; submissions: AssignmentSubmission[] | undefined; maxScore: number;
}) {
  const students = rows?.length ?? 0;
  const submitted = rows?.filter((row) => row.attempt_count > 0).length ?? 0;
  const grading = submissions?.filter((row) => isGrading(row.status)).length ?? 0;
  const scored = rows?.filter((row) => row.final_score != null) ?? [];
  const average = scored.length ? scored.reduce((sum, row) => sum + (row.final_score ?? 0), 0) / scored.length : null;
  return <dl className="flex flex-wrap divide-x" aria-label="Tóm tắt kết quả">
    <Stat label="Đã nộp" value={rows ? <>{submitted}<span className="text-base font-normal text-muted-foreground">/{students}</span></> : "—"}
      hint={rows && students ? `${Math.round((submitted / students) * 100)}%` : undefined} />
    <Stat label="Đang chấm" value={submissions ? grading : "—"}
      hint={grading ? <span className="inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />tự làm mới</span> : undefined} />
    <Stat label="Điểm trung bình" value={average != null ? <>{formatPoints(Math.round(average * 100) / 100)}<span className="text-base font-normal text-muted-foreground">/{formatPoints(maxScore)}</span></> : "—"}
      hint={average != null ? `${scored.length} SV có điểm` : "chưa có điểm"} />
  </dl>;
}
