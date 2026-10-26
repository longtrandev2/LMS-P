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

/** Mã sinh viên hoặc email (api-spec §3) — mỗi dòng 1 định danh */
function parseIdentifiers(text: string): { rows: { student_code?: string; email?: string }[] } {
  const rows: { student_code?: string; email?: string }[] = [];
  for (const line of text.split(/[\n,;]+/)) {
    const token = line.trim();
    if (!token) continue;
    if (token.includes("@")) rows.push({ email: token });
    else rows.push({ student_code: token });
  }
  return { rows };
}

/** POST /classes/{id}/enrollments — body {"students":[{student_code}|{email}]} (api-spec §3) */
export function EnrollStudentsDialog({ onOpenChange, classId, onEnrolled }: EnrollStudentsDialogProps) {
  const [singleId, setSingleId] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<{ row: number; reason: string }[]>([]);

  async function enroll(rows: { student_code?: string; email?: string }[]) {
    setSubmitting(true);
    setRowErrors([]);
    try {
      const data = await api.post<{ added: number; errors: { row: number; code: string; reason: string }[] }>(
        `/classes/${classId}/enrollments`,
        { students: rows }
      );
      if (data.errors.length > 0) {
        setRowErrors(data.errors);
        toast.success(`Đã ghi danh ${data.added} sinh viên; ${data.errors.length} dòng lỗi.`);
      } else {
        toast.success(`Đã ghi danh ${data.added} sinh viên vào lớp.`);
        onOpenChange(false);
        setSingleId("");
        setBulkText("");
      }
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
    const token = singleId.trim();
    if (!token) {
      setErrors((prev) => ({ ...prev, single: "Nhập mã sinh viên hoặc email." }));
      return;
    }
    enroll(token.includes("@") ? [{ email: token }] : [{ student_code: token }]);
  }

  function handleBulk(e: React.FormEvent) {
    e.preventDefault();
    const { rows } = parseIdentifiers(bulkText);
    if (rows.length === 0) {
      setErrors((prev) => ({ ...prev, bulk: "Dán ít nhất một mã sinh viên hoặc email." }));
      return;
    }
    enroll(rows);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Thêm sinh viên vào lớp</DialogTitle>
          <DialogDescription>
            Ghi danh từng sinh viên hoặc dán danh sách mã SV / email hàng loạt.
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
                <Label htmlFor="enroll-single">Mã sinh viên hoặc email</Label>
                <Input
                  id="enroll-single"
                  value={singleId}
                  onChange={(e) => setSingleId(e.target.value)}
                  className="font-mono"
                  placeholder="VD: SV2021001 hoặc sv@school.edu"
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
                <Label htmlFor="enroll-bulk">Danh sách mã SV / email</Label>
                <Textarea
                  id="enroll-bulk"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                  placeholder={"Mỗi dòng một mã SV hoặc email, ví dụ:\nSV2021001\nsv@school.edu"}
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

        {rowErrors.length > 0 ? (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            <p className="font-medium">{rowErrors.length} dòng không ghi danh được:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {rowErrors.map((item) => (
                <li key={item.row}>
                  Dòng {item.row}: {item.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
