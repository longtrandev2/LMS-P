import { ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SortOption { value: string; label: string }
export function SortSelect({ value, onChange, options, label = "Sắp xếp", className }: {
  value: string; onChange: (value: string) => void; options: SortOption[]; label?: string; className?: string;
}) {
  return <Select value={value} onValueChange={onChange}>
    <SelectTrigger className={cn("w-full sm:w-44", className)} aria-label={label}>
      <ArrowUpDown className="text-muted-foreground" aria-hidden /><SelectValue />
    </SelectTrigger>
    <SelectContent align="end">{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
  </Select>;
}
