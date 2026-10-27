import { cn } from "@/lib/utils";
import { REVIEW_STATE_LABEL, REVIEW_STATE_TONE, type ReviewState } from "./review-question-card";

const LEGEND: ReviewState[] = ["correct", "partial", "wrong", "blank"];

/** Lưới đi tới câu trên màn xem lại, tô theo đúng / một phần / sai / bỏ trống. */
export function ReviewNavigator({ states }: { states: ReviewState[] }) {
  return <nav aria-label="Đi tới câu" className="space-y-3">
    <p className="text-sm font-medium">Đi tới câu</p>
    <ol className="grid grid-cols-8 gap-2 sm:grid-cols-10 lg:grid-cols-5">
      {states.map((state, index) => <li key={index}>
        <a href={`#cau-${index + 1}`} title={REVIEW_STATE_LABEL[state]} aria-label={`Câu ${index + 1}: ${REVIEW_STATE_LABEL[state]}`}
          className={cn("flex h-9 items-center justify-center rounded-md text-sm font-medium tabular-nums outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring", REVIEW_STATE_TONE[state])}>
          {index + 1}
        </a>
      </li>)}
    </ol>
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground" aria-hidden>
      {(states.includes("pending") ? [...LEGEND, "pending" as const] : LEGEND).map((state) => <li key={state} className="flex items-center gap-1.5">
        <span className={cn("size-2.5 rounded-sm", REVIEW_STATE_TONE[state])} />{REVIEW_STATE_LABEL[state]}
      </li>)}
    </ul>
  </nav>;
}
