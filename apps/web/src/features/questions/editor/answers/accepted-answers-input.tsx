import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckBox } from "../../ui/choice-controls";
import { FieldMessage } from "../editor-context";
import { LIMITS } from "../limits";

/** Danh sách đáp án chấp nhận dạng tag + tùy chọn phân biệt hoa thường. Enter hoặc “|” để thêm. */
export function AcceptedAnswersInput({ id, label, values, onChange, caseSensitive, onCaseSensitiveChange, error }: {
  id: string; label: string; values: string[]; onChange: (values: string[]) => void;
  caseSensitive: boolean; onCaseSensitiveChange: (value: boolean) => void; error?: string;
}) {
  const [text, setText] = useState("");
  function add(raw: string) {
    const next = raw.split(/[|\n]/).map((value) => value.trim()).filter(Boolean)
      .filter((value, index, list) => !values.includes(value) && list.indexOf(value) === index);
    if (next.length) onChange([...values, ...next].slice(0, LIMITS.accepted));
    setText("");
  }
  const full = values.length >= LIMITS.accepted;
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckBox checked={caseSensitive} onCheckedChange={(checked) => onCaseSensitiveChange(checked === true)} />
        Phân biệt hoa thường
      </label>
    </div>
    <div className={cn("flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 focus-within:border-ring",
      error ? "border-destructive" : "border-input")}>
      {values.map((value) => <span key={value} className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted px-2 py-0.5 font-mono text-xs">
        <span className="truncate">{value}</span>
        <button type="button" className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label={`Bỏ đáp án ${value}`} onClick={() => onChange(values.filter((item) => item !== value))}><X className="size-3" aria-hidden /></button>
      </span>)}
      <input id={id} value={text} disabled={full} maxLength={LIMITS.answerText} aria-invalid={!!error} aria-describedby={`${id}-message`}
        placeholder={full ? "Đã đủ 20 đáp án" : values.length ? "Thêm đáp án…" : "Gõ đáp án rồi nhấn Enter"}
        onChange={(event) => event.target.value.includes("|") ? add(event.target.value) : setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); add(text); }
          else if (event.key === "Backspace" && !text && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={() => text.trim() && add(text)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text");
          if (/[|\n]/.test(pasted)) { event.preventDefault(); add(text + pasted); }
        }}
        className="h-7 min-w-32 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground" />
    </div>
    <FieldMessage id={`${id}-message`} error={error}
      hint="Chuẩn hóa khi chấm: bỏ khoảng trắng thừa; không bỏ dấu tiếng Việt." />
  </div>;
}
