import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { ClassSummary, Paginated } from "@/types/api";

interface Props {
  id: string;
  value: ClassSummary | null;
  onChange: (value: ClassSummary) => void;
  invalid?: boolean;
}

/** Chọn lớp có tìm kiếm (mã, tên lớp hoặc học phần) — dùng API danh sách lớp của trang Học phần & lớp. */
export function ClassPicker({ id, value, onChange, invalid }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => { const timer = setTimeout(() => setQ(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const filters = { page: 1, limit: 20, q: q || undefined, sort: "code" };
  const query = useQuery({
    queryKey: queryKeys.classes.list(filters),
    queryFn: ({ signal }) => api.get<Paginated<ClassSummary>>("/classes", filters, signal),
    placeholderData: keepPreviousData,
    enabled: open,
  });
  const items = query.data?.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="secondary" role="combobox" aria-expanded={open} aria-invalid={invalid}
          className={cn("w-full justify-between font-normal sm:w-80", !value && "text-muted-foreground", invalid && "ring-1 ring-destructive")}>
          <span className="truncate">{value ? <><span className="font-mono">{value.code}</span> · {value.name}</> : "Chọn lớp học phần"}</span>
          <ChevronsUpDown className="opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-1.5">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã, tên lớp hoặc học phần"
          aria-label="Tìm lớp" autoFocus className="mb-1" />
        <ul role="listbox" aria-label="Lớp học phần" className="max-h-64 overflow-y-auto">
          {query.isPending ? <li className="px-2 py-3 text-sm text-muted-foreground">Đang tải…</li>
            : items.length === 0 ? <li className="px-2 py-3 text-sm text-muted-foreground">Không tìm thấy lớp.</li>
            : items.map((c) => (
              <li key={c.id} role="option" aria-selected={value?.id === c.id}>
                <button type="button" onClick={() => { onChange(c); setOpen(false); }}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none">
                  <Check className={cn("mt-0.5 size-4 shrink-0", value?.id === c.id ? "opacity-100" : "opacity-0")} aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate"><span className="font-mono text-xs">{c.code}</span> · {c.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{c.course_name} · {c.semester} · {c.lecturer_name}</span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
