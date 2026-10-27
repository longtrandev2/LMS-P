import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Eye, FileQuestion, Lock, Plus, Share2, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuestionBank, QuestionCategory } from "@/types/api";
import { QuestionBankSharingDialog } from "./question-bank-sharing-dialog";
import { QuestionCsvImportDialog } from "./question-csv-import-dialog";

function MetaItem({ icon: Icon, children }: { icon: typeof BookOpen; children: React.ReactNode }) {
  return <span className="inline-flex min-w-0 items-center gap-1.5"><Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden /><span className="truncate">{children}</span></span>;
}
const Dot = () => <span aria-hidden className="text-muted-foreground/60">·</span>;

/**
 * Đầu vùng chính của ngân hàng (DESIGN.md §4 Đầu trang): tên 24/600 + hàng meta (học phần · phạm vi · số câu);
 * hành động phải: Nhập CSV, Chia sẻ (xám) và Tạo câu hỏi (đen).
 */
export function QuestionBankHeader({ bank, total, categories, categoryId, categoriesLoading, canAuthor, createHref, onChanged }: {
  bank: QuestionBank | undefined; total: number | null; categories: QuestionCategory[]; categoryId: number | null;
  categoriesLoading: boolean; canAuthor: boolean; createHref: string; onChanged: () => void;
}) {
  const [sharingOpen, setSharingOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const canEdit = canAuthor && !!bank?.can_edit;

  if (!bank) return <header className="space-y-1">
    <h1 className="text-2xl font-semibold tracking-tight">Ngân hàng câu hỏi</h1>
    <p className="text-sm text-muted-foreground">Soạn câu hỏi theo ngân hàng của học phần và dùng lại trong bài tập, quiz.</p>
  </header>;

  return <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
    <div className="min-w-0 space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">{bank.name}</h1>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
        <MetaItem icon={BookOpen}>{bank.course_name ?? "Ngân hàng cá nhân"}</MetaItem>
        <Dot />
        <MetaItem icon={bank.visibility === "shared" ? Users : Lock}>{bank.visibility === "shared" ? "Chia sẻ trong học phần" : "Riêng tư"}</MetaItem>
        {total != null ? <><Dot /><MetaItem icon={FileQuestion}><span className="tabular-nums">{total}</span> câu</MetaItem></> : null}
        {bank.can_edit ? null : <><Dot /><MetaItem icon={Eye}>Chỉ xem</MetaItem></>}
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {canEdit ? <Button type="button" variant="outline" onClick={() => setImportOpen(true)} disabled={categoriesLoading}>
        <Upload aria-hidden /> Nhập CSV</Button> : null}
      {bank.can_manage ? <Button type="button" variant="outline" onClick={() => setSharingOpen(true)}><Share2 aria-hidden /> Chia sẻ</Button> : null}
      {canEdit ? <Button asChild><Link to={createHref}><Plus aria-hidden /> Tạo câu hỏi</Link></Button> : null}
    </div>
    {sharingOpen ? <QuestionBankSharingDialog bank={bank} onClose={() => setSharingOpen(false)} onChanged={onChanged} /> : null}
    {importOpen ? <QuestionCsvImportDialog bankId={bank.id} categories={categories} defaultCategoryId={categoryId}
      onOpenChange={setImportOpen} onImported={onChanged} /> : null}
  </header>;
}
