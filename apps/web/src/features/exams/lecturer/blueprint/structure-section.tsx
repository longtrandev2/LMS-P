import { useState } from "react";
import { Plus } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { EditorSection } from "@/features/assignments/lecturer/editor-layout";
import { QuestionPickerSheet } from "@/features/assignments/lecturer/question-picker-sheet";
import { QuestionPreviewDialog } from "@/features/assignments/lecturer/question-preview-dialog";
import { defaultSectionTitle, isImplicitSection, newKey, orderedBySection, variantTotal, type BlueprintForm, type RuleDraft } from "./blueprint-model";
import { MatrixSheet } from "./matrix-sheet";
import type { PublishIssue } from "./publish-issue";
import { RuleSheet, type RuleTarget } from "./rule-sheet";
import { SectionBlock } from "./section-block";
import { PublishIssueAlert, VariantBar } from "./structure-notices";
import { useBuilderCtx } from "./use-builder-ctx";
import type { AssignmentDetails, QuestionSummary } from "@/types/api";

/** Mục "Cấu trúc đề" của trang soạn — phần, câu cố định, quy tắc, ma trận, mã đề (exam-spec.md §8.2). */
export function StructureSection({ classId, form, patch, errors, locked, quiz, details, issue }: {
  classId: number; form: BlueprintForm; patch: (next: Partial<BlueprintForm>) => void; errors: Record<string, string>;
  locked: boolean; quiz: boolean; details: AssignmentDetails | null; issue: PublishIssue | null;
}) {
  const [scopeState, setScope] = useState<number | null>(null);
  const [pickerSection, setPickerSection] = useState<string | null>(null);
  const [ruleTarget, setRuleTarget] = useState<RuleTarget | null>(null);
  const [matrixSection, setMatrixSection] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const variantCount = variantTotal(form);
  const scope = variantCount && scopeState != null && scopeState <= variantCount ? scopeState : null;
  const fixedIds = new Set(form.questions.map((q) => q.question_id));
  const ctx = useBuilderCtx({
    form, patch, errors, locked, quiz, scope, details, issue,
    handlers: {
      openPicker: setPickerSection, openMatrix: setMatrixSection, preview: setPreviewId,
      openRule: (sectionKey, rule) => setRuleTarget({ sectionKey, variant: scope, rule }),
    },
  });

  function addSection() {
    const base = isImplicitSection(form) ? [{ ...form.sections[0], title: defaultSectionTitle(0) }] : form.sections;
    patch({ sections: [...base, { key: newKey("s"), title: defaultSectionTitle(base.length) }] });
  }
  function moveSection(index: number, d: -1 | 1) {
    const next = [...form.sections];
    [next[index], next[index + d]] = [next[index + d], next[index]];
    patch({ sections: next });
  }
  function removeSection(key: string) {
    const sections = form.sections.filter((s) => s.key !== key);
    patch({ sections, questions: form.questions.filter((q) => q.sectionKey !== key), rules: form.rules.filter((r) => r.sectionKey !== key) });
    setRemoving(null);
  }
  function requestRemove(key: string) {
    if (form.questions.some((q) => q.sectionKey === key) || form.rules.some((r) => r.sectionKey === key)) setRemoving(key);
    else removeSection(key);
  }
  function addQuestions(items: QuestionSummary[]) {
    if (!pickerSection) return;
    const fresh = items.filter((item) => !fixedIds.has(item.id)).map((item) => ({
      question_id: item.id, type: item.type, content: item.content, difficulty: item.difficulty, bank_name: item.bank_name,
      points: "1", sectionKey: pickerSection, variant: scope,
    }));
    patch({ questions: [...form.questions, ...fresh] });
  }
  function saveRule(rule: RuleDraft) {
    const exists = form.rules.some((r) => r.key === rule.key);
    patch({ rules: exists ? form.rules.map((r) => r.key === rule.key ? rule : r) : [...form.rules, rule] });
    setRuleTarget(null);
  }
  const removingTitle = form.sections.find((s) => s.key === removing)?.title;

  return <EditorSection id="questions" title="Cấu trúc đề"
    description={locked ? "Cấu trúc đề đã được ghim khi xuất bản." : "Chia đề thành các phần; mỗi phần gồm câu cố định và quy tắc bốc ngẫu nhiên. Câu cố định đứng trước, câu bốc ngẫu nhiên sau."}>
    {variantCount ? <VariantBar count={variantCount} value={scope} onChange={setScope} /> : null}
    {issue ? <PublishIssueAlert issue={issue} form={form} criteria={(i) => { const r = orderedBySection(form, form.rules)[i]; return r ? `Ngẫu nhiên ${r.count} câu · ${ctx.ruleCriteria(r)}` : null; }} /> : null}
    <div className="space-y-3">
      {form.sections.map((section, index) => <SectionBlock key={section.key} ctx={ctx} section={section} index={index} count={form.sections.length}
        onMove={(d) => moveSection(index, d)} onRemove={() => requestRemove(section.key)} />)}
    </div>
    {locked ? null : <Button type="button" variant="outline" size="sm" disabled={form.sections.length >= 20} onClick={addSection}><Plus aria-hidden />Thêm phần</Button>}
    {errors.questions ? <p role="alert" data-editor-error className="text-sm text-destructive">{errors.questions}</p> : null}
    {!locked && !variantCount && [...form.questions, ...form.rules].some((item) => item.variant != null)
      ? <Button type="button" variant="secondary" size="sm" onClick={() => patch({
        questions: form.questions.map((q) => ({ ...q, variant: null })), rules: form.rules.map((r) => ({ ...r, variant: null })),
      })}>Đưa mọi mục về chung</Button> : null}

    <QuestionPickerSheet open={pickerSection != null} onOpenChange={(open) => !open && setPickerSection(null)} classId={classId} quiz={quiz}
      existing={fixedIds} onAdd={addQuestions} />
    {ruleTarget ? <RuleSheet classId={classId} target={ruleTarget} quiz={quiz} variantCount={variantCount} fixedIds={fixedIds}
      onClose={() => setRuleTarget(null)} onSave={saveRule} /> : null}
    {matrixSection ? <MatrixSheet classId={classId} sectionKey={matrixSection} variant={scope} quiz={quiz} fixedIds={fixedIds}
      onClose={() => setMatrixSection(null)} onAdd={(rules) => { patch({ rules: [...form.rules, ...rules] }); setMatrixSection(null); }} /> : null}
    <QuestionPreviewDialog questionId={previewId} onOpenChange={(open) => !open && setPreviewId(null)} />
    <AlertDialog open={removing != null} onOpenChange={(open) => !open && setRemoving(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa phần “{removingTitle || "không tên"}”?</AlertDialogTitle>
          <AlertDialogDescription>Mọi câu cố định và quy tắc trong phần này cũng bị bỏ khỏi đề. Câu hỏi trong ngân hàng không bị ảnh hưởng.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => removing && removeSection(removing)}>Xóa phần</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </EditorSection>;
}
