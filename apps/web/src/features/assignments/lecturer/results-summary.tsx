import { Loader2 } from "lucide-react";
import { formatPoints } from "./labels";
import { isGrading } from "@/features/assignments/submission/submission-status";
import type { AssignmentSubmission, StudentResultRow } from "@/types/api";

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return <div className="bg-card px-4 py-3">
    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
    {hint ? <dd className="text-xs text-muted-foreground tabular-nums">{hint}</dd> : null}
  </div>;
}

/** Tóm tắt: số sinh viên, đã nộp, đang chấm, điểm trung bình (trên sinh viên đã có điểm). */
export function ResultsSummary({ rows, submissions, maxScore }: {
  rows: StudentResultRow[] | undefined; submissions: AssignmentSubmission[] | undefined; maxScore: number;
}) {
  const students = rows?.length ?? 0;
  const submitted = rows?.filter((row) => row.attempt_count > 0).length ?? 0;
  const grading = submissions?.filter((row) => isGrading(row.status)).length ?? 0;
  const scored = rows?.filter((row) => row.final_score != null) ?? [];
  const average = scored.length ? scored.reduce((sum, row) => sum + (row.final_score ?? 0), 0) / scored.length : null;
  return <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
    <Stat label="Sinh viên" value={rows ? students : "—"} />
    <Stat label="Đã nộp" value={rows ? submitted : "—"} hint={rows && students ? `${Math.round((submitted / students) * 100)}% lớp` : undefined} />
    <Stat label="Đang chấm" value={submissions ? <span className="inline-flex items-center gap-2">{grading}
      {grading ? <Loader2 className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" aria-label="đang tự làm mới" /> : null}</span> : "—"}
      hint={grading ? "Tự làm mới mỗi 3 giây" : undefined} />
    <Stat label="Điểm trung bình" value={average != null ? formatPoints(Math.round(average * 100) / 100) : "—"}
      hint={average != null ? `trên ${formatPoints(maxScore)} · ${scored.length} SV có điểm` : "Chưa có điểm"} />
  </dl>;
}
