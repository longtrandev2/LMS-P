import { Link } from "react-router-dom";
import { CalendarRange, GraduationCap, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ClassSummary } from "@/types/api";

/** Vạch màu nhận diện khóa học — xoay theo mã, giúp phân biệt nhanh thẻ lớp */
const COURSE_STRIPES = [
  "bg-cta",
  "bg-primary",
  "bg-success",
  "bg-primary/40",
] as const;

function stripeFor(code: string): string {
  let hash = 0;
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return COURSE_STRIPES[Math.abs(hash) % COURSE_STRIPES.length];
}

/** Pill trạng thái lớp: active = đỏ nhạt, locked = xám */
export function ClassStatusPill({ status }: { status?: string | null }) {
  if (!status) return null;
  return status === "active" ? (
    <Badge variant="outline" className="cursor-default border-cta/25 bg-cta/10 text-cta">
      Đang mở
    </Badge>
  ) : (
    <Badge variant="outline" className="cursor-default bg-muted text-muted-foreground">
      Đã khóa
    </Badge>
  );
}

/** Thẻ lớp học của sinh viên — dùng ở dashboard và trang Lớp học */
export function MyClassCard({ clazz }: { clazz: ClassSummary }) {
  return (
    <Link
      to={`/me/classes/${clazz.id}`}
      className="block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      <Card
        className="group relative h-full overflow-hidden gap-0 py-0 transition-colors duration-200 hover:border-cta/40"
      >
        <span
          aria-hidden
          className={cn("absolute inset-y-0 left-0 w-1.5", stripeFor(clazz.course_code))}
        />
        <CardContent className="space-y-3 p-5 pl-6">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
              {clazz.code}
            </span>
            <ClassStatusPill status={clazz.status} />
          </div>
          <h3 className="font-heading text-lg font-bold leading-snug">
            {clazz.name}
          </h3>
          <div className="space-y-1 border-t pt-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <GraduationCap className="size-4 shrink-0" aria-hidden />
              {clazz.course_name}
              <span className="font-mono text-xs">({clazz.course_code})</span>
            </p>
            {clazz.lecturer_name ? (
              <p className="flex items-center gap-2">
                <UserRound className="size-4 shrink-0" aria-hidden />
                GV: {clazz.lecturer_name}
              </p>
            ) : null}
            <p className="flex items-center gap-2">
              <CalendarRange className="size-4 shrink-0" aria-hidden />
              Học kỳ {clazz.semester}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
