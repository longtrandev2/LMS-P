import { Input } from "@/components/ui/input";
import { RadioCards, SwitchRow } from "./option-cards";
import { EditorSection, Field, fieldAria } from "./editor-layout";
import { SCORE_POLICY_OPTIONS } from "./labels";
import { isExamCategory } from "@/features/exams/shared/exam-labels";
import type { EditorForm, FieldErrors } from "./editor-model";

const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function EditorScheduleSection({ form, patch, errors, published }: {
  form: EditorForm; patch: (next: Partial<EditorForm>) => void; errors: FieldErrors; published: boolean;
}) {
  const singleAttempt = form.attemptsLimited && form.maxAttempts.trim() === "1";
  const exam = isExamCategory(form.category);
  return <EditorSection id="schedule" title={exam ? "Lịch thi" : "Lịch & lượt"}
    description={exam ? `Sinh viên bắt đầu làm trong khung giờ này, mỗi người một lượt. Giờ theo máy bạn (${zone}).`
      : `Giờ hiển thị và nhập theo giờ địa phương của máy bạn (${zone}).`}>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <SwitchRow id="use-available-from" label={exam ? "Hẹn giờ mở thi" : "Hẹn giờ mở bài"} description="Tắt: mở ngay khi xuất bản."
          checked={form.useAvailableFrom} onChange={(useAvailableFrom) => patch({ useAvailableFrom })} />
        {form.useAvailableFrom ? <Field id="available-from" label="Mở lúc" error={errors.availableFrom}>
          <Input {...fieldAria("available-from", errors.availableFrom)} type="datetime-local" value={form.availableFrom}
            onChange={(event) => patch({ availableFrom: event.target.value })} />
        </Field> : null}
      </div>
      <Field id="due-at" label={exam ? "Đóng lúc" : "Hạn nộp"} error={errors.dueAt}
        hint={exam ? "Sau giờ này không bắt đầu được nữa; phiên đang làm cũng tự nộp." : undefined}>
        <Input {...fieldAria("due-at", errors.dueAt, exam)} type="datetime-local" value={form.dueAt}
          onChange={(event) => patch({ dueAt: event.target.value })} />
      </Field>
    </div>

    {exam ? null : <div className="space-y-4 border-t pt-5">
      <SwitchRow id="allow-late" label="Cho phép nộp muộn" description="Bài nộp sau hạn bị trừ điểm theo phần trăm."
        checked={form.allowLate} onChange={(allowLate) => patch({ allowLate })} />
      {form.allowLate ? <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field id="late-due-at" label="Hạn nộp muộn" error={errors.lateDueAt}>
          <Input {...fieldAria("late-due-at", errors.lateDueAt)} type="datetime-local" value={form.lateDueAt}
            onChange={(event) => patch({ lateDueAt: event.target.value })} />
        </Field>
        <Field id="late-penalty" label="Mức phạt" error={errors.latePenalty}>
          <div className="relative">
            <Input {...fieldAria("late-penalty", errors.latePenalty)} type="number" inputMode="decimal" min={0} max={100} step={1}
              className="pr-8 tabular-nums" value={form.latePenalty} onChange={(event) => patch({ latePenalty: event.target.value })} />
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-sm text-muted-foreground">%</span>
          </div>
        </Field>
      </div> : null}
    </div>}

    {exam ? null : published ? <p className="border-t pt-5 text-sm text-muted-foreground">
      Số lượt: <span className="font-medium text-foreground">{form.attemptsLimited ? form.maxAttempts : "không giới hạn"}</span>
      {" · "}Cách tính điểm: <span className="font-medium text-foreground">{SCORE_POLICY_OPTIONS.find((o) => o.id === form.scorePolicy)?.label}</span>
      {" "}(đã khóa sau khi xuất bản)
    </p> : <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-sm font-medium">Số lượt nộp</p>
        <RadioCards label="Số lượt nộp" value={form.attemptsLimited ? "limited" : "unlimited"}
          onChange={(value) => patch({ attemptsLimited: value === "limited" })}
          options={[{ id: "unlimited", label: "Không giới hạn" }, { id: "limited", label: "Giới hạn" }]} />
        {form.attemptsLimited ? <Field id="max-attempts" label="Số lượt tối đa" error={errors.maxAttempts}
          hint={form.category === "quiz" ? "Mỗi lượt là một lần làm trọn đề." : "Tính riêng cho từng câu."}>
          <Input {...fieldAria("max-attempts", errors.maxAttempts, true)} type="number" inputMode="numeric" min={1} max={100}
            className="w-32 tabular-nums" value={form.maxAttempts} onChange={(event) => patch({ maxAttempts: event.target.value })} />
        </Field> : null}
      </div>
      {singleAttempt ? null : <div className="space-y-2">
        <p className="text-sm font-medium">Cách tính điểm</p>
        <RadioCards label="Cách tính điểm" value={form.scorePolicy} onChange={(scorePolicy) => patch({ scorePolicy })}
          options={SCORE_POLICY_OPTIONS} columns={2} />
      </div>}
    </div>}
  </EditorSection>;
}
