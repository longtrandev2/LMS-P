import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES } from "@/lib/languages";
import type { CheckerMode, ProgrammingLanguage } from "@/types/api";
import { EditorSection, FieldMessage, useEditor } from "../editor-context";
import { MEMORY_CHOICES, type ProgrammingDraft } from "../question-draft";

export const CHECKERS: { id: CheckerMode; label: string; description: string }[] = [
  { id: "token", label: "Theo token", description: "So từng từ/số, bỏ qua khác biệt khoảng trắng và xuống dòng." },
  { id: "line", label: "Theo dòng", description: "So từng dòng; bỏ khoảng trắng cuối dòng và dòng trống cuối." },
  { id: "float", label: "Số thực", description: "Như theo token; hai số thực đạt nếu chênh lệch ≤ epsilon." },
];

/** Ngôn ngữ, giới hạn thời gian/bộ nhớ, checker — docs/assessment-spec.md §4. */
export function ProgrammingSettings() {
  const { draft, update, errors } = useEditor();
  const p = draft.programming;
  const set = (patch: Partial<ProgrammingDraft>) => update((d) => ({ ...d, programming: { ...d.programming, ...patch } }));
  function toggleLanguage(lang: ProgrammingLanguage, on: boolean) {
    const allowed = LANGUAGES.map((item) => item.id).filter((id) => id === lang ? on : p.allowed_languages.includes(id));
    set({ allowed_languages: allowed });
  }
  const checker = CHECKERS.find((item) => item.id === p.checker_mode);
  return <EditorSection field="languages" title="Cấu hình chấm" description="Chương trình đọc stdin, ghi stdout. Java dùng class Main.">
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">Ngôn ngữ cho phép</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {LANGUAGES.map((lang) => <label key={lang.id} htmlFor={`lang-${lang.id}`} className="flex h-10 cursor-pointer items-center gap-3 rounded-lg bg-secondary px-3 text-sm transition-colors duration-150 hover:bg-accent">
          <Checkbox id={`lang-${lang.id}`} checked={p.allowed_languages.includes(lang.id)} onCheckedChange={(checked) => toggleLanguage(lang.id, checked === true)} />
          <span className="font-medium">{lang.short}</span>
          <span className="ml-auto truncate text-xs text-muted-foreground">{lang.label}</span>
        </label>)}
      </div>
      <FieldMessage id="languages-message" error={errors.languages} />
    </fieldset>
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <div className="space-y-2" data-field="time_limit">
        <Label htmlFor="time-limit">Giới hạn thời gian (ms)</Label>
        <Input id="time-limit" inputMode="numeric" value={p.time_limit_ms} aria-invalid={!!errors.time_limit} aria-describedby="time-limit-message"
          onChange={(event) => /^\d{0,5}$/.test(event.target.value) && set({ time_limit_ms: event.target.value })} className="font-mono" />
        <FieldMessage id="time-limit-message" error={errors.time_limit} hint="100–10.000 ms. Java và Python được nhân hệ số ×2." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="memory-limit">Giới hạn bộ nhớ</Label>
        <Select value={String(p.memory_limit_mb)} onValueChange={(value) => set({ memory_limit_mb: Number(value) })}>
          <SelectTrigger id="memory-limit" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[...new Set([...MEMORY_CHOICES, p.memory_limit_mb])].sort((a, b) => a - b)
              .map((mb) => <SelectItem key={mb} value={String(mb)}>{mb} MB</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="checker-mode">Cách so output</Label>
        <Select value={p.checker_mode} onValueChange={(value) => set({ checker_mode: value as CheckerMode })}>
          <SelectTrigger id="checker-mode" className="w-full" aria-describedby="checker-mode-message"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CHECKERS.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <FieldMessage id="checker-mode-message" hint={checker?.description} />
      </div>
      {p.checker_mode === "float" ? <div className="space-y-2" data-field="epsilon">
        <Label htmlFor="checker-epsilon">Epsilon</Label>
        <Input id="checker-epsilon" inputMode="decimal" value={p.checker_epsilon} aria-invalid={!!errors.epsilon} aria-describedby="checker-epsilon-message"
          onChange={(event) => set({ checker_epsilon: event.target.value })} className="font-mono" />
        <FieldMessage id="checker-epsilon-message" error={errors.epsilon} hint="Sai số tuyệt đối hoặc tương đối, từ 1e-12 đến 1." />
      </div> : null}
    </div>
  </EditorSection>;
}
