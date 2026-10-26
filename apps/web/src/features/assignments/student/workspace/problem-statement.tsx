import { MarkdownView } from "@/components/markdown-view";
import type { AssignmentQuestion } from "@/types/api";
import { formatScore } from "../../submission-result";
import { CHECKER_LABEL } from "../labels";
import { IoBlock } from "./io-block";

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0">
    <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 truncate text-sm font-medium tabular-nums" title={value}>{value}</dd>
  </div>;
}

/** Tab "Đề bài": giới hạn, checker, nội dung Markdown, ví dụ mẫu. */
export function ProblemStatement({ question }: { question: AssignmentQuestion }) {
  const programming = question.programming;
  const samples = programming?.samples ?? [];
  return <div className="space-y-6">
    {programming ? <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4">
      <Fact label="Thời gian" value={`${programming.time_limit_ms} ms`} />
      <Fact label="Bộ nhớ" value={`${programming.memory_limit_mb} MB`} />
      <Fact label="Điểm" value={formatScore(question.points)} />
      <Fact label="So kết quả" value={programming.checker_mode === "float" ? "Số thực" : programming.checker_mode === "line" ? "Theo dòng" : "Theo từ"} />
    </dl> : null}
    <MarkdownView source={question.content} className="text-[15px]" />
    <div className="space-y-1 rounded-lg border-l-2 border-primary bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <p>Đọc dữ liệu từ <strong className="text-foreground">stdin</strong>, ghi kết quả ra <strong className="text-foreground">stdout</strong>. Java: đặt tên lớp là <code className="rounded bg-muted px-1 font-mono">Main</code>.</p>
      {programming ? <p>Cách so: {CHECKER_LABEL[programming.checker_mode]}. Java và Python được gấp đôi giới hạn thời gian.</p> : null}
    </div>
    {samples.length ? <section aria-labelledby="samples-title" className="space-y-4">
      <h3 id="samples-title" className="text-sm font-semibold">Ví dụ</h3>
      {samples.map((sample, index) => <div key={sample.position} className="space-y-2">
        <p className="text-xs font-medium">Ví dụ {index + 1}</p>
        <div className="grid gap-3 xl:grid-cols-2">
          <IoBlock label="Input" value={sample.input} copy />
          <IoBlock label="Output" value={sample.expected_output} copy />
        </div>
      </div>)}
    </section> : null}
  </div>;
}
