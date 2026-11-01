import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownView } from "@/components/markdown-view";
import { RadioCards } from "./option-cards";
import { EditorSection, Field, fieldAria } from "./editor-layout";
import { CATEGORY_OPTIONS } from "./labels";
import type { EditorForm, FieldErrors } from "./editor-model";

export function EditorInfoSection({ form, patch, errors, published }: {
  form: EditorForm; patch: (next: Partial<EditorForm>) => void; errors: FieldErrors; published: boolean;
}) {
  const hasProgramming = form.questions.some((q) => q.type === "programming") || form.rules.some((r) => r.type === "programming");
  const options = CATEGORY_OPTIONS.map((option) => option.id === "quiz" && hasProgramming
    ? { ...option, description: "Không chọn được: đề đang có câu lập trình.", disabled: true }
    : option);
  return <EditorSection id="info" title="Thông tin" description="Tên, mô tả và hạng mục tính điểm của bài.">
    <Field id="assignment-title" label="Tên bài" error={errors.title}>
      <Input {...fieldAria("assignment-title", errors.title)} value={form.title} maxLength={200}
        placeholder="Ví dụ: Quiz tuần 3 — Socket TCP" onChange={(event) => patch({ title: event.target.value })} />
    </Field>
    <div className="space-y-1.5">
      <Tabs defaultValue="write">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="assignment-description" className="text-sm font-medium">Mô tả <span className="font-normal text-muted-foreground">· Markdown, tùy chọn</span></label>
          <TabsList className="h-7">
            <TabsTrigger value="write" className="px-2.5 text-xs">Soạn</TabsTrigger>
            <TabsTrigger value="preview" className="px-2.5 text-xs">Xem trước</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="write" className="mt-2">
          <Textarea id="assignment-description" rows={5} value={form.description} maxLength={20000}
            placeholder="Yêu cầu, tài liệu được dùng, cách nộp…" onChange={(event) => patch({ description: event.target.value })} />
        </TabsContent>
        <TabsContent value="preview" className="mt-2">
          <div className="min-h-32 rounded-md bg-secondary/50 px-3 py-2">
            {form.description.trim() ? <MarkdownView source={form.description} />
              : <p className="text-sm text-muted-foreground">Chưa có mô tả.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
    <div className="space-y-2">
      <p className="text-sm font-medium">Hạng mục</p>
      <RadioCards label="Hạng mục" value={form.category} onChange={(category) => patch({ category })}
        options={options} columns={2} disabled={published} />
      {published ? <p className="text-xs text-muted-foreground">Hạng mục đã khóa sau khi xuất bản.</p> : null}
    </div>
  </EditorSection>;
}
