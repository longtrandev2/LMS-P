import { FolderPlus } from "lucide-react";
import { SearchField } from "@/components/list-toolbar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPES } from "@/lib/question-types";
import type { QuestionCategory } from "@/types/api";
import { DIFFICULTY_LABEL } from "./question-labels";

const ALL = "all";

export interface QuestionFilterValues { search: string; type: string; difficulty: string }

/**
 * Thanh công cụ danh sách câu (DESIGN.md §4): tìm theo nội dung · danh mục (+ thêm danh mục) · loại · độ khó.
 * Không khung — nằm ngay trên các hàng.
 */
export function QuestionListFilters({ values, onChange, categories, categoryId, categoriesLoading, onCategory, onAddCategory, disabled }: {
  values: QuestionFilterValues; onChange: (patch: Partial<QuestionFilterValues>) => void;
  categories: QuestionCategory[]; categoryId: number | null; categoriesLoading: boolean;
  onCategory: (id: number | null) => void; onAddCategory?: () => void; disabled: boolean;
}) {
  return <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Lọc câu hỏi">
    <SearchField value={values.search} onChange={(search) => onChange({ search })} placeholder="Tìm nội dung câu hỏi…"
      label="Tìm câu hỏi" className="w-full sm:w-64" />
    <div className="flex items-center gap-0.5">
      <Select value={categoryId != null ? String(categoryId) : ALL} disabled={disabled || categoriesLoading}
        onValueChange={(value) => onCategory(value === ALL ? null : Number(value))}>
        <SelectTrigger aria-label="Lọc theo danh mục" className="w-44"><SelectValue placeholder="Đang tải…" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Mọi danh mục</SelectItem>
          {categories.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {onAddCategory ? <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" onClick={onAddCategory}
        aria-label="Thêm danh mục" title="Thêm danh mục"><FolderPlus aria-hidden /></Button> : null}
    </div>
    <Select value={values.type || ALL} onValueChange={(value) => onChange({ type: value === ALL ? "" : value })} disabled={disabled}>
      <SelectTrigger aria-label="Lọc theo loại câu hỏi" className="w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Mọi loại câu</SelectItem>
        {QUESTION_TYPES.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select value={values.difficulty || ALL} onValueChange={(value) => onChange({ difficulty: value === ALL ? "" : value })} disabled={disabled}>
      <SelectTrigger aria-label="Lọc theo độ khó" className="w-36"><SelectValue /></SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={ALL}>Mọi độ khó</SelectItem>
        {Object.entries(DIFFICULTY_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>;
}
