import { useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { CodeEditor } from "@/components/code-editor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, languageFromFileName } from "@/lib/languages";
import type { ProgrammingLanguage } from "@/types/api";
import { EditorSection, FieldMessage, useEditor } from "../editor-context";
import { byteSize, formatBytes, LIMITS } from "../limits";

const ACCEPT = ".py,.c,.cpp,.cc,.java";

/** Lời giải mẫu: chỉ giảng viên thấy; dùng để sinh output và kiểm tra đề. */
export function SolutionEditor() {
  const { draft, update, errors } = useEditor();
  const fileRef = useRef<HTMLInputElement>(null);
  const p = draft.programming;
  const allowed = LANGUAGES.filter((lang) => p.allowed_languages.includes(lang.id));
  const set = (patch: Partial<typeof p>) => update((d) => ({ ...d, programming: { ...d.programming, ...patch } }));
  const language = p.solution_language ?? allowed[0]?.id ?? "python";

  async function upload(file: File | undefined) {
    if (!file) return;
    const detected = languageFromFileName(file.name);
    if (!detected) { toast.error("Chỉ nhận file .py, .c, .cpp, .cc hoặc .java."); return; }
    if (file.size > LIMITS.solutionBytes) { toast.error(`File lời giải vượt ${formatBytes(LIMITS.solutionBytes)}.`); return; }
    const code = await file.text();
    set({ solution_code: code, solution_language: detected });
    if (!p.allowed_languages.includes(detected)) toast.warning("Ngôn ngữ của file chưa nằm trong danh sách cho phép.");
    else toast.success(`Đã tải ${file.name}.`);
  }

  return <EditorSection field="solution" title="Lời giải mẫu" description="Chỉ giảng viên thấy. Dùng để sinh output và kiểm tra đề trước khi xuất bản."
    actions={<>
      <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden
        onChange={(event) => { void upload(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
      <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload aria-hidden /> Tải file</Button>
    </>}>
    <div className="flex flex-wrap items-end gap-3" data-field="solution_language">
      <div className="w-full space-y-2 sm:w-64">
        <Label htmlFor="solution-language">Ngôn ngữ lời giải</Label>
        <Select value={p.solution_language ?? (p.solution_code.trim() ? "" : language)} onValueChange={(value) => set({ solution_language: value as ProgrammingLanguage })}>
          <SelectTrigger id="solution-language" className="w-full" aria-invalid={!!errors.solution_language}><SelectValue placeholder="Chọn ngôn ngữ" /></SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => <SelectItem key={lang.id} value={lang.id} disabled={!p.allowed_languages.includes(lang.id)}>{lang.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <span className="pb-2.5 text-xs text-muted-foreground tabular-nums">{formatBytes(byteSize(p.solution_code))} / {formatBytes(LIMITS.solutionBytes)}</span>
    </div>
    <FieldMessage id="solution-language-message" error={errors.solution_language} />
    <CodeEditor language={language} value={p.solution_code} minHeight="14rem" maxHeight="36rem" ariaLabel="Lời giải mẫu"
      onChange={(code) => set({ solution_code: code, solution_language: p.solution_language ?? language })} />
    <FieldMessage id="solution-message" error={errors.solution} />
  </EditorSection>;
}
