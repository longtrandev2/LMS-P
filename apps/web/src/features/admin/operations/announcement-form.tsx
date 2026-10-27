import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { MarkdownView } from "@/components/markdown-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { AnnouncementAudience, AnnouncementInput } from "@/types/admin";
import type { ClassSummary } from "@/types/api";
import { AnnouncementConfirmDialog } from "./announcement-confirm-dialog";
import { ClassPicker } from "./class-picker";
import { AUDIENCE_LABEL, type AnnouncementRole, ROLE_OPTIONS } from "./operations-labels";

/** Soạn thông báo hệ thống (markdown) và chọn người nhận — admin-spec §5.1. */
export function AnnouncementForm() {
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [role, setRole] = useState<AnnouncementRole>("student");
  const [clazz, setClazz] = useState<ClassSummary | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [tried, setTried] = useState(false);
  const [bodyTab, setBodyTab] = useState("write");

  const titleError = !title.trim() ? "Nhập tiêu đề." : undefined;
  const bodyError = !body.trim() ? "Nhập nội dung." : undefined;
  const classError = audience === "class" && !clazz ? "Chọn lớp nhận thông báo." : undefined;
  const valid = !titleError && !bodyError && !classError;

  const send = useMutation({
    mutationFn: () => {
      const input: AnnouncementInput = { title: title.trim(), body: body.trim(), audience };
      if (audience === "role") input.role = role;
      if (audience === "class") input.class_id = clazz?.id;
      return api.post<{ id: number; recipient_count: number }>("/admin/announcements", input);
    },
    onSuccess: ({ recipient_count }) => {
      toast.success(`Đã gửi thông báo tới ${recipient_count.toLocaleString("vi-VN")} người.`);
      setConfirming(false); setTitle(""); setBody(""); setTried(false); setBodyTab("write");
      void client.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
    onError: (error) => { setConfirming(false); toast.error(errorText(error)); },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTried(true);
    if (valid) setConfirming(true);
  }

  return (
    <form onSubmit={submit} noValidate aria-labelledby="ann-compose" className="max-w-3xl space-y-5">
      <h2 id="ann-compose" className="text-base font-semibold">Soạn thông báo</h2>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="ann-title">Tiêu đề</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{title.length}/200</span>
        </div>
        <Input id="ann-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} aria-invalid={tried && Boolean(titleError)}
          placeholder="Ví dụ: Lịch bảo trì hệ thống" />
        {tried && titleError ? <p role="alert" className="text-xs text-destructive">{titleError}</p> : null}
      </div>
      <Tabs value={bodyTab} onValueChange={setBodyTab} className="gap-1.5">
        <div className="flex items-end justify-between gap-3">
          <Label htmlFor="ann-body">Nội dung <span className="font-normal text-muted-foreground">(Markdown)</span></Label>
          <TabsList className="h-8">
            <TabsTrigger value="write">Soạn</TabsTrigger>
            <TabsTrigger value="preview">Xem trước</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="write" className="space-y-1">
          <Textarea id="ann-body" rows={6} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)}
            aria-invalid={tried && Boolean(bodyError)} placeholder="Nội dung hiển thị trong thông báo của người nhận" />
          <p className="flex justify-between text-xs text-muted-foreground">
            {tried && bodyError ? <span role="alert" className="text-destructive">{bodyError}</span> : <span>Hỗ trợ **đậm**, danh sách, liên kết.</span>}
            <span className="tabular-nums">{body.length}/2000</span>
          </p>
        </TabsContent>
        <TabsContent value="preview">
          <div className="min-h-36 rounded-md bg-secondary/50 px-3 py-2">
            {body.trim() ? <MarkdownView source={body} /> : <p className="text-sm text-muted-foreground">Chưa có nội dung để xem trước.</p>}
          </div>
        </TabsContent>
      </Tabs>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Đối tượng nhận</legend>
        <ToggleGroup type="single" value={audience} onValueChange={(v) => v && setAudience(v as AnnouncementAudience)} aria-label="Đối tượng nhận">
          {(Object.keys(AUDIENCE_LABEL) as AnnouncementAudience[]).map((a) => <ToggleGroupItem key={a} value={a}>{AUDIENCE_LABEL[a]}</ToggleGroupItem>)}
        </ToggleGroup>
        {audience === "role" ? (
          <Select value={role} onValueChange={(v) => setRole(v as AnnouncementRole)}>
            <SelectTrigger className="w-full sm:w-56" aria-label="Vai trò nhận"><SelectValue /></SelectTrigger>
            <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        ) : null}
        {audience === "class" ? (
          <div className="space-y-1">
            <ClassPicker id="ann-class" value={clazz} onChange={setClazz} invalid={tried && Boolean(classError)} />
            <p className="text-xs text-muted-foreground">{tried && classError ? <span role="alert" className="text-destructive">{classError}</span> : "Gửi cho sinh viên đang học và giảng viên của lớp."}</p>
          </div>
        ) : null}
        {audience === "all" ? <p className="text-xs text-muted-foreground">Mọi tài khoản đang hoạt động (không gồm tài khoản bị khóa).</p> : null}
      </fieldset>
      <Button type="submit" disabled={send.isPending}><Send aria-hidden /> Gửi thông báo</Button>
      <AnnouncementConfirmDialog open={confirming} onOpenChange={setConfirming} pending={send.isPending} onConfirm={() => send.mutate()}
        title={title.trim()} audience={audience} role={role} classCode={clazz ? `${clazz.code} · ${clazz.name}` : null} />
    </form>
  );
}
