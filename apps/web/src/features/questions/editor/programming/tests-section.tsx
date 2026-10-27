import { useRef, useState } from "react";
import { FileArchive, FileUp, FlaskConical, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/state-blocks";
import { cn } from "@/lib/utils";
import { EditorSection, FieldMessage, useEditor } from "../editor-context";
import { emptyTest, type TestDraft } from "../question-draft";
import { formatBytes, LIMITS, testsTotalBytes } from "../limits";
import { moveItem } from "../list-utils";
import { TestCaseDialog } from "./test-case-dialog";
import { TestCaseTable } from "./test-case-table";
import { importFromFiles, importFromZip, type ImportResult } from "./test-import";
import { TestImportDialog } from "./test-import-dialog";

/** Bộ test: bảng + thêm/sửa/xóa/đổi thứ tự + nhập file/zip. Test mới mặc định Ẩn. */
export function TestsSection() {
  const { draft, update, errors } = useEditor();
  const filesRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<{ index: number | null; test: TestDraft } | null>(null);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [reading, setReading] = useState(false);
  const tests = draft.tests;
  const setTests = (recipe: (rows: TestDraft[]) => TestDraft[]) => update((d) => ({ ...d, tests: recipe(d.tests) }));
  const total = testsTotalBytes(tests);
  const full = tests.length >= LIMITS.tests.max;

  async function read(task: () => Promise<ImportResult>) {
    setReading(true);
    try { setImported(await task()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không đọc được file."); }
    finally { setReading(false); }
  }

  return <EditorSection field="tests" title="Bộ test"
    description="Test Mẫu là ví dụ hiện trong đề; test Ẩn chỉ dùng để chấm. Chấm nhị phân: phải đạt mọi test."
    actions={<>
      <input ref={filesRef} type="file" multiple accept=".in,.out,.ans,.txt" className="sr-only" tabIndex={-1} aria-hidden
        onChange={(event) => { const files = [...(event.currentTarget.files ?? [])]; event.currentTarget.value = ""; if (files.length) void read(() => importFromFiles(files)); }} />
      <input ref={zipRef} type="file" accept=".zip,application/zip" className="sr-only" tabIndex={-1} aria-hidden
        onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void read(() => importFromZip(file)); }} />
      <Button type="button" size="sm" variant="outline" disabled={reading} onClick={() => filesRef.current?.click()}><FileUp aria-hidden /> Tải file</Button>
      <Button type="button" size="sm" variant="outline" disabled={reading} onClick={() => zipRef.current?.click()}><FileArchive aria-hidden /> {reading ? "Đang đọc…" : "Tải zip"}</Button>
      <Button type="button" size="sm" variant="outline" disabled={full} onClick={() => setEditing({ index: null, test: emptyTest() })}><Plus aria-hidden /> Thêm test</Button>
    </>}>
    {tests.length ? <TestCaseTable tests={tests} errors={errors}
      onToggle={(index, is_public) => setTests((rows) => rows.map((row, i) => i === index ? { ...row, is_public } : row))}
      onEdit={(index) => setEditing({ index, test: tests[index] })}
      onMove={(index, delta) => setTests((rows) => moveItem(rows, index, delta))}
      onDelete={(index) => setTests((rows) => rows.filter((_, i) => i !== index))} />
      : <EmptyState compact icon={FlaskConical} title="Chưa có test" className="rounded-lg bg-secondary/50"
        description="Thêm từng test, hoặc tải file .in/.out (hay một file zip) để nhập hàng loạt." />}
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground tabular-nums">
      <span>{tests.length}/{LIMITS.tests.max} test · {tests.filter((t) => t.is_public).length} mẫu</span>
      <span className={cn(total > LIMITS.totalTestBytes && "font-medium text-destructive")}>{formatBytes(total)} / {formatBytes(LIMITS.totalTestBytes)}</span>
    </div>
    <FieldMessage id="tests-message" error={errors.tests} />
    {editing ? <TestCaseDialog test={editing.test} index={editing.index} onClose={() => setEditing(null)} onSave={(test) => {
      const index = editing.index;
      setTests((rows) => index == null ? [...rows, test] : rows.map((row, i) => i === index ? test : row));
      setEditing(null);
    }} /> : null}
    {imported ? <TestImportDialog result={imported} existing={tests} onClose={() => setImported(null)} onApply={(mode, pairs) => {
      const created = pairs.map((pair) => emptyTest({ input: pair.input, expected_output: pair.expected_output }));
      setTests((rows) => mode === "replace" ? created : [...rows, ...created]);
      setImported(null);
      toast.success(mode === "replace" ? `Đã thay bằng ${created.length} test.` : `Đã thêm ${created.length} test.`);
    }} /> : null}
  </EditorSection>;
}
