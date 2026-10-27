import { MarkdownView } from "@/components/markdown-view";
import type { AssignmentQuestion } from "@/types/api";
import { CHECKER_LABEL } from "../labels";
import { IoBlock } from "./io-block";

/** Tab "Đề bài": nội dung Markdown, lưu ý vào/ra (khối nền xám), ví dụ Input/Output dạng khối mono. */
export function ProblemStatement({ question }: { question: AssignmentQuestion }) {
  const programming = question.programming;
  const samples = programming?.samples ?? [];
  return <div className="space-y-6">
    <MarkdownView source={question.content} className="text-[15px]" />
    <div className="space-y-1 rounded-lg bg-secondary px-4 py-3 text-xs leading-5 text-muted-foreground">
      <p>Đọc dữ liệu từ <strong className="font-medium text-foreground">stdin</strong>, ghi kết quả ra <strong className="font-medium text-foreground">stdout</strong>. Java: đặt tên lớp là <code className="rounded bg-background px-1 font-mono">Main</code>.</p>
      {programming ? <p>{CHECKER_LABEL[programming.checker_mode]}. Java và Python được gấp đôi giới hạn thời gian.</p> : null}
    </div>
    {samples.length ? <section aria-labelledby="samples-title" className="space-y-5">
      <h2 id="samples-title" className="text-base font-semibold">Ví dụ</h2>
      {samples.map((sample, index) => <div key={sample.position} className="space-y-2">
        {samples.length > 1 ? <p className="text-sm font-medium">Ví dụ {index + 1}</p> : null}
        <div className="grid gap-3 xl:grid-cols-2">
          <IoBlock label="Input" value={sample.input} copy />
          <IoBlock label="Output" value={sample.expected_output} copy />
        </div>
      </div>)}
    </section> : null}
  </div>;
}
