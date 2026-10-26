import { useState } from "react";
import { MarkdownView } from "@/components/markdown-view";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FieldMessage } from "./editor-context";

/** Trình soạn Markdown: tab Viết / Xem trước (render an toàn bằng MarkdownView). */
export function MarkdownField({ id, label, value, onChange, error, hint, placeholder, actions, textareaRef, minHeight = "min-h-40", optional, maxLength }: {
  id: string; label: string; value: string; onChange: (value: string) => void; error?: string; hint?: React.ReactNode;
  placeholder?: string; actions?: React.ReactNode; textareaRef?: React.Ref<HTMLTextAreaElement>; minHeight?: string;
  optional?: boolean; maxLength?: number;
}) {
  const [tab, setTab] = useState("write");
  const messageId = `${id}-message`;
  return <div className="space-y-2">
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <Label htmlFor={id} className="pb-1.5">{label}{optional ? <span className="font-normal text-muted-foreground"> (tùy chọn)</span> : null}</Label>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <TabsList variant="line" className="h-8">
            <TabsTrigger value="write" className="px-2.5 normal-case tracking-normal">Viết</TabsTrigger>
            <TabsTrigger value="preview" className="px-2.5 normal-case tracking-normal">Xem trước</TabsTrigger>
          </TabsList>
        </div>
      </div>
      <TabsContent value="write" className="mt-2" forceMount hidden={tab !== "write"}>
        <Textarea id={id} ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}
          aria-invalid={!!error} aria-describedby={error || hint ? messageId : undefined} maxLength={maxLength}
          className={cn("max-h-[70vh] bg-background font-mono text-[13px] leading-6", minHeight)} spellCheck={false} />
      </TabsContent>
      <TabsContent value="preview" className="mt-2">
        <div className={cn("rounded-md border bg-background px-3 py-2", minHeight)}>
          {value.trim() ? <MarkdownView source={value} /> : <p className="text-sm text-muted-foreground">Chưa có nội dung để xem trước.</p>}
        </div>
      </TabsContent>
    </Tabs>
    <FieldMessage id={messageId} error={error} hint={hint} />
  </div>;
}
