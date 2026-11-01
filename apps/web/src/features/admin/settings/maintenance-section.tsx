import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { type SettingsDraft, draftFrom } from "./settings-model";
import { FieldHelp, SettingsSection } from "./settings-section";
import type { SettingsForm } from "./use-settings-form";

export const MAINTENANCE_WARNING =
  "Sinh viên và giảng viên sẽ không thể bắt đầu bài mới, chạy thử, tạo đơn xin nghỉ hay upload học liệu. Phiên làm bài đang diễn ra vẫn tự lưu và nộp bình thường.";

/** Nhóm "Bảo trì" — admin-spec §5.2. Bật cần xác nhận riêng; thay đổi chỉ có hiệu lực sau khi Lưu. */
export function MaintenanceSection({ form, draft }: { form: SettingsForm; draft: SettingsDraft }) {
  const [confirmOn, setConfirmOn] = useState(false);
  const saved = draftFrom(form.map).maintenance;
  const error = form.serverErrors.maintenance ?? form.clientErrors.maintenance;
  const setEnabled = (enabled: boolean) => form.update((d) => ({ ...d, maintenance: { ...d.maintenance, enabled } }), "maintenance");

  return (
    <SettingsSection id="maintenance" title="Bảo trì" keys={["maintenance"]} map={form.map}
      description="Tạm chặn các thao tác bắt đầu việc mới. Mọi người dùng thấy dải cảnh báo vàng trên đầu trang.">
      <div className="flex items-center gap-3">
        <Switch id="maintenance-enabled" checked={draft.maintenance.enabled}
          onCheckedChange={(on) => (on ? setConfirmOn(true) : setEnabled(false))} />
        <Label htmlFor="maintenance-enabled">Bật chế độ bảo trì</Label>
        {saved.enabled ? <Badge variant="warning">Đang bật</Badge> : <Badge>Đang tắt</Badge>}
      </div>
      <div className="max-w-xl space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="maintenance-message">Thông điệp hiển thị</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{draft.maintenance.message.length}/500</span>
        </div>
        <Textarea id="maintenance-message" rows={3} maxLength={500} value={draft.maintenance.message} aria-invalid={Boolean(error)}
          aria-describedby="maintenance-help" placeholder="Ví dụ: Hệ thống bảo trì đến 23:00 tối nay."
          onChange={(event) => form.update((d) => ({ ...d, maintenance: { ...d.maintenance, message: event.target.value } }), "maintenance")} />
        <FieldHelp id="maintenance-help" defaultText="tắt, không có thông điệp" hint="Hiện trên dải cảnh báo và trong lỗi trả về khi bị chặn" error={error} />
      </div>

      <AlertDialog open={confirmOn} onOpenChange={setConfirmOn}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bật chế độ bảo trì?</AlertDialogTitle>
            <AlertDialogDescription>{MAINTENANCE_WARNING}</AlertDialogDescription>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">Chế độ bảo trì có hiệu lực sau khi bạn bấm <span className="font-medium text-foreground">Lưu</span>.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => setEnabled(true)}>Bật bảo trì</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
