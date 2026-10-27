import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState, ListSkeleton } from "@/components/state-blocks";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { BankSelect, TypeSelect, useClassBanks } from "@/features/assignments/lecturer/question-filter-selects";
import { DIFFICULTY_LABEL, formatPoints } from "@/features/assignments/lecturer/labels";
import { newKey, parseNumber, round2, type RuleDraft } from "./blueprint-model";
import { countMatching, useBankQuestions } from "./use-bank-data";
import type { QuestionCategory, QuestionDifficulty, QuestionType } from "@/types/api";

const LEVELS: QuestionDifficulty[] = ["easy", "medium", "hard"];

/** Ma trận đề: danh mục × độ khó, nhập số câu từng ô + một mức điểm/câu → mỗi ô > 0 thành một quy tắc (exam-spec.md §3.2). */
export function MatrixSheet({ classId, sectionKey, variant, quiz, fixedIds, onClose, onAdd }: {
  classId: number; sectionKey: string; variant: number | null; quiz: boolean; fixedIds: Set<number>;
  onClose: () => void; onAdd: (rules: RuleDraft[]) => void;
}) {
  const { banks } = useClassBanks(classId);
  const [bankId, setBankId] = useState<number | null>(null);
  const [type, setType] = useState<QuestionType | null>(null);
  const [points, setPoints] = useState("1");
  const [cells, setCells] = useState<Record<string, string>>({});
  const activeBank = bankId ?? banks[0]?.id ?? null;
  const questions = useBankQuestions(activeBank);
  const categories = useQuery({
    queryKey: queryKeys.questionBanks.categories(activeBank ?? undefined),
    queryFn: ({ signal }) => api.get<QuestionCategory[]>(`/question-banks/${activeBank}/categories`, undefined, signal),
    enabled: activeBank != null,
  });
  const avail = (categoryId: number, difficulty: QuestionDifficulty) =>
    questions.data ? countMatching(questions.data, { categoryId, difficulty, type }, fixedIds, quiz) : 0;
  const rows = (categories.data ?? []).filter((c) => LEVELS.some((d) => avail(c.id, d) > 0));
  const cellKey = (categoryId: number, difficulty: QuestionDifficulty) => `${categoryId}:${difficulty}`;
  const valueOf = (key: string) => Math.max(0, Math.floor(parseNumber(cells[key] ?? "") ?? 0));
  const picked = rows.flatMap((c) => LEVELS.map((d) => ({ c, d, n: valueOf(cellKey(c.id, d)), max: avail(c.id, d) }))).filter((x) => x.n > 0);
  const total = picked.reduce((sum, x) => sum + x.n, 0);
  const each = parseNumber(points);
  const over = picked.some((x) => x.n > x.max || x.n > 100);
  const invalidPoints = each == null || each <= 0 || each > 100;

  function add() {
    onAdd(picked.map((x) => ({
      key: newKey("r"), sectionKey, variant, bankId: activeBank as number, categoryId: x.c.id, difficulty: x.d, type, count: String(x.n), points,
    })));
  }

  return <Sheet open onOpenChange={(open) => !open && onClose()}>
    <SheetContent side="right" className="w-full! gap-0 sm:max-w-2xl!">
      <SheetHeader className="border-b p-5 pr-14">
        <SheetTitle>Ma trận đề</SheetTitle>
        <SheetDescription>Nhập số câu cần bốc ở từng ô danh mục × độ khó. Mỗi ô có số câu thành một quy tắc ngẫu nhiên.</SheetDescription>
      </SheetHeader>
      <div className="grid gap-3 border-b p-5 sm:grid-cols-[1.4fr_1fr_7rem]">
        <div className="space-y-1.5"><Label htmlFor="matrix-bank">Ngân hàng</Label>
          <BankSelect id="matrix-bank" banks={banks} value={activeBank} onChange={(id) => { setBankId(id); setCells({}); }} /></div>
        <div className="space-y-1.5"><Label htmlFor="matrix-type">Loại câu</Label>
          <TypeSelect id="matrix-type" value={type} onChange={setType} excludeProgramming={quiz} /></div>
        <div className="space-y-1.5"><Label htmlFor="matrix-points">Điểm mỗi câu</Label>
          <Input id="matrix-points" type="number" inputMode="decimal" min={0.01} step={0.25} className="tabular-nums" value={points}
            aria-invalid={invalidPoints ? true : undefined} onChange={(e) => setPoints(e.target.value)} /></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {questions.isPending || categories.isPending ? <ListSkeleton rows={4} />
          : rows.length === 0 ? <EmptyState compact icon={Grid3x3} title="Ngân hàng không có câu phù hợp" description="Đổi ngân hàng hoặc loại câu." />
            : <table className="w-full text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-3 text-left font-medium">Danh mục</th>
                {LEVELS.map((d) => <th key={d} scope="col" className="w-28 px-2 py-2 text-right font-medium">{DIFFICULTY_LABEL[d]}</th>)}
                <th scope="col" className="w-14 py-2 pl-2 text-right font-medium">Cộng</th>
              </tr></thead>
              <tbody>{rows.map((c) => <tr key={c.id} className="border-b last:border-b-0">
                <th scope="row" className="py-2 pr-3 text-left font-normal">{c.name}</th>
                {LEVELS.map((d) => {
                  const key = cellKey(c.id, d);
                  const max = avail(c.id, d);
                  const bad = valueOf(key) > max;
                  return <td key={d} className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <Input type="number" inputMode="numeric" min={0} max={max} disabled={max === 0} aria-label={`${c.name} — ${DIFFICULTY_LABEL[d]}, tối đa ${max}`}
                        aria-invalid={bad ? true : undefined} className="h-7 w-14 px-2 text-right tabular-nums" value={cells[key] ?? ""} placeholder="0"
                        onChange={(e) => setCells({ ...cells, [key]: e.target.value })} />
                      <span className="w-7 text-xs text-muted-foreground tabular-nums">/{max}</span>
                    </div>
                  </td>;
                })}
                <td className="py-2 pl-2 text-right font-medium tabular-nums">{LEVELS.reduce((s, d) => s + valueOf(cellKey(c.id, d)), 0) || ""}</td>
              </tr>)}</tbody>
            </table>}
        {over ? <p role="alert" className="mt-3 text-sm text-destructive">Có ô vượt quá số câu hiện có trong ngân hàng.</p> : null}
      </div>
      <SheetFooter className="flex-row items-center justify-between gap-3 border-t p-4">
        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
          <span className="font-medium text-foreground">{total}</span> câu · {picked.length} quy tắc · {formatPoints(round2(total * (each ?? 0)))} điểm
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
          <Button type="button" disabled={picked.length === 0 || over || invalidPoints} onClick={add}>Thêm {picked.length || ""} quy tắc</Button>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>;
}
