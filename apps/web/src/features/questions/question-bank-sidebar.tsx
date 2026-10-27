import { useState } from "react";
import { Library, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Course, QuestionBank } from "@/types/api";
import { BankCreateDialog } from "./bank-create-dialog";

const ALL_COURSES = "all";

/** Gom ngân hàng theo học phần (giữ thứ tự xuất hiện) — mỗi nhóm là một mục nav có tiêu đề xám. */
function groupByCourse(banks: QuestionBank[]) {
  const groups = new Map<string, QuestionBank[]>();
  for (const bank of banks) {
    const key = bank.course_name ?? "Ngân hàng cá nhân";
    groups.set(key, [...(groups.get(key) ?? []), bank]);
  }
  return [...groups.entries()];
}

/**
 * Cột trái kiểu ClassroomIO: chọn học phần, danh sách ngân hàng dạng mục nav (tên + số câu đã biết),
 * mục đang chọn nền `bg-accent`; nút “+” tạo ngân hàng trong học phần đang chọn.
 */
export function QuestionBankSidebar(props: {
  courses: Course[]; banks: QuestionBank[]; courseId: number | null; bankId: number | null; counts: Record<number, number>;
  canCreate: boolean; coursesLoading: boolean; banksLoading: boolean;
  onCourseChange: (id: number | null) => void; onBankChange: (id: number) => void;
  onBankCreated: (bank: QuestionBank) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const visibleBanks = props.banks.filter((bank) => props.courseId == null || bank.course_id === props.courseId);
  const course = props.courses.find((item) => item.id === props.courseId);

  return <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start" aria-label="Chọn ngân hàng câu hỏi">
    <div className="space-y-1.5">
      <label htmlFor="question-course" className="px-2 text-xs text-muted-foreground">Học phần</label>
      <Select value={props.courseId != null ? String(props.courseId) : ALL_COURSES} disabled={props.coursesLoading}
        onValueChange={(value) => props.onCourseChange(value === ALL_COURSES ? null : Number(value))}>
        <SelectTrigger id="question-course" className="w-full"><SelectValue placeholder="Đang tải học phần…" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_COURSES}>Tất cả học phần</SelectItem>
          {props.courses.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.code} · {item.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>

    <nav aria-label="Ngân hàng" className="space-y-4">
      <div className="flex h-7 items-center justify-between pl-2">
        <span className="text-xs text-muted-foreground">Ngân hàng</span>
        {props.canCreate ? <Button type="button" size="icon-sm" variant="ghost" className="text-muted-foreground" disabled={!course}
          onClick={() => setCreateOpen(true)} aria-label="Tạo ngân hàng" title={course ? "Tạo ngân hàng" : "Chọn học phần để tạo ngân hàng"}>
          <Plus aria-hidden /></Button> : null}
      </div>
      {props.banksLoading ? <div aria-busy="true" aria-label="Đang tải" className="space-y-2 px-2">
        <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" />
      </div> : visibleBanks.length ? groupByCourse(visibleBanks).map(([group, banks]) => <div key={group} className="space-y-0.5">
        {props.courseId == null ? <p className="truncate px-2 pb-1 text-xs text-muted-foreground/80">{group}</p> : null}
        <ul className="space-y-0.5">
          {banks.map((bank) => {
            const active = bank.id === props.bankId;
            const count = props.counts[bank.id];
            return <li key={bank.id}>
              <button type="button" aria-current={active ? "page" : undefined} onClick={() => props.onBankChange(bank.id)}
                className={cn("flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-accent font-medium text-foreground" : "text-secondary-foreground hover:bg-secondary")}>
                <Library className={cn("size-4 shrink-0", active ? "text-foreground" : "text-muted-foreground")} strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{bank.name}</span>
                {bank.visibility === "private" ? <Lock className="size-3 shrink-0 text-muted-foreground" aria-label="Riêng tư" /> : null}
                {count != null ? <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{count}</span> : null}
              </button>
            </li>;
          })}
        </ul>
      </div>) : <p className="px-2 text-sm text-muted-foreground">
        {props.courseId == null ? "Chưa có ngân hàng nào." : "Học phần này chưa có ngân hàng."}
        {props.canCreate && course ? <Button type="button" variant="link" size="xs" className="ml-1 h-auto px-0 text-sm" onClick={() => setCreateOpen(true)}>Tạo ngân hàng</Button> : null}
      </p>}
    </nav>
    {createOpen && course ? <BankCreateDialog course={course} onClose={() => setCreateOpen(false)} onCreated={props.onBankCreated} /> : null}
  </aside>;
}
