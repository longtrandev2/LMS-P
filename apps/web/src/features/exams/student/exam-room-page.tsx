import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/state-blocks";
import { queryKeys } from "@/lib/query-keys";
import type { AttemptSessionSummary, AttemptSessionView } from "@/types/exams";
import { routeId } from "@/features/assignments/student/paths";
import { ExamRoom } from "./room/exam-room";
import { SubmittedScreen } from "./submitted-screen";
import { useSessionView } from "./use-exam-sessions";
import { useTimingSignal } from "./room/use-timing-signal";

function RoomSkeleton() {
  return <div className="flex h-dvh flex-col" aria-busy="true" aria-label="Đang tải phòng thi">
    <div className="flex h-14 items-center gap-4 border-b px-5"><Skeleton className="h-5 w-64" /><Skeleton className="ml-auto h-8 w-24" /><Skeleton className="h-8 w-20" /></div>
    <div className="flex flex-1">
      <div className="hidden w-64 space-y-3 border-r bg-sidebar p-5 lg:block"><Skeleton className="h-4 w-24" /><Skeleton className="h-28" /></div>
      <div className="mx-auto w-full max-w-[720px] space-y-4 p-8"><Skeleton className="h-4 w-32" /><Skeleton className="h-6 w-3/4" /><Skeleton className="h-40" /></div>
    </div>
  </div>;
}

/** `/attempt-sessions/:sessionId` — phòng thi toàn màn hình (exam-spec §8.1); phiên đã nộp → màn "Đã nộp bài". */
export function ExamRoomPage() {
  const { sessionId } = useParams();
  const id = routeId(sessionId);
  const client = useQueryClient();
  const [timedOut, setTimedOut] = useState(false);
  const view = useSessionView(id, timedOut);
  // Gia hạn/thu bài: đọc lại phiên — đồng hồ tự hiệu chỉnh, phiên đã nộp thì chuyển màn "Đã nộp".
  useTimingSignal(id, () => void view.refetch());
  const [ready, setReady] = useState(false);
  // Chỉ dựng phòng thi từ dữ liệu mới nhất (không dùng bản cache cũ khi vào lại phòng).
  if (!ready && view.data && !view.isFetching) setReady(true);

  const back = <Button asChild variant="secondary"><Link to="/me/classes">Về lớp học của tôi</Link></Button>;
  if (!Number.isFinite(id)) return <div className="p-8"><EmptyState title="Không tìm thấy phiên làm bài" description="Đường dẫn không hợp lệ." action={back} /></div>;
  if (!view.data || !ready) {
    return view.isError && !view.isFetching
      ? <div className="mx-auto max-w-xl space-y-4 p-8"><ErrorState error={view.error} onRetry={() => void view.refetch()} />{back}</div>
      : <RoomSkeleton />;
  }
  if (view.data.session.status === "submitted" || timedOut) return <SubmittedScreen view={view.data} timedOut={timedOut} />;

  function onSubmitted(summary: AttemptSessionSummary) {
    client.setQueryData<AttemptSessionView>(queryKeys.exams.session(id), (old) => old && { ...old, session: summary, sections: [], answers: [] });
    void client.invalidateQueries({ queryKey: queryKeys.exams.mySessions(summary.assignment_id) });
  }
  function onTimedOut() {
    setTimedOut(true);
    void view.refetch();
    if (view.data) void client.invalidateQueries({ queryKey: queryKeys.exams.mySessions(view.data.session.assignment_id) });
  }

  return <ExamRoom view={view.data} onSubmitted={onSubmitted} onTimedOut={onTimedOut} />;
}
