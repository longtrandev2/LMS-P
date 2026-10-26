import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ErrorState } from "@/components/state-blocks";
import { VerdictBadge } from "@/components/verdict-badge";
import { formatUtcDateTime } from "@/lib/date-time";
import { languageLabel } from "@/lib/languages";
import type { SubmissionDetails } from "@/types/api";
import { formatScore, isGrading } from "../../submission-result";
import { studentPaths } from "../paths";
import { IoBlock } from "./io-block";
import { Pending } from "./run-result";

/** Kết quả lượt nộp mới nhất (cập nhật qua WS + poll): verdict, test sai đầu tiên, log biên dịch. */
export function LatestSubmissionResult({ submission, loading, error, onRetry }: {
  submission: SubmissionDetails | undefined; loading: boolean; error: unknown; onRetry: () => void;
}) {
  if (!submission) {
    if (error) return <ErrorState error={error} onRetry={onRetry} />;
    return loading ? <Pending text="Đang tải kết quả…" /> : <p className="py-6 text-sm text-muted-foreground">Chưa có lượt nộp nào cho câu này.</p>;
  }
  const result = submission.result;
  const tests = result?.tests ?? [];
  const failedIndex = result?.failed_test != null ? tests.findIndex((test) => test.position === result.failed_test) : -1;
  const failed = failedIndex >= 0 ? tests[failedIndex] : undefined;
  const failedNo = failedIndex >= 0 ? failedIndex + 1 : result?.failed_test;

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Lượt {submission.attempt_no}</span>
      <span className="tabular-nums">{formatUtcDateTime(submission.submitted_at)}</span>
      <span>{languageLabel(submission.language)}</span>
      {submission.is_late ? <span className="text-warning">Nộp muộn</span> : null}
      <Link to={studentPaths.submission(submission.id)} className="ml-auto inline-flex items-center gap-1 rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
        Xem chi tiết<ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
    {isGrading(submission.status) ? <Pending text={submission.status === "pending" ? "Đang chờ chấm…" : "Đang chấm…"} />
      : submission.status === "failed" ? <div className="space-y-1">
        <VerdictBadge verdict="SYSTEM_ERROR" />
        <p className="text-sm text-muted-foreground">Máy chấm gặp lỗi hạ tầng — lượt này không bị tính. {result?.error_message ?? ""}</p>
      </div> : <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <VerdictBadge verdict={submission.verdict ?? result?.verdict} className="text-sm" />
          {result?.tests_total != null ? <span className="text-sm tabular-nums">Đạt {result.tests_passed ?? 0}/{result.tests_total} test</span> : null}
          <span className="ml-auto font-mono text-sm font-semibold tabular-nums">
            {formatScore(submission.score)}<span className="text-muted-foreground">/{formatScore(submission.max_score)}</span>
          </span>
        </div>
        {failedNo != null && submission.verdict !== "AC" && submission.verdict !== "CE" ? <p className="text-sm">
          Sai ở test #{failedNo} <span className="text-muted-foreground">({failed?.is_public ? "test mẫu" : "test ẩn"})</span>
          {failed?.time_ms != null ? <span className="text-muted-foreground"> · {failed.time_ms} ms</span> : null}
        </p> : null}
        {result?.compile_output ? <IoBlock label={result.compile_error ? "Lỗi biên dịch" : "Log biên dịch"} value={result.compile_output} tone={result.compile_error ? "danger" : undefined} /> : null}
        {result?.error_message ? <p className="text-sm text-destructive">{result.error_message}</p> : null}
        {failed?.is_public ? <div className="grid gap-3 xl:grid-cols-3">
          <IoBlock label="Input" value={failed.input} />
          <IoBlock label="Output mong đợi" value={failed.expected_output} />
          <IoBlock label="Output của bạn" value={failed.output} tone="danger" />
        </div> : null}
      </div>}
  </div>;
}
