import { ListToolbar, SearchField } from "@/components/list-toolbar";
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
  return <ListToolbar search={<SearchField value={value.search} onChange={(search) => set({ search })} placeholder="Tìm tên hoặc mã sinh viên" label="Tìm sinh viên" />}>
    <Select value={value.question} onValueChange={(question) => set({ question })}>
      <SelectTrigger className="w-full sm:w-32" aria-label="Lọc theo câu"><SelectValue /></SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>Mọi câu</SelectItem>
        {questions.map((question, index) => <SelectItem key={question.question_id} value={String(question.question_id)}>Câu {index + 1}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select value={value.status} onValueChange={(status) => set({ status })}>
      <SelectTrigger className="w-full sm:w-40" aria-label="Lọc theo trạng thái"><SelectValue /></SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>Mọi trạng thái</SelectItem>
        {(Object.keys(STATUS_LABEL) as SubmissionStatus[]).map((status) => <SelectItem key={status} value={status}>{STATUS_LABEL[status]}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select value={value.verdict} onValueChange={(verdict) => set({ verdict })}>
      <SelectTrigger className="w-full sm:w-44" aria-label="Lọc theo verdict"><SelectValue /></SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={ALL}>Mọi verdict</SelectItem>
        {VERDICTS.map((verdict) => <SelectItem key={verdict} value={verdict}>{verdict === "SYSTEM_ERROR" ? "SE" : verdict} · {VERDICT_LABEL[verdict]}</SelectItem>)}
      </SelectContent>
    </Select>
  </ListToolbar>;
}
