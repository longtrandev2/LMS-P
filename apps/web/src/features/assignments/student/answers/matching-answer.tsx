import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CorrectnessMark, markTone, type AnswerFieldProps } from "./correctness-mark";

const NONE = "__none__";

/** `matching` — mỗi mục trái chọn một mục phải; mục phải chỉ nên dùng một lần (cảnh báo nếu trùng). */
export function MatchingAnswer({ question, value, onChange, readOnly, correct, idPrefix }: AnswerFieldProps) {
  const lefts = question.matching?.lefts ?? [];
  const rights = question.matching?.rights ?? [];
  const matches = value.matches ?? {};
  const usage = new Map<string, number>();
  for (const right of Object.values(matches)) if (right) usage.set(right, (usage.get(right) ?? 0) + 1);
  const hasDuplicate = [...usage.values()].some((count) => count > 1);
  const rightText = (id: string | undefined) => rights.find((item) => item.id === id)?.text;

  function update(leftId: string, rightId: string) {
    const next = { ...matches };
    if (rightId === NONE) delete next[leftId];
    else next[leftId] = rightId;
    onChange({ ...value, matches: next });
  }

  return <fieldset className="space-y-3">
    <legend className="mb-1 text-xs font-medium text-muted-foreground">Ghép mỗi mục bên trái với một mục bên phải</legend>
    {hasDuplicate && !readOnly ? <Alert variant="warning" role="status">
      <AlertTriangle aria-hidden />
      <AlertDescription className="text-xs">Có mục bên phải đang được chọn nhiều lần — mỗi mục chỉ đúng với một dòng.</AlertDescription>
    </Alert> : null}
    <ul className="space-y-2">
      {lefts.map((left, index) => {
        const id = `${idPrefix}-match-${left.id}`;
        const chosen = matches[left.id];
        const expected = correct?.matches?.[left.id];
        const state = correct?.matches ? (chosen && chosen === expected ? "correct" : "wrong") : null;
        const duplicate = chosen ? (usage.get(chosen) ?? 0) > 1 : false;
        return <li key={left.id} className={cn("grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,1fr)] sm:items-center", markTone(state))}>
          <span id={`${id}-label`} className="flex gap-2 text-sm">
            <span className="font-mono text-xs leading-5 text-muted-foreground" aria-hidden>{index + 1}.</span>{left.text}
          </span>
          <div className="space-y-1">
            {readOnly ? <div className="flex items-center gap-2 text-sm">
              <span className={chosen ? "font-medium" : "text-muted-foreground"}>{rightText(chosen) ?? "Chưa ghép"}</span>
              {state ? <CorrectnessMark ok={state === "correct"} /> : null}
            </div> : <Select value={chosen ?? NONE} onValueChange={(next) => update(left.id, next)}>
              <SelectTrigger id={id} aria-labelledby={`${id}-label`} aria-invalid={duplicate || undefined} className="w-full">
                <SelectValue placeholder="Chọn mục ghép" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Chưa chọn —</SelectItem>
                {rights.map((right) => <SelectItem key={right.id} value={right.id}>
                  {right.text}{(usage.get(right.id) ?? 0) > 0 && right.id !== chosen ? " (đã dùng)" : ""}
                </SelectItem>)}
              </SelectContent>
            </Select>}
            {duplicate && !readOnly ? <p className="text-xs text-warning">Mục này cũng được chọn ở dòng khác.</p> : null}
            {state === "wrong" && expected ? <p className="text-xs text-muted-foreground">
              Đúng: <span className="font-medium text-foreground">{rightText(expected) ?? expected}</span>
            </p> : null}
          </div>
        </li>;
      })}
    </ul>
  </fieldset>;
}
