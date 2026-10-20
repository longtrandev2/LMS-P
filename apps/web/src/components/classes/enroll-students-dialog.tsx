"use client";

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
import { FieldError } from "@/components/users/user-form-dialog";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";

interface EnrollStudentsDialogProps {
  onOpenChange: (open: boolean) => void;
  classId: string;
  onEnrolled: () => void;
}

function parseIds(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** POST /classes/{id}/enrollments — body [{student_id}] (1 hoặc bulk theo api-spec §3) */
export function EnrollStudentsDialog({ onOpenChange, classId, onEnrolled }: EnrollStudentsDialogProps) {
  const [singleId, setSingleId] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function enroll(ids: string[]) {
    setSubmitting(true);
    try {
      await api.post(`/classes/${classId}/enrollments`, ids.map((student_id) => ({ student_id })));
      toast.success(`Đã ghi danh ${ids.length} sinh viên vào lớp.`);
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
    const id = singleId.trim();
    if (!id) {
      setErrors((prev) => ({ ...prev, single: "Nhập mã định danh (ID) của sinh viên." }));
      return;
    }
    enroll([id]);
  }

  function handleBulk(e: React.FormEvent) {
    e.preventDefault();
    const ids = parseIds(bulkText);
    if (ids.length === 0) {
      setErrors((prev) => ({ ...prev, bulk: "Dán ít nhất một ID sinh viên." }));
      return;
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
                  value={singleId}
                  onChange={(e) => setSingleId(e.target.value)}
                  className="font-mono"
                  placeholder="ID tài khoản sinh viên"
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
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                  placeholder={"Mỗi dòng một ID, ví dụ:\n3f1c...\n9ab2..."}
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
