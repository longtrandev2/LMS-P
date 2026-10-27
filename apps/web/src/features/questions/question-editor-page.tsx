import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { QUESTION_TYPES } from "@/lib/question-types";
import { queryKeys } from "@/lib/query-keys";
import type { Question, QuestionBank, QuestionCategory, QuestionType } from "@/types/api";
import { QuestionEditorForm } from "./editor/question-editor-form";
import { QuestionViewer } from "./editor/question-viewer";

const toId = (value: string | null | undefined) => {
  const parsed = Number(value);
  return value && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

function EditorSkeleton() {
  return <div aria-busy="true" aria-label="Đang tải">
    <div className="-mx-4 -mt-6 mb-8 flex h-14 items-center gap-3 border-b px-4 sm:-mx-8 sm:-mt-8 sm:px-8">
      <Skeleton className="size-7" /><Skeleton className="h-4 w-40" /><Skeleton className="ml-auto h-8 w-28" />
    </div>
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <div className="space-y-4"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-full" /><Skeleton className="h-40 w-full" /></div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  </div>;
}

/** `/questions/new?bank=&category=&type=` và `/questions/:questionId/edit` — docs/assessment-spec.md §8. */
export function QuestionEditorPage() {
  const { status: guard, user } = useAuthGuard(["admin", "lecturer"]);
  const { questionId } = useParams();
  const [params] = useSearchParams();
  const id = toId(questionId);
  const isEdit = questionId != null;
  const question = useQuery({
    queryKey: queryKeys.questions.detail(id ?? 0),
    queryFn: ({ signal }) => api.get<Question>(`/questions/${id}`, undefined, signal),
    enabled: guard === "ok" && id != null,
  });
  const bankId = question.data?.bank_id ?? (isEdit ? null : toId(params.get("bank")));
  const banks = useQuery({
    queryKey: queryKeys.questionBanks.list(),
    queryFn: ({ signal }) => api.get<QuestionBank[]>("/question-banks", undefined, signal),
    enabled: guard === "ok",
  });
  const categories = useQuery({
    queryKey: queryKeys.questionBanks.categories(bankId ?? undefined),
    queryFn: ({ signal }) => api.get<QuestionCategory[]>(`/question-banks/${bankId}/categories`, undefined, signal),
    enabled: guard === "ok" && bankId != null,
  });

  if (guard !== "ok") return null;
  const back = <Button asChild variant="outline"><Link to="/questions">Về ngân hàng câu hỏi</Link></Button>;
  if (isEdit && id == null) return <EmptyState title="Không tìm thấy câu hỏi" description="Đường dẫn không hợp lệ." action={back} />;
  if (question.isError) return <ErrorState error={question.error} onRetry={() => question.refetch()} />;
  if (banks.isError) return <ErrorState error={banks.error} onRetry={() => banks.refetch()} />;
  if ((isEdit && question.isPending) || banks.isPending) return <EditorSkeleton />;
  if (bankId == null) return <EmptyState title="Chưa chọn ngân hàng" description="Mở ngân hàng câu hỏi rồi bấm “Tạo câu hỏi”." action={back} />;

  const bank = banks.data.find((item) => item.id === bankId);
  const canEdit = !!user?.roles.includes("lecturer") && !!bank?.can_edit;
  if (question.data && !canEdit) return <QuestionViewer question={question.data} bank={bank} />;
  if (!bank || !canEdit) return <EmptyState title="Không thể tạo câu hỏi" description="Bạn chỉ có quyền xem ngân hàng này, hoặc ngân hàng không tồn tại." action={back} />;

  const typeParam = params.get("type");
  const initialType = QUESTION_TYPES.some((item) => item.id === typeParam) ? typeParam as QuestionType : "mcq";
  return <QuestionEditorForm key={question.data?.id ?? "new"} question={question.data ?? null} bank={bank}
    categories={categories.data ?? []} categoriesLoading={categories.isPending}
    initialType={initialType} initialCategory={toId(params.get("category"))} />;
}
