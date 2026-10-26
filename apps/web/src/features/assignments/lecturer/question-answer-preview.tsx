import { Check } from "lucide-react";
import { languageLabel } from "@/lib/languages";
import { cn } from "@/lib/utils";
import type { Question } from "@/types/api";

const CHECKER_LABEL = { token: "So theo token", line: "So từng dòng", float: "Số thực có sai số" } as const;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2"><p className="text-xs font-medium text-muted-foreground">{title}</p>{children}</div>;
}

function Chips({ values }: { values: string[] }) {
  return <div className="flex flex-wrap gap-1.5">{values.map((value, index) =>
    <code key={`${value}-${index}`} className="rounded-md border bg-muted/50 px-2 py-0.5 font-mono text-xs">{value}</code>)}</div>;
}

/** Đáp án theo loại câu (giảng viên xem) — docs/assessment-spec.md §1.2, §4. */
export function QuestionAnswerPreview({ question }: { question: Question }) {
  const spec = question.answer_spec;
  switch (question.type) {
    case "mcq": case "multiple_choice": case "true_false":
      return <Block title="Lựa chọn">
        <ul className="space-y-1.5">{[...question.options].sort((a, b) => a.position - b.position).map((option, index) =>
          <li key={option.id ?? index} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", option.is_correct && "border-success/40 bg-success/5")}>
            <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + index)}</span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{option.content}</span>
            {option.is_correct ? <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><Check className="size-3.5" aria-hidden />Đúng</span> : null}
          </li>)}</ul>
      </Block>;
    case "short_answer":
      return <Block title={`Đáp án chấp nhận${spec?.case_sensitive ? " (phân biệt hoa thường)" : ""}`}><Chips values={spec?.accepted ?? []} /></Block>;
    case "numeric":
      return <Block title="Đáp số"><p className="font-mono text-sm">{spec?.value ?? "—"}{spec?.tolerance ? ` ± ${spec.tolerance}` : ""}</p></Block>;
    case "fill_blank":
      return <Block title="Đáp án từng ô"><ol className="space-y-1.5">{(spec?.blanks ?? []).map((blank, index) =>
        <li key={index} className="flex items-start gap-2 text-sm"><span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">[[{index + 1}]]</span><Chips values={blank.accepted} /></li>)}</ol></Block>;
    case "matching":
      return <Block title="Cặp đúng">
        <ul className="space-y-1.5">{(spec?.pairs ?? []).map((pair, index) =>
          <li key={pair.id ?? index} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
            <span className="rounded-md border px-2 py-1">{pair.left}</span><span aria-label="ghép với" className="text-muted-foreground">→</span><span className="rounded-md border px-2 py-1">{pair.right}</span>
          </li>)}</ul>
        {spec?.distractors?.length ? <p className="text-xs text-muted-foreground">Phương án nhiễu: {spec.distractors.map((d) => d.text).join(" · ")}</p> : null}
      </Block>;
    case "ordering":
      return <Block title="Thứ tự đúng"><ol className="list-decimal space-y-1 pl-5 text-sm">{(spec?.items ?? []).map((item, index) =>
        <li key={item.id ?? index}>{item.text}</li>)}</ol></Block>;
    case "programming": {
      const p = question.programming;
      const publicTests = question.test_cases.filter((t) => t.is_public);
      return <Block title="Thông số chấm">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Thời gian</dt><dd className="font-mono">{p?.time_limit_ms ?? "—"} ms</dd></div>
          <div><dt className="text-xs text-muted-foreground">Bộ nhớ</dt><dd className="font-mono">{p?.memory_limit_mb ?? "—"} MB</dd></div>
          <div><dt className="text-xs text-muted-foreground">Test</dt><dd>{question.test_cases.length} ({publicTests.length} mẫu)</dd></div>
          <div><dt className="text-xs text-muted-foreground">Checker</dt><dd>{CHECKER_LABEL[p?.checker_mode ?? "token"]}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">Ngôn ngữ: {(p?.allowed_languages ?? []).map(languageLabel).join(", ") || "—"}
          {p?.solution_code ? ` · Có lời giải mẫu (${languageLabel(p.solution_language)})` : " · Chưa có lời giải mẫu"}</p>
        {publicTests.slice(0, 2).map((test) => <div key={test.position} className="grid gap-2 sm:grid-cols-2">
          <pre className="max-h-32 overflow-auto rounded-lg border bg-muted/40 p-2 font-mono text-xs"><span className="mb-1 block font-sans text-muted-foreground">Input</span>{test.input}</pre>
          <pre className="max-h-32 overflow-auto rounded-lg border bg-muted/40 p-2 font-mono text-xs"><span className="mb-1 block font-sans text-muted-foreground">Output mong đợi</span>{test.expected_output}</pre>
        </div>)}
      </Block>;
    }
    default:
      return null;
  }
}
