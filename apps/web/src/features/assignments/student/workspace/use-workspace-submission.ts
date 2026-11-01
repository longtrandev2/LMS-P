import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import { useRealtimeEvents } from "@/lib/realtime/use-realtime";
import type { AssignmentSubmission, ProgrammingLanguage } from "@/types/api";
import { useIdempotencyKey } from "../use-idempotency-key";
import { useSubmissionDetails } from "../use-student-data";

/** 202 `{submission_id, status}`; key trùng trả bản gốc (200) — chấp nhận cả `id`. */
interface SubmitReceipt { submission_id?: number; id?: number; status?: string }

/**
 * Lượt nộp mới nhất của câu code: theo dõi realtime qua WS `submission.*`, đọc lại khi (re)connect,
 * poll 2s dự phòng khi đang chờ/đang chấm.
 */
export function useLatestSubmission(assignmentId: number, history: AssignmentSubmission[]) {
  const client = useQueryClient();
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const activeId = submittedId ?? history[0]?.id ?? null;
  const details = useSubmissionDetails(activeId);

  const refreshList = () => void client.invalidateQueries({ queryKey: queryKeys.assignments.mySubmissions(assignmentId) });
  useRealtimeEvents({
    onMessage: (type, data) => {
      if (!type.startsWith("submission.")) return;
      refreshList();
      const id = (data as { submission_id?: number } | null | undefined)?.submission_id;
      if (id != null) void client.invalidateQueries({ queryKey: queryKeys.submissions.detail(id) });
    },
    onOpen: () => {
      refreshList();
      if (activeId != null) void client.invalidateQueries({ queryKey: queryKeys.submissions.detail(activeId) });
    },
  }, { replayOpen: true });

  return { activeId, details, setSubmittedId };
}

/** `POST …/questions/{qid}/submissions` với Idempotency-Key cố định cho cùng (ngôn ngữ, code). */
export function useCodeSubmit(assignmentId: number, questionId: number, onSubmitted: (submissionId: number) => void) {
  const client = useQueryClient();
  const idempotency = useIdempotencyKey();
  return useMutation({
    mutationFn: (body: { language: ProgrammingLanguage; source_code: string }) =>
      api.post<SubmitReceipt>(`/assignments/${assignmentId}/questions/${questionId}/submissions`, body, {
        headers: { "Idempotency-Key": idempotency.keyFor(JSON.stringify(body)) },
      }),
    onSuccess: (receipt) => {
      idempotency.reset();
      const id = receipt.submission_id ?? receipt.id;
      if (id != null) onSubmitted(id);
      void client.invalidateQueries({ queryKey: queryKeys.assignments.mySubmissions(assignmentId) });
      toast.success("Đã nộp bài — đang chờ chấm.");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "IDEMPOTENCY_CONFLICT") idempotency.reset();
      toast.error(errorText(error));
    },
  });
}
