import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Pattern Danh sách (DESIGN.md §5): thanh công cụ trong panel — tìm kiếm bên trái,
 * lọc + hành động bên phải; panel = `rounded-xl border bg-card`, bảng ngay dưới.
 *
 * <section className="rounded-xl border bg-card">
 *   <ListToolbar search={<SearchField … />}>{bộ lọc}</ListToolbar>
 *   <Table …/> <DataTablePagination …/>
 * </section>
 */
export function ListToolbar({ search, children, className }: {
  search?: React.ReactNode; children?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-4", className)}>
      {search ? <div className="w-full sm:w-72">{search}</div> : null}
      {children ? <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">{children}</div> : null}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder = "Tìm kiếm…", label, className }: {
  value: string; onChange: (value: string) => void; placeholder?: string; label?: string; className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="pl-9"
      />
    </div>
  );
}
