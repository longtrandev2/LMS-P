import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VERDICT_LABEL } from "@/lib/verdicts";
import { STATUS_LABEL } from "./labels";
import type { AssignmentQuestion, GradingVerdict, SubmissionStatus } from "@/types/api";

export interface SubmissionFilterState { question: string; status: string; verdict: string; search: string }
export const ALL = "all";
export const EMPTY_FILTERS: SubmissionFilterState = { question: ALL, status: ALL, verdict: ALL, search: "" };

const VERDICTS: GradingVerdict[] = ["AC", "WA", "CE", "TLE", "MLE", "RE", "OLE", "SYSTEM_ERROR"];

export function SubmissionFilters({ value, onChange, questions }: {
  value: SubmissionFilterState; onChange: (next: SubmissionFilterState) => void; questions: AssignmentQuestion[];
}) {
  const set = (patch: Partial<SubmissionFilterState>) => onChange({ ...value, ...patch });
  return <div className="flex flex-wrap items-center gap-2">
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input type="search" aria-label="Tìm sinh viên" placeholder="Tìm tên hoặc mã sinh viên" className="pl-9"
        value={value.search} onChange={(event) => set({ search: event.target.value })} />
    </div>
    <Select value={value.question} onValueChange={(question) => set({ question })}>
      <SelectTrigger className="w-36" aria-label="Lọc theo câu"><SelectValue /></SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>Mọi câu</SelectItem>
        {questions.map((question, index) => <SelectItem key={question.question_id} value={String(question.question_id)}>Câu {index + 1}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select value={value.status} onValueChange={(status) => set({ status })}>
      <SelectTrigger className="w-40" aria-label="Lọc theo trạng thái"><SelectValue /></SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>Mọi trạng thái</SelectItem>
        {(Object.keys(STATUS_LABEL) as SubmissionStatus[]).map((status) => <SelectItem key={status} value={status}>{STATUS_LABEL[status]}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select value={value.verdict} onValueChange={(verdict) => set({ verdict })}>
      <SelectTrigger className="w-44" aria-label="Lọc theo verdict"><SelectValue /></SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>Mọi verdict</SelectItem>
        {VERDICTS.map((verdict) => <SelectItem key={verdict} value={verdict}>{verdict === "SYSTEM_ERROR" ? "SE" : verdict} · {VERDICT_LABEL[verdict]}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>;
}
