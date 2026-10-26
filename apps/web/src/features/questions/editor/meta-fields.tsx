import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PARTIAL_SCORING_TYPES, SCORING_MODE_LABEL } from "@/lib/question-types";
import type { QuestionCategory, QuestionDifficulty, ScoringMode } from "@/types/api";
import { useEditor } from "./editor-context";

const DEFAULT_CATEGORY = "__default";
const DIFFICULTIES: { value: QuestionDifficulty; label: string }[] = [
  { value: "easy", label: "Dễ" }, { value: "medium", label: "Trung bình" }, { value: "hard", label: "Khó" },
];
const SCORING_HINT: Record<ScoringMode, string> = {
  all_or_nothing: "Sinh viên chỉ nhận điểm khi trả lời đúng toàn bộ.",
  partial: "Điểm chia theo phần đúng (ô, cặp, vị trí hoặc lựa chọn).",
};

/** Danh mục, độ khó và cách chấm (chỉ loại hỗ trợ chấm từng phần — §1.1). */
export function MetaFields({ categories, categoriesLoading }: { categories: QuestionCategory[]; categoriesLoading: boolean }) {
  const { draft, patch } = useEditor();
  const partial = PARTIAL_SCORING_TYPES.includes(draft.type);
  const fallback = categories.find((item) => item.name === "Chưa phân loại");
  const categoryValue = draft.category_id != null ? String(draft.category_id) : fallback ? String(fallback.id) : DEFAULT_CATEGORY;
  return <div className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-2">
      <Label htmlFor="question-category">Danh mục</Label>
      <Select value={categoryValue} disabled={categoriesLoading}
        onValueChange={(value) => patch({ category_id: value === DEFAULT_CATEGORY ? null : Number(value) })}>
        <SelectTrigger id="question-category" className="w-full">
          <SelectValue placeholder={categoriesLoading ? "Đang tải danh mục…" : "Chọn danh mục"} />
        </SelectTrigger>
        <SelectContent position="popper">
          {fallback ? null : <SelectItem value={DEFAULT_CATEGORY}>Chưa phân loại (mặc định)</SelectItem>}
          {categories.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <span id="question-difficulty-label" className="block text-sm font-medium leading-none">Độ khó</span>
      <ToggleGroup type="single" aria-labelledby="question-difficulty-label" value={draft.difficulty}
        onValueChange={(value) => value && patch({ difficulty: value as QuestionDifficulty })}>
        {DIFFICULTIES.map((item) => <ToggleGroupItem key={item.value} value={item.value}>{item.label}</ToggleGroupItem>)}
      </ToggleGroup>
    </div>
    {partial ? <div className="space-y-2 sm:col-span-2">
      <span id="question-scoring-label" className="block text-sm font-medium leading-none">Cách chấm</span>
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup type="single" aria-labelledby="question-scoring-label" value={draft.scoring_mode}
          onValueChange={(value) => value && patch({ scoring_mode: value as ScoringMode })}>
          {(["all_or_nothing", "partial"] as ScoringMode[]).map((value) => <ToggleGroupItem key={value} value={value}>{SCORING_MODE_LABEL[value]}</ToggleGroupItem>)}
        </ToggleGroup>
        <p className="text-xs text-muted-foreground">{SCORING_HINT[draft.scoring_mode]}</p>
      </div>
    </div> : null}
  </div>;
}
