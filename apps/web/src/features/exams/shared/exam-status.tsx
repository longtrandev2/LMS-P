import { Badge } from "@/components/ui/badge";
import { categoryLabel, formatPoints, shortDateTime } from "@/features/assignments/lecturer/labels";
import { assignmentWindow } from "@/features/assignments/submission-window";
import { minutesLabel, paperModeLabel } from "./exam-labels";
import type { AssignmentSummary } from "@/types/api";

export type ExamPhase = "draft" | "upcoming" | "open" | "closed";

/** Trạng thái kỳ thi trên danh sách — exam-spec.md §8: Nháp / Sắp mở / Đang mở / Đã đóng. */
export function examPhase(item: AssignmentSummary, now = Date.now()): ExamPhase {
  if (!item.is_published) return "draft";
  const window = assignmentWindow(item, now);
  return window === "upcoming" ? "upcoming" : window === "closed" ? "closed" : "open";
}

const LABEL: Record<ExamPhase, string> = { draft: "Nháp", upcoming: "Sắp mở", open: "Đang mở", closed: "Đã đóng" };
const VARIANT = { draft: "default", upcoming: "info", open: "success", closed: "secondary" } as const;

export function ExamPhaseBadge({ phase }: { phase: ExamPhase }) {
  return <Badge variant={VARIANT[phase]}>{LABEL[phase]}</Badge>;
}

/** "27/10 12:52 → 03/11 13:52" hoặc "đến 03/11 13:52" khi mở ngay lúc xuất bản. */
export function examWindowText(item: AssignmentSummary): string {
  return item.available_from ? `${shortDateTime(item.available_from)} → ${shortDateTime(item.due_at)}` : `Đóng ${shortDateTime(item.due_at)}`;
}

/** Hàng meta: hạng mục · thời lượng · chế độ đề (giảng viên) · số câu · điểm · khung giờ. */
export function ExamMeta({ item, showMode }: { item: AssignmentSummary; showMode: boolean }) {
  const parts = [
    categoryLabel(item.category),
    minutesLabel(item.time_limit_minutes),
    showMode ? paperModeLabel(item.paper_mode, item.variant_count) : null,
    `${item.question_count} câu`,
    `${formatPoints(item.total_points)} điểm`,
    examWindowText(item),
  ].filter((part): part is string => !!part);
  return <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground tabular-nums">
    {parts.map((part, index) => <span key={index} className="contents">
      {index ? <span aria-hidden>·</span> : null}<span>{part}</span>
    </span>)}
  </p>;
}
