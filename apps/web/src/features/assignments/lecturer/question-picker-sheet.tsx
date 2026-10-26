import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { BankSelect, CategorySelect, DifficultySelect, TypeSelect, useClassBanks } from "./question-filter-selects";
import { QuestionPickRow } from "./question-pick-row";
import { QuestionPreviewDialog } from "./question-preview-dialog";
import type { Paginated, QuestionDifficulty, QuestionSummary, QuestionType } from "@/types/api";

const LIMIT = 20;

/** Panel chọn câu tay từ ngân hàng: lọc, tìm, phân trang, chọn nhiều rồi thêm vào đề. */
export function QuestionPickerSheet({ open, onOpenChange, classId, quiz, existing, onAdd }: {
  open: boolean; onOpenChange: (open: boolean) => void; classId: number; quiz: boolean;
  existing: Set<number>; onAdd: (items: QuestionSummary[]) => void;
}) {
  const { banks, isPending: banksPending, error: banksError, retry } = useClassBanks(classId);
  const [bankId, setBankId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | null>(null);
  const [type, setType] = useState<QuestionType | null>(null);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Map<number, QuestionSummary>>(new Map());
  const [previewId, setPreviewId] = useState<number | null>(null);
  const activeBank = bankId ?? banks[0]?.id ?? null;

  useEffect(() => { const timer = window.setTimeout(() => setTerm(search.trim()), 300); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => setPage(1), [activeBank, categoryId, difficulty, type, term]);
  useEffect(() => { if (!open) setPicked(new Map()); }, [open]);

  const filters = { bank_id: activeBank ?? undefined, category_id: categoryId ?? undefined, difficulty: difficulty ?? undefined, type: type ?? undefined, q: term || undefined, page, limit: LIMIT };
  const list = useQuery({
    queryKey: queryKeys.questions.list(filters),
    queryFn: ({ signal }) => api.get<Paginated<QuestionSummary>>("/questions", filters, signal),
    enabled: open && activeBank != null,
    placeholderData: keepPreviousData,
  });
  const toggle = (item: QuestionSummary, checked: boolean) => setPicked((current) => {
    const next = new Map(current);
    if (checked) next.set(item.id, item); else next.delete(item.id);
    return next;
  });
  function reason(item: QuestionSummary): string | undefined {
    if (existing.has(item.id)) return "Đã có trong đề";
    if (quiz && item.type === "programming") return "Quiz không nhận câu lập trình";
    return undefined;
  }
  function add() { onAdd([...picked.values()]); onOpenChange(false); }

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full! gap-0 sm:max-w-2xl!">
      <SheetHeader className="border-b p-5 pr-14">
        <SheetTitle className="font-heading">Chọn câu từ ngân hàng</SheetTitle>
        <SheetDescription>Đánh dấu các câu cần thêm. Câu đã có trong đề được bỏ qua.</SheetDescription>
      </SheetHeader>
      <div className="grid gap-3 border-b p-5 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="picker-bank">Ngân hàng</Label>
          <BankSelect id="picker-bank" banks={banks} value={activeBank} onChange={(id) => { setBankId(id); setCategoryId(null); }} /></div>
        <div className="space-y-1.5"><Label htmlFor="picker-category">Danh mục</Label>
          <CategorySelect id="picker-category" bankId={activeBank} value={categoryId} onChange={setCategoryId} /></div>
        <div className="space-y-1.5"><Label htmlFor="picker-difficulty">Độ khó</Label>
          <DifficultySelect id="picker-difficulty" value={difficulty} onChange={setDifficulty} /></div>
        <div className="space-y-1.5"><Label htmlFor="picker-type">Loại câu</Label>
          <TypeSelect id="picker-type" value={type} onChange={setType} excludeProgramming={quiz} /></div>
        <div className="relative sm:col-span-2">
          <Label htmlFor="picker-search" className="sr-only">Tìm câu hỏi</Label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="picker-search" type="search" className="pl-9" value={search} placeholder="Tìm theo nội dung câu hỏi" onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={list.isFetching}>
        {banksError ? <ErrorState error={banksError} onRetry={retry} /> : null}
        {banksPending && !banksError ? <TableSkeleton rows={6} cols={2} /> : null}
        {!banksError && !banksPending && banks.length === 0 ? <EmptyState compact title="Chưa có ngân hàng câu hỏi" description="Tạo ngân hàng và câu hỏi ở trang Ngân hàng câu hỏi." /> : null}
        {list.isPending && activeBank != null ? <TableSkeleton rows={6} cols={2} /> : null}
        {list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : null}
        {list.data?.items.length === 0 ? <EmptyState compact title="Không có câu phù hợp" description="Thử bỏ bớt bộ lọc hoặc đổi ngân hàng." /> : null}
        {list.data?.items.length ? <ul className="divide-y">{list.data.items.map((item) => {
          const disabledReason = reason(item);
          return <QuestionPickRow key={item.id} item={item} checked={existing.has(item.id) || picked.has(item.id)}
            disabledReason={disabledReason} onCheckedChange={(checked) => toggle(item, checked)} onPreview={() => setPreviewId(item.id)} />;
        })}</ul> : null}
      </div>
      {list.data && list.data.total > LIMIT ? <DataTablePagination page={page} limit={LIMIT} total={list.data.total} onPageChange={setPage} /> : null}
      <div className="flex items-center justify-between gap-3 border-t p-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">Đã đánh dấu <span className="font-medium text-foreground">{picked.size}</span> câu</p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button type="button" disabled={picked.size === 0} onClick={add}>Thêm {picked.size || ""} câu vào đề</Button>
        </div>
      </div>
      <QuestionPreviewDialog questionId={previewId} onOpenChange={(value) => !value && setPreviewId(null)} />
    </SheetContent>
  </Sheet>;
}
