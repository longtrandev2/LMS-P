import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssignmentEditorHeader } from "./assignment-editor-header";
import { EditorClassesSection } from "./editor-classes-section";
import { EditorInfoSection } from "./editor-info-section";
import { EditorQuestionsSection } from "./editor-questions-section";
import { EditorReviewSection, PublishedReasonSection } from "./editor-review-section";
import { EditorScheduleSection } from "./editor-schedule-section";
import { EditorSummaryPanel } from "./editor-summary-panel";
import { initialForm, validate, type EditorForm, type EditorMode } from "./editor-model";
import { LeaveConfirmDialog } from "./leave-confirm-dialog";
import { plainExcerpt } from "./labels";
import { PublishConflictDialog } from "./publish-conflict-dialog";
import { useSaveAssignment, type SaveAction } from "./use-save-assignment";
import { useUnsavedGuard } from "./use-unsaved-guard";
import { DeliverySection } from "@/features/exams/lecturer/delivery-section";
import { StructureSection } from "@/features/exams/lecturer/blueprint/structure-section";
import { hasBlueprint, isExamCategory } from "@/features/exams/shared/exam-labels";
import type { AssignmentCategory, AssignmentDetails } from "@/types/api";

function focusFirstError() {
  window.setTimeout(() => {
    const target = document.querySelector<HTMLElement>("[aria-invalid='true'], [data-editor-error]");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  }, 0);
}

/** Form soạn đề (trang riêng) — docs/assessment-spec.md §6, §8. */
export function AssignmentEditorForm({ classId, details, title, classLabel, badges, initialCategory }: {
  classId: number; details: AssignmentDetails | null; title: string; classLabel: string; badges?: React.ReactNode;
  initialCategory?: AssignmentCategory;
}) {
  const navigate = useNavigate();
  const mode: EditorMode = !details ? "create" : details.assignment.is_published ? "published" : "draft";
  const published = mode === "published";
  const [form, setForm] = useState<EditorForm>(() => initialForm(details, classId, initialCategory));
  const [baseline, setBaseline] = useState(() => JSON.stringify(form));
  const [attempt, setAttempt] = useState<SaveAction | null>(null);
  const dirty = JSON.stringify(form) !== baseline;
  const guard = useUnsavedGuard(dirty);
  const classPath = `/classes/${classId}?tab=${isExamCategory(details?.assignment.category ?? initialCategory ?? "assignment") ? "exams" : "assignments"}`;
  const blueprint = hasBlueprint(form.category);
  const assignmentId = details?.assignment.id ?? null;
  const errors = attempt ? validate(form, mode, attempt === "publish") : {};
  const patch = (next: Partial<EditorForm>) => setForm((current) => ({ ...current, ...next }));

  const saver = useSaveAssignment({
    mode, assignmentId, onDraftPersisted: (saved) => setBaseline(JSON.stringify(saved)),
    onSaved: (action, created) => {
      setBaseline(JSON.stringify(form));
      setAttempt(null);
      if (mode === "create" && action === "draft" && created?.length) {
        const own = created.find((item) => item.assignment.class_id === classId) ?? created[0];
        navigate(`/classes/${own.assignment.class_id}/assignments/${own.assignment.id}/edit`, { replace: true });
      } else if (action === "publish" || published) {
        navigate(classPath);
      } else {
        patch({ reason: "" });
      }
    },
  });

  function submit(action: SaveAction) {
    setAttempt(action);
    const found = validate(form, mode, action === "publish");
    if (Object.keys(found).length) {
      toast.error("Kiểm tra lại các mục được đánh dấu.");
      focusFirstError();
      return;
    }
    void saver.save(form, action);
  }

  const contentOf = (id: number) => {
    const question = form.questions.find((q) => q.question_id === id);
    return question ? `Câu ${form.questions.indexOf(question) + 1}: ${plainExcerpt(question.content, 80)}` : `Câu hỏi #${id}`;
  };

  const busy = saver.saving != null;
  const saveButtons = (block: boolean) => published
    ? <Button type="button" className={block ? "w-full" : undefined} disabled={busy} onClick={() => submit("draft")}>{saver.saving ? "Đang lưu…" : "Lưu điều chỉnh"}</Button>
    : block ? <>
      <Button type="button" className="w-full" disabled={busy} onClick={() => submit("publish")}>{saver.saving === "publish" ? "Đang xuất bản…" : "Lưu & xuất bản"}</Button>
      <Button type="button" variant="secondary" className="w-full" disabled={busy} onClick={() => submit("draft")}>{saver.saving === "draft" ? "Đang lưu…" : "Lưu nháp"}</Button>
    </> : <>
      <Button type="button" variant="secondary" disabled={busy} onClick={() => submit("draft")}>{saver.saving === "draft" ? "Đang lưu…" : "Lưu nháp"}</Button>
      <Button type="button" disabled={busy} onClick={() => submit("publish")}>{saver.saving === "publish" ? "Đang xuất bản…" : "Lưu & xuất bản"}</Button>
    </>;

  return <form className="pb-16" noValidate onSubmit={(event) => event.preventDefault()}>
    <AssignmentEditorHeader backHref={classPath} backLabel={classLabel} title={title} badges={badges} dirty={dirty} isNew={mode === "create"}>
      {saveButtons(false)}
    </AssignmentEditorHeader>
    <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-8 pt-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        {published ? <p className="mb-8 flex gap-2.5 rounded-lg bg-info/8 px-4 py-3 text-sm text-info">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {blueprint ? "Bài đã xuất bản: chỉ sửa được thông tin, lịch, quy chế và chính sách xem lại. Thời lượng, chế độ giao đề, cấu trúc đề, điểm và trộn đề đã khóa."
            : "Bài đã xuất bản: chỉ sửa được thông tin, lịch, nộp muộn và chính sách xem lại. Câu hỏi, điểm, số lượt và trộn đề đã khóa."}
        </p> : null}
        <div className="divide-y [&>section:first-child]:pt-0">
          <EditorInfoSection form={form} patch={patch} errors={errors} published={published} />
          {blueprint ? <DeliverySection form={form} patch={patch} errors={errors} published={published} /> : null}
          <div data-editor-error={errors.questions ? true : undefined} tabIndex={-1} className="outline-none">
            {blueprint ? <StructureSection classId={classId} form={form} patch={patch} errors={errors} locked={published}
              quiz={form.category === "quiz"} details={details} issue={saver.issue} />
              : <EditorQuestionsSection classId={classId} form={form} patch={patch} errors={errors} locked={published} />}
          </div>
          <EditorScheduleSection form={form} patch={patch} errors={errors} published={published} />
          <EditorReviewSection form={form} patch={patch} published={published} />
          {mode === "create" ? <EditorClassesSection classId={classId} value={form.classIds} error={errors.classIds}
            onChange={(classIds) => patch({ classIds })} /> : null}
          {published ? <PublishedReasonSection form={form} patch={patch} errors={errors} /> : null}
        </div>
      </div>
      <EditorSummaryPanel form={form} mode={mode} actions={saveButtons(true)} details={details} dirty={dirty}
        previewHref={blueprint && assignmentId != null ? `/classes/${classId}/assignments/${assignmentId}/papers` : null} />
    </div>

    <PublishConflictDialog conflict={saver.conflict} busy={saver.saving != null} questionLabel={contentOf}
      onCancel={saver.dismissConflict} onConfirm={saver.confirmUnverified} />
    <LeaveConfirmDialog open={guard.pendingHref != null} onCancel={guard.cancelLeave} onConfirm={guard.confirmLeave} />
  </form>;
}
