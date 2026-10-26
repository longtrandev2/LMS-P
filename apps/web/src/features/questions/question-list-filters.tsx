import { ListToolbar, SearchField } from "@/components/list-toolbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPES } from "@/lib/question-types";

export const ALL = "all";
export const DIFFICULTY_LABEL = { easy: "Dễ", medium: "Trung bình", hard: "Khó" } as const;

/** Thanh công cụ danh sách câu hỏi (DESIGN.md §5): tìm theo nội dung bên trái, lọc loại câu + độ khó bên phải. */
export function QuestionListFilters({ search, type, difficulty, disabled, onSearch, onType, onDifficulty }: {
  search: string; type: string; difficulty: string; disabled: boolean;
  onSearch: (value: string) => void; onType: (value: string) => void; onDifficulty: (value: string) => void;
}) {
  return <ListToolbar search={<SearchField value={search} onChange={onSearch} placeholder="Tìm nội dung câu hỏi…" label="Tìm câu hỏi" />}>
    <Select value={type || ALL} onValueChange={(value) => onType(value === ALL ? "" : value)} disabled={disabled}>
      <SelectTrigger aria-label="Lọc theo loại câu hỏi" className="w-full min-w-0 sm:w-44"><SelectValue /></SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={ALL}>Tất cả loại</SelectItem>
        {QUESTION_TYPES.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select value={difficulty || ALL} onValueChange={(value) => onDifficulty(value === ALL ? "" : value)} disabled={disabled}>
      <SelectTrigger aria-label="Lọc theo độ khó" className="w-full min-w-0 sm:w-36"><SelectValue /></SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={ALL}>Mọi độ khó</SelectItem>
        {Object.entries(DIFFICULTY_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  </ListToolbar>;
}
