import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FieldError } from "@/components/form-field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Paginated, User } from "@/types/api";

export function ClassLecturerField({ lecturerId, initialName, error, onChange }: {
  lecturerId: number | null; initialName: string; error?: string; onChange: (id: number | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [selectedName, setSelectedName] = useState(initialName);
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  const query = useQuery({
    queryKey: queryKeys.users.list({ page: 1, limit: 10, role: "lecturer", status: "active", q: term }),
    queryFn: ({ signal }) => api.get<Paginated<User>>("/users", { page: 1, limit: 10, role: "lecturer", status: "active", q: term }, signal),
    enabled: term.length >= 2,
  });
  return <div className="space-y-2">
    <Label htmlFor="class-lecturer">Tìm giảng viên phụ trách</Label>
    <Input id="class-lecturer" value={search}
      onChange={(event) => { setSearch(event.target.value); setSelectedName(""); onChange(null); }}
      placeholder={lecturerId ? "Tìm giảng viên khác theo mã, tên hoặc email" : "Tìm mã, tên hoặc email giảng viên"}
      aria-invalid={!!error} aria-describedby="class-lecturer-hint" />
    <p id="class-lecturer-hint" className="text-xs text-muted-foreground">
      {lecturerId ? `Giảng viên phụ trách: ${selectedName}` : "Nhập ít nhất 2 ký tự để xem gợi ý."}
    </p>
    {term.length >= 2 && query.isPending ? <p className="text-sm text-muted-foreground">Đang tìm giảng viên…</p> : null}
    {term.length >= 2 && query.isError ? <FieldError text="Không tải được danh sách giảng viên." /> : null}
    {term.length >= 2 && query.data ? <ul className="max-h-40 divide-y overflow-y-auto rounded-md border">
      {query.data.items.length ? query.data.items.map((user) => <li key={user.id}>
        <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { onChange(user.id); setSelectedName(user.full_name); setSearch(""); setTerm(""); }}>
          <span className="block font-medium">{user.full_name}{user.student_code ? ` · ${user.student_code}` : ""}</span><span className="text-xs text-muted-foreground">{user.email}</span>
        </button>
      </li>) : <li className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy giảng viên.</li>}
    </ul> : null}
    {error ? <FieldError text={error} /> : null}
  </div>;
}
