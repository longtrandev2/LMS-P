import { Link } from "react-router-dom";
import { CalendarClock, ClipboardList, Files, ListOrdered, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_ICON, categoryLabel, shortDateTime } from "@/features/assignments/lecturer/labels";
import { MetaItem, MetaRow } from "@/features/assignments/lecturer/meta-row";
import type { AssignmentSummary } from "@/types/api";

/** Đầu trang giám sát: tên kỳ thi + loại, khung giờ, thời lượng, số mã đề; link sang trang kết quả. */
export function MonitorHeader({ assignment, resultsHref }: { assignment: AssignmentSummary; resultsHref: string }) {
  const CategoryIcon = CATEGORY_ICON[assignment.category];
  const variants = assignment.paper_mode === "variants" && assignment.variant_count ? assignment.variant_count : null;
  return <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-2xl font-semibold text-balance">{assignment.title}</h1>
        <Badge><CategoryIcon aria-hidden />{categoryLabel(assignment.category)}</Badge>
      </div>
      <MetaRow>
        <MetaItem icon={CalendarClock}>
          {assignment.available_from ? `${shortDateTime(assignment.available_from)} → ` : "Đóng "}{shortDateTime(assignment.due_at)}
        </MetaItem>
        {assignment.time_limit_minutes ? <MetaItem icon={Timer}>{assignment.time_limit_minutes} phút</MetaItem> : null}
        <MetaItem icon={ListOrdered}>{assignment.question_count} câu</MetaItem>
        {variants ? <MetaItem icon={Files}>{variants} mã đề</MetaItem> : null}
      </MetaRow>
    </div>
    <Button variant="secondary" asChild>
      <Link to={resultsHref}><ClipboardList aria-hidden />Kết quả</Link>
    </Button>
  </header>;
}
