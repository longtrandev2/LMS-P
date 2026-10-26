import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Code2, ListChecks, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/logo";
import { AssignmentDeadlineCountdown } from "@/features/assignments/assignment-deadline-countdown";
import { AssignmentQuestionNavigator } from "@/features/assignments/assignment-question-navigator";
import { AssignmentPracticePanel } from "@/features/assignments/assignment-practice-panel";
import { AssignmentQuizPanel } from "@/features/assignments/assignment-quiz-panel";
import { assignmentWindow } from "@/features/assignments/submission-window";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { formatUtcDateTime, utcDateTimeMillis } from "@/lib/date-time";
import { queryKeys } from "@/lib/query-keys";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import type { AssignmentDetails } from "@/types/api";

const categoryLabel = { quiz: "Quiz", assignment: "Bài tập", midterm: "Giữa kỳ", final: "Cuối kỳ" };

export function AssignmentAttemptRoute() {
  const { status } = useAuthGuard(["student"]);
  if (status === "checking") return <div className="grid min-h-dvh place-items-center">Đang kiểm tra phiên đăng nhập…</div>;
  if (status === "denied") return <div className="grid min-h-dvh place-items-center">Chỉ sinh viên mới có thể làm bài.</div>;
  return <AssignmentAttemptPage />;
}

function AssignmentAttemptPage() {
  const { id = "" } = useParams();
  const assignmentId = Number(id);
  const [, refreshWindow] = useState(0);
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const query = useQuery({
    queryKey: queryKeys.assignments.details(assignmentId),
    queryFn: () => api.get<AssignmentDetails>(`/assignments/${assignmentId}`),
    enabled: Number.isSafeInteger(assignmentId) && assignmentId > 0,
  });
  const questions = query.data?.questions ?? [];
  const assignment = query.data?.assignment;
  const status = assignment ? assignmentWindow(assignment) : "upcoming";

  useEffect(() => {
    if (!assignment) return;
    const nextBoundary = status === "upcoming" ? assignment.available_from
      : status === "open" ? assignment.due_at : status === "late" ? assignment.late_due_at : null;
    const boundaryMs = nextBoundary ? utcDateTimeMillis(nextBoundary) : Number.NaN;
    const timer = Number.isFinite(boundaryMs)
      ? window.setTimeout(() => refreshWindow((revision) => revision + 1), Math.min(2_147_000_000, Math.max(0, boundaryMs - Date.now() + 25)))
      : undefined;
    const refreshWhenVisible = () => refreshWindow((revision) => revision + 1);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [assignment, status]);
  useEffect(() => {
    if (!questions.length) return;
    setActiveQuestionId((activeId) => activeId && questions.some((question) => question.question_id === activeId)
      ? activeId : questions[0].question_id);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
      const questionId = Number(visible?.target.getAttribute("data-question-id"));
      if (questionId) setActiveQuestionId(questionId);
    }, { rootMargin: "-120px 0px -65% 0px", threshold: 0.1 });
    questions.forEach((question) => {
      const node = document.getElementById(`question-${question.question_id}`);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [questions]);

  if (!Number.isSafeInteger(assignmentId) || assignmentId < 1)
    return <AttemptMessage title="Đường dẫn bài làm không hợp lệ." />;
  if (query.isPending) return <AttemptMessage title="Đang tải đề và chuẩn bị không gian làm bài…" />;
  if (query.isError) return <AttemptMessage title={errorText(query.error)} onRetry={() => void query.refetch()} />;
  if (!assignment) return <AttemptMessage title="Không tìm thấy bài tập." />;

  const deadline = (status === "late" || status === "closed") && assignment.allow_late && assignment.late_due_at
    ? assignment.late_due_at : assignment.due_at;
  const mcqCount = questions.filter((question) => question.type === "mcq").length;
  const codeCount = questions.length - mcqCount;
  const title = assignment.category === "quiz" ? "Quiz nộp toàn bài một lần" : "Bài tập nộp theo từng câu";

  return <div className="min-h-dvh bg-muted/30">
    <header className="sticky top-0 z-30 border-b bg-card/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1500px] items-center gap-3 px-3 sm:px-6">
        <Button variant="ghost" size="sm" asChild className="shrink-0"><Link to={`/me/classes/${assignment.class_id}`}><ArrowLeft aria-hidden /><span className="hidden sm:inline">Quay lại lớp</span></Link></Button>
        <div className="hidden min-w-0 items-center gap-2 border-l pl-3 sm:flex"><LogoMark size={30} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{assignment.title}</p><p className="text-xs text-muted-foreground">{categoryLabel[assignment.category]} · {questions.length} câu</p></div></div>
        <div className="ml-auto"><AssignmentDeadlineCountdown assignment={assignment} deadline={deadline} status={status} /></div>
      </div>
    </header>

    <main className="mx-auto max-w-[1500px] px-3 py-5 sm:px-6 sm:py-8">
      <section className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-3xl"><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="secondary">{categoryLabel[assignment.category]}</Badge><span className="text-xs text-muted-foreground">Hạn nộp {formatUtcDateTime(deadline)}</span></div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{assignment.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{assignment.description || title}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2"><ListChecks className="size-4 text-primary" aria-hidden />{mcqCount} câu trắc nghiệm</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2"><Code2 className="size-4 text-primary" aria-hidden />{codeCount} câu lập trình</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2"><Sparkles className="size-4 text-primary" aria-hidden />{assignment.total_points} điểm</span>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
        <AssignmentQuestionNavigator questions={questions} activeId={activeQuestionId}
          onSelect={(questionId) => {
            setActiveQuestionId(questionId);
            document.getElementById(`question-${questionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }} />
        <section className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
          <div className="rounded-xl border bg-card p-4 text-sm shadow-sm"><p className="font-semibold">{title}</p>
            <p className="mt-1 text-muted-foreground">{assignment.category === "quiz" ? "Chọn đáp án cho các câu rồi nộp toàn bộ quiz một lần." : "Mỗi câu được nộp riêng. Câu chưa trả lời được tính 0 điểm."}</p>
          </div>
          {assignment.category === "quiz" ? <AssignmentQuizPanel details={query.data} windowStatus={status} /> : <AssignmentPracticePanel details={query.data} windowStatus={status} />}
        </section>
      </div>
    </main>
  </div>;
}

function AttemptMessage({ title, onRetry }: { title: string; onRetry?: () => void }) {
  return <main className="grid min-h-dvh place-items-center p-6"><div className="max-w-lg text-center"><LogoMark size={44} className="mx-auto mb-4" /><p className="font-medium">{title}</p>{onRetry ? <Button className="mt-4" variant="outline" onClick={onRetry}>Thử tải lại</Button> : null}</div></main>;
}
