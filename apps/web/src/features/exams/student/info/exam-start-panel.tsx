import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, CalendarPlus, Eye, EyeOff, Hourglass, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { AssignmentSummary } from "@/types/api";
import type { AttemptSessionSummary } from "@/types/exams";
import { assignmentCloseAt } from "@/features/assignments/submission-window";
import { reviewPolicyText, shortDateTime } from "@/features/assignments/student/labels";
import { AssignmentPanel } from "@/features/assignments/student/overview/assignment-info";
import type { MetaItem } from "@/features/assignments/student/meta-row";
import { clockText, durationText, startErrorText, type ExamWindow } from "../exam-labels";
import { useStartSession } from "../use-exam-sessions";

function blockedReason(item: AssignmentSummary, window: ExamWindow, used: number): string | null {
  if (window === "upcoming") return `Bài mở lúc ${shortDateTime(item.available_from)}.`;
  if (window === "closed") return "Bài đã đóng, không bắt đầu lượt mới được.";
  if (item.max_attempts != null && used >= item.max_attempts) return "Bạn đã dùng hết lượt làm bài.";
  return null;
}

/**
 * Panel phải trang thông tin bài giao theo phiên (exam-spec §8): thời lượng, khung giờ, lượt, xem lại;
 * ô "Tôi đã đọc và đồng ý quy chế" (khi có quy chế) + nút "Bắt đầu làm bài" / "Tiếp tục làm bài" hoặc lý do bị khóa.
 */
export function ExamStartPanel({ item, window, sessions, loading }: {
  item: AssignmentSummary; window: ExamWindow; sessions: AttemptSessionSummary[]; loading: boolean;
}) {
  const navigate = useNavigate();
  const start = useStartSession(item.id);
  const [accepted, setAccepted] = useState(false);
  const inProgress = sessions.find((session) => session.status === "in_progress");
  const used = sessions.length;
  const hasRules = Boolean(item.rules_text?.trim());
  const blocked = inProgress ? null : blockedReason(item, window, used);
  const needsConsent = hasRules && !inProgress && !blocked;
  const canClick = !loading && !blocked && !start.isPending && (!needsConsent || accepted);

  function onStart() {
    start.mutate(accepted || !hasRules, { onSuccess: (view) => navigate(`/attempt-sessions/${view.session.id}`) });
  }

  const facts: (MetaItem | null)[] = [
    item.available_from ? { icon: CalendarPlus, text: `Mở lúc ${shortDateTime(item.available_from)}` } : null,
    { icon: CalendarClock, text: `Đóng lúc ${shortDateTime(assignmentCloseAt(item))}` },
    { icon: Hourglass, text: item.time_limit_minutes != null ? "Tính giờ từ lúc bấm Bắt đầu, không quá giờ đóng" : "Làm đến khi bài đóng" },
    { icon: RotateCcw, text: item.max_attempts == null ? `Đã làm ${used} lượt · không giới hạn` : `Đã dùng ${used}/${item.max_attempts} lượt` },
    { icon: item.review_mode === "never" ? EyeOff : Eye, text: reviewPolicyText(item) },
  ];
  const label = inProgress ? "Tiếp tục làm bài" : window === "upcoming" ? "Chưa đến giờ làm bài" : window === "closed" ? "Bài đã đóng"
    : blocked ? "Đã hết lượt" : "Bắt đầu làm bài";
  const note = start.isError ? null : blocked ?? (inProgress
    ? `Bạn đang có lượt làm dở — đồng hồ vẫn chạy (còn khoảng ${clockText(inProgress.remaining_seconds)}).`
    : needsConsent && !accepted ? "Đánh dấu đồng ý quy chế để bắt đầu." : null);

  const primary = <>
    {needsConsent ? <label htmlFor="exam-accept-rules" className="mb-2 flex cursor-pointer items-start gap-2.5 text-sm leading-5 select-none">
      <Checkbox id="exam-accept-rules" className="mt-0.5" checked={accepted} onCheckedChange={(checked) => setAccepted(checked === true)} />
      Tôi đã đọc và đồng ý quy chế
    </label> : null}
    <Button className="w-full" variant={blocked ? "secondary" : "default"} disabled={!canClick} onClick={onStart}>
      {start.isPending ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}
      {start.isPending ? "Đang vào phòng thi…" : label}
    </Button>
    {start.isError ? <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
      {startErrorText(start.error)}
    </p> : null}
  </>;

  return <AssignmentPanel label="Thời gian làm bài" value={durationText(item.time_limit_minutes)}
    facts={facts.filter((fact): fact is MetaItem => fact != null)} primary={primary} note={note} />;
}
