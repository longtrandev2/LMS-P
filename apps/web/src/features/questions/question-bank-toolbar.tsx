import { useState } from "react";
import { FolderPlus, Share2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { QuestionBank, QuestionCategory } from "@/types/api";
import { QuestionBankSharingDialog } from "./question-bank-sharing-dialog";
import { QuestionCsvImportDialog } from "./question-csv-import-dialog";

const ALL_CATEGORIES = "all";

export function QuestionBankToolbar({ bank, categories, categoryId, categoriesLoading, canAuthor, onCategoryChange, onCategoryCreated, onChanged }: {
  bank: QuestionBank | undefined; categories: QuestionCategory[]; categoryId: number | null; categoriesLoading: boolean; canAuthor: boolean;
  onCategoryChange: (id: number | null) => void; onCategoryCreated: (category: QuestionCategory) => void; onChanged: () => void;
}) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [sharingOpen, setSharingOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const canEdit = canAuthor && !!bank?.can_edit;

  async function createCategory(event: React.FormEvent) {
    event.preventDefault(); if (!bank) return; setBusy(true);
    try {
      const category = await api.post<QuestionCategory>(`/question-banks/${bank.id}/categories`, { name: name.trim() });
      onCategoryCreated(category); setCategoryOpen(false); setName(""); toast.success("Đã tạo danh mục.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }

  return <section className="rounded-xl border bg-card" aria-label="Công cụ ngân hàng câu hỏi">
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold">{bank?.name ?? "Chọn ngân hàng câu hỏi"}</h2>
        <p className="truncate text-xs text-muted-foreground">{bank ? `${bank.course_name ?? "Ngân hàng cá nhân"}${bank.can_edit ? "" : " · bạn chỉ có quyền xem"}` : "Chọn một ngân hàng ở danh sách bên trái để xem câu hỏi."}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? <>
          <Button type="button" variant="outline" size="sm" onClick={() => setCategoryOpen(true)}><FolderPlus aria-hidden /> Danh mục</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)} disabled={categoriesLoading}><Upload aria-hidden /> Nhập CSV</Button>
        </> : null}
        {bank?.can_manage ? <Button type="button" variant="outline" size="sm" onClick={() => setSharingOpen(true)}><Share2 aria-hidden /> Chia sẻ</Button> : null}
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3 border-t bg-muted/20 px-4 py-3">
      <Label htmlFor="question-category-filter" className="text-xs text-muted-foreground">Danh mục</Label>
      <Select value={categoryId != null ? String(categoryId) : ALL_CATEGORIES} disabled={!bank || categoriesLoading}
        onValueChange={(value) => onCategoryChange(value === ALL_CATEGORIES ? null : Number(value))}>
        <SelectTrigger id="question-category-filter" size="sm" className="w-full min-w-0 bg-card sm:w-64"><SelectValue placeholder="Đang tải danh mục…" /></SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={ALL_CATEGORIES}>Tất cả danh mục</SelectItem>
          {categories.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    {categoryOpen && bank ? <Dialog open onOpenChange={setCategoryOpen}><DialogContent>
      <DialogHeader><DialogTitle className="font-heading">Thêm danh mục</DialogTitle><DialogDescription>Sắp xếp câu hỏi theo chương hoặc nội dung học tập.</DialogDescription></DialogHeader>
      <form onSubmit={createCategory} className="space-y-4"><div className="space-y-2"><Label htmlFor="question-category-name">Tên danh mục</Label><Input id="question-category-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} required /></div><DialogFooter><Button type="button" variant="ghost" onClick={() => setCategoryOpen(false)}>Hủy</Button><Button disabled={busy || !name.trim()}>{busy ? "Đang tạo…" : "Tạo danh mục"}</Button></DialogFooter></form>
    </DialogContent></Dialog> : null}
    {sharingOpen && bank ? <QuestionBankSharingDialog bank={bank} onClose={() => setSharingOpen(false)} onChanged={onChanged} /> : null}
    {importOpen && bank ? <QuestionCsvImportDialog bankId={bank.id} categories={categories} defaultCategoryId={categoryId}
      onOpenChange={setImportOpen} onImported={onChanged} /> : null}
  </section>;
}
