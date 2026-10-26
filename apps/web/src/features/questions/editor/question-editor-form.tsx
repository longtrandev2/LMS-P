import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { queryKeys } from "@/lib/query-keys";
import type { Question, QuestionBank, QuestionCategory, QuestionType } from "@/types/api";
import { TypeAnswerEditor } from "./answers/type-answer-editor";
import { ContentField } from "./content-field";
import { EditorContext, EditorSection, type EditorApi } from "./editor-context";
import { EditorHeader } from "./editor-header";
import { LIMITS } from "./limits";
import { MarkdownField } from "./markdown-field";
import { MetaFields } from "./meta-fields";
import { QuestionPreview } from "./preview/question-preview";
import { QuestionTypePicker } from "./question-type-picker";
import { useLeaveGuard } from "./use-leave-guard";
import { useQuestionForm } from "./use-question-form";

export const bankHref = (bankId: number, categoryId?: number | null) =>
  `/questions?bank=${bankId}${categoryId != null ? `&category=${categoryId}` : ""}`;

/** Trang soạn câu: form theo loại bên trái, xem trước như sinh viên bên phải (§8). */
export function QuestionEditorForm({ question, bank, categories, categoriesLoading, initialType, initialCategory }: {
  question: Question | null; bank: QuestionBank; categories: QuestionCategory[]; categoriesLoading: boolean;
  initialType: QuestionType; initialCategory: number | null;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const cache = useQueryClient();
  const form = useQuestionForm({ question, bankId: bank.id, initialType, initialCategory });
  const leave = useLeaveGuard(form.dirty);
  const [version, setVersion] = useState<number | null>(question?.version_no ?? null);
  const [justSaved, setJustSaved] = useState(!!(location.state as { suggestVerify?: boolean } | null)?.suggestVerify);
  const saveRef = useRef<() => void>(() => undefined);

  async function save() {
    if (form.saving) return;
    const saved = await form.save();
    if (!saved) return;
    cache.setQueryData(queryKeys.questions.detail(saved.id), saved);
    void cache.invalidateQueries({ queryKey: [...queryKeys.questions.all, "list"] });
    const suggestVerify = saved.type === "programming" && !!saved.programming?.solution_code;
    toast.success(question ? `Đã lưu phiên bản ${saved.version_no}.` : "Đã tạo câu hỏi.");
    setVersion(saved.version_no);
    setJustSaved(suggestVerify);
    if (!question) navigate(`/questions/${saved.id}/edit`, { replace: true, state: { suggestVerify } });
  }
  useEffect(() => { saveRef.current = () => void save(); });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); saveRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const api = useMemo<EditorApi>(() => ({
    draft: form.draft, update: form.update, patch: form.patch, errors: form.errors,
    bankId: bank.id, questionId: question?.id ?? null, dirty: form.dirty,
  }), [form.draft, form.update, form.patch, form.errors, form.dirty, bank.id, question?.id]);
  const backHref = bankHref(bank.id, question?.category_id ?? initialCategory);

  return <EditorContext.Provider value={api}>
    <div className="space-y-6">
      <EditorHeader backHref={backHref} bankName={bank.name} title={question ? `Sửa câu hỏi #${question.id}` : "Câu hỏi mới"}
        version={version} dirty={form.dirty} saving={form.saving} onSave={() => void save()} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <form noValidate className="min-w-0 space-y-5" onSubmit={(event) => event.preventDefault()}>
          <QuestionTypePicker value={form.draft.type} locked={!!question} onChange={form.changeType} />
          <EditorSection title="Nội dung" field="content">
            <MetaFields categories={categories} categoriesLoading={categoriesLoading} />
            <ContentField />
            <div data-field="explanation">
              <MarkdownField id="question-explanation" label="Giải thích đáp án" optional value={form.draft.explanation}
                onChange={(explanation) => form.patch({ explanation })} error={form.errors.explanation} maxLength={LIMITS.explanation} minHeight="min-h-24"
                hint="Chỉ hiện cho sinh viên khi chính sách xem lại cho phép." placeholder="Vì sao đáp án này đúng…" />
            </div>
          </EditorSection>
          <TypeAnswerEditor suggestVerify={justSaved} />
        </form>
        <aside className="min-w-0 xl:sticky xl:top-36 xl:max-h-[calc(100dvh-10rem)] xl:overflow-y-auto">
          <QuestionPreview draft={form.draft} />
        </aside>
      </div>
    </div>
    <AlertDialog open={leave.pendingHref != null} onOpenChange={(open) => !open && leave.cancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rời trang khi chưa lưu?</AlertDialogTitle>
          <AlertDialogDescription>Các thay đổi chưa lưu sẽ bị mất.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Ở lại</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={leave.confirm}>Rời trang</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </EditorContext.Provider>;
}
