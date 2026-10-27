import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info } from "lucide-react";
import { ErrorState } from "@/components/state-blocks";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatScore, GRADE_COMPONENT_LABEL } from "@/lib/grades";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { ComponentGrade, GradeComponent, GradePolicy, GradeRow } from "@/types/api";
import { GradeGroup, type GradeLine } from "./grade-group";

type MyGrades = GradeRow & { policy: GradePolicy };

function componentNote(grade: ComponentGrade): string | undefined {
  if (grade.override && (grade.override.source ?? "manual") === "manual") return "Giảng viên điều chỉnh";
  if (grade.status === "missing") return "Chưa có điểm";
  if (grade.status === "provisional") return "Tạm tính";
  return undefined;
}

function componentLine(data: MyGrades, key: GradeComponent): GradeLine {
  const grade = data.components[key];
  const ineligibleFinal = key === "final" && !data.eligible;
  return {
    key,
    label: <>{GRADE_COMPONENT_LABEL[key]} <span className="ml-1 text-muted-foreground tabular-nums">({data.policy.weights[key]}%)</span></>,
    value: formatScore(grade.score, 2),
    note: ineligibleFinal ? "Không đủ điều kiện dự thi" : componentNote(grade),
  };
}

function LetterBadge({ letter, passed }: { letter: string | null; passed: boolean | null }) {
  if (!letter) return <>—</>;
  return passed
    ? <Badge className="h-6 bg-success px-2 text-sm text-white">{letter}</Badge>
    : <Badge variant="destructive" className="h-6 px-2 text-sm">{letter}</Badge>;
}

/** Tab Kết quả học tập của sinh viên (spec §5.5, kiểu S-Link): điểm thành phần, điều kiện dự thi, tổng kết hệ 10/4/chữ. */
export function StudentGradesTab({ classId }: { classId: string }) {
  const query = useQuery({
    queryKey: queryKeys.grades.mine(classId),
    queryFn: ({ signal }) => api.get<MyGrades>(`/me/classes/${classId}/grades`, undefined, signal),
  });

  if (query.isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Đang tải kết quả học tập">
        <Skeleton className="h-6 w-56" />
        <div className="grid gap-6 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
      </div>
    );
  }
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const data = query.data;
  const att = data.attendance;
  const used = att.absent + att.excused;
  const provisional = data.status === "provisional";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">Chi tiết điểm học phần</h2>
        {provisional ? <Badge variant="warning">Tạm tính</Badge>
          : data.passed ? <Badge variant="success">Đạt</Badge> : <Badge variant="destructive">Chưa đạt</Badge>}
      </div>

      {!data.eligible ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          Bạn đã nghỉ quá số buổi cho phép nên không đủ điều kiện dự thi; điểm Cuối kỳ được tính 0.
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <GradeGroup id="grades-attendance" title="Điểm thành phần & điều kiện dự thi" lines={[
          componentLine(data, "attendance"),
          { key: "absences", label: "Số buổi nghỉ", value: <>{used}<span className="font-normal text-muted-foreground">/{att.max_absences} được phép</span></> },
          {
            key: "eligible", label: "Điều kiện dự thi",
            value: <span className={cn(data.eligible ? "text-success" : "text-destructive")}>{data.eligible ? "Đủ điều kiện" : "Không đủ điều kiện"}</span>,
          },
        ]} />
        <GradeGroup id="grades-components" title="Điểm học phần" lines={[
          componentLine(data, "assignment"), componentLine(data, "midterm"), componentLine(data, "final"),
        ]} />
        <GradeGroup id="grades-total" title="Điểm tổng kết" lines={[
          { key: "t10", label: "Điểm hệ 10", value: <span className="text-base">{formatScore(data.total10)}</span> },
          { key: "t4", label: "Điểm hệ 4", value: formatScore(data.total4) },
          { key: "letter", label: "Điểm chữ", value: <LetterBadge letter={data.letter} passed={data.passed} /> },
        ]} />
      </div>

      {provisional ? (
        <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {data.total10 == null
            ? "Điểm tổng kết sẽ hiện khi đủ 4 thành phần. Thành phần chưa có điểm hiển thị “—”."
            : "Điểm đang tạm tính: còn bài chưa đóng hoặc đang chấm, kết quả có thể thay đổi đến khi chốt."}
        </p>
      ) : null}
    </div>
  );
}
