import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SegmentedToggle } from "../../ui/choice-controls";
import { byteSize, formatBytes, LIMITS, testsTotalBytes } from "../limits";
import type { TestDraft } from "../question-draft";
import type { ImportedPair, ImportResult } from "./test-import";

export type ImportMode = "replace" | "append";

/** Xem trước các cặp test đã ghép trước khi thay toàn bộ hoặc thêm vào cuối. */
export function TestImportDialog({ result, existing, onApply, onClose }: {
  result: ImportResult; existing: TestDraft[]; onApply: (mode: ImportMode, pairs: ImportedPair[]) => void; onClose: () => void;
}) {
  const [mode, setMode] = useState<ImportMode>(existing.length ? "append" : "replace");
  const valid = result.pairs.filter((pair) => !pair.error);
  const base = mode === "append" ? existing : [];
  const count = base.length + valid.length;
  const total = testsTotalBytes(base) + testsTotalBytes(valid);
  const blockers = [
    count > LIMITS.tests.max ? `Sau khi nhập sẽ có ${count} test, vượt giới hạn ${LIMITS.tests.max}.` : null,
    total > LIMITS.totalTestBytes ? `Tổng dung lượng ${formatBytes(total)} vượt ${formatBytes(LIMITS.totalTestBytes)}.` : null,
  ].filter((item): item is string => !!item);

  return <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-h-[88dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-heading">Nhập bộ test</DialogTitle>
        <DialogDescription>Đã ghép {result.pairs.length} cặp, {valid.length} cặp hợp lệ. Test nhập vào mặc định là <strong>Ẩn</strong>.</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-3 overflow-y-auto">
        {result.problems.length ? <ul className="space-y-1 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-gold">
          {result.problems.map((problem) => <li key={problem} className="flex gap-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />{problem}</li>)}
        </ul> : null}
        {result.pairs.length ? <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead className="w-10">#</TableHead><TableHead>Tên</TableHead><TableHead className="text-right">Input</TableHead><TableHead className="text-right">Output</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
            <TableBody>
              {result.pairs.map((pair, index) => <TableRow key={pair.name}>
                <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="max-w-48 truncate font-mono text-xs">{pair.name}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatBytes(byteSize(pair.input))}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatBytes(byteSize(pair.expected_output))}</TableCell>
                <TableCell className={pair.error ? "text-xs text-destructive" : "text-xs text-success"}>{pair.error ?? "Hợp lệ"}</TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </div> : null}
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedToggle label="Cách nhập" value={mode} onChange={setMode} options={[
            { value: "replace", label: "Thay toàn bộ" }, { value: "append", label: "Thêm vào cuối" },
          ]} />
          <span className="text-xs text-muted-foreground">Sau khi nhập: {count} test · {formatBytes(total)}</span>
        </div>
        {blockers.map((text) => <p key={text} role="alert" className="text-xs text-destructive">{text}</p>)}
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
        <Button type="button" disabled={!valid.length || blockers.length > 0} onClick={() => onApply(mode, valid)}>
          {mode === "replace" ? `Thay bằng ${valid.length} test` : `Thêm ${valid.length} test`}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
