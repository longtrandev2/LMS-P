import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PARTIAL_SCORING_TYPES, SCORING_MODE_LABEL } from "@/lib/question-types";
import type { QuestionCategory, QuestionDifficulty, ScoringMode } from "@/types/api";
import { DIFFICULTY_LABEL } from "../question-labels";
import { EditorSection, useEditor } from "./editor-context";

const DEFAULT_CATEGORY = "__default";
const SCORING_HINT: Record<ScoringMode, string> = {
  all_or_nothing: "Sinh viên chỉ nhận điểm khi trả lời đúng toàn bộ.",
  partial: "Điểm chia theo phần đúng (ô, cặp, vị trí hoặc lựa chọn).",
};

/** Section “Phân loại”: danh mục, độ khó và cách chấm (chỉ loại hỗ trợ chấm từng phần — §1.1). */
export function MetaFields({ categories, categoriesLoading }: { categories: QuestionCategory[]; categoriesLoading: boolean }) {
  const { draft, patch } = useEditor();
  const partial = PARTIAL_SCORING_TYPES.includes(draft.type);
  const fallback = categories.find((item) => item.name === "Chưa phân loại");
  const categoryValue = draft.category_id != null ? String(draft.category_id) : fallback ? String(fallback.id) : DEFAULT_CATEGORY;
  return <EditorSection title="Phân loại" description="Dùng để lọc trong ngân hàng và khi bốc câu ngẫu nhiên cho bài.">
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="question-category">Danh mục</Label>
        <Select value={categoryValue} disabled={categoriesLoading}
          onValueChange={(value) => patch({ category_id: value === DEFAULT_CATEGORY ? null : Number(value) })}>
          <SelectTrigger id="question-category" className="w-full">
            <SelectValue placeholder={categoriesLoading ? "Đang tải danh mục…" : "Chọn danh mục"} />
          </SelectTrigger>
          <SelectContent>
            {fallback ? null : <SelectItem value={DEFAULT_CATEGORY}>Chưa phân loại (mặc định)</SelectItem>}
            {categories.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <span id="question-difficulty-label" className="block text-sm font-medium leading-none">Độ khó</span>
        <ToggleGroup type="single" size="sm" aria-labelledby="question-difficulty-label" value={draft.difficulty}
          onValueChange={(value) => value && patch({ difficulty: value as QuestionDifficulty })}>
          {(Object.keys(DIFFICULTY_LABEL) as QuestionDifficulty[]).map((value) => <ToggleGroupItem key={value} value={value}>{DIFFICULTY_LABEL[value]}</ToggleGroupItem>)}
        </ToggleGroup>
      </div>
      {partial ? <div className="space-y-2 sm:col-span-2">
        <span id="question-scoring-label" className="block text-sm font-medium leading-none">Cách chấm</span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <ToggleGroup type="single" size="sm" aria-labelledby="question-scoring-label" value={draft.scoring_mode}
            onValueChange={(value) => value && patch({ scoring_mode: value as ScoringMode })}>
            {(["all_or_nothing", "partial"] as ScoringMode[]).map((value) => <ToggleGroupItem key={value} value={value}>{SCORING_MODE_LABEL[value]}</ToggleGroupItem>)}
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">{SCORING_HINT[draft.scoring_mode]}</p>
        </div>
      </div> : null}
    </div>
  </EditorSection>;
}
