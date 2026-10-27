import { useEffect, useRef, type KeyboardEvent } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { currentOrder } from "./answer-model";
import { BAR, CorrectnessMark, markTone, type AnswerFieldProps } from "./correctness-mark";

/** `ordering` — đổi chỗ bằng nút lên/xuống hoặc phím ↑/↓ khi một mục đang được chọn. */
export function OrderingAnswer({ question, value, onChange, readOnly, correct, idPrefix }: AnswerFieldProps) {
  const items = question.ordering_items ?? [];
  const order = currentOrder(question, value);
  const textOf = (id: string) => items.find((item) => item.id === id)?.text ?? id;
  const refs = useRef(new Map<string, HTMLLIElement>());
  const focusAfterMove = useRef<string | null>(null);
  const touched = value.order != null;

  useEffect(() => {
    const id = focusAfterMove.current;
    focusAfterMove.current = null;
    if (id) refs.current.get(id)?.focus();
  }, [value.order]);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (readOnly || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    focusAfterMove.current = next[target];
    onChange({ ...value, order: next });
  }

  function onKeyDown(event: KeyboardEvent<HTMLLIElement>, index: number) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      move(index, event.key === "ArrowUp" ? -1 : 1);
    }
  }

  return <div className="space-y-3">
    <p id={`${idPrefix}-order-hint`} className="text-xs text-muted-foreground">
      {readOnly ? "Thứ tự bạn đã sắp" : touched ? "Sắp các mục theo đúng thứ tự, từ trên xuống dưới."
        : "Chưa sắp xếp — dùng nút mũi tên, hoặc chọn một mục rồi bấm ↑/↓ để đổi chỗ."}
    </p>
    <ol className="space-y-3" aria-describedby={`${idPrefix}-order-hint`} data-arrow-keys>
      {order.map((id, index) => {
        const state = correct?.order ? (correct.order[index] === id ? "correct" : "wrong") : null;
        return <li key={id} ref={(node) => { if (node) refs.current.set(id, node); else refs.current.delete(id); }}
          tabIndex={readOnly ? undefined : 0} onKeyDown={(event) => onKeyDown(event, index)}
          aria-label={`Vị trí ${index + 1}: ${textOf(id)}`}
          className={cn(BAR, "flex items-center gap-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !readOnly && "hover:bg-accent focus-visible:bg-accent", markTone(state))}>
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-background font-mono text-xs text-muted-foreground tabular-nums" aria-hidden>{index + 1}</span>
          <span className="min-w-0 flex-1 break-words">{textOf(id)}</span>
          {state ? <CorrectnessMark ok={state === "correct"} /> : null}
          {readOnly ? null : <span className="flex gap-1">
            <Button type="button" size="icon-xs" variant="ghost" tabIndex={-1} disabled={index === 0}
              aria-label={`Đưa "${textOf(id)}" lên`} onClick={() => move(index, -1)}><ArrowUp aria-hidden /></Button>
            <Button type="button" size="icon-xs" variant="ghost" tabIndex={-1} disabled={index === order.length - 1}
              aria-label={`Đưa "${textOf(id)}" xuống`} onClick={() => move(index, 1)}><ArrowDown aria-hidden /></Button>
          </span>}
        </li>;
      })}
    </ol>
    {correct?.order ? <div className="text-xs text-muted-foreground">
      <p>Thứ tự đúng</p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-foreground">
        {correct.order.map((id) => <li key={id}>{textOf(id)}</li>)}
      </ol>
    </div> : null}
  </div>;
}
