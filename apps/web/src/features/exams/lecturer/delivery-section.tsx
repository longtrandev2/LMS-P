import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownView } from "@/components/markdown-view";
import { EditorSection, Field, fieldAria } from "@/features/assignments/lecturer/editor-layout";
import { RadioCards } from "@/features/assignments/lecturer/option-cards";
import { PAPER_MODE_OPTIONS, isExamCategory } from "@/features/exams/shared/exam-labels";
import type { AssignmentCategory } from "@/types/api";
import type { PaperMode } from "@/types/exams";

export interface DeliveryForm { category: AssignmentCategory; timeLimit: string; paperMode: PaperMode; variantCount: string; rulesText: string }

/** Mục "Thời gian & cách giao đề" (exam-spec.md §2, §8.2). Đã xuất bản: chỉ sửa được quy chế. */
export function DeliverySection({ form, patch, errors, published }: {
  form: DeliveryForm; patch: (next: Partial<DeliveryForm>) => void; errors: Record<string, string>; published: boolean;
}) {
  const exam = isExamCategory(form.category);
  return <EditorSection id="delivery" title="Thời gian & cách giao đề"
    description={exam ? "Kỳ thi làm theo phiên: đếm giờ từ lúc sinh viên bắt đầu, tự lưu và tự nộp khi hết giờ. Mỗi sinh viên làm một lượt."
      : "Quiz có thời lượng hoặc nhiều đề sẽ làm theo phiên (đếm giờ, tự lưu, tự nộp)."}>
    <Field id="time-limit" label={exam ? "Thời lượng làm bài" : "Thời lượng làm bài (tùy chọn)"} error={errors.timeLimit}
      hint={exam ? "Tính từ lúc sinh viên bấm Bắt đầu, không vượt quá giờ đóng." : "Để trống: không giới hạn thời gian."}>
      <div className="relative w-48">
        <Input {...fieldAria("time-limit", errors.timeLimit, true)} type="number" inputMode="numeric" min={1} max={600} disabled={published}
          className="pr-12 tabular-nums" value={form.timeLimit} placeholder={exam ? "45" : "Không giới hạn"} onChange={(e) => patch({ timeLimit: e.target.value })} />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-sm text-muted-foreground">phút</span>
      </div>
    </Field>
    <div className="space-y-2">
      <p className="text-sm font-medium">Chế độ giao đề</p>
      <RadioCards label="Chế độ giao đề" value={form.paperMode} onChange={(paperMode) => patch({ paperMode })}
        options={PAPER_MODE_OPTIONS} columns={3} disabled={published} />
      {published ? <p className="text-xs text-muted-foreground">Thời lượng và chế độ giao đề đã khóa sau khi xuất bản.</p> : null}
    </div>
    {form.paperMode === "variants" ? <Field id="variant-count" label="Số mã đề" error={errors.variantCount} hint="Từ 2 đến 20 mã; mã đề đánh số 101, 102…">
      <Input {...fieldAria("variant-count", errors.variantCount, true)} type="number" inputMode="numeric" min={2} max={20} disabled={published}
        className="w-24 tabular-nums" value={form.variantCount} onChange={(e) => patch({ variantCount: e.target.value })} />
    </Field> : null}
    {form.paperMode === "per_student" ? <p className="flex gap-2.5 rounded-lg bg-info/8 px-4 py-3 text-sm text-info">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      Đề của mỗi sinh viên được bốc từ quy tắc ngẫu nhiên khi bắt đầu làm. Kho nên lớn gấp đôi số câu cần bốc để đề ít trùng nhau.
    </p> : null}
    <div className="space-y-1.5">
      <Tabs defaultValue="write">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="rules-text" className="text-sm font-medium">Quy chế <span className="font-normal text-muted-foreground">· Markdown, tùy chọn</span></label>
          <TabsList className="h-7">
            <TabsTrigger value="write" className="px-2.5 text-xs">Soạn</TabsTrigger>
            <TabsTrigger value="preview" className="px-2.5 text-xs">Xem trước</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="write" className="mt-2">
          <Textarea {...fieldAria("rules-text", errors.rulesText, true)} rows={4} value={form.rulesText} maxLength={10000}
            placeholder={"- Không dùng tài liệu.\n- Rời khỏi trang làm bài sẽ được ghi lại."} onChange={(e) => patch({ rulesText: e.target.value })} />
        </TabsContent>
        <TabsContent value="preview" className="mt-2">
          <div className="min-h-24 rounded-md bg-secondary/50 px-3 py-2">
            {form.rulesText.trim() ? <MarkdownView source={form.rulesText} /> : <p className="text-sm text-muted-foreground">Chưa có quy chế.</p>}
          </div>
        </TabsContent>
      </Tabs>
      {errors.rulesText ? <p id="rules-text-error" role="alert" className="text-xs text-destructive">{errors.rulesText}</p>
        : <p id="rules-text-hint" className="text-xs text-muted-foreground">Có nội dung thì sinh viên phải tick xác nhận đã đọc trước khi bắt đầu.</p>}
    </div>
  </EditorSection>;
}
