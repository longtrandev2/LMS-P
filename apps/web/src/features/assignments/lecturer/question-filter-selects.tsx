import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { QUESTION_TYPES } from "@/lib/question-types";
import { DIFFICULTY_LABEL } from "./labels";
import type { ClassSummary, QuestionBank, QuestionCategory, QuestionDifficulty, QuestionType } from "@/types/api";

const ALL = "all";

/** Ngân hàng xem được, ưu tiên ngân hàng thuộc học phần của lớp. */
export function useClassBanks(classId: number) {
  const clazz = useQuery({
    queryKey: queryKeys.classes.detail(String(classId)),
    queryFn: ({ signal }) => api.get<ClassSummary>(`/classes/${classId}`, undefined, signal),
  });
  const courseId = clazz.data?.course_id;
  const banks = useQuery({
    queryKey: queryKeys.questionBanks.list(courseId),
    queryFn: ({ signal }) => api.get<QuestionBank[]>("/question-banks", { course_id: courseId }, signal),
    enabled: courseId != null,
  });
  const sorted = [...(banks.data ?? [])].sort((a, b) => Number(b.course_id === courseId) - Number(a.course_id === courseId));
  return {
    banks: sorted, isPending: clazz.isPending || banks.isPending, error: clazz.error ?? banks.error,
    retry: () => { void clazz.refetch(); void banks.refetch(); },
  };
}

export function BankSelect({ id, banks, value, onChange }: {
  id: string; banks: QuestionBank[]; value: number | null; onChange: (id: number) => void;
}) {
  return <Select value={value != null ? String(value) : undefined} onValueChange={(next) => onChange(Number(next))}>
    <SelectTrigger id={id} className="w-full"><SelectValue placeholder="Chọn ngân hàng" /></SelectTrigger>
    <SelectContent position="popper">
      {banks.map((bank) => <SelectItem key={bank.id} value={String(bank.id)}>
        {bank.name}{bank.course_name ? ` · ${bank.course_name}` : " · Cá nhân"}
      </SelectItem>)}
    </SelectContent>
  </Select>;
}

export function CategorySelect({ id, bankId, value, onChange }: {
  id: string; bankId: number | null; value: number | null; onChange: (id: number | null) => void;
}) {
  const categories = useQuery({
    queryKey: queryKeys.questionBanks.categories(bankId ?? undefined),
    queryFn: ({ signal }) => api.get<QuestionCategory[]>(`/question-banks/${bankId}/categories`, undefined, signal),
    enabled: bankId != null,
  });
  return <Select value={value != null ? String(value) : ALL} onValueChange={(next) => onChange(next === ALL ? null : Number(next))}
    disabled={bankId == null}>
    <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
    <SelectContent position="popper">
      <SelectItem value={ALL}>Mọi danh mục</SelectItem>
      {categories.data?.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
    </SelectContent>
  </Select>;
}

export function DifficultySelect({ id, value, onChange }: {
  id: string; value: QuestionDifficulty | null; onChange: (value: QuestionDifficulty | null) => void;
}) {
  return <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? null : next as QuestionDifficulty)}>
    <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
    <SelectContent position="popper">
      <SelectItem value={ALL}>Mọi độ khó</SelectItem>
      {(Object.keys(DIFFICULTY_LABEL) as QuestionDifficulty[]).map((key) => <SelectItem key={key} value={key}>{DIFFICULTY_LABEL[key]}</SelectItem>)}
    </SelectContent>
  </Select>;
}

/** `excludeProgramming` cho quiz — quiz không nhận câu lập trình. */
export function TypeSelect({ id, value, onChange, excludeProgramming }: {
  id: string; value: QuestionType | null; onChange: (value: QuestionType | null) => void; excludeProgramming: boolean;
}) {
  const types = QUESTION_TYPES.filter((item) => !excludeProgramming || item.id !== "programming");
  return <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? null : next as QuestionType)}>
    <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
    <SelectContent position="popper">
      <SelectItem value={ALL}>{excludeProgramming ? "Mọi loại (trừ lập trình)" : "Mọi loại câu"}</SelectItem>
      {types.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
    </SelectContent>
  </Select>;
}
