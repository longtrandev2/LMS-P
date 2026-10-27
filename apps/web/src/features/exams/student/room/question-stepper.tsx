import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Nút Đánh dấu / Trước / Sau của một câu (câu lập trình — câu khách quan dùng chân khung quiz). */
export function QuestionStepper({ index, total, flagged, onToggleFlag, onPrev, onNext }: {
  index: number; total: number; flagged: boolean; onToggleFlag: () => void; onPrev: () => void; onNext: () => void;
}) {
  return <div className="flex flex-wrap items-center gap-2">
    <Button type="button" variant="secondary" size="sm" aria-pressed={flagged} onClick={onToggleFlag}
      className={cn(flagged && "bg-warning/12 text-warning hover:bg-warning/18")}>
      <Flag className={flagged ? "fill-current" : undefined} aria-hidden />{flagged ? "Đã đánh dấu" : "Đánh dấu"}
    </Button>
    <Button type="button" variant="secondary" size="sm" disabled={index === 0} onClick={onPrev} title="Câu trước">
      <ChevronLeft aria-hidden />Trước
    </Button>
    <Button type="button" variant="secondary" size="sm" disabled={index >= total - 1} onClick={onNext} title="Câu sau">
      Sau<ChevronRight aria-hidden />
    </Button>
  </div>;
}
