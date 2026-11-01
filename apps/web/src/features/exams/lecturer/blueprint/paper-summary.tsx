import { AlertTriangle, FileStack } from "lucide-react";
import { formatPoints } from "@/features/assignments/lecturer/labels";
import { variantCode } from "@/features/exams/shared/exam-labels";
import { paperSummaries, parseNumber, poolSizes, type BlueprintForm } from "./blueprint-model";
import type { AssignmentDetails } from "@/types/api";

/** Cảnh báo cấu trúc đề tính tại chỗ: kho thiếu (theo lần lưu gần nhất), tổng điểm các mã lệch, kho nhỏ với đề riêng. */
export function blueprintWarnings(form: BlueprintForm, details: AssignmentDetails | null): string[] {
  const warnings: string[] = [];
  const pools = poolSizes(form, details);
  let short = 0;
  let thin = 0;
  form.rules.forEach((rule) => {
    const pool = pools.get(rule.key);
    const count = parseNumber(rule.count) ?? 0;
    if (pool == null) return;
    if (pool < count) short += 1;
    else if (form.paperMode === "per_student" && pool < count * 2) thin += 1;
  });
  if (short) warnings.push(`${short} quy tắc không đủ câu trong kho.`);
  if (thin) warnings.push(`${thin} quy tắc có kho nhỏ hơn 2 lần số câu — đề của sinh viên dễ trùng.`);
  const papers = paperSummaries(form);
  if (papers.length > 1 && new Set(papers.map((p) => p.points)).size > 1) warnings.push("Tổng điểm các mã đề chưa bằng nhau.");
  return warnings;
}

/** Danh sách đề trong panel tóm tắt: số câu + tổng điểm từng đề (mỗi mã), kèm cảnh báo. */
export function PaperSummaryList({ form, details }: { form: BlueprintForm; details: AssignmentDetails | null }) {
  const papers = paperSummaries(form);
  const warnings = blueprintWarnings(form, details);
  const label = (variant: number | null) => variant != null ? `Đề ${variantCode(variant)}`
    : form.paperMode === "per_student" ? "Mỗi đề" : "Đề chung";
  return <>
    {papers.map((paper) => <li key={paper.variant ?? "all"} className="flex items-start gap-2.5">
      <FileStack className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      <span className="flex min-w-0 flex-1 justify-between gap-2">
        <span>{label(paper.variant)}</span>
        <span className="text-muted-foreground">{paper.count} câu · <span className="font-medium text-foreground">{formatPoints(paper.points)} đ</span></span>
      </span>
    </li>)}
    {warnings.map((warning) => <li key={warning} className="flex items-start gap-2.5 text-warning">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="min-w-0">{warning}</span>
    </li>)}
  </>;
}
