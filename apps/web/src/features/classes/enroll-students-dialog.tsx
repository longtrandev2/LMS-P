import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldError } from "@/components/form-field-error";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";

interface EnrollStudentsDialogProps {
  onOpenChange: (open: boolean) => void;
  classId: string;
  onEnrolled: () => void;
}

/** ID sinh viên là số nguyên (BIGINT) — parse và báo lỗi dòng không hợp lệ */
function parseIds(text: string): { ids: number[]; invalid: string[] } {
  const ids: number[] = [];
  const invalid: string[] = [];
  for (const line of text.split(/[\n,;]+/)) {
    const token = line.trim();
    if (!token) continue;
    if (/^\d+$/.test(token)) ids.push(Number(token));
    else invalid.push(token);
  }
  return { ids, invalid };
}

/** POST /classes/{id}/enrollments — body [{student_id}] (1 hoặc bulk theo api-spec §3) */
export function EnrollStudentsDialog({ onOpenChange, classId, onEnrolled }: EnrollStudentsDialogProps) {
  const [singleId, setSingleId] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function enroll(ids: number[]) {
    setSubmitting(true);
    try {
      const data = await api.post<{ added: number }>(
        `/classes/${classId}/enrollments`,
        ids.map((student_id) => ({ student_id }))
      );
      if (data.added < ids.length) {
        toast.success(
          `Đã ghi danh ${data.added} sinh viên; ${ids.length - data.added} đã ở trong lớp từ trước.`
        );
      } else {
        toast.success(`Đã ghi danh ${data.added} sinh viên vào lớp.`);
      }
      onOpenChange(false);
      setSingleId("");
      setBulkText("");
      setErrors({});
      onEnrolled();
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSingle(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d+$/.test(singleId.trim())) {
      setErrors((prev) => ({ ...prev, single: "ID sinh viên là số (vd: 42)." }));
      return;
    }
    enroll([Number(singleId.trim())]);
  }

  function handleBulk(e: React.FormEvent) {
    e.preventDefault();
    const { ids, invalid } = parseIds(bulkText);
    if (ids.length === 0) {
      setErrors((prev) => ({ ...prev, bulk: "Dán ít nhất một ID sinh viên (số)." }));
      return;
    }
    if (invalid.length > 0) {
      setErrors((prev) => ({
        ...prev,
        bulk: `Các dòng không phải số bị bỏ qua: ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "…" : ""}`,
      }));
    }
    enroll(ids);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Thêm sinh viên vào lớp</DialogTitle>
          <DialogDescription>
            Ghi danh từng sinh viên hoặc dán danh sách ID hàng loạt.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Thêm một sinh viên</TabsTrigger>
            <TabsTrigger value="bulk">Thêm hàng loạt</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <form onSubmit={handleSingle} className="space-y-4 pt-2" noValidate>
              <div className="space-y-2">
                <Label htmlFor="enroll-single">ID sinh viên</Label>
                <Input
                  id="enroll-single"
                  inputMode="numeric"
                  value={singleId}
                  onChange={(e) => setSingleId(e.target.value)}
                  className="font-mono"
                  placeholder="Số ID tài khoản, vd: 42"
                  aria-invalid={!!errors.single}
                />
                {errors.single ? <FieldError text={errors.single} /> : null}
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang ghi danh…" : "Ghi danh"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="bulk">
            <form onSubmit={handleBulk} className="space-y-4 pt-2" noValidate>
              <div className="space-y-2">
                <Label htmlFor="enroll-bulk">Danh sách ID sinh viên</Label>
                <Textarea
                  id="enroll-bulk"
                  inputMode="numeric"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                  placeholder={"Mỗi dòng một ID số, ví dụ:\n42\n57"}
                  aria-invalid={!!errors.bulk}
                />
                {errors.bulk ? <FieldError text={errors.bulk} /> : null}
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang ghi danh…" : "Ghi danh tất cả"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
