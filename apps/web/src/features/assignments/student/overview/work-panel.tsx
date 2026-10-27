import { Link } from "react-router-dom";
import { CircleCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssignmentDetails } from "@/types/api";
import { acceptsSubmissions, assignmentWindow } from "../../submission-window";
import { bestScore, formatScore } from "../../submission-result";
import { studentPaths } from "../paths";
import { useMySubmissions } from "../use-student-data";
import { AssignmentPanel, policyFacts } from "./assignment-info";

/** Panel phải của bài thường: điểm hiện có (tổng điểm tốt nhất từng câu), số câu đã nộp, nút tới câu chưa nộp. */
export function WorkPanel({ details }: { details: AssignmentDetails }) {
  const item = details.assignment;
  const history = useMySubmissions(item.id);
  const rows = history.data ?? [];
  const perQuestion = details.questions.map((question) => rows.filter((row) => row.question_id === question.question_id));
  const submitted = perQuestion.filter((list) => list.length > 0).length;
  const scores = perQuestion.map(bestScore).filter((score): score is number => score != null);
  const total = scores.length ? scores.reduce((sum, score) => sum + score, 0) : null;
  const nextIndex = perQuestion.findIndex((list) => list.length === 0);
  const next = nextIndex >= 0 ? details.questions[nextIndex] : undefined;
  const open = acceptsSubmissions(assignmentWindow(item));

  const primary = !next || !open || history.isPending ? null : next.type === "programming"
    ? <Button asChild className="w-full"><Link to={studentPaths.problem(item.class_id, item.id, next.question_id)}>Làm câu {nextIndex + 1}</Link></Button>
    : <Button asChild className="w-full"><a href={`#question-${next.question_id}`}>Làm câu {nextIndex + 1}</a></Button>;
  const attempts = item.max_attempts == null ? "Không giới hạn lượt mỗi câu" : `Tối đa ${item.max_attempts} lượt mỗi câu`;

  return <AssignmentPanel label="Điểm hiện có" value={total == null ? null : formatScore(total)} max={formatScore(item.total_points)}
    facts={[
      { icon: CircleCheck, text: `Đã nộp ${submitted}/${details.questions.length} câu` },
      { icon: RotateCcw, text: attempts },
      ...policyFacts(item),
    ]}
    primary={primary}
    secondary={<Button asChild variant="secondary" className="w-full"><Link to={studentPaths.classPage(item.class_id)}>Về lớp học</Link></Button>}
    note={!open ? "Bài hiện không nhận bài nộp." : !next && details.questions.length ? "Bạn đã nộp tất cả câu — có thể nộp lại nếu còn lượt." : null} />;
}
