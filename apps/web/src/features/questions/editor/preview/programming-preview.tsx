import { Clock, Cpu } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import type { QuestionDraft } from "../question-draft";

function Sample({ label, text }: { label: string; text: string }) {
  return <div className="min-w-0 space-y-1">
    <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
    <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-2 font-mono text-xs leading-5 whitespace-pre">{text || " "}</pre>
  </div>;
}

/** Phần đề lập trình sinh viên thấy: giới hạn, ngôn ngữ, ví dụ mẫu (test Mẫu). */
export function ProgrammingPreview({ draft }: { draft: QuestionDraft }) {
  const p = draft.programming;
  const samples = draft.tests.filter((test) => test.is_public);
  const languages = LANGUAGES.filter((lang) => p.allowed_languages.includes(lang.id));
  return <div className="space-y-4">
    <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5"><Clock className="size-3.5" aria-hidden /><dt className="sr-only">Thời gian</dt><dd>{p.time_limit_ms || "—"} ms</dd></div>
      <div className="flex items-center gap-1.5"><Cpu className="size-3.5" aria-hidden /><dt className="sr-only">Bộ nhớ</dt><dd>{p.memory_limit_mb} MB</dd></div>
      <div className="flex items-center gap-1.5"><dt>Ngôn ngữ:</dt><dd>{languages.map((lang) => lang.short).join(", ") || "—"}</dd></div>
    </dl>
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Ví dụ</h3>
      {samples.length ? samples.map((test, index) => <div key={test.key} className="space-y-2">
        <p className="text-xs font-medium">Ví dụ {index + 1}</p>
        <div className="grid gap-2 sm:grid-cols-2"><Sample label="Input" text={test.input} /><Sample label="Output" text={test.expected_output} /></div>
      </div>) : <p className="text-xs text-muted-foreground">Chưa có test Mẫu — đề sẽ không có ví dụ. Đánh dấu một vài test là “Mẫu”.</p>}
    </div>
  </div>;
}
