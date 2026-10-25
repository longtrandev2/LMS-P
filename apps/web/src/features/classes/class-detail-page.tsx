import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { EnrollStudentsDialog } from "@/features/classes/enroll-students-dialog";
import { RemoveStudentButton } from "@/features/classes/remove-student-button";
import { MaterialsSection } from "@/features/materials/materials-section";
import { AssignmentsSection } from "@/features/assignments/assignments-section";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { hasRole } from "@/stores/auth";
import { ClassSearchField } from "@/features/classes/class-search-field";
import { DataTablePagination } from "@/components/data-table-pagination";
import { SortSelect } from "@/components/sort-select";
import type { ClassStudent, ClassSummary, Paginated } from "@/types/api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function ClassDetailPage({ classId }: { classId: string }) {
  const { status: guard, user } = useAuthGuard(["admin", "lecturer"]);
  const queryClient = useQueryClient();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [tab, setTab] = useState("students");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [studentSort, setStudentSort] = useState("full_name");
  useEffect(() => setStudentPage(1), [studentSearch]);
  const canManageMaterials = hasRole(user, "lecturer");
  const canManageAssignments = hasRole(user, "lecturer") || hasRole(user, "admin");

  const classQuery = useQuery({
    queryKey: queryKeys.classes.detail(classId),
    queryFn: ({ signal }) => api.get<ClassSummary>(`/classes/${classId}`, undefined, signal),
    enabled: guard === "ok",
  });
  const studentsQuery = useQuery({
    queryKey: queryKeys.classes.students(classId, { page: studentPage, limit: 20, q: studentSearch.trim() || undefined, sort: studentSort }),
    queryFn: ({ signal }) =>
      api.get<Paginated<ClassStudent>>(`/classes/${classId}/students`, { page: studentPage, limit: 20, q: studentSearch.trim() || undefined, sort: studentSort }, signal),
    enabled: guard === "ok",
  });

  if (guard !== "ok") return null;

  const clazz = classQuery.data;
  const students = studentsQuery.data?.items;

  function invalidateStudents() {
    queryClient.invalidateQueries({ queryKey: queryKeys.classes.students(classId) });
  }

  return (
    <div className="space-y-6">
      <Link
        to={clazz ? `/courses/${clazz.course_id}` : "/courses"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {clazz ? `Khóa học ${clazz.course_code}` : "Khóa học"}
      </Link>

      <PageHeader
        title={clazz ? clazz.name : "Chi tiết lớp"}
        description={
          clazz
            ? `Mã lớp ${clazz.code} · Học kỳ ${clazz.semester}${clazz.lecturer_name ? ` · GV: ${clazz.lecturer_name}` : ""}${clazz.room ? ` · Phòng ${clazz.room}` : ""}${clazz.schedule ? ` · ${clazz.schedule}` : ""}`
            : "Đang tải thông tin lớp…"
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="students">Sinh viên</TabsTrigger>
            <TabsTrigger value="materials">Học liệu</TabsTrigger>
            <TabsTrigger value="assignments">Bài tập & Quiz</TabsTrigger>
          </TabsList>
          {tab === "students" ? (
            <Button size="sm" onClick={() => setEnrollOpen(true)}>
              <UserPlus aria-hidden /> Thêm sinh viên
            </Button>
          ) : null}
        </div>

        <TabsContent value="students" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-wrap gap-3 p-4 pb-0"><ClassSearchField value={studentSearch} onChange={setStudentSearch} placeholder="Tìm theo tên, email hoặc mã sinh viên" />
                <SortSelect value={studentSort} onChange={(value) => { setStudentSort(value); setStudentPage(1); }} options={[{ value: "full_name", label: "Theo tên" }, { value: "student_code", label: "Theo mã sinh viên" }, { value: "enrolled_at", label: "Theo ngày ghi danh" }]} />
              </div>
              {studentsQuery.isPending ? (
                <TableSkeleton cols={4} />
              ) : studentsQuery.isError ? (
                <ErrorState error={studentsQuery.error} onRetry={() => studentsQuery.refetch()} />
              ) : students && students.length === 0 ? (
                <EmptyState
                  title="Chưa có sinh viên nào trong lớp"
                  description="Thêm sinh viên bằng mã sinh viên hoặc email — từng người hoặc hàng loạt."
                  action={
                    <Button onClick={() => setEnrollOpen(true)}>
                      <UserPlus aria-hidden /> Thêm sinh viên
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12 text-right">#</TableHead>
                      <TableHead>Sinh viên</TableHead>
                      <TableHead>Mã SV</TableHead>
                      <TableHead>Ngày ghi danh</TableHead>
                      <TableHead className="w-24 text-right">
                        <span className="sr-only">Thao tác</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students?.map((student, index) => (
                      <TableRow key={student.user_id}>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                          {(studentPage - 1) * 20 + index + 1}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {student.student_code ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(student.enrolled_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <RemoveStudentButton
                            classId={classId}
                            student={student}
                            onRemoved={invalidateStudents}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {studentsQuery.data && students && students.length > 0 ? <DataTablePagination page={studentsQuery.data.page} limit={studentsQuery.data.limit} total={studentsQuery.data.total} onPageChange={setStudentPage} /> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="mt-4">
          <MaterialsSection classId={classId} canManage={canManageMaterials} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <AssignmentsSection classId={classId} canManage={canManageAssignments} />
        </TabsContent>
      </Tabs>

      {enrollOpen ? (
        <EnrollStudentsDialog
          onOpenChange={setEnrollOpen}
          classId={classId}
          onEnrolled={invalidateStudents}
        />
      ) : null}
    </div>
  );
}
