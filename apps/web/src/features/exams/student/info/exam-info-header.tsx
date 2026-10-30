import { Award, CalendarClock, Files, ListChecks, RotateCcw } from "lucide-react";
import { examWindowText } from "../exam-status";
import { Badge } from "@/components/ui/badge";
import type { AssignmentSummary } from "@/types/api";
import { formatScore } from "@/features/assignments/submission-result";
import { CATEGORY_LABEL } from "@/features/assignments/student/labels";
import { MetaRow } from "@/features/assignments/student/meta-row";
import { EXAM_WINDOW_LABEL, durationText, paperModeText, type ExamWindow } from "../exam-labels";

const WINDOW_VARIANT = { upcoming: "info", open: "success", closed: "secondary" } as const satisfies Record<ExamWindow, string>;

export function ExamWindowBadge({ window }: { window: ExamWindow }) {
  return <Badge variant={WINDOW_VARIANT[window]}>{EXAM_WINDOW_LABEL[window]}</Badge>;
}

/** Đầu trang bài giao theo phiên: tiêu đề + loại + trạng thái, hàng meta (thời lượng · số câu · điểm · lượt · mã đề). */
export function ExamInfoHeader({ item, window }: { item: AssignmentSummary; window: ExamWindow }) {
  const paper = paperModeText(item.paper_mode, item.variant_count);
  return <header className="space-y-2.5">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">{item.title}</h1>
      <Badge variant="default">{CATEGORY_LABEL[item.category]}</Badge>
      <ExamWindowBadge window={window} />
    </div>
    <MetaRow items={[
      { icon: CalendarClock, text: examWindowText(item) },
      { icon: ListChecks, text: `${item.question_count} câu` },
      { icon: Award, text: `${formatScore(item.total_points)} điểm` },
      item.category === "quiz" ? { icon: RotateCcw, text: item.max_attempts == null ? "Không giới hạn lượt" : `${item.max_attempts} lượt làm` } : null,
      paper ? { icon: Files, text: paper } : null,
    ]} />
  </header>;
}
