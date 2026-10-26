import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { CodeEditor } from "@/components/code-editor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_STARTERS, LANGUAGES } from "@/lib/languages";
import type { ProgrammingLanguage } from "@/types/api";
import { EditorSection, FieldMessage, useEditor } from "../editor-context";

/** Code khởi đầu theo từng ngôn ngữ được phép. Bỏ trống = sinh viên bắt đầu với editor rỗng. */
export function StarterCodesEditor() {
  const { draft, update, errors } = useEditor();
  const allowed = LANGUAGES.filter((lang) => draft.programming.allowed_languages.includes(lang.id));
  const [selected, setSelected] = useState<ProgrammingLanguage | null>(null);
  const active = allowed.find((lang) => lang.id === selected)?.id ?? allowed[0]?.id;
  const setCode = (lang: ProgrammingLanguage, code: string) => update((d) => ({
    ...d, programming: { ...d.programming, starter_codes: { ...d.programming.starter_codes, [lang]: code } },
  }));
  if (!active) return null;
  return <EditorSection field={`starter.${active}`} title="Code khởi đầu" description="Sinh viên thấy code này khi mở bài. Có thể để trống."
    actions={<Button type="button" size="sm" variant="outline" onClick={() => setCode(active, DEFAULT_STARTERS[active])}>
      <RotateCcw aria-hidden /> Dùng mẫu mặc định</Button>}>
    <Tabs value={active} onValueChange={(value) => setSelected(value as ProgrammingLanguage)} className="gap-3">
      <TabsList variant="line" className="h-9 max-w-full justify-start overflow-x-auto">
        {allowed.map((lang) => <TabsTrigger key={lang.id} value={lang.id} className="flex-none px-3">
          {lang.short}{draft.programming.starter_codes[lang.id]?.trim() ? null : <span className="ml-1 font-normal text-muted-foreground">(trống)</span>}
        </TabsTrigger>)}
      </TabsList>
      {allowed.map((lang) => <TabsContent key={lang.id} value={lang.id} className="space-y-2">
        <CodeEditor language={lang.id} value={draft.programming.starter_codes[lang.id] ?? ""} onChange={(code) => setCode(lang.id, code)}
          minHeight="10rem" maxHeight="28rem" ariaLabel={`Code khởi đầu ${lang.label}`} />
        <FieldMessage id={`starter-${lang.id}-message`} error={errors[`starter.${lang.id}`]} />
      </TabsContent>)}
    </Tabs>
  </EditorSection>;
}
