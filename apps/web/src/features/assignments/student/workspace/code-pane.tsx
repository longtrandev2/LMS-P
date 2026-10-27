import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { CodeEditor } from "@/components/code-editor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES } from "@/lib/languages";
import type { ProgrammingLanguage } from "@/types/api";
import { ConfirmDialog } from "../confirm-dialog";

/** Thanh trên (Select ngôn ngữ · trạng thái nháp · "Khôi phục code mẫu") + editor viền nhẹ. */
export function CodePane({ allowed, language, onLanguageChange, code, onCodeChange, onRestore, isStarter, readOnly }: {
  allowed: ProgrammingLanguage[]; language: ProgrammingLanguage; onLanguageChange: (language: ProgrammingLanguage) => void;
  code: string; onCodeChange: (code: string) => void; onRestore: () => void; isStarter: boolean; readOnly: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const options = LANGUAGES.filter((item) => allowed.includes(item.id));
  return <section aria-label="Soạn code" className="flex flex-col">
    <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-3">
      <label htmlFor="workspace-language" className="sr-only">Ngôn ngữ</label>
      <Select value={language} onValueChange={(value) => onLanguageChange(value as ProgrammingLanguage)}>
        <SelectTrigger id="workspace-language" className="min-w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">{isStarter ? "Code mẫu" : "Nháp tự lưu trên trình duyệt này"}</span>
      <Button type="button" variant="link" size="sm" className="ml-auto text-muted-foreground hover:text-foreground"
        disabled={isStarter || readOnly} onClick={() => setConfirmOpen(true)}>
        <RotateCcw aria-hidden />Khôi phục code mẫu
      </Button>
    </div>
    <div className="px-4 py-3">
      <CodeEditor value={code} onChange={onCodeChange} language={language} readOnly={readOnly}
        minHeight="max(18rem, calc(100dvh - 24rem))" ariaLabel="Trình soạn code" />
    </div>
    <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} destructive title="Khôi phục code mẫu?"
      description="Code hiện tại của ngôn ngữ này sẽ bị thay bằng code mẫu và nháp bị xóa. Bài đã nộp không bị ảnh hưởng."
      confirmLabel="Khôi phục" onConfirm={onRestore} />
  </section>;
}
