import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Paginated, QuestionCategory, QuestionDifficulty, QuestionSummary, QuestionType } from "@/types/api";

const PAGE = 100;
const MAX_PAGES = 20;

/** Mọi câu của một ngân hàng (tối đa 2 000) — để đếm kho cho ma trận đề / quy tắc. */
async function fetchBankQuestions(bankId: number, signal?: AbortSignal): Promise<QuestionSummary[]> {
  const items: QuestionSummary[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await api.get<Paginated<QuestionSummary>>("/questions", { bank_id: bankId, page, limit: PAGE }, signal);
    items.push(...data.items);
    if (items.length >= data.total || data.items.length === 0) break;
  }
  return items;
}

export function useBankQuestions(bankId: number | null) {
  return useQuery({
    queryKey: [...queryKeys.questions.all, "bank-all", bankId] as const,
    queryFn: ({ signal }) => fetchBankQuestions(bankId as number, signal),
    enabled: bankId != null,
    staleTime: 60_000,
  });
}

/** Câu của nhiều ngân hàng (dùng chung cache với `useBankQuestions`) → map theo ngân hàng. */
export function useBanksQuestions(bankIds: number[]): Map<number, QuestionSummary[]> {
  const unique = [...new Set(bankIds)];
  const results = useQueries({
    queries: unique.map((bankId) => ({
      queryKey: [...queryKeys.questions.all, "bank-all", bankId] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchBankQuestions(bankId, signal),
      staleTime: 60_000,
    })),
  });
  const map = new Map<number, QuestionSummary[]>();
  results.forEach((result, index) => { if (result.data) map.set(unique[index], result.data); });
  return map;
}

/** Danh mục của nhiều ngân hàng (cùng cache với `CategorySelect`) → tra tên theo id. */
export function useCategoryNames(bankIds: number[]): Map<number, string> {
  const unique = [...new Set(bankIds)];
  const results = useQueries({
    queries: unique.map((bankId) => ({
      queryKey: queryKeys.questionBanks.categories(bankId),
      queryFn: ({ signal }: { signal: AbortSignal }) => api.get<QuestionCategory[]>(`/question-banks/${bankId}/categories`, undefined, signal),
    })),
  });
  const names = new Map<number, string>();
  results.forEach((result) => result.data?.forEach((category) => names.set(category.id, category.name)));
  return names;
}

export interface Criteria { categoryId: number | null; difficulty: QuestionDifficulty | null; type: QuestionType | null }

/** Số câu khớp điều kiện, trừ câu cố định đã có trong đề; quiz bỏ câu lập trình. */
export function countMatching(questions: QuestionSummary[], criteria: Criteria, exclude: Set<number>, noProgramming: boolean): number {
  return questions.filter((q) => !exclude.has(q.id) && !(noProgramming && q.type === "programming")
    && (criteria.categoryId == null || q.category_id === criteria.categoryId)
    && (criteria.difficulty == null || q.difficulty === criteria.difficulty)
    && (criteria.type == null || q.type === criteria.type)).length;
}
