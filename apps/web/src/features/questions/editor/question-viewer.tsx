import { useMemo } from "react";
import { Clock, Code2, Cpu, FileCheck2, FolderOpen, GitCommitVertical, Library, Scale, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CodeEditor } from "@/components/code-editor";
import { languageLabel, LANGUAGES } from "@/lib/languages";
import { SCORING_MODE_LABEL, PARTIAL_SCORING_TYPES } from "@/lib/question-types";
import type { Question, QuestionBank } from "@/types/api";
import { EditorSection } from "./editor-context";
import { EditorHeader } from "./editor-header";
import { QuestionPreview } from "./preview/question-preview";
import { TestCaseTable } from "./programming/test-case-table";
import { CHECKERS } from "./programming/programming-settings";
import { draftFromQuestion } from "./question-draft";
import { bankHref } from "./question-editor-form";

function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return <div className="flex items-start gap-3 text-sm">
    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
    <dt className="sr-only">{label}</dt><dd className="min-w-0">{children}</dd>
  </div>;
}

/** Chế độ chỉ xem (quyền xem ngân hàng): câu + đáp án bên trái, panel thông tin bên phải (kiểu thẻ Frappe), lời giải và bộ test bên dưới. */
export function QuestionViewer({ question, bank }: { question: Question; bank: QuestionBank | undefined }) {
  const draft = useMemo(() => draftFromQuestion(question), [question]);
  const p = draft.programming;
  const programming = question.type === "programming";
  const checker = CHECKERS.find((c) => c.id === p.checker_mode)?.label;
  return <>
    <EditorHeader backHref={bankHref(question.bank_id, question.category_id)} bankName={bank?.name ?? question.bank_name}
      title={`Câu hỏi #${question.id}`} type={question.type} version={question.version_no} dirty={false}>
      <Badge variant="secondary">Chỉ xem</Badge>
    </EditorHeader>
    <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-8 pb-16">
        <QuestionPreview draft={draft} showAnswers title="Câu hỏi và đáp án" />
        {programming && p.solution_code ? <EditorSection title="Lời giải mẫu" description={languageLabel(p.solution_language)} className="border-t-0 pt-0">
          <CodeEditor language={p.solution_language ?? "text"} value={p.solution_code} readOnly maxHeight="32rem" ariaLabel="Lời giải mẫu" />
        </EditorSection> : null}
        {programming ? <EditorSection title="Bộ test" description={`${draft.tests.length} test · ${draft.tests.filter((t) => t.is_public).length} mẫu`}>
          {draft.tests.length ? <TestCaseTable tests={draft.tests} readOnly /> : <p className="text-sm text-muted-foreground">Chưa có test.</p>}
        </EditorSection> : null}
      </div>
      <aside className="rounded-xl border p-5 xl:sticky xl:top-28" aria-label="Thông tin câu hỏi">
        <h2 className="text-sm font-semibold">Thông tin</h2>
        <dl className="mt-4 space-y-3">
          <Fact icon={Library} label="Ngân hàng">{bank?.name ?? question.bank_name}</Fact>
          <Fact icon={FolderOpen} label="Danh mục">{question.category_name}</Fact>
          <Fact icon={GitCommitVertical} label="Phiên bản"><span className="tabular-nums">Phiên bản {question.version_no}</span></Fact>
          {PARTIAL_SCORING_TYPES.includes(question.type) ? <Fact icon={Scale} label="Cách chấm">{SCORING_MODE_LABEL[draft.scoring_mode]}</Fact> : null}
          {programming ? <>
            <Fact icon={Clock} label="Thời gian"><span className="tabular-nums">{p.time_limit_ms} ms</span></Fact>
            <Fact icon={Cpu} label="Bộ nhớ"><span className="tabular-nums">{p.memory_limit_mb} MB</span></Fact>
            <Fact icon={FileCheck2} label="Cách so output">So output {checker?.toLowerCase()}{p.checker_mode === "float" ? ` (ε = ${p.checker_epsilon})` : ""}</Fact>
            <Fact icon={Code2} label="Ngôn ngữ">{LANGUAGES.filter((l) => p.allowed_languages.includes(l.id)).map((l) => l.label).join(", ")}</Fact>
          </> : null}
        </dl>
        <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">Bạn có quyền xem ngân hàng này. Liên hệ chủ ngân hàng để được cấp quyền sửa.</p>
      </aside>
    </div>
  </>;
}
