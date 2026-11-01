import { useRef } from "react";
import { FileText, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { insertBlankAt } from "./answers/fill-blank-editor";
import { EditorSection, useEditor } from "./editor-context";
import { LIMITS } from "./limits";
import { MarkdownField } from "./markdown-field";

export const PROBLEM_TEMPLATE = `## Mô tả

Mô tả bài toán.

## Input

- Dòng đầu chứa số nguyên \`n\`.

## Output

- In ra kết quả.

## Ràng buộc

- \`1 ≤ n ≤ 10^5\`

## Ghi chú

`;

/** Section nội dung câu hỏi (Markdown) + công cụ theo loại: “Dùng mẫu đề” (lập trình), “Chèn ô” (điền chỗ trống). */
export function ContentField() {
  const { draft, patch, errors } = useEditor();
  const ref = useRef<HTMLTextAreaElement>(null);
  const programming = draft.type === "programming";

  function insertBlank() {
    const area = ref.current;
    const start = area?.selectionStart ?? draft.content.length;
    const end = area?.selectionEnd ?? start;
    const next = insertBlankAt(draft.content, start, end);
    patch({ content: next.content });
    requestAnimationFrame(() => { area?.focus(); area?.setSelectionRange(next.caret, next.caret); });
  }
  function applyTemplate() {
    const current = draft.content.trimEnd();
    patch({ content: current ? `${current}\n\n${PROBLEM_TEMPLATE}` : PROBLEM_TEMPLATE });
    requestAnimationFrame(() => ref.current?.focus());
  }

  const actions = programming
    ? <Button type="button" size="xs" variant="ghost" className="text-muted-foreground" onClick={applyTemplate}><FileText aria-hidden /> Dùng mẫu đề</Button>
    : draft.type === "fill_blank"
      ? <Button type="button" size="xs" variant="outline" onMouseDown={(event) => event.preventDefault()} onClick={insertBlank}><SquarePlus aria-hidden /> Chèn ô</Button>
      : null;
  const description = programming ? "Mô tả bài toán, định dạng input/output và ràng buộc. Ví dụ mẫu tự lấy từ các test Mẫu — không cần chép vào đề."
    : draft.type === "fill_blank" ? "Đặt con trỏ vào chỗ cần điền rồi bấm “Chèn ô”; mỗi ô có dạng [[1]], [[2]]… theo thứ tự."
      : "Hỗ trợ Markdown (GFM): **đậm**, `code`, bảng, danh sách. Không nhận HTML.";

  return <EditorSection field="content" title={programming ? "Đề bài" : "Nội dung câu hỏi"} description={description}>
    <MarkdownField id="question-content" label={programming ? "Đề bài" : "Nội dung câu hỏi"} hideLabel mono={programming} value={draft.content}
      onChange={(content) => patch({ content })} error={errors.content} actions={actions} textareaRef={ref}
      maxLength={LIMITS.content} minHeight={programming ? "min-h-72" : "min-h-32"}
      placeholder={programming ? "Mô tả bài toán, định dạng input/output, ràng buộc…" : "Nhập nội dung câu hỏi…"} />
  </EditorSection>;
}
