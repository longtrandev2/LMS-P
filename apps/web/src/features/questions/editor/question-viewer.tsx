import { useMemo } from "react";
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

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-0.5"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm font-medium">{children}</dd></div>;
}

/** Chế độ chỉ xem (quyền xem ngân hàng): câu như sinh viên thấy + đáp án, cấu hình chấm, lời giải, bộ test. */
export function QuestionViewer({ question, bank }: { question: Question; bank: QuestionBank | undefined }) {
  const draft = useMemo(() => draftFromQuestion(question), [question]);
  const p = draft.programming;
  return <div className="space-y-6">
    <EditorHeader backHref={bankHref(question.bank_id, question.category_id)} bankName={bank?.name ?? question.bank_name}
      title={`Câu hỏi #${question.id}`} version={question.version_no} dirty={false}>
      <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">Chỉ xem</span>
    </EditorHeader>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
      <QuestionPreview draft={draft} showAnswers title="Câu hỏi và đáp án" />
      <EditorSection title="Thông tin">
        <dl className="grid grid-cols-2 gap-4">
          <Fact label="Danh mục">{question.category_name}</Fact>
          <Fact label="Phiên bản">{question.version_no}</Fact>
          {PARTIAL_SCORING_TYPES.includes(question.type) ? <Fact label="Cách chấm">{SCORING_MODE_LABEL[draft.scoring_mode]}</Fact> : null}
          {question.type === "programming" ? <>
            <Fact label="Thời gian">{p.time_limit_ms} ms</Fact>
            <Fact label="Bộ nhớ">{p.memory_limit_mb} MB</Fact>
            <Fact label="Cách so output">{CHECKERS.find((c) => c.id === p.checker_mode)?.label}{p.checker_mode === "float" ? ` (ε = ${p.checker_epsilon})` : ""}</Fact>
            <div className="col-span-2"><Fact label="Ngôn ngữ">{LANGUAGES.filter((l) => p.allowed_languages.includes(l.id)).map((l) => l.label).join(", ")}</Fact></div>
          </> : null}
        </dl>
      </EditorSection>
    </div>
    {question.type === "programming" ? <>
      {p.solution_code ? <EditorSection title="Lời giải mẫu" description={languageLabel(p.solution_language)}>
        <CodeEditor language={p.solution_language ?? "text"} value={p.solution_code} readOnly maxHeight="32rem" ariaLabel="Lời giải mẫu" />
      </EditorSection> : null}
      <EditorSection title="Bộ test" description={`${draft.tests.length} test · ${draft.tests.filter((t) => t.is_public).length} mẫu`}>
        {draft.tests.length ? <TestCaseTable tests={draft.tests} readOnly /> : <p className="text-sm text-muted-foreground">Chưa có test.</p>}
      </EditorSection>
    </> : null}
  </div>;
}
