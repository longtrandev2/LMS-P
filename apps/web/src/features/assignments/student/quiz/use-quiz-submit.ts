import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Answer, QuizAttempt } from "@/types/api";
import { useIdempotencyKey } from "../use-idempotency-key";

/**
 * `POST /assignments/{id}/quiz-attempts` với Idempotency-Key cố định cho cùng nội dung:
 * thử lại sau lỗi mạng dùng lại key (server trả lượt gốc), câu trả lời đổi thì sinh key mới.
 */
export function useQuizSubmit(assignmentId: number, onSubmitted: (attempt: QuizAttempt) => void) {
  const client = useQueryClient();
  const idempotency = useIdempotencyKey();
  return useMutation({
    mutationFn: (answers: Answer[]) => {
      const body = { answers };
      return api.post<QuizAttempt>(`/assignments/${assignmentId}/quiz-attempts`, body, {
        headers: { "Idempotency-Key": idempotency.keyFor(JSON.stringify(body)) },
      });
    },
    onSuccess: (attempt) => {
      idempotency.reset();
      onSubmitted(attempt);
      void client.invalidateQueries({ queryKey: queryKeys.assignments.quizAttempts(assignmentId) });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "IDEMPOTENCY_CONFLICT") idempotency.reset();
    },
  });
}
