import type { ReactNode } from "react";
import { CalendarClock, CalendarPlus, Eye, EyeOff, Hourglass, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AssignmentSummary } from "@/types/api";
import { WINDOW_LABEL, type AssignmentWindow } from "../../submission-window";
import { reviewPolicyText, shortDateTime } from "../labels";
import { FactList, type MetaItem } from "../meta-row";

const windowVariant = { upcoming: "secondary", open: "success", late: "warning", closed: "secondary" } as const satisfies Record<AssignmentWindow, string>;

export function WindowBadge({ window }: { window: AssignmentWindow }) {
  return <Badge variant={windowVariant[window]}>{WINDOW_LABEL[window]}</Badge>;
}

/** Các dòng chính sách chung (hạn, nộp muộn, cách tính điểm, xem lại) cho panel phụ. */
export function policyFacts(item: AssignmentSummary): MetaItem[] {
  const isQuiz = item.category === "quiz";
  const facts: (MetaItem | null)[] = [
    item.available_from ? { icon: CalendarPlus, text: `Mở lúc ${shortDateTime(item.available_from)}` } : null,
    { icon: CalendarClock, text: `Hạn nộp ${shortDateTime(item.due_at)}` },
    item.allow_late && item.late_due_at
      ? { icon: Hourglass, text: <>Nộp muộn đến {shortDateTime(item.late_due_at)}, <span className="text-warning">trừ {item.late_penalty_percent}%</span></> }
      : { icon: Hourglass, text: "Không nhận nộp muộn" },
    { icon: Trophy, text: item.score_policy === "best" ? (isQuiz ? "Lấy điểm lượt cao nhất" : "Lấy lượt cao nhất mỗi câu") : (isQuiz ? "Lấy điểm lượt cuối" : "Lấy lượt cuối mỗi câu") },
    { icon: item.review_mode === "never" ? EyeOff : Eye, text: reviewPolicyText(item) },
  ];
  return facts.filter((fact): fact is MetaItem => fact != null);
}

/**
 * Panel phụ bên phải (kiểu thẻ "Manage Batch" của Frappe): con số chính + nhãn, danh sách `icon + chữ`,
 * nút đen full-width + nút xám full-width, ghi chú ngắn.
 */
export function AssignmentPanel({ label, value, max, facts, primary, secondary, note }: {
  label: string; value: ReactNode; max?: ReactNode; facts: MetaItem[]; primary?: ReactNode; secondary?: ReactNode; note?: ReactNode;
}) {
  return <section aria-label="Tóm tắt bài" className="rounded-xl border bg-card p-5">
    <p className="text-sm text-muted-foreground">{label}</p>
    {value == null ? <p className="mt-1 text-base text-muted-foreground">Chưa có điểm · tối đa {max}</p>
      : <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}{max != null ? <span className="text-base font-normal text-muted-foreground">/{max}</span> : null}
      </p>}
    <div className="mt-4"><FactList items={facts} /></div>
    {primary || secondary ? <div className="mt-5 grid gap-2">{primary}{secondary}</div> : null}
    {note ? <p className="mt-3 text-xs text-muted-foreground">{note}</p> : null}
  </section>;
}
