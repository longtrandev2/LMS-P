import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BankSelect, CategorySelect, DifficultySelect, TypeSelect, useClassBanks } from "@/features/assignments/lecturer/question-filter-selects";
import { variantCode } from "@/features/exams/shared/exam-labels";
import { newKey, parseNumber, type RuleDraft } from "./blueprint-model";
import { countMatching, useBankQuestions } from "./use-bank-data";

export interface RuleTarget { sectionKey: string; variant: number | null; rule?: RuleDraft }

/** Sheet thêm/sửa một quy tắc bốc ngẫu nhiên (exam-spec.md §3.2). Mount lại theo `target` để khởi tạo state. */
export function RuleSheet({ classId, target, quiz, variantCount, fixedIds, onClose, onSave }: {
  classId: number; target: RuleTarget; quiz: boolean; variantCount: number | null; fixedIds: Set<number>;
  onClose: () => void; onSave: (rule: RuleDraft) => void;
}) {
  const { banks } = useClassBanks(classId);
  const initial = target.rule;
  const [bankId, setBankId] = useState<number | null>(initial?.bankId ?? null);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? null);
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? null);
  const [type, setType] = useState(initial?.type ?? null);
  const [count, setCount] = useState(initial?.count ?? "5");
  const [points, setPoints] = useState(initial?.points ?? "1");
  const [variant, setVariant] = useState<number | null>(initial ? initial.variant : target.variant);
  const [error, setError] = useState<string | null>(null);
  const activeBank = bankId ?? banks[0]?.id ?? null;
  const questions = useBankQuestions(activeBank);
  const available = questions.data ? countMatching(questions.data, { categoryId, difficulty, type }, fixedIds, quiz) : null;

  function submit() {
    const n = parseNumber(count);
    const p = parseNumber(points);
    if (activeBank == null) return setError("Chọn ngân hàng.");
    if (n == null || !Number.isInteger(n) || n < 1 || n > 100) return setError("Số câu là số nguyên từ 1 đến 100.");
    if (p == null || p <= 0 || p > 100) return setError("Điểm mỗi câu từ 0,01 đến 100.");
    onSave({ key: initial?.key ?? newKey("r"), sectionKey: target.sectionKey, variant, bankId: activeBank, categoryId, difficulty, type, count, points });
  }

  return <Sheet open onOpenChange={(open) => !open && onClose()}>
    <SheetContent side="right" className="w-full! gap-0 sm:max-w-md!">
      <SheetHeader className="border-b p-5 pr-14">
        <SheetTitle>{initial ? "Sửa quy tắc ngẫu nhiên" : "Thêm quy tắc ngẫu nhiên"}</SheetTitle>
        <SheetDescription>Mỗi đề bốc đủ số câu khớp điều kiện. Câu cố định và câu thuộc quy tắc đứng trước không bị bốc lại.</SheetDescription>
      </SheetHeader>
      <div className="grid flex-1 content-start gap-4 overflow-y-auto p-5">
        <div className="space-y-1.5"><Label htmlFor="rule-bank">Ngân hàng</Label>
          <BankSelect id="rule-bank" banks={banks} value={activeBank} onChange={(id) => { setBankId(id); setCategoryId(null); }} /></div>
        <div className="space-y-1.5"><Label htmlFor="rule-category">Danh mục</Label>
          <CategorySelect id="rule-category" bankId={activeBank} value={categoryId} onChange={setCategoryId} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="rule-difficulty">Độ khó</Label>
            <DifficultySelect id="rule-difficulty" value={difficulty} onChange={setDifficulty} /></div>
          <div className="space-y-1.5"><Label htmlFor="rule-type">Loại câu</Label>
            <TypeSelect id="rule-type" value={type} onChange={setType} excludeProgramming={quiz} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="rule-count">Số câu</Label>
            <Input id="rule-count" type="number" inputMode="numeric" min={1} max={100} className="tabular-nums" value={count} onChange={(e) => setCount(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="rule-points">Điểm mỗi câu</Label>
            <Input id="rule-points" type="number" inputMode="decimal" min={0.01} step={0.25} className="tabular-nums" value={points} onChange={(e) => setPoints(e.target.value)} /></div>
        </div>
        {variantCount ? <div className="space-y-1.5"><Label htmlFor="rule-variant">Thuộc mã đề</Label>
          <Select value={variant == null ? "all" : String(variant)} onValueChange={(v) => setVariant(v === "all" ? null : Number(v))}>
            <SelectTrigger id="rule-variant" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">Chung mọi mã đề</SelectItem>
              {Array.from({ length: variantCount }, (_, i) => <SelectItem key={i} value={String(i + 1)}>Đề {variantCode(i + 1)}</SelectItem>)}
            </SelectContent>
          </Select></div> : null}
        <p className="rounded-lg bg-secondary/60 px-3 py-2.5 text-sm text-muted-foreground" aria-live="polite">
          {available == null ? "Đang đếm câu trong ngân hàng…"
            : <>Ngân hàng có <span className="font-medium text-foreground tabular-nums">{available}</span> câu khớp điều kiện (chưa trừ kho của quy tắc khác).
              {(parseNumber(count) ?? 0) > available ? <span className="mt-1 block text-destructive">Không đủ câu cho {count} câu yêu cầu.</span> : null}</>}
        </p>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </div>
      <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
        <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
        <Button type="button" onClick={submit}>{initial ? "Lưu quy tắc" : "Thêm quy tắc"}</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>;
}
