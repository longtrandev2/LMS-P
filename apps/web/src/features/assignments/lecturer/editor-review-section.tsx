import { Textarea } from "@/components/ui/textarea";
import { RadioCards, SwitchRow } from "./option-cards";
import { EditorSection, Field, fieldAria } from "./editor-layout";
import { REVIEW_MODE_OPTIONS } from "./labels";
import type { EditorForm, FieldErrors } from "./editor-model";

export function EditorReviewSection({ form, patch, published }: {
  form: EditorForm; patch: (next: Partial<EditorForm>) => void; published: boolean;
}) {
  return <EditorSection id="review" title="Xem lại & trộn đề"
    description="Khi nào sinh viên được xem lại bài làm, và có trộn thứ tự câu/lựa chọn hay không.">
    <div className="space-y-2">
      <p className="text-sm font-medium">Cho xem lại</p>
      <RadioCards label="Cho xem lại" value={form.reviewMode} onChange={(reviewMode) => patch({ reviewMode })}
        options={REVIEW_MODE_OPTIONS} columns={3} />
      <p className="text-xs text-muted-foreground">Bài lập trình luôn hiện verdict và kết quả test mẫu ngay sau khi chấm.</p>
    </div>
    <SwitchRow id="review-shows-answers" label="Hiện đáp án đúng và giải thích khi xem lại"
      description={form.reviewMode === "never" ? "Không có tác dụng khi không cho xem lại." : "Tắt: chỉ hiện điểm từng câu và câu trả lời của sinh viên."}
      checked={form.reviewShowsAnswers} onChange={(reviewShowsAnswers) => patch({ reviewShowsAnswers })}
      disabled={form.reviewMode === "never"} />
    <div className="space-y-4 border-t pt-5">
      <SwitchRow id="shuffle-questions" label="Trộn thứ tự câu hỏi" description={form.category === "assignment" ? "Mỗi sinh viên thấy một thứ tự riêng, cố định theo lượt." : "Mỗi sinh viên thấy thứ tự riêng; chỉ trộn trong cùng một phần."}
        checked={form.shuffleQuestions} onChange={(shuffleQuestions) => patch({ shuffleQuestions })} disabled={published} />
      <SwitchRow id="shuffle-options" label="Trộn thứ tự lựa chọn" description="Chỉ áp dụng cho câu một đáp án và nhiều đáp án."
        checked={form.shuffleOptions} onChange={(shuffleOptions) => patch({ shuffleOptions })} disabled={published} />
      {published ? <p className="text-xs text-muted-foreground">Cài đặt trộn đề đã khóa sau khi xuất bản.</p> : null}
    </div>
  </EditorSection>;
}

/** Lý do điều chỉnh bắt buộc khi sửa bài đã xuất bản (ghi audit). */
export function PublishedReasonSection({ form, patch, errors }: {
  form: EditorForm; patch: (next: Partial<EditorForm>) => void; errors: FieldErrors;
}) {
  return <EditorSection id="reason" title="Lý do điều chỉnh" description="Bắt buộc với bài đã xuất bản — lưu vào lịch sử thay đổi.">
    <Field id="change-reason" label="Lý do" error={errors.reason}>
      <Textarea {...fieldAria("change-reason", errors.reason)} rows={2} maxLength={500} value={form.reason}
        placeholder="Ví dụ: gia hạn do sự cố hệ thống" onChange={(event) => patch({ reason: event.target.value })} />
    </Field>
  </EditorSection>;
}
