import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { FieldError } from "@/components/form-field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ClassLecturer, Paginated, User } from "@/types/api";

export function ClassLecturerField({ lecturers, error, onChange }: {
  lecturers: ClassLecturer[]; error?: string; onChange: (lecturers: ClassLecturer[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const query = useQuery({
    queryKey: queryKeys.users.list({ page: 1, limit: 10, role: "lecturer", status: "active", q: term }),
    queryFn: ({ signal }) => api.get<Paginated<User>>("/users", { page: 1, limit: 10, role: "lecturer", status: "active", q: term }, signal),
    enabled: term.length >= 2,
  });
  function add(user: User) {
    if (!lecturers.some((item) => item.id === user.id))
      onChange([...lecturers, { id: user.id, full_name: user.full_name, avatar_url: user.avatar_url }]);
    setSearch(""); setTerm("");
  }
  return <div className="space-y-2">
    <Label htmlFor="class-lecturer">Giảng viên phụ trách</Label>
    {lecturers.length > 0 ? <ul aria-label="Giảng viên đã chọn" className="space-y-1">
      {lecturers.map((user) => <li key={user.id} className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-1.5 text-sm">
        <span className="min-w-0 break-words">{user.full_name}</span>
        <Button type="button" variant="ghost" size="icon-xs" aria-label={`Gỡ giảng viên ${user.full_name}`}
          onClick={() => onChange(lecturers.filter((item) => item.id !== user.id))}><X className="size-3.5" aria-hidden /></Button>
      </li>)}
    </ul> : null}
    <Input id="class-lecturer" value={search} onChange={(event) => setSearch(event.target.value)}
      placeholder="Tìm để thêm giảng viên theo mã, tên hoặc email"
      aria-invalid={!!error} aria-describedby="class-lecturer-hint" />
    <p id="class-lecturer-hint" className="text-xs text-muted-foreground">Chọn ít nhất một giảng viên. Nhập ít nhất 2 ký tự để tìm thêm.</p>
    {search.trim().length >= 2 && term === search.trim() && query.isPending ? <p className="text-sm text-muted-foreground">Đang tìm giảng viên…</p> : null}
    {term.length >= 2 && term === search.trim() && query.isError ? <FieldError text="Không tải được danh sách giảng viên." /> : null}
    {term.length >= 2 && term === search.trim() && query.data ? <ul className="max-h-40 divide-y overflow-y-auto rounded-md border">
      {query.data.items.length ? query.data.items.map((user) => {
        const selected = lecturers.some((item) => item.id === user.id);
        return <li key={user.id}>
          <button type="button" disabled={selected} className="w-full px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-default disabled:opacity-50" onClick={() => add(user)}>
            <span className="block font-medium">{user.full_name}{user.student_code ? ` · ${user.student_code}` : ""}{selected ? " · Đã chọn" : ""}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </button>
        </li>;
      }) : <li className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy giảng viên.</li>}
    </ul> : null}
    {error ? <FieldError text={error} /> : null}
  </div>;
}
