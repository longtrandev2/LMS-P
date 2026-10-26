import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BankSelect, CategorySelect, DifficultySelect, TypeSelect } from "./question-filter-selects";
import type { QuestionBank, QuestionDifficulty, QuestionType } from "@/types/api";

export interface DrawRuleDraft {
  key: number;
  bankId: number | null;
  categoryId: number | null;
  difficulty: QuestionDifficulty | null;
  type: QuestionType | null;
  count: string;
}

/** Một quy tắc bốc câu: ngân hàng, danh mục?, độ khó?, loại?, số câu. */
export function DrawRuleRow({ index, rule, banks, quiz, canRemove, error, onChange, onRemove }: {
  index: number; rule: DrawRuleDraft; banks: QuestionBank[]; quiz: boolean; canRemove: boolean; error?: string;
  onChange: (next: Partial<DrawRuleDraft>) => void; onRemove: () => void;
}) {
  const id = (name: string) => `draw-${rule.key}-${name}`;
  return <fieldset className="space-y-3 rounded-lg border p-4">
    <div className="flex items-center justify-between gap-2">
      <legend className="text-sm font-medium">Quy tắc {index + 1}</legend>
      {canRemove ? <Button type="button" variant="ghost" size="icon-sm" aria-label={`Xóa quy tắc ${index + 1}`} onClick={onRemove}><Trash2 aria-hidden /></Button> : null}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.2fr_1fr_1.2fr_5.5rem]">
      <div className="space-y-1.5"><Label htmlFor={id("bank")}>Ngân hàng</Label>
        <BankSelect id={id("bank")} banks={banks} value={rule.bankId} onChange={(bankId) => onChange({ bankId, categoryId: null })} /></div>
      <div className="space-y-1.5"><Label htmlFor={id("category")}>Danh mục</Label>
        <CategorySelect id={id("category")} bankId={rule.bankId} value={rule.categoryId} onChange={(categoryId) => onChange({ categoryId })} /></div>
      <div className="space-y-1.5"><Label htmlFor={id("difficulty")}>Độ khó</Label>
        <DifficultySelect id={id("difficulty")} value={rule.difficulty} onChange={(difficulty) => onChange({ difficulty })} /></div>
      <div className="space-y-1.5"><Label htmlFor={id("type")}>Loại câu</Label>
        <TypeSelect id={id("type")} value={rule.type} onChange={(type) => onChange({ type })} excludeProgramming={quiz} /></div>
      <div className="space-y-1.5"><Label htmlFor={id("count")}>Số câu</Label>
        <Input id={id("count")} type="number" inputMode="numeric" min={1} max={100} className="tabular-nums" value={rule.count}
          aria-invalid={error ? true : undefined} onChange={(event) => onChange({ count: event.target.value })} /></div>
    </div>
    {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
  </fieldset>;
}
