import { CircleHelp, ClipboardCheck, NotebookPen, type LucideIcon } from "lucide-react";
import { utcDateTimeMillis } from "@/lib/date-time";
import type { AssignmentCategory } from "@/types/api";

/** Nhãn + icon nét theo loại bài (không bong bóng màu). */
export const ASSIGNMENT_KIND: Record<AssignmentCategory, { label: string; icon: LucideIcon }> = {
  quiz: { label: "Quiz", icon: CircleHelp },
  assignment: { label: "Bài tập", icon: NotebookPen },
  midterm: { label: "Giữa kỳ", icon: ClipboardCheck },
  final: { label: "Cuối kỳ", icon: ClipboardCheck },
};

const pad = (value: number) => String(value).padStart(2, "0");

/** "29/10 23:54" — mốc giờ gọn cho danh sách (năm hiện tại bỏ năm). */
export function shortDateTime(value: string): string {
  const date = new Date(utcDateTimeMillis(value));
  if (Number.isNaN(date.getTime())) return "—";
  const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  const year = date.getFullYear() === new Date().getFullYear() ? "" : `/${date.getFullYear()}`;
  return `${day}${year} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
