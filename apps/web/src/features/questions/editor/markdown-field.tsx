import { useState } from "react";
import { MarkdownView } from "@/components/markdown-view";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FieldMessage } from "./editor-context";

/**
 * Trình soạn Markdown: tab gạch chân Viết / Xem trước (render an toàn bằng MarkdownView) + công cụ theo loại ở bên phải.
 * `hideLabel` khi tiêu đề section đã nói rõ trường này là gì (nhãn vẫn còn cho trình đọc màn hình).
 */
export function MarkdownField({ id, label, value, onChange, error, hint, placeholder, actions, textareaRef, minHeight = "min-h-40", optional, maxLength, hideLabel, mono }: {
  id: string; label: string; value: string; onChange: (value: string) => void; error?: string; hint?: React.ReactNode;
  placeholder?: string; actions?: React.ReactNode; textareaRef?: React.Ref<HTMLTextAreaElement>; minHeight?: string;
  optional?: boolean; maxLength?: number; hideLabel?: boolean; mono?: boolean;
}) {
  const [tab, setTab] = useState("write");
  const messageId = `${id}-message`;
  return <div className="space-y-2">
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b">
        <div className="flex items-end gap-4">
          <Label htmlFor={id} className={hideLabel ? "sr-only" : "pb-2"}>{label}{optional ? <span className="font-normal text-muted-foreground"> (tùy chọn)</span> : null}</Label>
          <TabsList variant="line" className="-mb-px h-8 w-auto gap-3 border-b-0">
            <TabsTrigger value="write" className="px-2">Viết</TabsTrigger>
            <TabsTrigger value="preview" className="px-2">Xem trước</TabsTrigger>
          </TabsList>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 pb-1.5">{actions}</div> : null}
      </div>
      <TabsContent value="write" className="mt-3" forceMount hidden={tab !== "write"}>
        <Textarea id={id} ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}
          aria-invalid={!!error} aria-describedby={error || hint ? messageId : undefined} maxLength={maxLength}
          className={cn("max-h-[70vh] px-3 py-2.5 leading-6", mono ? "font-mono text-[13px]" : "text-sm", minHeight)} spellCheck={false} />
      </TabsContent>
      <TabsContent value="preview" className="mt-3">
        <div className={cn("rounded-md px-1 py-1", minHeight)}>
          {value.trim() ? <MarkdownView source={value} /> : <p className="text-sm text-muted-foreground">Chưa có nội dung để xem trước.</p>}
        </div>
      </TabsContent>
    </Tabs>
    <FieldMessage id={messageId} error={error} hint={hint} />
  </div>;
}
