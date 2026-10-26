import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPES } from "@/lib/question-types";

export const ALL = "all";
export const DIFFICULTY_LABEL = { easy: "Dễ", medium: "Trung bình", hard: "Khó" } as const;

/** Tìm theo nội dung + lọc loại câu + độ khó. */
export function QuestionListFilters({ search, type, difficulty, disabled, onSearch, onType, onDifficulty }: {
  search: string; type: string; difficulty: string; disabled: boolean;
  onSearch: (value: string) => void; onType: (value: string) => void; onDifficulty: (value: string) => void;
}) {
  return <div className="grid grid-cols-2 gap-3 border-b bg-muted/20 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_180px_150px]">
    <div className="relative col-span-2 xl:col-span-1">
      <Search className="absolute top-3 left-3 size-4 text-muted-foreground" aria-hidden />
      <Input type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Tìm nội dung câu hỏi…"
        aria-label="Tìm câu hỏi" disabled={disabled} className="bg-card pl-10" />
    </div>
    <Select value={type || ALL} onValueChange={(value) => onType(value === ALL ? "" : value)} disabled={disabled}>
      <SelectTrigger aria-label="Lọc theo loại câu hỏi" className="w-full min-w-0 bg-card"><SelectValue /></SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>Tất cả loại</SelectItem>
        {QUESTION_TYPES.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select value={difficulty || ALL} onValueChange={(value) => onDifficulty(value === ALL ? "" : value)} disabled={disabled}>
      <SelectTrigger aria-label="Lọc theo độ khó" className="w-full min-w-0 bg-card"><SelectValue /></SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>Mọi độ khó</SelectItem>
        {Object.entries(DIFFICULTY_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>;
}
