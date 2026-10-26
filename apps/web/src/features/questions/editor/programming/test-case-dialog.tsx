import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedToggle } from "../../ui/choice-controls";
import { byteSize, formatBytes, LIMITS } from "../limits";
import type { TestDraft } from "../question-draft";

type Visibility = "public" | "hidden";

/** Thêm/sửa một test: 2 textarea mono + Mẫu/Ẩn. */
export function TestCaseDialog({ test, index, onSave, onClose }: {
  test: TestDraft; index: number | null; onSave: (test: TestDraft) => void; onClose: () => void;
}) {
  const [value, setValue] = useState(test);
  const inputBytes = byteSize(value.input);
  const outputBytes = byteSize(value.expected_output);
  const inputError = inputBytes > LIMITS.inputBytes ? "Input vượt 128 KiB." : undefined;
  const outputError = outputBytes > LIMITS.expectedBytes ? "Output vượt 64 KiB." : undefined;
  const area = "max-h-[45dvh] min-h-40 bg-background font-mono text-xs leading-5";
  return <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle className="font-heading">{index == null ? "Thêm test" : `Sửa test #${index + 1}`}</DialogTitle>
        <DialogDescription>Test Mẫu hiện cho sinh viên làm ví dụ trong đề; test Ẩn chỉ dùng để chấm.</DialogDescription>
      </DialogHeader>
      <form id="test-case-form" className="space-y-4" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); if (!inputError && !outputError) onSave(value); }}>
        <SegmentedToggle<Visibility> label="Loại test" value={value.is_public ? "public" : "hidden"}
          onChange={(next) => setValue({ ...value, is_public: next === "public" })}
          options={[{ value: "hidden", label: "Ẩn" }, { value: "public", label: "Mẫu" }]} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2"><Label htmlFor="test-input">Input (stdin)</Label>
              <span className="font-mono text-[11px] text-muted-foreground">{formatBytes(inputBytes)}</span></div>
            <Textarea id="test-input" autoFocus value={value.input} spellCheck={false} aria-invalid={!!inputError} className={area}
              onChange={(event) => setValue({ ...value, input: event.target.value })} />
            {inputError ? <p className="text-xs text-destructive">{inputError}</p> : null}
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2"><Label htmlFor="test-output">Output mong đợi</Label>
              <span className="font-mono text-[11px] text-muted-foreground">{formatBytes(outputBytes)}</span></div>
            <Textarea id="test-output" value={value.expected_output} spellCheck={false} aria-invalid={!!outputError} className={area}
              placeholder="Để trống rồi dùng “Sinh output từ lời giải”"
              onChange={(event) => setValue({ ...value, expected_output: event.target.value })} />
            {outputError ? <p className="text-xs text-destructive">{outputError}</p> : null}
          </div>
        </div>
      </form>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
        <Button type="submit" form="test-case-form" disabled={!!inputError || !!outputError}>{index == null ? "Thêm test" : "Cập nhật"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
