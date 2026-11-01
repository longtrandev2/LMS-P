import { Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoomSection } from "./room-model";

/**
 * Cột trái phòng thi: "Đã làm x/n" + thanh tiến độ, lưới số câu nhóm theo phần (đã làm nền đen, chưa làm xám,
 * đánh dấu chấm cam — chỉ lưu trên máy, câu đang xem có vòng), chú thích.
 */
export function QuestionNav({ sections, answered, flagged, current, onSelect }: {
  sections: RoomSection[]; answered: Set<number>; flagged: number[]; current: number; onSelect: (index: number) => void;
}) {
  const total = sections.reduce((sum, section) => sum + section.items.length, 0);
  const percent = total ? Math.round((answered.size / total) * 100) : 0;
  return <nav aria-label="Danh sách câu hỏi" className="space-y-5 px-5 py-5">
    <div>
      <p className="text-sm font-medium tabular-nums">Đã làm {answered.size}/{total}</p>
      <div role="progressbar" aria-label="Tiến độ làm bài" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered.size}
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-accent">
        <div className="h-full rounded-full bg-foreground transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
    </div>
    {sections.map((section, sectionIndex) => <div key={sectionIndex} className="space-y-2.5">
      {section.label ? <p className="truncate text-xs font-medium text-muted-foreground" title={section.label}>{section.label}</p> : null}
      <ol className="grid grid-cols-5 gap-2">
        {section.items.map(({ question, index }) => {
          const done = answered.has(question.question_id);
          const isFlagged = flagged.includes(question.question_id);
          const active = index === current;
          const code = question.type === "programming";
          return <li key={question.question_id}>
            <button type="button" onClick={() => onSelect(index)} aria-current={active ? "step" : undefined}
              aria-label={`Câu ${index + 1}${code ? " (lập trình)" : ""}, ${done ? "đã làm" : "chưa làm"}${isFlagged ? ", đã đánh dấu" : ""}`}
              className={cn(
                "relative flex h-9 w-full items-center justify-center gap-0.5 rounded-md bg-secondary text-sm tabular-nums transition-colors duration-150 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                done && "bg-foreground font-medium text-background hover:bg-foreground/85",
                active && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}>
              {index + 1}
              {code ? <Code2 className="size-3 opacity-70" aria-hidden /> : null}
              {isFlagged ? <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-background bg-warning" aria-hidden /> : null}
            </button>
          </li>;
        })}
      </ol>
    </div>)}
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t pt-4 text-xs text-muted-foreground" aria-hidden>
      <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-foreground" />Đã làm</li>
      <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-secondary ring-1 ring-foreground/25" />Chưa làm</li>
      <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" />Đánh dấu</li>
      <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm ring-2 ring-foreground" />Đang xem</li>
    </ul>
  </nav>;
}
