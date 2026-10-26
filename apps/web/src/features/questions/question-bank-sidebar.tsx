import { useState } from "react";
import { Check, LibraryBig, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/state-blocks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { cn } from "@/lib/utils";
import type { Course, QuestionBank } from "@/types/api";

const ALL_COURSES = "all";

export function QuestionBankSidebar(props: {
  courses: Course[]; banks: QuestionBank[]; courseId: number | null; bankId: number | null;
  canCreate: boolean; coursesLoading: boolean; banksLoading: boolean;
  onCourseChange: (id: number | null) => void; onBankChange: (id: number) => void;
  onBankCreated: (bank: QuestionBank) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "shared">("private");
  const [busy, setBusy] = useState(false);
  const visibleBanks = props.banks.filter((bank) => props.courseId == null || bank.course_id === props.courseId);

  async function createBank(event: React.FormEvent) {
    event.preventDefault();
    if (props.courseId == null) return;
    setBusy(true);
    try {
      const bank = await api.post<QuestionBank>("/question-banks", { course_id: props.courseId, name: name.trim(), visibility });
      props.onBankCreated(bank); setCreateOpen(false); setName(""); setVisibility("private");
      toast.success("Đã tạo ngân hàng câu hỏi.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }

  return <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
    <div className="space-y-2">
      <Label htmlFor="question-course">Học phần</Label>
      <Select value={props.courseId != null ? String(props.courseId) : ALL_COURSES} disabled={props.coursesLoading}
        onValueChange={(value) => props.onCourseChange(value === ALL_COURSES ? null : Number(value))}>
        <SelectTrigger id="question-course" className="w-full"><SelectValue placeholder="Đang tải học phần…" /></SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={ALL_COURSES}>Tất cả học phần</SelectItem>
          {props.courses.map((course) => <SelectItem key={course.id} value={String(course.id)}>{course.code} · {course.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="question-banks-title">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex items-center gap-2"><LibraryBig className="size-4 text-muted-foreground" aria-hidden /><h2 id="question-banks-title" className="text-sm font-semibold">Ngân hàng</h2><Badge variant="secondary" className="tabular-nums">{visibleBanks.length}</Badge></div>
        {props.canCreate ? <Button type="button" size="icon-sm" variant="ghost" disabled={props.courseId == null} onClick={() => setCreateOpen(true)}
          aria-label="Tạo ngân hàng" title={props.courseId == null ? "Chọn học phần để tạo ngân hàng" : "Tạo ngân hàng"}><Plus aria-hidden /></Button> : null}
      </div>
      {props.banksLoading ? <div aria-busy="true" aria-label="Đang tải" className="space-y-2 p-3"><Skeleton className="h-14 rounded-lg" /><Skeleton className="h-14 rounded-lg" /></div> : visibleBanks.length ? <div className="max-h-[min(55dvh,620px)] space-y-1 overflow-y-auto p-2">
        {visibleBanks.map((bank) => {
          const active = bank.id === props.bankId;
          return <button key={bank.id} type="button" aria-pressed={active} onClick={() => props.onBankChange(bank.id)}
            className={cn("w-full rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "border-border bg-accent" : "border-transparent hover:bg-muted/60")}>
            <span className="flex items-start justify-between gap-2"><span className="min-w-0 truncate text-sm font-medium">{bank.name}</span>{active ? <Check className="size-4 shrink-0 text-foreground" aria-hidden /> : null}</span>
            <span className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{bank.course_name ?? "Ngân hàng cá nhân"}</span>
              <span className="shrink-0">{bank.visibility === "shared" ? "Đã chia sẻ" : "Riêng tư"}{bank.can_edit ? "" : " · chỉ xem"}</span>
            </span>
          </button>;
        })}
      </div> : <EmptyState compact icon={LibraryBig} title="Chưa có ngân hàng"
        description={props.courseId == null ? "Chọn học phần để xem hoặc tạo ngân hàng." : "Tạo ngân hàng đầu tiên cho học phần này."}
        action={props.canCreate && props.courseId != null ? <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}><Plus aria-hidden /> Tạo ngân hàng</Button> : undefined} />}
    </section>
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent>
      <DialogHeader><DialogTitle>Tạo ngân hàng câu hỏi</DialogTitle><DialogDescription>Ngân hàng thuộc học phần đang chọn. Có thể chia sẻ với giảng viên khác sau khi tạo.</DialogDescription></DialogHeader>
      <form onSubmit={createBank} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="question-bank-name">Tên ngân hàng</Label><Input id="question-bank-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Chương 1 – Socket TCP" required /></div>
        <div className="space-y-2"><Label htmlFor="question-bank-visibility">Phạm vi ban đầu</Label>
          <Select value={visibility} onValueChange={(value) => setVisibility(value as "private" | "shared")}>
            <SelectTrigger id="question-bank-visibility" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent position="popper"><SelectItem value="private">Riêng tư</SelectItem><SelectItem value="shared">Chia sẻ cho giảng viên cùng học phần</SelectItem></SelectContent>
          </Select>
        </div>
        <DialogFooter><Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Hủy</Button><Button disabled={busy || !name.trim()}>{busy ? "Đang tạo…" : "Tạo ngân hàng"}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </aside>;
}
