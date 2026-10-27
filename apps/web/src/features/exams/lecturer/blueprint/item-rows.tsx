import { ArrowDown, ArrowUp, Eye, Pencil, Shuffle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { questionTypeLabel } from "@/lib/question-types";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABEL, formatPoints, plainExcerpt } from "@/features/assignments/lecturer/labels";
import { variantCode } from "@/features/exams/shared/exam-labels";
import { parseNumber, round2, type RuleDraft, type SelectedQuestion } from "./blueprint-model";
import type { BuilderCtx } from "./builder-types";

const NUM_INPUT = "h-7 w-16 px-2 text-right tabular-nums";

function ScopeBadge({ variant }: { variant: number | null }) {
  return variant == null ? null : <Badge variant="info">Đề {variantCode(variant)}</Badge>;
}

function RowActions({ label, index, count, locked, onMove, onRemove, children }: {
  label: string; index: number; count: number; locked: boolean; onMove: (d: -1 | 1) => void; onRemove: () => void; children?: React.ReactNode;
}) {
  return <div className="flex items-center justify-end gap-0.5">
    {children}
    {locked ? null : <>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Đưa ${label} lên`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Đưa ${label} xuống`} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown aria-hidden /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Bỏ ${label}`} className="text-muted-foreground hover:text-destructive" onClick={onRemove}><X aria-hidden /></Button>
    </>}
  </div>;
}

/** Dòng câu cố định: nội dung rút gọn · loại · độ khó · điểm. */
export function FixedRow({ ctx, question, number, index, count, onChange, onMove, onRemove }: {
  ctx: BuilderCtx; question: SelectedQuestion; number: number; index: number; count: number;
  onChange: (next: Partial<SelectedQuestion>) => void; onMove: (d: -1 | 1) => void; onRemove: () => void;
}) {
  const id = `fixed-points-${question.question_id}`;
  const error = ctx.errors[`points:${question.question_id}`];
  const invalid = ctx.quiz && question.type === "programming";
  return <TableRow className={cn(invalid && "bg-destructive/5")}>
    <TableCell className="w-10 pl-3 font-mono text-xs text-muted-foreground tabular-nums">{String(number).padStart(2, "0")}</TableCell>
    <TableCell className="max-w-0 whitespace-normal">
      <p className="truncate text-sm">{plainExcerpt(question.content) || `Câu hỏi #${question.question_id}`}</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
        <span>Câu cố định</span><span aria-hidden>·</span>
        <span className={cn(invalid && "font-medium text-destructive")}>{questionTypeLabel(question.type)}</span>
        <span aria-hidden>·</span><span>{DIFFICULTY_LABEL[question.difficulty]}</span>
        {invalid ? <span className="font-medium text-destructive">· Quiz không nhận câu lập trình</span> : null}
        <ScopeBadge variant={question.variant} />
      </p>
      {error ? <p id={`${id}-error`} className="mt-1 text-xs text-destructive">{error}</p> : null}
    </TableCell>
    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">1</TableCell>
    <TableCell className="text-right">
      <label htmlFor={id} className="sr-only">Điểm câu {number}</label>
      <Input id={id} type="number" inputMode="decimal" min={0.01} step={0.25} className={cn(NUM_INPUT, "ml-auto")} value={question.points}
        disabled={ctx.locked} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange({ points: event.target.value })} />
    </TableCell>
    <TableCell className="text-right text-sm font-medium tabular-nums">{formatPoints(parseNumber(question.points) ?? 0)}</TableCell>
    <TableCell className="pr-2">
      <RowActions label={`câu ${number}`} index={index} count={count} locked={ctx.locked} onMove={onMove} onRemove={onRemove}>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Xem trước câu ${number}`} onClick={() => ctx.preview(question.question_id)}><Eye aria-hidden /></Button>
      </RowActions>
    </TableCell>
  </TableRow>;
}

function PoolBadge({ ctx, rule }: { ctx: BuilderCtx; rule: RuleDraft }) {
  const shortage = ctx.shortageOf(rule);
  const pool = ctx.poolOf(rule);
  const count = parseNumber(rule.count) ?? 0;
  if (shortage) return <Badge variant="destructive">Kho chỉ {shortage.available}/{shortage.requested} câu</Badge>;
  if (!pool) return <Badge variant="secondary">Kho —</Badge>;
  const prefix = pool.exact ? "Kho" : "Kho ~";
  const title = pool.exact ? "Số câu phù hợp còn lại trong ngân hàng" : "Ước tính — lưu nháp để tính chính xác";
  if (pool.size < count) return <Badge variant="destructive" title={title}>{prefix} {pool.size} · thiếu {count - pool.size}</Badge>;
  if (ctx.form.paperMode === "per_student" && pool.size < count * 2) return <Badge variant="warning" title={title}>{prefix} {pool.size} · dễ trùng đề</Badge>;
  return <Badge variant="secondary" title={title}>{prefix} {pool.size} câu</Badge>;
}

/** Dòng quy tắc ngẫu nhiên: "Ngẫu nhiên N câu · danh mục · độ khó · loại" + kho + số câu/điểm sửa tại chỗ. */
export function RuleRow({ ctx, rule, index, count, onChange, onMove, onRemove }: {
  ctx: BuilderCtx; rule: RuleDraft; index: number; count: number;
  onChange: (next: Partial<RuleDraft>) => void; onMove: (d: -1 | 1) => void; onRemove: () => void;
}) {
  const id = `rule-${rule.key}`;
  const error = ctx.errors[`rule:${rule.key}`];
  const total = round2((parseNumber(rule.count) ?? 0) * (parseNumber(rule.points) ?? 0));
  return <TableRow>
    <TableCell className="w-10 pl-3"><Shuffle className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden /></TableCell>
    <TableCell className="max-w-0 whitespace-normal">
      <p className="truncate text-sm font-medium">Ngẫu nhiên {rule.count || "?"} câu</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
        <span className="truncate">{ctx.ruleCriteria(rule)}</span>
        <PoolBadge ctx={ctx} rule={rule} />
        <ScopeBadge variant={rule.variant} />
      </p>
      {error ? <p id={`${id}-error`} className="mt-1 text-xs text-destructive">{error}</p> : null}
    </TableCell>
    <TableCell className="text-right">
      <label htmlFor={`${id}-count`} className="sr-only">Số câu bốc của quy tắc</label>
      <Input id={`${id}-count`} type="number" inputMode="numeric" min={1} max={100} className={cn(NUM_INPUT, "ml-auto")} value={rule.count}
        disabled={ctx.locked} aria-invalid={error ? true : undefined} onChange={(event) => onChange({ count: event.target.value })} />
    </TableCell>
    <TableCell className="text-right">
      <label htmlFor={`${id}-points`} className="sr-only">Điểm mỗi câu của quy tắc</label>
      <Input id={`${id}-points`} type="number" inputMode="decimal" min={0.01} step={0.25} className={cn(NUM_INPUT, "ml-auto")} value={rule.points}
        disabled={ctx.locked} aria-invalid={error ? true : undefined} onChange={(event) => onChange({ points: event.target.value })} />
    </TableCell>
    <TableCell className="text-right text-sm font-medium tabular-nums">{formatPoints(total)}</TableCell>
    <TableCell className="pr-2">
      <RowActions label="quy tắc" index={index} count={count} locked={ctx.locked} onMove={onMove} onRemove={onRemove}>
        {ctx.locked ? null : <Button type="button" variant="ghost" size="icon-sm" aria-label="Sửa điều kiện quy tắc" onClick={() => ctx.openRule(rule.sectionKey, rule)}><Pencil aria-hidden /></Button>}
      </RowActions>
    </TableCell>
  </TableRow>;
}
