import { useState } from "react";
import { toast } from "sonner";
import { FolderPlus, LibraryBig, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuestionCsvImportDialog } from "@/features/questions/question-csv-import-dialog";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { Course, QuestionBank, QuestionCategory } from "@/types/api";

export function QuestionBankControls({ courses, banks, categories, courseId, bankId, categoryId, onCourseChange,
  onPersonalBankChange, onCategoryChange, onEnsureCourseBank, onChanged }: {
  courses: Course[]; banks: QuestionBank[]; categories: QuestionCategory[]; courseId: number | null;
  bankId: number | null; categoryId: number | null; onCourseChange: (id: number | null) => void;
  onPersonalBankChange: (id: number | null) => void; onCategoryChange: (id: number | null) => void;
  onEnsureCourseBank: () => Promise<QuestionBank>; onChanged: () => void;
}) {
  const [categoryOpen, setCategoryOpen] = useState(false); const [bankOpen, setBankOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<{ bankId: number; categoryId: number } | null>(null);
  const [name, setName] = useState(""); const [busy, setBusy] = useState(false);
  const personalBanks = banks.filter((bank) => bank.course_id == null);

  async function targetBank() {
    if (bankId != null) return bankId;
    if (courseId == null) throw new Error("Chọn học phần hoặc ngân hàng cá nhân trước.");
    return (await onEnsureCourseBank()).id;
  }

  async function createCategory(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const target = await targetBank();
      const created = await api.post<QuestionCategory>(`/question-banks/${target}/categories`, { name: name.trim() });
      onCategoryChange(created.id); onChanged(); setCategoryOpen(false); setName(""); toast.success("Đã tạo danh mục.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }

  async function createPersonalBank(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const created = await api.post<QuestionBank>("/question-banks", { name: name.trim() });
      onPersonalBankChange(created.id); onChanged(); setBankOpen(false); setName("");
      toast.success("Đã tạo ngân hàng cá nhân.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }

  async function openImport() {
    try {
      const target = await targetBank();
      const categoriesForBank = target === bankId ? categories
        : await api.get<QuestionCategory[]>(`/question-banks/${target}/categories`);
      const targetCategory = categoryId ?? categoriesForBank.find((item) => item.name === "Chưa phân loại")?.id;
      if (targetCategory == null) throw new Error("Ngân hàng chưa có danh mục nhận câu hỏi.");
      setImportTarget({ bankId: target, categoryId: targetCategory });
    } catch (error) { toast.error(errorText(error)); }
  }

  return <>
    <section className="space-y-4 rounded-xl border bg-card p-5" aria-labelledby="question-source-title">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><LibraryBig className="size-5" aria-hidden /></span><div><h2 id="question-source-title" className="text-base font-semibold">Học phần</h2><p className="mt-0.5 text-xs text-muted-foreground">Câu hỏi được dùng chung trong ngân hàng của học phần.</p></div></div>
      <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-2"><Label htmlFor="question-course">Chọn học phần</Label><select id="question-course" value={courseId ?? ""} onChange={(event) => onCourseChange(event.target.value ? Number(event.target.value) : null)} className="h-10 w-full min-w-0 rounded-lg border border-input bg-background/50 px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"><option value="">Chọn học phần</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code} · {course.name}</option>)}</select></div>
        <div className="min-w-0 space-y-2"><Label htmlFor="question-category">Danh mục (tùy chọn)</Label><select id="question-category" value={categoryId ?? ""} onChange={(event) => onCategoryChange(event.target.value ? Number(event.target.value) : null)} disabled={!bankId} className="h-10 w-full min-w-0 rounded-lg border border-input bg-background/50 px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"><option value="">Tất cả danh mục</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={!courseId && !bankId} onClick={() => setCategoryOpen(true)}><FolderPlus aria-hidden />Thêm danh mục</Button><Button type="button" variant="secondary" disabled={!courseId && !bankId} onClick={() => void openImport()}><Upload aria-hidden />Nhập CSV</Button></div>
      </div>
      {courseId != null && bankId == null ? <p className="text-xs text-muted-foreground">Ngân hàng học phần sẽ được tạo tự động khi bạn thêm câu hỏi hoặc tạo danh mục.</p> : null}
      <details className="border-t pt-3 text-sm">
        <summary className="w-fit cursor-pointer font-medium text-muted-foreground">Ngân hàng cá nhân (nâng cao)</summary>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 space-y-2"><Label htmlFor="personal-question-bank">Ngân hàng cá nhân</Label><select id="personal-question-bank" value={courseId == null ? bankId ?? "" : ""} onChange={(event) => onPersonalBankChange(event.target.value ? Number(event.target.value) : null)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Chọn ngân hàng cá nhân</option>{personalBanks.map((bank) => <option key={bank.id} value={bank.id}>{bank.name}</option>)}</select></div>
          <Button type="button" variant="outline" onClick={() => setBankOpen(true)}><Plus aria-hidden />Tạo ngân hàng cá nhân</Button>
        </div>
      </details>
    </section>
    <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}><DialogContent>
      <DialogHeader><DialogTitle className="font-heading">Thêm danh mục</DialogTitle><DialogDescription>Ví dụ: Chương 1, Mạng OSI hoặc Cấu trúc dữ liệu. Câu hỏi không cần danh mục vẫn được lưu trong “Chưa phân loại”.</DialogDescription></DialogHeader>
      <form onSubmit={createCategory} className="space-y-4"><div className="space-y-2"><Label htmlFor="category-name">Tên danh mục</Label><Input id="category-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} required /></div><DialogFooter><Button type="button" variant="ghost" onClick={() => setCategoryOpen(false)}>Hủy</Button><Button disabled={busy}>{busy ? "Đang tạo…" : "Tạo danh mục"}</Button></DialogFooter></form>
    </DialogContent></Dialog>
    <Dialog open={bankOpen} onOpenChange={setBankOpen}><DialogContent>
      <DialogHeader><DialogTitle className="font-heading">Tạo ngân hàng cá nhân</DialogTitle><DialogDescription>Dùng kho riêng cho câu hỏi chưa gắn với học phần. Câu hỏi dùng chung của lớp nên được thêm vào ngân hàng học phần.</DialogDescription></DialogHeader>
      <form onSubmit={createPersonalBank} className="space-y-4"><div className="space-y-2"><Label htmlFor="personal-bank-name">Tên ngân hàng</Label><Input id="personal-bank-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} required /></div><DialogFooter><Button type="button" variant="ghost" onClick={() => setBankOpen(false)}>Hủy</Button><Button disabled={busy}>{busy ? "Đang tạo…" : "Tạo ngân hàng"}</Button></DialogFooter></form>
    </DialogContent></Dialog>
    {importTarget ? <QuestionCsvImportDialog bankId={importTarget.bankId} categoryId={importTarget.categoryId} onOpenChange={(open) => !open && setImportTarget(null)} onImported={onChanged} /> : null}
  </>;
}
