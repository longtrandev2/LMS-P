import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { blankCount, matchesAccepted } from "./answer-model";
import { CorrectnessMark, markTone, type AnswerFieldProps } from "./correctness-mark";

/** `fill_blank` — nội dung đã hiện nhãn "(n)"; bên dưới là ô nhập theo thứ tự, gửi đủ n phần tử. */
export function FillBlankAnswer({ question, value, onChange, readOnly, correct, idPrefix }: AnswerFieldProps) {
  const count = blankCount(question);
  const blanks = Array.from({ length: count }, (_, index) => value.blanks?.[index] ?? "");

  function update(index: number, text: string) {
    const next = [...blanks];
    next[index] = text;
    onChange({ ...value, blanks: next });
  }

  return <fieldset className="space-y-3">
    <legend className="mb-1 text-xs font-medium text-muted-foreground">Điền vào {count} chỗ trống theo thứ tự</legend>
    {blanks.map((text, index) => {
      const id = `${idPrefix}-blank-${index}`;
      const accepted = correct?.blanks?.[index];
      const ok = accepted ? matchesAccepted(text, accepted) : null;
      return <div key={id} className="grid gap-1.5 sm:grid-cols-[3rem_minmax(0,1fr)] sm:items-center">
        <Label htmlFor={id} className="font-mono text-sm">({index + 1})</Label>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Input id={id} value={text} maxLength={200} readOnly={readOnly} autoComplete="off"
              placeholder={readOnly ? "Bỏ trống" : `Ô ${index + 1}`}
              className={cn("max-w-md", markTone(ok == null ? null : ok ? "correct" : "wrong"))}
              onChange={(event) => update(index, event.target.value)} />
            {ok == null ? null : <CorrectnessMark ok={ok} />}
          </div>
          {accepted?.length ? <p className="text-xs text-muted-foreground">
            Chấp nhận: <span className="font-medium text-foreground">{accepted.join(" · ")}</span>
          </p> : null}
        </div>
      </div>;
    })}
  </fieldset>;
}
