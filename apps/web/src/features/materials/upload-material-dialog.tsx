import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldError } from "@/components/form-field-error";
import { errorText } from "@/lib/error-messages";
import type { MaterialType } from "./types";
import { MaterialFilePicker } from "./material-file-picker";
import { MaterialFormFields } from "./material-form-fields";
import { useUploadMaterial } from "./use-materials";

interface UploadMaterialDialogProps {
  onOpenChange: (open: boolean) => void;
  classId: string;
}

/** FR-MAT-01: tệp ≤ 100MB (pdf/doc/slide/zip) hoặc link */
const MAX_UPLOAD_MB = 100;
const FILE_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.7z,.mp4,.webm";

function typeFromFilename(name: string): MaterialType {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "doc" || ext === "docx") return "doc";
  if (ext === "ppt" || ext === "pptx") return "slide";
  if (ext === "zip" || ext === "rar" || ext === "7z") return "archive";
  if (ext === "mp4" || ext === "webm") return "video";
  return "other";
}

export function UploadMaterialDialog({ onOpenChange, classId }: UploadMaterialDialogProps) {
  const upload = useUploadMaterial(classId);
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<MaterialType | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleFileChange(selected: File | null) {
    setFile(selected);
    if (selected) {
      setTitle((prev) => prev || selected.name.replace(/\.[^.]+$/, ""));
      setType((prev) => prev || typeFromFilename(selected.name));
    }
  }

  function buildForm(mode: "file" | "link"): FormData | null {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Nhập tiêu đề học liệu.";
    if (mode === "file") {
      if (!file) next.file = "Chọn tệp để tải lên.";
      if (file && file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        next.file = `Tệp vượt giới hạn ${MAX_UPLOAD_MB}MB.`;
      }
      if (!type) next.type = "Chọn phân loại.";
    } else {
      if (!/^https?:\/\/.+/i.test(linkUrl.trim())) next.link = "Dán liên kết hợp lệ (http/https).";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return null;

    const form = new FormData();
    form.append("title", title.trim());
    form.append("description", description.trim());
    form.append("type", (type || "link") as string);
    if (mode === "file" && file) form.append("file", file);
    if (mode === "link") form.append("link_url", linkUrl.trim());
    return form;
  }

  async function handleSubmit(mode: "file" | "link", e: React.FormEvent) {
    e.preventDefault();
    const form = buildForm(mode);
    if (!form) return;
    try {
      await upload.mutateAsync(form);
      toast.success("Đã tải lên học liệu.");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorText(error));
    }
  }

  const submitting = upload.isPending;
  const sharedProps = {
    title,
    onTitle: setTitle,
    description,
    onDescription: setDescription,
    type,
    onType: setType,
    errors,
  };

  const footer = (label: string, busyLabel: string) => (
    <DialogFooter className="pt-2">
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
      <Button type="submit" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {submitting ? busyLabel : label}
      </Button>
    </DialogFooter>
  );

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tải học liệu</DialogTitle>
          <DialogDescription>Chia sẻ tệp hoặc liên kết cho sinh viên trong lớp.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file" className="gap-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Tệp</TabsTrigger>
            <TabsTrigger value="link">Liên kết</TabsTrigger>
          </TabsList>

          <TabsContent value="file">
            <form onSubmit={(e) => handleSubmit("file", e)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="material-file" className="sr-only">Tệp</Label>
                <MaterialFilePicker id="material-file" file={file} accept={FILE_ACCEPT} maxMb={MAX_UPLOAD_MB}
                  invalid={!!errors.file} onChange={handleFileChange} />
                {errors.file ? <FieldError text={errors.file} /> : null}
              </div>
              <MaterialFormFields {...sharedProps} />
              {footer("Tải lên", "Đang tải lên…")}
            </form>
          </TabsContent>

          <TabsContent value="link">
            <form onSubmit={(e) => handleSubmit("link", e)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="material-link">Liên kết</Label>
                <Input id="material-link" type="url" inputMode="url" value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://drive.google.com/…" aria-invalid={!!errors.link} />
                {errors.link ? <FieldError text={errors.link} /> : null}
              </div>
              <MaterialFormFields {...sharedProps} defaultType="link" />
              {footer("Lưu liên kết", "Đang lưu…")}
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
