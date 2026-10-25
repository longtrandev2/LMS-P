import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ClassSearchField({ value, onChange, placeholder = "Tìm theo mã, tên lớp hoặc học kỳ" }: {
  value: string; onChange: (value: string) => void; placeholder?: string;
}) {
  return <div className="relative max-w-md">
    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" aria-label="Tìm lớp học" />
  </div>;
}
