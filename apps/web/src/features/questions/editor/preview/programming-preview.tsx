import { Clock, Code2, Cpu } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import type { QuestionDraft } from "../question-draft";

function Sample({ label, text }: { label: string; text: string }) {
  return <div className="min-w-0 space-y-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <pre className="max-h-48 overflow-auto rounded-md bg-secondary px-3 py-2 font-mono text-xs leading-5 whitespace-pre">{text || " "}</pre>
  </div>;
}

/** Phần đề lập trình sinh viên thấy: hàng meta giới hạn/ngôn ngữ, ví dụ mẫu (test Mẫu). */
export function ProgrammingPreview({ draft }: { draft: QuestionDraft }) {
  const p = draft.programming;
  const samples = draft.tests.filter((test) => test.is_public);
  const languages = LANGUAGES.filter((lang) => p.allowed_languages.includes(lang.id));
  return <div className="space-y-5">
    <dl className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5"><Clock className="size-3.5" aria-hidden /><dt className="sr-only">Thời gian</dt><dd className="tabular-nums">{p.time_limit_ms || "—"} ms</dd></div>
      <span aria-hidden>·</span>
      <div className="flex items-center gap-1.5"><Cpu className="size-3.5" aria-hidden /><dt className="sr-only">Bộ nhớ</dt><dd className="tabular-nums">{p.memory_limit_mb} MB</dd></div>
      <span aria-hidden>·</span>
      <div className="flex items-center gap-1.5"><Code2 className="size-3.5" aria-hidden /><dt className="sr-only">Ngôn ngữ</dt><dd>{languages.map((lang) => lang.short).join(", ") || "—"}</dd></div>
    </dl>
    <div className="space-y-4 border-t pt-4">
      {samples.length ? samples.map((test, index) => <div key={test.key} className="space-y-2">
        <p className="text-sm font-semibold">Ví dụ {index + 1}</p>
        <div className="grid gap-2 sm:grid-cols-2"><Sample label="Input" text={test.input} /><Sample label="Output" text={test.expected_output} /></div>
      </div>) : <p className="text-xs text-muted-foreground">Chưa có test Mẫu — đề sẽ không có ví dụ. Đánh dấu một vài test là “Mẫu”.</p>}
    </div>
  </div>;
}
