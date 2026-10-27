import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { LANGUAGES, languageLabel } from "@/lib/languages";
import { cn } from "@/lib/utils";
import type { ProgrammingLanguage } from "@/types/api";
import { FieldMessage, useEditor } from "../editor-context";

/**
 * Ngôn ngữ cho phép: chỉ liệt kê ngôn ngữ hệ thống đang bật (`allowed_languages`, admin-spec §1).
 * Câu cũ còn chọn ngôn ngữ đã bị tắt: vẫn hiện dòng đó (đánh dấu) để giảng viên bỏ chọn trước khi lưu.
 */
export function LanguageChecklist() {
  const { draft, update, errors, rules } = useEditor();
  const selected = draft.programming.allowed_languages;
  const blocked = selected.filter((id) => !rules.allowedLanguages.includes(id));
  const shown = LANGUAGES.filter((lang) => rules.allowedLanguages.includes(lang.id) || blocked.includes(lang.id));

  function toggle(lang: ProgrammingLanguage, on: boolean) {
    const next = LANGUAGES.map((item) => item.id).filter((id) => id === lang ? on : selected.includes(id));
    update((d) => ({ ...d, programming: { ...d.programming, allowed_languages: next } }));
  }

  return <fieldset className="space-y-2">
    <legend className="mb-2 text-sm font-medium">Ngôn ngữ cho phép</legend>
    {blocked.length ? <Alert variant="warning" className="mb-3">
      <TriangleAlert aria-hidden />
      <AlertTitle>Ngôn ngữ không còn được hệ thống cho phép</AlertTitle>
      <AlertDescription>
        {blocked.map(languageLabel).join(", ")} đã bị quản trị viên tắt. Bài đã giao vẫn chấm như cũ; muốn lưu phiên bản mới, hãy bỏ chọn
        ngôn ngữ này.
      </AlertDescription>
    </Alert> : null}
    <div className="grid gap-2 sm:grid-cols-2">
      {shown.map((lang) => {
        const off = blocked.includes(lang.id);
        return <label key={lang.id} htmlFor={`lang-${lang.id}`}
          className={cn("flex h-10 cursor-pointer items-center gap-3 rounded-lg bg-secondary px-3 text-sm transition-colors duration-150 hover:bg-accent",
            off && "bg-warning/10 hover:bg-warning/15")}>
          <Checkbox id={`lang-${lang.id}`} checked={selected.includes(lang.id)} onCheckedChange={(checked) => toggle(lang.id, checked === true)}
            aria-describedby="languages-message" />
          <span className="font-medium">{lang.short}</span>
          <span className={cn("ml-auto truncate text-xs", off ? "font-medium text-warning" : "text-muted-foreground")}>
            {off ? "Đã bị tắt" : lang.label}
          </span>
        </label>;
      })}
    </div>
    <FieldMessage id="languages-message" error={errors.languages}
      hint={rules.allowedLanguages.length < LANGUAGES.length ? "Danh sách theo cấu hình hệ thống; ngôn ngữ khác đang tắt." : undefined} />
  </fieldset>;
}
