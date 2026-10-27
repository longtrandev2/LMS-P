import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatPoints } from "@/features/assignments/lecturer/labels";
import { variantCode } from "@/features/exams/shared/exam-labels";
import { orderedBySection, type BlueprintForm } from "./blueprint-model";
import type { PublishIssue } from "./publish-issue";

/** Thanh chọn phạm vi mã đề: "Chung mọi mã đề | Đề 101 | Đề 102 …" (exam-spec.md §8.2). */
export function VariantBar({ count, value, onChange }: { count: number; value: number | null; onChange: (value: number | null) => void }) {
  return <div className="flex flex-wrap items-center gap-3">
    <span id="variant-bar-label" className="text-sm font-medium">Đang soạn cho</span>
    <ToggleGroup type="single" size="sm" aria-labelledby="variant-bar-label" className="flex-wrap"
      value={value == null ? "all" : String(value)} onValueChange={(next) => next && onChange(next === "all" ? null : Number(next))}>
      <ToggleGroupItem value="all">Chung mọi mã đề</ToggleGroupItem>
      {Array.from({ length: count }, (_, i) => <ToggleGroupItem key={i} value={String(i + 1)}>Đề {variantCode(i + 1)}</ToggleGroupItem>)}
    </ToggleGroup>
  </div>;
}

/** Lỗi xuất bản do cấu trúc đề: quy tắc thiếu câu, tổng điểm các mã lệch, quá số câu ghim. */
export function PublishIssueAlert({ issue, form, criteria }: {
  issue: PublishIssue; form: BlueprintForm; criteria: (index: number) => string | null;
}) {
  const ordered = orderedBySection(form, form.rules);
  return <Alert variant="destructive" role="alert">
    <AlertTriangle aria-hidden />
    <AlertTitle>Chưa xuất bản được: {issue.message}</AlertTitle>
    <AlertDescription>
      <ul className="list-disc space-y-0.5 pl-4">
        {issue.shortages.map((item, i) => {
          const label = item.ruleIndex != null && ordered[item.ruleIndex] ? criteria(item.ruleIndex) : null;
          return <li key={i}>{label ? `Quy tắc “${label}”` : "Một quy tắc"}: cần {item.requested} câu, kho chỉ có {item.available} câu.</li>;
        })}
        {issue.variantTotals ? <li>Tổng điểm: {Object.entries(issue.variantTotals).map(([no, total]) => `Đề ${variantCode(Number(no))} ${formatPoints(total)} điểm`).join(" · ")}. Các mã đề phải bằng nhau.</li> : null}
        {issue.pinnedCount != null ? <li>Bài sẽ ghim {issue.pinnedCount} câu (tính cả kho bốc ngẫu nhiên), tối đa 500. Giảm số quy tắc hoặc thu hẹp điều kiện.</li> : null}
      </ul>
    </AlertDescription>
  </Alert>;
}
