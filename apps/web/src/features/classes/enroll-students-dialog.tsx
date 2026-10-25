import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTablePagination } from "@/components/data-table-pagination";
import { FieldError } from "@/components/form-field-error";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { parseEnrollmentCsv, type EnrollmentCsvTarget } from "@/features/classes/enrollment-csv";
import { queryKeys } from "@/lib/query-keys";
import type { Paginated, StudentCandidate } from "@/types/api";

interface Props { onOpenChange: (open: boolean) => void; classId: string; onEnrolled: () => void }
type Target = { student_code: string } | { email: string };
type RowCheck = { row: number; identifier: string | null; full_name: string | null; valid: boolean; reason: string | null };
type CsvPreview = { eligible: number; rows: RowCheck[] };
const identify = (value: string): Target => value.includes("@") ? { email: value } : { student_code: value };
const sampleCsv = "data:text/csv;charset=utf-8,student_code%2Cemail%0A23IT001%2C";

export function EnrollStudentsDialog({ onOpenChange, classId, onEnrolled }: Props) {
  const [single, setSingle] = useState("");
  const [bulk, setBulk] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvTargets, setCsvTargets] = useState<EnrollmentCsvTarget[]>([]);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateTerm, setCandidateTerm] = useState("");
  const [candidatePage, setCandidatePage] = useState(1);
  const [selectedCandidates, setSelectedCandidates] = useState<StudentCandidate[]>([]);
  useEffect(() => { const timer = window.setTimeout(() => setCandidateTerm(candidateSearch.trim()), 300); return () => window.clearTimeout(timer); }, [candidateSearch]);
  const candidateQuery = useQuery({
    queryKey: queryKeys.classes.candidates(classId, { q: candidateTerm, page: candidatePage, limit: 10 }),
    queryFn: ({ signal }) => api.get<Paginated<StudentCandidate>>(`/classes/${classId}/student-candidates`, { q: candidateTerm, page: candidatePage, limit: 10 }, signal),
    enabled: candidateTerm.length >= 2,
  });

  async function enroll(values: Target[]) {
    setSubmitting(true); setError("");
    try {
      const result = await api.post<{ added: number; errors: { row: number; reason: string }[] }>(
        `/classes/${classId}/enrollments`, { students: values }
      );
      if (result.added) toast.success(`Đã ghi danh ${result.added} sinh viên.`);
      if (result.errors.length) toast.error(result.errors.map((item) => `Dòng ${item.row}: ${item.reason}`).join(" · "));
      setSingle(""); setBulk(""); setSelectedCandidates([]); onEnrolled();
      if (!result.errors.length) onOpenChange(false);
    } catch (cause) { toast.error(errorText(cause)); }
    finally { setSubmitting(false); }
  }

  async function readCsv(file?: File) {
    if (!file) return;
    setSubmitting(true); setCsvError(""); setPreview(null);
    try {
      const targets = parseEnrollmentCsv(await file.text());
      if (!targets.length) throw new Error("CSV chưa có dòng sinh viên nào.");
      const result = await api.post<CsvPreview>(`/classes/${classId}/enrollments/import/preview`, { students: targets });
      setCsvTargets(targets); setPreview(result);
    } catch (cause) { setCsvError(cause instanceof Error ? cause.message : errorText(cause)); }
    finally { setSubmitting(false); }
  }

  async function importCsv() {
    setSubmitting(true); setCsvError("");
    try {
      const result = await api.post<{ added: number; errors: { row: number; reason: string }[] }>(
        `/classes/${classId}/enrollments/import`, { students: csvTargets }
      );
      if (result.added) toast.success(`Đã thêm ${result.added} sinh viên${result.errors.length ? `; ${result.errors.length} dòng cần xử lý lại` : "."}`);
      else toast.error("Không có dòng nào được thêm.");
      if (result.errors.length) toast.error(result.errors.map((item) => `Dòng ${item.row}: ${item.reason}`).join(" · "));
      onEnrolled(); onOpenChange(false);
    } catch (cause) { setCsvError(errorText(cause)); }
    finally { setSubmitting(false); }
  }

  function handleSingle(event: React.FormEvent) {
    event.preventDefault(); const value = single.trim();
    if (!value) { setError("Nhập mã sinh viên hoặc email."); return; }
    void enroll([identify(value)]);
  }

  function handleBulk(event: React.FormEvent) {
    event.preventDefault();
    const values = bulk.split(/[\n,;]+/).map((value) => value.trim()).filter(Boolean);
    if (!values.length) { setError("Dán danh sách mã sinh viên hoặc email."); return; }
    void enroll(values.map(identify));
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle className="font-heading">Thêm sinh viên vào lớp</DialogTitle>
          <DialogDescription>Nhập mã SV/email hoặc nhập danh sách CSV. Hệ thống kiểm tra từng sinh viên trước khi thêm.</DialogDescription></DialogHeader>
        <Tabs defaultValue="single">
          <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="single">Một người</TabsTrigger><TabsTrigger value="bulk">Dán DS</TabsTrigger><TabsTrigger value="search">Tìm SV</TabsTrigger><TabsTrigger value="csv">CSV</TabsTrigger></TabsList>
          <TabsContent value="single"><form onSubmit={handleSingle} className="space-y-4 pt-2">
            <div className="space-y-2"><Label htmlFor="enroll-single">Mã sinh viên hoặc email</Label>
              <Input id="enroll-single" value={single} onChange={(e) => setSingle(e.target.value)} placeholder="VD: 23IT001 hoặc sv@example.edu" />
              {error ? <FieldError text={error} /> : null}</div>
            <Button type="submit" disabled={submitting}>{submitting ? "Đang ghi danh…" : "Ghi danh"}</Button>
          </form></TabsContent>
          <TabsContent value="bulk"><form onSubmit={handleBulk} className="space-y-4 pt-2">
            <div className="space-y-2"><Label htmlFor="enroll-bulk">Danh sách mã SV hoặc email</Label>
              <Textarea id="enroll-bulk" value={bulk} onChange={(e) => setBulk(e.target.value)} rows={6} className="font-mono text-sm" placeholder={"Mỗi dòng một mã SV hoặc email:\n23IT001\nsv@example.edu"} />
              {error ? <FieldError text={error} /> : null}</div>
            <Button type="submit" disabled={submitting}>{submitting ? "Đang ghi danh…" : "Ghi danh danh sách"}</Button>
          </form></TabsContent>
          <TabsContent value="search" className="space-y-3 pt-4">
            <Input value={candidateSearch} onChange={(event) => { setCandidateSearch(event.target.value); setCandidatePage(1); }} placeholder="Tìm theo tên, mã SV hoặc email" aria-label="Tìm sinh viên để xếp lớp" />
            {candidateTerm.length < 2 ? <p className="text-sm text-muted-foreground">Nhập ít nhất 2 ký tự để tìm sinh viên.</p> : candidateQuery.isPending ? <p className="text-sm text-muted-foreground">Đang tìm sinh viên…</p> : candidateQuery.isError ? <p className="text-sm text-destructive">Không tìm được sinh viên. Thử lại sau.</p> : candidateQuery.data?.items.length === 0 ? <p className="text-sm text-muted-foreground">Không có sinh viên phù hợp chưa thuộc lớp này.</p> : <>
              <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">{candidateQuery.data?.items.map((student) => {
                const checked = selectedCandidates.some((item) => item.user_id === student.user_id);
                return <li key={student.user_id} className="flex items-center gap-3 px-3 py-2">
                  <input type="checkbox" checked={checked} aria-label={`Chọn ${student.full_name}`} onChange={() => setSelectedCandidates((items) => checked ? items.filter((item) => item.user_id !== student.user_id) : [...items, student])} />
                  <span className="min-w-0 text-sm"><span className="block truncate font-medium">{student.full_name} · {student.student_code || "Chưa có mã SV"}</span><span className="block truncate text-xs text-muted-foreground">{student.email}</span></span>
                </li>;
              })}</ul>
              {candidateQuery.data ? <DataTablePagination page={candidateQuery.data.page} limit={candidateQuery.data.limit} total={candidateQuery.data.total} onPageChange={setCandidatePage} /> : null}
            </>}
            <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Đã chọn {selectedCandidates.length} sinh viên</span>
              <Button disabled={submitting || selectedCandidates.length === 0} onClick={() => void enroll(selectedCandidates.map((student) => student.student_code ? { student_code: student.student_code } : { email: student.email }))}>{submitting ? "Đang thêm…" : "Thêm vào lớp"}</Button></div>
          </TabsContent>
          <TabsContent value="csv" className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label htmlFor="enrollment-csv">Chọn file CSV (cột student_code hoặc email)</Label>
              <a className="text-sm text-primary underline-offset-4 hover:underline" href={sampleCsv} download="mau-xep-lop.csv">Tải file mẫu</a>
            </div>
            <Input id="enrollment-csv" type="file" accept=".csv,text/csv" disabled={submitting}
              onChange={(event) => { void readCsv(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
            <p className="text-xs text-muted-foreground">Mỗi dòng điền một mã sinh viên hoặc email. Có thể dùng dấu phẩy hoặc chấm phẩy phân cách cột.</p>
            {csvError ? <FieldError text={csvError} /> : null}
            {preview ? <div className="space-y-3">
              <p className="text-sm font-medium">Đủ điều kiện thêm: {preview.eligible} / {preview.rows.length}</p>
              <ul className="max-h-56 divide-y overflow-y-auto rounded-md border">
                {preview.rows.map((row) => <li key={`${row.row}-${row.identifier}`} className="flex items-start justify-between gap-4 px-3 py-2 text-sm">
                  <span><span className="mr-2 text-muted-foreground">Dòng {row.row}</span>{row.full_name || row.identifier || "Thiếu mã/email"}
                    {row.reason ? <span className="block pl-12 text-xs text-destructive">{row.reason}</span> : null}</span>
                  <span className={row.valid ? "shrink-0 text-xs text-success" : "shrink-0 text-xs text-destructive"}>{row.valid ? "Hợp lệ" : "Lỗi"}</span>
                </li>)}
              </ul>
              <Button onClick={() => void importCsv()} disabled={submitting || preview.eligible === 0}>
                {submitting ? "Đang thêm…" : `Xác nhận thêm ${preview.eligible} sinh viên`}
              </Button>
            </div> : null}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
