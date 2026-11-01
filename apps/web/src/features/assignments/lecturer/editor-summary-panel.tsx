import { Link } from "react-router-dom";
import { CalendarClock, Eye, Hourglass, ListOrdered, RotateCcw, Shuffle, Sigma, Timer, Users, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaperSummaryList } from "@/features/exams/lecturer/blueprint/paper-summary";
import { hasBlueprint, isExamCategory, minutesLabel, paperModeLabel } from "@/features/exams/shared/exam-labels";
import { CATEGORY_ICON, SCORE_POLICY_OPTIONS, categoryLabel, formatPoints } from "./labels";
import { totalPoints, type EditorForm, type EditorMode } from "./editor-model";
import type { AssignmentDetails } from "@/types/api";

/** `datetime-local` ("2026-11-06T23:59") → "06/11/2026 23:59". */
function localLabel(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}` : null;
}

function Line({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return <li className="flex items-start gap-2.5">
    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
    <span className="min-w-0">{children}</span>
  </li>;
}

function navSections(form: EditorForm, mode: EditorMode) {
  const blueprint = hasBlueprint(form.category);
  const exam = isExamCategory(form.category);
  return [
    { id: "info", label: "Thông tin" },
    ...(blueprint ? [{ id: "delivery", label: "Thời gian & cách giao đề" }] : []),
    { id: "questions", label: blueprint ? "Cấu trúc đề" : "Câu hỏi" },
    { id: "schedule", label: exam ? "Lịch thi" : "Lịch & lượt" },
    { id: "review", label: "Xem lại & trộn đề" },
    ...(mode === "create" ? [{ id: "classes", label: "Giao cho lớp" }] : []),
    ...(mode === "published" ? [{ id: "reason", label: "Lý do điều chỉnh" }] : []),
  ];
}

/**
 * Panel phụ bên phải trang soạn (DESIGN.md §4, kiểu thẻ "Manage Batch" Frappe): tóm tắt đề (từng mã đề với bài có
 * cấu trúc đề) + nút lưu + "Xem trước đề", dưới là mục lục nhảy tới từng section.
 */
export function EditorSummaryPanel({ form, mode, actions, details, previewHref, dirty }: {
  form: EditorForm; mode: EditorMode; actions: React.ReactNode; details: AssignmentDetails | null; previewHref: string | null; dirty: boolean;
}) {
  const Icon = CATEGORY_ICON[form.category];
  const blueprint = hasBlueprint(form.category);
  const exam = isExamCategory(form.category);
  const due = localLabel(form.dueAt);
  const from = form.useAvailableFrom ? localLabel(form.availableFrom) : null;
  const late = form.allowLate && !exam ? localLabel(form.lateDueAt) : null;
  const policy = SCORE_POLICY_OPTIONS.find((option) => option.id === form.scorePolicy)?.label;
  const attempts = form.attemptsLimited ? `${form.maxAttempts || "?"} lượt` : "Không giới hạn lượt";
  const limit = minutesLabel(Number(form.timeLimit) || null);

  return <aside aria-label="Tóm tắt bài" className="space-y-6 lg:sticky lg:top-32 lg:self-start">
    <div className="space-y-4 rounded-xl border p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Tóm tắt</p>
        {mode === "published" ? <Badge variant="success">Đã xuất bản</Badge> : <Badge>{mode === "create" ? "Bài mới" : "Nháp"}</Badge>}
      </div>
      <ul className="space-y-2.5 text-sm tabular-nums" aria-live="polite">
        <Line icon={Icon}>{categoryLabel(form.category)}</Line>
        {blueprint ? <>
          <Line icon={Timer}>{limit ?? <span className="text-muted-foreground">Không giới hạn thời gian</span>}</Line>
          <Line icon={Shuffle}>{paperModeLabel(form.paperMode, Number(form.variantCount) || null)}</Line>
          <PaperSummaryList form={form} details={details} />
        </> : <>
          <Line icon={ListOrdered}>{form.questions.length} câu hỏi</Line>
          <Line icon={Sigma}>{formatPoints(totalPoints(form.questions))} điểm</Line>
        </>}
        {from && exam ? <Line icon={CalendarClock}>Mở {from}</Line> : null}
        <Line icon={CalendarClock}>{due ? `${exam ? "Đóng" : "Hạn"} ${due}` : <span className="text-muted-foreground">Chưa đặt hạn</span>}</Line>
        {late ? <Line icon={Hourglass}>Muộn đến {late}{form.latePenalty ? ` (−${form.latePenalty}%)` : ""}</Line> : null}
        {exam ? null : <Line icon={RotateCcw}>{attempts}{form.attemptsLimited && form.maxAttempts.trim() === "1" ? "" : ` · ${policy}`}</Line>}
        {mode === "create" ? <Line icon={Users}>Giao cho {form.classIds.length} lớp</Line> : null}
      </ul>
      <div className="grid gap-2">
        {actions}
        {previewHref ? <Button asChild variant="outline" className="w-full"><Link to={previewHref}><Eye aria-hidden />Xem trước đề</Link></Button> : null}
        {previewHref && dirty ? <p className="text-xs text-muted-foreground">Xem trước theo bản đã lưu gần nhất.</p> : null}
      </div>
    </div>
    <nav aria-label="Các mục" className="hidden px-1 lg:block">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Trên trang này</p>
      <ul className="space-y-1 text-sm">
        {navSections(form, mode).map((section) => <li key={section.id}>
          <a href={`#${section.id}`} className="block rounded-sm text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">{section.label}</a>
        </li>)}
      </ul>
    </nav>
  </aside>;
}
