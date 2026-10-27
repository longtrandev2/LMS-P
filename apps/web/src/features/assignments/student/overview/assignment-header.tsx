import { CalendarClock, FileCode2, ListChecks, RotateCcw, type LucideIcon } from "lucide-react";
import type { AssignmentCategory, AssignmentSummary } from "@/types/api";
import { formatScore } from "../../submission-result";
import { CATEGORY_LABEL, shortDateTime } from "../labels";
import { MetaRow } from "../meta-row";
import { WindowBadge } from "./assignment-info";
import { assignmentWindow } from "../../submission-window";

const CATEGORY_ICON: Record<AssignmentCategory, LucideIcon> = {
  quiz: ListChecks, assignment: FileCode2, midterm: FileCode2, final: FileCode2,
};

/** Đầu trang tổng quan bài kiểu trang batch Frappe: tiêu đề 24/600 + hàng meta `icon · chữ`. */
export function AssignmentHeader({ item }: { item: AssignmentSummary }) {
  const isQuiz = item.category === "quiz";
  const attempts = item.max_attempts == null ? "Không giới hạn lượt"
    : isQuiz ? `${item.max_attempts} lượt làm` : `${item.max_attempts} lượt mỗi câu`;
  return <header className="space-y-2.5">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">{item.title}</h1>
      <WindowBadge window={assignmentWindow(item)} />
    </div>
    <MetaRow items={[
      { icon: CATEGORY_ICON[item.category], text: `${CATEGORY_LABEL[item.category]} · ${item.question_count} câu · ${formatScore(item.total_points)} điểm` },
      { icon: CalendarClock, text: `Hạn ${shortDateTime(item.due_at)}` },
      { icon: RotateCcw, text: attempts },
    ]} />
  </header>;
}
