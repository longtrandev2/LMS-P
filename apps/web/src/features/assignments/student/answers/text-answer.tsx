import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { matchesAccepted, parseNumberText } from "./answer-model";
import { CorrectnessMark, markTone, type AnswerFieldProps } from "./correctness-mark";

/** `short_answer` — một ô nhập, tối đa 1000 ký tự. */
export function ShortAnswer({ value, onChange, readOnly, correct, idPrefix }: AnswerFieldProps) {
  const id = `${idPrefix}-text`;
  const ok = correct?.accepted ? matchesAccepted(value.text, correct.accepted) : null;
  return <div className="space-y-2">
    <Label htmlFor={id}>Câu trả lời</Label>
    <div className="flex items-center gap-2">
      <Input id={id} value={value.text ?? ""} maxLength={1000} readOnly={readOnly} autoComplete="off"
        placeholder={readOnly ? "Bỏ trống" : "Nhập câu trả lời"} className={cn("max-w-xl", markTone(ok == null ? null : ok ? "correct" : "wrong"))}
        onChange={(event) => onChange({ ...value, text: event.target.value })} />
      {ok == null ? null : <CorrectnessMark ok={ok} />}
    </div>
    {correct?.accepted?.length ? <p className="text-xs text-muted-foreground">
      Đáp án chấp nhận: <span className="font-medium text-foreground">{correct.accepted.join(" · ")}</span>
    </p> : null}
  </div>;
}

/** `numeric` — nhận dấu phẩy hoặc dấu chấm thập phân, gửi `number`. */
export function NumericAnswer({ value, onChange, readOnly, correct, idPrefix }: AnswerFieldProps) {
  const id = `${idPrefix}-number`;
  const text = value.number_text ?? "";
  const parsed = parseNumberText(text);
  const invalid = text.trim() !== "" && parsed == null;
  const hasKey = correct?.value != null;
  const ok = hasKey && parsed != null ? Math.abs(parsed - (correct?.value ?? 0)) <= (correct?.tolerance ?? 0) : hasKey ? false : null;
  return <div className="space-y-2">
    <Label htmlFor={id}>Đáp số</Label>
    <div className="flex items-center gap-2">
      <Input id={id} value={text} inputMode="decimal" readOnly={readOnly} autoComplete="off" aria-invalid={invalid || undefined}
        aria-describedby={`${id}-hint`} placeholder={readOnly ? "Bỏ trống" : "Ví dụ: 3,5"}
        className={cn("max-w-56 font-mono", markTone(ok == null ? null : ok ? "correct" : "wrong"))}
        onChange={(event) => onChange({ ...value, number_text: event.target.value })} />
      {ok == null ? null : <CorrectnessMark ok={ok} />}
    </div>
    <p id={`${id}-hint`} className={cn("text-xs", invalid ? "text-destructive" : "text-muted-foreground")}>
      {invalid ? "Chưa phải số hợp lệ — câu này đang được tính là bỏ trống." : readOnly ? null : "Dùng dấu phẩy hoặc dấu chấm cho phần thập phân."}
    </p>
    {hasKey ? <p className="text-xs text-muted-foreground">
      Đáp án: <span className="font-mono font-medium text-foreground">{correct?.value}</span>
      {correct?.tolerance ? ` (sai số cho phép ±${correct.tolerance})` : ""}
    </p> : null}
  </div>;
}
