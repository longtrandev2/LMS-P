import { Link } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import type { AssignmentSummary, QuizAttempt } from "@/types/api";
import { acceptsSubmissions, assignmentWindow } from "../../submission-window";
import { formatScore } from "../../submission-result";
import { remainingAttempts } from "../labels";
import { draftKeys, readDraft } from "../local-draft";
import { studentPaths } from "../paths";
import { AssignmentPanel, policyFacts } from "./assignment-info";

/** Panel phải của quiz: điểm theo chính sách, lượt còn lại, chính sách, nút Bắt đầu/Làm lại + Xem lại lượt gần nhất. */
export function QuizPanel({ item, attempts, isPending }: { item: AssignmentSummary; attempts: QuizAttempt[]; isPending: boolean }) {
  const list = Array.isArray(attempts) ? attempts : [];
  const userId = useAuthStore((state) => state.user?.id);
  const window = assignmentWindow(item);
  const used = list.length;
  const remaining = remainingAttempts(used, item.max_attempts);
  const hasDraft = userId != null && readDraft(draftKeys.quiz(userId, item.id, used + 1)) != null;
  const blocked = !acceptsSubmissions(window) ? (window === "upcoming" ? "Bài chưa mở." : "Bài đã đóng, không nhận lượt mới.")
    : remaining === 0 ? "Bạn đã dùng hết lượt làm bài." : null;
  const label = hasDraft ? "Tiếp tục làm bài" : used ? "Làm lại" : "Bắt đầu làm bài";
  const scores = list.map((attempt) => attempt.score);
  const shown = item.score_policy === "best" ? (scores.length ? Math.max(...scores) : null) : list[0]?.score ?? null;
  const latest = list[0];

  const primary = blocked || isPending
    ? <Button className="w-full" disabled>{isPending ? "Đang tải…" : label}</Button>
    : <Button asChild className="w-full"><Link to={studentPaths.attempt(item.class_id, item.id)}>{label}</Link></Button>;
  const secondary = latest?.review_available
    ? <Button asChild variant="secondary" className="w-full"><Link to={studentPaths.review(item.class_id, item.id, latest.attempt_id)}>Xem lại lượt {latest.attempt_no}</Link></Button>
    : <Button asChild variant="secondary" className="w-full"><Link to={studentPaths.classPage(item.class_id)}>Về lớp học</Link></Button>;
  const note = blocked ?? (window === "late" ? `Đang trong hạn nộp muộn — điểm lượt mới bị trừ ${item.late_penalty_percent}%.`
    : hasDraft ? "Bạn có bài làm dở được lưu trên trình duyệt này." : null);

  return <AssignmentPanel label={item.score_policy === "best" ? "Điểm cao nhất" : "Điểm lượt cuối"}
    value={shown == null ? null : formatScore(shown)} max={formatScore(item.total_points)}
    facts={[
      { icon: RotateCcw, text: remaining == null ? `Đã làm ${used} lượt · không giới hạn` : `Còn ${remaining}/${item.max_attempts} lượt làm` },
      ...policyFacts(item),
    ]}
    primary={primary} secondary={secondary} note={note} />;
}
