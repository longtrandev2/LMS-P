import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceSetting } from "@/types/admin";
import { MAINTENANCE_WARNING } from "./maintenance-section";
import { SETTING_LABEL, formatSetting } from "./settings-labels";
import type { SettingsForm } from "./use-settings-form";

/** Thanh hành động dính đáy trang + hộp xác nhận liệt kê thay đổi (cũ → mới) và lý do tùy chọn. */
export function SaveSettingsBar({ form, hasErrors, onInvalid }: { form: SettingsForm; hasErrors: boolean; onInvalid: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const count = form.changes.length;
  const turningOn = form.changes.includes("maintenance")
    && (form.values?.maintenance as MaintenanceSetting | undefined)?.enabled
    && !(form.map.maintenance?.value as MaintenanceSetting | undefined)?.enabled;

  function openConfirm() {
    if (hasErrors) { onInvalid(); return; }
    setReason("");
    setOpen(true);
  }

  async function confirm() {
    try { await form.save.mutateAsync(reason); setOpen(false); } catch { setOpen(false); }
  }

  return (
    <>
      <div className="sticky bottom-0 z-20 -mx-4 -mb-6 sm:-mb-8 flex flex-wrap items-center justify-end gap-2 border-t bg-background px-4 py-3 sm:-mx-8 sm:px-8">
        <p aria-live="polite" className="mr-auto text-sm text-muted-foreground">
          {count > 0 ? <><span className="font-medium text-foreground tabular-nums">{count}</span> thay đổi chưa lưu</>
            : form.savedAt ? `Đã lưu lúc ${form.savedAt}` : "Không có thay đổi"}
        </p>
        <Button variant="outline" disabled={count === 0 || form.save.isPending} onClick={form.reset}>Hủy thay đổi</Button>
        <Button disabled={count === 0 || form.save.isPending} onClick={openConfirm}>{form.save.isPending ? "Đang lưu…" : "Lưu"}</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Lưu {count} thay đổi cấu hình?</DialogTitle>
            <DialogDescription>Thay đổi áp dụng ngay cho toàn hệ thống và được ghi nhật ký kiểm toán.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-72 divide-y overflow-y-auto rounded-lg bg-secondary/60 text-sm">
            {form.changes.map((key) => (
              <li key={key} className="space-y-0.5 px-3 py-2">
                <p className="font-medium">{SETTING_LABEL[key]}</p>
                <p className="text-muted-foreground">
                  <span className="line-through decoration-muted-foreground/50">{formatSetting(key, form.map[key]?.value)}</span>
                  <span aria-hidden> → </span><span className="sr-only"> thành </span>
                  <span className="font-medium text-foreground">{formatSetting(key, form.values?.[key])}</span>
                </p>
              </li>
            ))}
          </ul>
          {turningOn ? (
            <p className="flex gap-2 rounded-lg bg-warning/12 px-3 py-2 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />{MAINTENANCE_WARNING}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="settings-reason">Lý do <span className="font-normal text-muted-foreground">(không bắt buộc)</span></Label>
            <Textarea id="settings-reason" rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)}
              placeholder="Ghi vào nhật ký kiểm toán" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Quay lại</Button>
            <Button disabled={form.save.isPending} onClick={confirm}>{form.save.isPending ? "Đang lưu…" : "Lưu thay đổi"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
