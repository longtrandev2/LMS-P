import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
        <DialogTitle>Nhập bộ test</DialogTitle>
        <DialogDescription>Đã ghép {result.pairs.length} cặp, {valid.length} cặp hợp lệ. Test nhập vào mặc định là <strong>Ẩn</strong>.</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-3 overflow-y-auto">
        {result.problems.length ? <Alert variant="warning">
          <AlertTriangle aria-hidden />
          <AlertDescription><ul className="space-y-1 text-xs">{result.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul></AlertDescription>
        </Alert> : null}
        {result.pairs.length ? <div>
          <Table>
            <TableHeader><TableRow><TableHead className="w-10">#</TableHead><TableHead>Tên</TableHead><TableHead className="text-right">Input</TableHead><TableHead className="text-right">Output</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
            <TableBody>
              {result.pairs.map((pair, index) => <TableRow key={pair.name}>
                <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">{index + 1}</TableCell>
                <TableCell className="max-w-48 truncate font-mono text-xs">{pair.name}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">{formatBytes(byteSize(pair.input))}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">{formatBytes(byteSize(pair.expected_output))}</TableCell>
                <TableCell className={pair.error ? "text-xs text-destructive" : "text-xs text-success"}>{pair.error ?? "Hợp lệ"}</TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </div> : null}
        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup type="single" aria-label="Cách nhập" value={mode} onValueChange={(next) => next && setMode(next as ImportMode)}>
            <ToggleGroupItem value="replace">Thay toàn bộ</ToggleGroupItem>
            <ToggleGroupItem value="append">Thêm vào cuối</ToggleGroupItem>
          </ToggleGroup>
          <span className="text-xs text-muted-foreground tabular-nums">Sau khi nhập: {count} test · {formatBytes(total)}</span>
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
