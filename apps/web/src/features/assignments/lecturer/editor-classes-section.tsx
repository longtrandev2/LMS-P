import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CHOICE_BAR, EditorSection } from "./editor-layout";
import type { ClassSummary, Paginated } from "@/types/api";

/** Chọn các lớp cùng học phần do giảng viên phụ trách — mỗi lớp nhận một bản riêng (`POST /assignments/bulk`). */
export function EditorClassesSection({ classId, value, onChange, error }: {
  classId: number; value: number[]; onChange: (ids: number[]) => void; error?: string;
}) {
  const current = useQuery({
    queryKey: queryKeys.classes.detail(String(classId)),
    queryFn: ({ signal }) => api.get<ClassSummary>(`/classes/${classId}`, undefined, signal),
  });
  const courseId = current.data?.course_id;
  const filters = { course_id: courseId != null ? String(courseId) : undefined, page: 1, limit: 100 };
  const classes = useQuery({
    queryKey: queryKeys.classes.list(filters),
    queryFn: ({ signal }) => api.get<Paginated<ClassSummary>>("/classes", filters, signal),
    enabled: courseId != null,
  });
  const items = classes.data?.items ?? (current.data ? [current.data] : []);
  const toggle = (id: number, checked: boolean) =>
    onChange(checked ? [...new Set([...value, id])] : value.filter((item) => item !== id));

  return <EditorSection id="classes" title="Giao cho lớp"
    description={current.data ? `Các lớp bạn phụ trách thuộc học phần ${current.data.course_code} · ${current.data.course_name}. Mỗi lớp nhận một bài riêng để quản lý điểm.` : "Các lớp bạn phụ trách trong cùng học phần."}>
    {current.isPending || (classes.isPending && courseId != null) ? <div className="grid gap-2 sm:grid-cols-2">
      <Skeleton className="h-12" /><Skeleton className="h-12" />
    </div> : null}
    {current.isError || classes.isError ? <p role="alert" className="text-sm text-destructive">Không tải được danh sách lớp: {errorText(current.error ?? classes.error)}</p> : null}
    {items.length ? <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="sr-only">Lớp nhận bài</legend>
      {items.map((item) => {
        const id = `target-class-${item.id}`;
        return <label key={item.id} htmlFor={id} className={cn(CHOICE_BAR, "cursor-pointer items-center hover:bg-accent")}>
          <Checkbox id={id} checked={value.includes(item.id)} onCheckedChange={(checked) => toggle(item.id, checked === true)} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{item.name}</span>
            <span className="block font-mono text-xs text-muted-foreground">{item.code} · {item.semester}{item.id === classId ? " · lớp hiện tại" : ""}</span>
          </span>
        </label>;
      })}
    </fieldset> : null}
    {error ? <p role="alert" className="text-xs text-destructive">{error}</p>
      : <p className="text-xs text-muted-foreground tabular-nums">Đã chọn {value.length} lớp.</p>}
  </EditorSection>;
}
