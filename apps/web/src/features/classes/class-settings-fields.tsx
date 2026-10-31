import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface ClassSettings {
  room: string;
  schedule: string;
  status: "active" | "locked";
}

export function ClassSettingsFields({ value, onChange }: {
  value: ClassSettings;
  onChange: (next: ClassSettings) => void;
}) {
  const set = (field: keyof ClassSettings, content: string) => onChange({ ...value, [field]: content });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="class-room">Phòng học</Label>
        <Input id="class-room" maxLength={50} value={value.room} onChange={(e) => set("room", e.target.value)} placeholder="VD: A203" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="class-schedule">Lịch học</Label>
        <Input id="class-schedule" maxLength={100} value={value.schedule} onChange={(e) => set("schedule", e.target.value)} placeholder="VD: Thứ 2, tiết 1–3" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="class-status">Trạng thái</Label>
        <div className="flex h-9 items-center gap-2.5">
          <Switch id="class-status" checked={value.status === "active"} onCheckedChange={(on) => set("status", on ? "active" : "locked")} />
          <span className="text-sm text-muted-foreground">{value.status === "active" ? "Đang hoạt động" : "Đã khóa"}</span>
        </div>
      </div>
    </div>
  );
}