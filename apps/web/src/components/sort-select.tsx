import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SortOption { value: string; label: string }
export function SortSelect({ value, onChange, options, label = "Sắp xếp" }: {
  value: string; onChange: (value: string) => void; options: SortOption[]; label?: string;
}) {
  return <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-48" aria-label={label}><SelectValue /></SelectTrigger>
    <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
  </Select>;
}
