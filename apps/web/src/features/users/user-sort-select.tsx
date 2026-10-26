import { ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function UserSortSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-44" aria-label="Sắp xếp người dùng"><ArrowUpDown className="text-muted-foreground" aria-hidden /><SelectValue /></SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="-created_at">Mới tạo trước</SelectItem>
        <SelectItem value="full_name">Tên A–Z</SelectItem>
        <SelectItem value="-full_name">Tên Z–A</SelectItem>
        <SelectItem value="-last_login_at">Đăng nhập gần đây</SelectItem>
      </SelectContent>
    </Select>
  );
}
