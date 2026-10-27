import { ArrowDown, ArrowUp, Grid3x3, Library, ListPlus, Shuffle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPoints } from "@/features/assignments/lecturer/labels";
import { variantCode } from "@/features/exams/shared/exam-labels";
import { defaultSectionTitle, isImplicitSection, parseNumber, round2, type SectionDraft } from "./blueprint-model";
import { inScope, type BuilderCtx } from "./builder-types";
import { FixedRow, RuleRow } from "./item-rows";

/** Đổi chỗ hai phần tử (theo tham chiếu) trong mảng phẳng. */
function swap<T>(items: T[], a: T, b: T): T[] {
  return items.map((item) => item === a ? b : item === b ? a : item);
}

/** Một phần của đề: tên, bảng mục (câu cố định trước, quy tắc sau), nút thêm mục. */
export function SectionBlock({ ctx, section, index, count, onMove, onRemove }: {
  ctx: BuilderCtx; section: SectionDraft; index: number; count: number; onMove: (d: -1 | 1) => void; onRemove: () => void;
}) {
  const { form, patch, locked } = ctx;
  const fixed = form.questions.filter((q) => q.sectionKey === section.key && inScope(ctx, q.variant));
  const rules = form.rules.filter((r) => r.sectionKey === section.key && inScope(ctx, r.variant));
  const questionCount = fixed.length + rules.reduce((sum, r) => sum + (parseNumber(r.count) ?? 0), 0);
  const points = round2(fixed.reduce((s, q) => s + (parseNumber(q.points) ?? 0), 0)
    + rules.reduce((s, r) => s + (parseNumber(r.count) ?? 0) * (parseNumber(r.points) ?? 0), 0));
  const implicit = isImplicitSection(form);
  const titleId = `section-title-${section.key}`;
  const error = ctx.errors[`section:${section.key}`];
  const scopeLabel = ctx.variants ? ctx.scope == null ? " · chung mọi mã đề" : ` · thêm vào Đề ${variantCode(ctx.scope)}` : "";

  return <div className="space-y-3 rounded-xl border p-4" data-editor-error={error ? true : undefined}>
    <div className="flex flex-wrap items-start gap-2">
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor={titleId} className="text-xs font-medium text-muted-foreground">
          {implicit ? "Tên phần (tùy chọn)" : `Phần ${index + 1}`}
        </label>
        <Input id={titleId} value={section.title} maxLength={200} disabled={locked} placeholder={implicit ? "Đề một phần — có thể để trống" : defaultSectionTitle(index)}
          aria-invalid={error ? true : undefined} aria-describedby={error ? `${titleId}-error` : undefined} className="font-medium"
          onChange={(event) => patch({ sections: form.sections.map((s) => s.key === section.key ? { ...s, title: event.target.value } : s) })} />
        {error ? <p id={`${titleId}-error`} className="text-xs text-destructive">{error}</p> : null}
      </div>
      <p className="mt-6 shrink-0 text-xs text-muted-foreground tabular-nums">{questionCount} câu · {formatPoints(points)} điểm</p>
      {locked || count === 1 ? null : <div className="mt-5 flex shrink-0 items-center">
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Đưa phần ${index + 1} lên`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Đưa phần ${index + 1} xuống`} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown aria-hidden /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Xóa phần ${index + 1}`} className="text-muted-foreground hover:text-destructive" onClick={onRemove}><Trash2 aria-hidden /></Button>
      </div>}
    </div>

    {fixed.length || rules.length ? <Table className="table-fixed">
      <TableHeader>
        <TableRow className="text-xs">
          <TableHead className="h-8 w-10 pl-3 text-xs" aria-label="Thứ tự" />
          <TableHead className="h-8 text-xs">Mục</TableHead>
          <TableHead className="h-8 w-20 text-right text-xs">Số câu</TableHead>
          <TableHead className="h-8 w-20 text-right text-xs">Điểm/câu</TableHead>
          <TableHead className="h-8 w-14 text-right text-xs">Tổng</TableHead>
          <TableHead className="h-8 w-36 pr-2 text-xs" aria-label="Thao tác" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {fixed.map((q, i) => <FixedRow key={q.question_id} ctx={ctx} question={q} number={i + 1} index={i} count={fixed.length}
          onChange={(next) => patch({ questions: form.questions.map((item) => item === q ? { ...item, ...next } : item) })}
          onMove={(d) => patch({ questions: swap(form.questions, q, fixed[i + d]) })}
          onRemove={() => patch({ questions: form.questions.filter((item) => item !== q) })} />)}
        {rules.map((r, i) => <RuleRow key={r.key} ctx={ctx} rule={r} index={i} count={rules.length}
          onChange={(next) => patch({ rules: form.rules.map((item) => item === r ? { ...item, ...next } : item) })}
          onMove={(d) => patch({ rules: swap(form.rules, r, rules[i + d]) })}
          onRemove={() => patch({ rules: form.rules.filter((item) => item !== r) })} />)}
      </TableBody>
    </Table> : <p className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-3 text-sm text-muted-foreground">
      <ListPlus className="size-4 shrink-0" aria-hidden />
      {locked ? "Phần này không có mục nào." : "Chưa có mục. Chọn câu cố định, thêm quy tắc bốc ngẫu nhiên hoặc dựng ma trận đề."}
    </p>}

    {locked ? null : <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={() => ctx.openPicker(section.key)}><Library aria-hidden />Chọn câu</Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => ctx.openRule(section.key)}><Shuffle aria-hidden />Thêm quy tắc</Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => ctx.openMatrix(section.key)}><Grid3x3 aria-hidden />Ma trận đề</Button>
      {scopeLabel ? <span className="text-xs text-muted-foreground">Mục mới{scopeLabel}</span> : null}
    </div>}
  </div>;
}
