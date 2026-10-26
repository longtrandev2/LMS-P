import { MarkdownView } from "@/components/markdown-view";
import type { AnswerResponse, AssignmentQuestion } from "@/types/api";

const empty = <span className="text-muted-foreground italic">Bỏ trống</span>;

function Answer({ question, response }: { question?: AssignmentQuestion; response: AnswerResponse }) {
  if (response.selected_option_ids) {
    if (!response.selected_option_ids.length) return empty;
    const content = new Map(question?.options.map((option) => [option.id, option.content]));
    return <ul className="space-y-1.5">{response.selected_option_ids.map((id) =>
      <li key={id} className="rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap">{content.get(id) ?? `Lựa chọn #${id}`}</li>)}</ul>;
  }
  if (response.text != null) return response.text.trim() ? <p className="rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap">{response.text}</p> : empty;
  if (response.number != null) return <p className="font-mono text-sm tabular-nums">{response.number}</p>;
  if (response.blanks) return <ol className="space-y-1">{response.blanks.map((value, index) =>
    <li key={index} className="flex gap-2 text-sm"><span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">[[{index + 1}]]</span>{value.trim() ? value : empty}</li>)}</ol>;
  if (response.matches) {
    const lefts = new Map(question?.matching?.lefts.map((item) => [item.id, item.text]));
    const rights = new Map(question?.matching?.rights.map((item) => [item.id, item.text]));
    const entries = Object.entries(response.matches);
    if (!entries.length) return empty;
    return <ul className="space-y-1.5">{entries.map(([left, right]) =>
      <li key={left} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
        <span className="rounded-md border px-2 py-1">{lefts.get(left) ?? left}</span><span aria-label="ghép với" className="text-muted-foreground">→</span>
        <span className="rounded-md border px-2 py-1">{rights.get(right) ?? right}</span>
      </li>)}</ul>;
  }
  if (response.order) {
    const items = new Map(question?.ordering_items?.map((item) => [item.id, item.text]));
    return <ol className="list-decimal space-y-1 pl-5 text-sm">{response.order.map((id) => <li key={id}>{items.get(id) ?? id}</li>)}</ol>;
  }
  return empty;
}

/** Câu trả lời của câu khách quan nộp từng câu (`submissions.response`, assessment-spec §3.2). */
export function ObjectiveResponse({ question, response }: { question?: AssignmentQuestion; response: AnswerResponse }) {
  return <div className="space-y-4 p-4 sm:p-5">
    {question ? <div className="border-b pb-4"><MarkdownView source={question.content} /></div> : null}
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Câu trả lời</p>
      <Answer question={question} response={response} />
    </div>
  </div>;
}
