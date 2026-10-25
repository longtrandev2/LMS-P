import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ClassSettings {
  maxStudents: string;
  enrollFrom: string;
  enrollUntil: string;
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
        <Label htmlFor="class-capacity">Sĩ số tối đa</Label>
        <Input id="class-capacity" type="number" min="1" value={value.maxStudents} onChange={(e) => set("maxStudents", e.target.value)} placeholder="Để trống nếu không giới hạn" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="class-status">Trạng thái</Label>
        <Select value={value.status} onValueChange={(v) => set("status", v as ClassSettings["status"])}>
          <SelectTrigger id="class-status"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="active">Đang hoạt động</SelectItem><SelectItem value="locked">Đã khóa</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label htmlFor="enroll-from">Mở ghi danh lúc</Label><Input id="enroll-from" type="datetime-local" value={value.enrollFrom} onChange={(e) => set("enrollFrom", e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="enroll-until">Đóng ghi danh lúc</Label><Input id="enroll-until" type="datetime-local" value={value.enrollUntil} onChange={(e) => set("enrollUntil", e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="class-room">Phòng học</Label><Input id="class-room" maxLength={50} value={value.room} onChange={(e) => set("room", e.target.value)} placeholder="VD: A203" /></div>
      <div className="space-y-2"><Label htmlFor="class-schedule">Lịch học</Label><Input id="class-schedule" maxLength={100} value={value.schedule} onChange={(e) => set("schedule", e.target.value)} placeholder="VD: Thứ 2, tiết 1–3" /></div>
    </div>
  );
}
