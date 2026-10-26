import type { ReactNode } from "react";
import { formatUtcDateTime } from "@/lib/date-time";
import { cn } from "@/lib/utils";
import type { AssignmentSummary } from "@/types/api";
import { assignmentWindow, WINDOW_LABEL, type AssignmentWindow } from "../../submission-window";
import { reviewPolicyText } from "../labels";

const windowTone: Record<AssignmentWindow, string> = {
  upcoming: "border-border bg-muted text-muted-foreground",
  open: "border-success/30 bg-success/10 text-success",
  late: "border-gold/30 bg-gold/10 text-gold",
  closed: "border-border bg-muted text-muted-foreground",
};

export function WindowBadge({ window }: { window: AssignmentWindow }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", windowTone[window])}>
    <span className="size-1.5 rounded-full bg-current" aria-hidden />{WINDOW_LABEL[window]}
  </span>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-0.5 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
    <dt className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</dt>
    <dd className="text-sm">{children}</dd>
  </div>;
}

/** Lịch, lượt, cách tính điểm, chính sách xem lại. */
export function AssignmentInfo({ item, attempts }: { item: AssignmentSummary; attempts: ReactNode }) {
  const window = assignmentWindow(item);
  return <section aria-labelledby="assignment-info-title" className="rounded-xl border bg-card px-5 py-3">
    <div className="flex items-center justify-between gap-3 border-b pb-3">
      <h2 id="assignment-info-title" className="text-sm font-semibold">Thông tin bài</h2>
      <WindowBadge window={window} />
    </div>
    <dl className="divide-y">
      <Row label="Mở lúc">{item.available_from ? formatUtcDateTime(item.available_from) : "Ngay khi xuất bản"}</Row>
      <Row label="Hạn nộp"><span className="font-medium">{formatUtcDateTime(item.due_at)}</span></Row>
      {item.allow_late && item.late_due_at ? <Row label="Hạn nộp muộn">
        {formatUtcDateTime(item.late_due_at)} · <span className="text-gold">trừ {item.late_penalty_percent}% điểm</span>
      </Row> : <Row label="Nộp muộn">Không nhận</Row>}
      <Row label="Lượt làm">{attempts}</Row>
      <Row label="Tính điểm">{item.question_count} câu · {item.total_points} điểm · {item.score_policy === "best" ? "lấy lượt cao nhất" : "lấy lượt cuối"}</Row>
      <Row label="Xem lại">{reviewPolicyText(item)}</Row>
    </dl>
  </section>;
}
