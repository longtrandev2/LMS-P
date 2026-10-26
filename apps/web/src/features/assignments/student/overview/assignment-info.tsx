import type { ReactNode } from "react";
import { formatUtcDateTime } from "@/lib/date-time";
import { Badge } from "@/components/ui/badge";
import type { AssignmentSummary } from "@/types/api";
import { assignmentWindow, WINDOW_LABEL, type AssignmentWindow } from "../../submission-window";
import { reviewPolicyText } from "../labels";

const windowVariant = { upcoming: "secondary", open: "success", late: "warning", closed: "secondary" } as const satisfies Record<AssignmentWindow, string>;

export function WindowBadge({ window }: { window: AssignmentWindow }) {
  return <Badge variant={windowVariant[window]}>
    <span className="size-1.5 rounded-full bg-current" aria-hidden />{WINDOW_LABEL[window]}
  </Badge>;
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
      <Row label="Mở lúc"><span className="tabular-nums">{item.available_from ? formatUtcDateTime(item.available_from) : "Ngay khi xuất bản"}</span></Row>
      <Row label="Hạn nộp"><span className="font-medium tabular-nums">{formatUtcDateTime(item.due_at)}</span></Row>
      {item.allow_late && item.late_due_at ? <Row label="Hạn nộp muộn">
        <span className="tabular-nums">{formatUtcDateTime(item.late_due_at)}</span> · <span className="text-warning">trừ {item.late_penalty_percent}% điểm</span>
      </Row> : <Row label="Nộp muộn">Không nhận</Row>}
      <Row label="Lượt làm">{attempts}</Row>
      <Row label="Tính điểm">{item.question_count} câu · {item.total_points} điểm · {item.score_policy === "best" ? "lấy lượt cao nhất" : "lấy lượt cuối"}</Row>
      <Row label="Xem lại">{reviewPolicyText(item)}</Row>
    </dl>
  </section>;
}
