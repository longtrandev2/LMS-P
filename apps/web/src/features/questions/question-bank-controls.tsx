import { useState } from "react";
import { BookOpen, Check, FolderPlus, LibraryBig, Plus, Share2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuestionBankSharingDialog } from "@/features/questions/question-bank-sharing-dialog";
import { QuestionCsvImportDialog } from "@/features/questions/question-csv-import-dialog";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { Course, QuestionBank, QuestionCategory } from "@/types/api";

type SharedProps = {
  courses: Course[]; banks: QuestionBank[]; courseId: number | null; bankId: number | null;
  canCreate: boolean; coursesLoading: boolean; banksLoading: boolean;
  onCourseChange: (id: number | null) => void; onBankChange: (id: number) => void;
  onBankCreated: (bank: QuestionBank) => void; onChanged: () => void;
};

export function QuestionBankSidebar(props: SharedProps) {
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
      props.onBankCreated(bank); props.onChanged(); setCreateOpen(false); setName(""); setVisibility("private");
      toast.success("Đã tạo ngân hàng câu hỏi.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }

  return <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
    <section className="space-y-3 rounded-xl border bg-card p-4" aria-labelledby="question-course-title">
      <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><BookOpen className="size-4" aria-hidden /></span><div><h2 id="question-course-title" className="text-sm font-semibold">Học phần</h2><p className="text-xs text-muted-foreground">Lọc ngân hàng theo môn học</p></div></div>
      <select value={props.courseId ?? ""} onChange={(event) => props.onCourseChange(event.target.value ? Number(event.target.value) : null)} aria-label="Chọn học phần" disabled={props.coursesLoading} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring">
        <option value="">{props.coursesLoading ? "Đang tải học phần…" : "Tất cả học phần"}</option>{props.courses.map((course) => <option key={course.id} value={course.id}>{course.code} · {course.name}</option>)}
      </select>
    </section>
    <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="question-banks-title">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3"><div className="flex items-center gap-2"><LibraryBig className="size-4 text-primary" aria-hidden /><h2 id="question-banks-title" className="text-sm font-semibold">Ngân hàng</h2><span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{visibleBanks.length}</span></div>
        {props.canCreate ? <Button type="button" size="sm" variant="ghost" disabled={props.courseId == null} onClick={() => setCreateOpen(true)} aria-label="Tạo ngân hàng"><Plus aria-hidden /></Button> : null}
      </div>
      {props.banksLoading ? <div className="space-y-2 p-3"><div className="h-14 animate-pulse rounded-lg bg-muted" /><div className="h-14 animate-pulse rounded-lg bg-muted" /></div> : visibleBanks.length ? <div className="max-h-[min(55dvh,620px)] space-y-1 overflow-y-auto p-2">
        {visibleBanks.map((bank) => <button key={bank.id} type="button" aria-pressed={bank.id === props.bankId} onClick={() => props.onBankChange(bank.id)} className={`w-full rounded-lg border p-3 text-left transition-colors ${bank.id === props.bankId ? "border-primary/50 bg-primary/10" : "border-transparent hover:border-border hover:bg-muted/60"}`}>
          <span className="flex items-start justify-between gap-2"><span className="min-w-0 truncate text-sm font-medium">{bank.name}</span>{bank.id === props.bankId ? <Check className="size-4 shrink-0 text-primary" aria-hidden /> : null}</span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">{bank.course_name ?? "Ngân hàng cá nhân"}</span>
          <span className="mt-2 inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{bank.visibility === "shared" ? "Đã chia sẻ" : "Riêng tư"}</span>
        </button>)}
      </div> : <div className="px-4 py-8 text-center"><p className="text-sm font-medium">Chưa có ngân hàng</p><p className="mt-1 text-xs text-muted-foreground">{props.courseId == null ? "Chọn học phần để xem hoặc tạo ngân hàng." : "Tạo ngân hàng đầu tiên cho học phần này."}</p>{props.canCreate && props.courseId != null ? <Button className="mt-3" size="sm" onClick={() => setCreateOpen(true)}><Plus aria-hidden /> Tạo ngân hàng</Button> : null}</div>}
    </section>
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent>
      <DialogHeader><DialogTitle className="font-heading">Tạo ngân hàng câu hỏi</DialogTitle><DialogDescription>Ngân hàng này sẽ thuộc học phần đang chọn. Bạn có thể chia sẻ với giảng viên khác sau khi tạo.</DialogDescription></DialogHeader>
      <form onSubmit={createBank} className="space-y-4"><div className="space-y-2"><Label htmlFor="question-bank-name">Tên ngân hàng</Label><Input id="question-bank-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Chương 1 – Cơ sở dữ liệu" required /></div>
        <div className="space-y-2"><Label htmlFor="question-bank-visibility">Phạm vi ban đầu</Label><select id="question-bank-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as "private" | "shared")} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="private">Riêng tư</option><option value="shared">Chia sẻ cho giảng viên cùng học phần</option></select></div>
        <DialogFooter><Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Hủy</Button><Button disabled={busy || !name.trim()}>{busy ? "Đang tạo…" : "Tạo ngân hàng"}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </aside>;
}

type ToolbarProps = {
  bank: QuestionBank | undefined; categories: QuestionCategory[]; categoryId: number | null;
  categoriesLoading: boolean; canAuthor: boolean; onCategoryChange: (id: number | null) => void;
  onCategoryCreated: (category: QuestionCategory) => void; onChanged: () => void;
};

export function QuestionBankToolbar(props: ToolbarProps) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [sharingOpen, setSharingOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<{ bankId: number; categoryId: number } | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const bank = props.bank;
  const canEdit = props.canAuthor && !!bank?.can_edit;

  async function createCategory(event: React.FormEvent) {
    event.preventDefault(); if (!bank) return; setBusy(true);
    try {
      const category = await api.post<QuestionCategory>(`/question-banks/${bank.id}/categories`, { name: name.trim() });
      props.onCategoryCreated(category); props.onChanged(); setCategoryOpen(false); setName(""); toast.success("Đã tạo danh mục.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }

  function openImport() {
    if (!bank) return;
    const targetCategory = props.categoryId ?? props.categories.find((item) => item.name === "Chưa phân loại")?.id;
    if (targetCategory == null) { toast.error("Ngân hàng chưa có danh mục nhận câu hỏi."); return; }
    setImportTarget({ bankId: bank.id, categoryId: targetCategory });
  }

  return <section className="overflow-hidden rounded-xl border bg-card" aria-label="Công cụ ngân hàng câu hỏi">
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
      <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><LibraryBig className="size-5" aria-hidden /></span><div className="min-w-0"><h2 className="truncate text-base font-semibold">{bank?.name ?? "Chọn ngân hàng câu hỏi"}</h2><p className="truncate text-xs text-muted-foreground">{bank?.course_name ?? (bank ? "Ngân hàng cá nhân" : "Chọn một ngân hàng ở danh sách bên trái để xem câu hỏi.")}</p></div></div>
      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? <><Button type="button" variant="outline" size="sm" onClick={() => setCategoryOpen(true)} disabled={!bank}><FolderPlus aria-hidden /> Danh mục</Button><Button type="button" variant="secondary" size="sm" onClick={openImport} disabled={!bank || props.categoriesLoading}><Upload aria-hidden /> Nhập CSV</Button></> : null}
        {bank?.can_manage ? <Button type="button" variant="outline" size="sm" onClick={() => setSharingOpen(true)}><Share2 aria-hidden /> Chia sẻ</Button> : null}
      </div>
    </div>
    <div className="grid gap-3 border-t bg-muted/20 p-4 sm:grid-cols-[minmax(0,260px)_1fr] sm:items-center">
      <Label htmlFor="question-category-filter" className="text-xs text-muted-foreground">Lọc theo danh mục</Label>
      <select id="question-category-filter" value={props.categoryId ?? ""} onChange={(event) => props.onCategoryChange(event.target.value ? Number(event.target.value) : null)} disabled={!bank || props.categoriesLoading} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring">
        <option value="">{props.categoriesLoading ? "Đang tải danh mục…" : "Tất cả danh mục"}</option>{props.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </div>
    {categoryOpen && bank ? <Dialog open onOpenChange={setCategoryOpen}><DialogContent>
      <DialogHeader><DialogTitle className="font-heading">Thêm danh mục</DialogTitle><DialogDescription>Sắp xếp câu hỏi theo chương, chủ đề hoặc nội dung học tập.</DialogDescription></DialogHeader>
      <form onSubmit={createCategory} className="space-y-4"><div className="space-y-2"><Label htmlFor="question-category-name">Tên danh mục</Label><Input id="question-category-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} required /></div><DialogFooter><Button type="button" variant="ghost" onClick={() => setCategoryOpen(false)}>Hủy</Button><Button disabled={busy || !name.trim()}>{busy ? "Đang tạo…" : "Tạo danh mục"}</Button></DialogFooter></form>
    </DialogContent></Dialog> : null}
    {sharingOpen && bank ? <QuestionBankSharingDialog bank={bank} onClose={() => setSharingOpen(false)} onChanged={props.onChanged} /> : null}
    {importTarget ? <QuestionCsvImportDialog bankId={importTarget.bankId} categoryId={importTarget.categoryId} onOpenChange={(open) => !open && setImportTarget(null)} onImported={props.onChanged} /> : null}
  </section>;
}
