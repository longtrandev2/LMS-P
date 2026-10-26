import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/state-blocks";
import { QuestionPickRow } from "./question-pick-row";
import { QuestionPreviewDialog } from "./question-preview-dialog";
import type { DrawRuleDraft } from "./draw-rule-row";
import type { DrawResult, QuestionSummary } from "@/types/api";

/** `rule` trong `shortages` là chỉ số quy tắc tính từ 0 theo thứ tự gửi lên. */
function ruleLabel(rule: number, rules: DrawRuleDraft[]): string {
  return rule >= 0 && rule < rules.length ? `Quy tắc ${rule + 1}` : `Quy tắc ${rule}`;
}

export function DrawResultList({ result, rules, checked, onCheckedChange }: {
  result: { items: QuestionSummary[]; shortages: DrawResult["shortages"]; skipped: number };
  rules: DrawRuleDraft[]; checked: Set<number>; onCheckedChange: (next: Set<number>) => void;
}) {
  const [previewId, setPreviewId] = useState<number | null>(null);
  const toggle = (id: number, value: boolean) => {
    const next = new Set(checked);
    if (value) next.add(id); else next.delete(id);
    onCheckedChange(next);
  };
  return <div className="space-y-3">
    {result.shortages.length || result.skipped ? <Alert>
      <AlertTriangle aria-hidden />
      <AlertTitle>Không đủ câu theo yêu cầu</AlertTitle>
      <AlertDescription>
        <ul className="list-disc space-y-0.5 pl-4">
          {result.shortages.map((item) => <li key={item.rule}>{ruleLabel(item.rule, rules)}: cần {item.requested} câu, chỉ còn {item.available} câu phù hợp.</li>)}
          {result.skipped ? <li>Đã bỏ {result.skipped} câu lập trình vì quiz không nhận loại câu này.</li> : null}
        </ul>
      </AlertDescription>
    </Alert> : null}
    {result.items.length === 0 ? <EmptyState compact title="Không bốc được câu nào" description="Nới lỏng quy tắc (bỏ danh mục, độ khó hoặc loại câu) rồi bốc lại." />
      : <div className="rounded-lg border">
        <p className="border-b px-4 py-2 text-sm text-muted-foreground" aria-live="polite">
          Bốc được {result.items.length} câu · chọn {checked.size}
        </p>
        <ul className="max-h-[45dvh] divide-y overflow-y-auto">
          {result.items.map((item) => <QuestionPickRow key={item.id} item={item} checked={checked.has(item.id)}
            onCheckedChange={(value) => toggle(item.id, value)} onPreview={() => setPreviewId(item.id)} />)}
        </ul>
      </div>}
    <QuestionPreviewDialog questionId={previewId} onOpenChange={(value) => !value && setPreviewId(null)} />
  </div>;
}
