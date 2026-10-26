import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortSelect } from "@/components/sort-select";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { questionTypeLabel } from "@/lib/question-types";
import { formatPoints } from "./labels";
import { StudentResultRow } from "./student-result-row";
import type { AssignmentQuestion, StudentResultRow as Row } from "@/types/api";

const SORTS = [
  { value: "name", label: "Tên A → Z" },
  { value: "code", label: "Mã sinh viên" },
  { value: "-score", label: "Điểm cao → thấp" },
  { value: "score", label: "Điểm thấp → cao" },
  { value: "-attempts", label: "Nhiều lượt nhất" },
];

function compare(sort: string) {
  const score = (row: Row) => row.final_score ?? -1;
  return (a: Row, b: Row) => {
    switch (sort) {
      case "code": return (a.student_code ?? "").localeCompare(b.student_code ?? "", "vi");
      case "-score": return score(b) - score(a);
      case "score": return score(a) - score(b);
      case "-attempts": return b.attempt_count - a.attempt_count;
      default: return a.student_full_name.localeCompare(b.student_full_name, "vi");
    }
  };
}

export function ResultsStudentsTab({ query, questions, quiz, attemptHref }: {
  query: { data?: Row[]; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  questions: AssignmentQuestion[]; quiz: boolean; attemptHref: (attemptId: number) => string;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? [])
      .filter((row) => !term || `${row.student_full_name} ${row.student_code ?? ""}`.toLowerCase().includes(term))
      .sort(compare(sort));
  }, [query.data, search, sort]);
  const toggle = (id: number) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" aria-label="Tìm sinh viên" placeholder="Tìm tên hoặc mã sinh viên" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <SortSelect value={sort} onChange={setSort} options={SORTS} />
    </div>
    <div className="overflow-hidden rounded-xl border bg-card">
      {query.isPending ? <TableSkeleton rows={5} cols={4} /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && rows.length === 0 ? <EmptyState compact title={search ? "Không tìm thấy sinh viên" : "Lớp chưa có sinh viên"} /> : null}
      {rows.length ? <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-[1] min-w-52 bg-card">Sinh viên</TableHead>
            <TableHead className="text-right">Điểm</TableHead>
            <TableHead className="text-right">Lượt</TableHead>
            {questions.map((question, index) => <TableHead key={question.question_id} className="min-w-20 text-center"
              title={`${questionTypeLabel(question.type)} · ${formatPoints(question.points)} điểm`}>
              C{index + 1}<span className="block text-[11px] font-normal text-muted-foreground">{formatPoints(question.points)}đ</span>
            </TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => <StudentResultRow key={row.student_id} row={row} questions={questions} quiz={quiz}
            expanded={expanded.has(row.student_id)} onToggle={() => toggle(row.student_id)} attemptHref={attemptHref} />)}
        </TableBody>
      </Table> : null}
    </div>
  </div>;
}
