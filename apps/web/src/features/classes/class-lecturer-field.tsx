import { useQuery } from "@tanstack/react-query";
import { FieldError } from "@/components/form-field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Paginated, User } from "@/types/api";

export function ClassLecturerField({ isAdmin, lecturerId, fullName, error, onChange }: {
  isAdmin: boolean; lecturerId: number | null; fullName: string; error?: string; onChange: (id: number) => void;
}) {
  const query = useQuery({
    queryKey: queryKeys.users.list({ page: 1, limit: 100, role: "lecturer" }),
    queryFn: ({ signal }) => api.get<Paginated<User>>("/users", { page: 1, limit: 100, role: "lecturer" }, signal),
    enabled: isAdmin,
  });
  return <div className="space-y-2">
    <Label htmlFor="class-lecturer">Giảng viên phụ trách</Label>
    {isAdmin ? query.isPending ? <Skeleton className="h-9 w-full" /> : query.isError ? <FieldError text="Không tải được danh sách giảng viên." /> : (
      <Select value={lecturerId != null ? String(lecturerId) : undefined} onValueChange={(value) => onChange(Number(value))}>
        <SelectTrigger id="class-lecturer" aria-invalid={!!error}><SelectValue placeholder="Chọn giảng viên" /></SelectTrigger>
        <SelectContent>{query.data?.items.map((lecturer) => <SelectItem key={lecturer.id} value={String(lecturer.id)}>{lecturer.full_name} ({lecturer.email})</SelectItem>)}</SelectContent>
      </Select>
    ) : <Input id="class-lecturer" value={fullName} disabled aria-describedby="class-lecturer-hint" />}
    {!isAdmin ? <p id="class-lecturer-hint" className="text-xs text-muted-foreground">Bạn là giảng viên phụ trách lớp này.</p> : null}
    {error ? <FieldError text={error} /> : null}
  </div>;
}
