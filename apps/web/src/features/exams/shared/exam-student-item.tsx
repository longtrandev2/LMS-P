import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CATEGORY_ICON } from "@/features/assignments/lecturer/labels";
import { ExamMeta, ExamPhaseBadge, examPhase } from "./exam-status";
import type { AssignmentSummary } from "@/types/api";

/** Hàng kỳ thi phía sinh viên: tên + thời lượng/khung giờ · trạng thái · "Vào thi" (đang mở) hoặc "Xem". */
export function ExamStudentItem({ item, classId }: { item: AssignmentSummary; classId: string }) {
  const phase = examPhase(item);
  const href = `/me/classes/${classId}/assignments/${item.id}`;
  const Icon = CATEGORY_ICON[item.category];
  return <li className="relative flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b sm:flex-nowrap px-2 py-2.5 transition-colors duration-150 last:border-b-0 hover:bg-secondary/50">
    <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
    <div className="min-w-0 flex-1 basis-[calc(100%-1.75rem)] sm:basis-auto">
      <h3 className="truncate text-sm font-medium">
        <Link to={href} className="rounded-sm outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring">{item.title}</Link>
      </h3>
      <ExamMeta item={item} showMode={false} />
    </div>
    <span className="ml-7 sm:ml-0"><ExamPhaseBadge phase={phase} /></span>
    <div className="relative z-[1] flex flex-1 justify-end sm:w-24 sm:flex-none sm:shrink-0">
      <Button size="sm" variant="secondary" asChild><Link to={href}>{phase === "open" ? "Vào thi" : "Xem"}</Link></Button>
    </div>
  </li>;
}
