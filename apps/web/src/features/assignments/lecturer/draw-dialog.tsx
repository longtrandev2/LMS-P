import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { DrawResultList } from "./draw-result-list";
import { DrawRuleRow, type DrawRuleDraft } from "./draw-rule-row";
import { useClassBanks } from "./question-filter-selects";
import type { DrawResult, DrawRule, QuestionSummary } from "@/types/api";

const MAX_RULES = 10;
let ruleKey = 0;
const newRule = (bankId: number | null): DrawRuleDraft => ({ key: ++ruleKey, bankId, categoryId: null, difficulty: null, type: null, count: "5" });

/** Bốc ngẫu nhiên theo quy tắc (`POST /questions/draw`) rồi thêm kết quả vào danh sách câu của bản nháp. */
export function DrawDialog({ open, onOpenChange, classId, quiz, existing, onAdd }: {
  open: boolean; onOpenChange: (open: boolean) => void; classId: number; quiz: boolean;
  existing: Set<number>; onAdd: (items: QuestionSummary[]) => void;
}) {
  const { banks, isPending: banksPending, error: banksError } = useClassBanks(classId);
  const [rules, setRules] = useState<DrawRuleDraft[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{ items: QuestionSummary[]; shortages: DrawResult["shortages"]; skipped: number } | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const visibleRules = rules;
  useEffect(() => {
    if (open && rules.length === 0 && banks.length) setRules([newRule(banks[0].id)]);
  }, [open, rules.length, banks]);

  const draw = useMutation({
    mutationFn: (body: { rules: DrawRule[]; exclude_question_ids: number[] }) => api.post<DrawResult>("/questions/draw", body),
    onSuccess: (data) => {
      // Quiz không nhận câu lập trình: quy tắc "mọi loại" có thể trả về câu lập trình — bỏ đi và báo lại.
      const items = data.items.filter((item) => !quiz || item.type !== "programming");
      setResult({ items, shortages: data.shortages, skipped: data.items.length - items.length });
      setChecked(new Set(items.map((item) => item.id)));
    },
  });

  function patchRule(key: number, next: Partial<DrawRuleDraft>) {
    setRules(visibleRules.map((rule) => rule.key === key ? { ...rule, ...next } : rule));
  }
  function submit() {
    const nextErrors: Record<number, string> = {};
    visibleRules.forEach((rule) => {
      const count = Number(rule.count);
      if (rule.bankId == null) nextErrors[rule.key] = "Chọn ngân hàng.";
      else if (!Number.isInteger(count) || count < 1 || count > 100) nextErrors[rule.key] = "Số câu là số nguyên từ 1 đến 100.";
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    draw.mutate({
      rules: visibleRules.map((rule) => ({
        bank_id: rule.bankId as number, category_id: rule.categoryId, difficulty: rule.difficulty, type: rule.type, count: Number(rule.count),
      })),
      exclude_question_ids: [...existing],
    });
  }
  function close(value: boolean) {
    if (!value) { setResult(null); setErrors({}); draw.reset(); }
    onOpenChange(value);
  }
  function add() {
    onAdd(result?.items.filter((item) => checked.has(item.id)) ?? []);
    close(false);
  }

  return <Dialog open={open} onOpenChange={close}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle className="font-heading">Bốc câu ngẫu nhiên</DialogTitle>
        <DialogDescription>
          {result ? "Xem kết quả, bỏ chọn câu không muốn dùng rồi thêm vào đề. Đề vẫn chung cho cả lớp."
            : "Mỗi quy tắc bốc một số câu không lặp từ ngân hàng. Câu đã có trong đề được loại trừ."}
        </DialogDescription>
      </DialogHeader>
      {result ? <DrawResultList result={result} rules={visibleRules} checked={checked} onCheckedChange={setChecked} />
        : <div className="space-y-3">
          {banksError ? <p role="alert" className="text-sm text-destructive">Không tải được ngân hàng câu hỏi: {errorText(banksError)}</p> : null}
          {!banksPending && !banksError && banks.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có ngân hàng câu hỏi nào bạn được xem.</p> : null}
          {visibleRules.map((rule, index) => <DrawRuleRow key={rule.key} index={index} rule={rule} banks={banks} quiz={quiz}
            canRemove={visibleRules.length > 1} error={errors[rule.key]} onChange={(next) => patchRule(rule.key, next)}
            onRemove={() => setRules(visibleRules.filter((item) => item.key !== rule.key))} />)}
          <Button type="button" variant="outline" size="sm" disabled={visibleRules.length >= MAX_RULES}
            onClick={() => setRules([...visibleRules, newRule(visibleRules.at(-1)?.bankId ?? banks[0]?.id ?? null)])}>
            <Plus aria-hidden />Thêm quy tắc
          </Button>
          {draw.isError ? <p role="alert" className="text-sm text-destructive">{errorText(draw.error)}</p> : null}
        </div>}
      <DialogFooter>
        {result ? <>
          <Button type="button" variant="ghost" onClick={() => setResult(null)}>Sửa quy tắc</Button>
          <Button type="button" variant="outline" disabled={draw.isPending} onClick={submit}><Shuffle aria-hidden />Bốc lại</Button>
          <Button type="button" disabled={checked.size === 0} onClick={add}>Thêm {checked.size} câu vào đề</Button>
        </> : <>
          <Button type="button" variant="ghost" onClick={() => close(false)}>Hủy</Button>
          <Button type="button" disabled={draw.isPending || visibleRules.length === 0} onClick={submit}><Shuffle aria-hidden />{draw.isPending ? "Đang bốc…" : "Bốc câu"}</Button>
        </>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
