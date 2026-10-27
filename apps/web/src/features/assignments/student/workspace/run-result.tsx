import { ChevronRight, Loader2 } from "lucide-react";
import { VerdictBadge } from "@/components/verdict-badge";
import { ApiError } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { RunJob, RunTestResult } from "@/types/api";
import { IoBlock } from "./io-block";

export function Pending({ text }: { text: string }) {
  return <p role="status" className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />{text}
  </p>;
}

export function runErrorText(error: unknown): string {
  if (error instanceof ApiError && (error.status === 429 || error.code === "RATE_LIMITED")) {
    return "Bạn chạy thử quá nhanh (tối đa 6 lần mỗi phút). Đợi một lát rồi chạy lại.";
  }
  return errorText(error);
}

/** Một test dạng hàng: tên · verdict · thời gian; mở ra xem Input / Output mong đợi / Output của bạn. */
function TestRow({ test, index, custom }: { test: RunTestResult; index: number; custom: boolean }) {
  const passed = test.verdict === "AC" || test.verdict === "OK";
  return <details open={!passed} className="group border-b last:border-b-0">
    <summary className="flex h-11 cursor-pointer list-none items-center gap-3 rounded-sm text-sm outline-none transition-colors duration-150 hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
      <ChevronRight className="size-4 text-muted-foreground transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
      <span className="w-28 font-medium">{custom ? "Input tự nhập" : `Ví dụ ${index + 1}`}</span>
      <VerdictBadge verdict={test.verdict} />
      <span className="ml-auto pr-1 text-xs text-muted-foreground tabular-nums">{test.time_ms != null ? `${test.time_ms} ms` : ""}</span>
    </summary>
    <div className="grid gap-3 pb-4 pl-7 xl:grid-cols-3">
      {custom ? <div className="xl:col-span-3"><IoBlock label="Output" value={test.output} copy /></div> : <>
        <IoBlock label="Input" value={test.input} />
        <IoBlock label="Output mong đợi" value={test.expected_output} />
        <IoBlock label="Output của bạn" value={test.output} tone={passed ? "success" : "danger"} />
      </>}
    </div>
  </details>;
}

/** Kết quả chạy thử (practice_run): verdict tổng, log biên dịch, danh sách test dạng hàng. */
export function RunResult({ job, running, error, custom }: { job: RunJob | null; running: boolean; error: unknown; custom: boolean }) {
  if (error && !running) return <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{runErrorText(error)}</p>;
  if (!job) return running ? <Pending text="Đang gửi code…" />
    : <p className="py-4 text-sm text-muted-foreground">Bấm <strong className="font-medium text-foreground">Chạy thử</strong> để chạy code với ví dụ mẫu hoặc input tự nhập. Chạy thử không tính lượt và điểm.</p>;
  if (job.status === "pending") return <Pending text="Đang chờ máy chấm…" />;
  if (job.status === "running") return <Pending text="Đang biên dịch và chạy…" />;

  const passed = job.tests.filter((test) => test.verdict === "AC" || test.verdict === "OK").length;
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-3">
      <VerdictBadge verdict={job.status === "failed" ? "SYSTEM_ERROR" : job.verdict} />
      {job.tests.length && !custom ? <span className="text-sm tabular-nums">Đạt {passed}/{job.tests.length} ví dụ</span> : null}
      {job.duration_ms != null ? <span className="ml-auto text-xs text-muted-foreground tabular-nums">{job.duration_ms} ms</span> : null}
    </div>
    {job.compile_output ? <IoBlock label={job.verdict === "CE" ? "Lỗi biên dịch" : "Log biên dịch"} value={job.compile_output} tone={job.verdict === "CE" ? "danger" : undefined} /> : null}
    {job.error_message ? <p className="text-sm text-destructive">{job.error_message}</p> : null}
    {job.tests.length ? <div className="border-t">{job.tests.map((test, index) => <TestRow key={test.position} test={test} index={index} custom={custom} />)}</div> : null}
  </div>;
}
