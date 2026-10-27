import { useState } from "react";
import { Download, FileUp, GraduationCap, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { errorText } from "@/lib/error-messages";
import { GRADE_COMPONENTS, GRADE_COMPONENT_LABEL, formatScore } from "@/lib/grades";
import type { ClassSummary } from "@/types/api";
import { GradeImportDialog } from "./grade-import-dialog";
import { GradePolicyDialog } from "./grade-policy-dialog";
import { GradebookTable } from "./gradebook-table";
import { exportGradebook, useGradebook } from "./use-gradebook";

/** Tab Kết quả học tập (sổ điểm giảng viên — spec §5.5): trọng số + cấu hình, nhập/xuất CSV, bảng điểm. */
export function GradebookTab({ classId, clazz }: { classId: string; clazz?: ClassSummary }) {
  const query = useGradebook(classId);
  const [dialog, setDialog] = useState<"policy" | "import" | null>(null);
  const [exporting, setExporting] = useState(false);
  const policy = query.data?.policy;
  const rows = [...(query.data?.items ?? [])].sort((a, b) => (a.student_code ?? "").localeCompare(b.student_code ?? ""));

  async function onExport() {
    setExporting(true);
    try { await exportGradebook(classId, `so-diem-${clazz?.code ?? classId}.csv`); }
    catch (e) { toast.error(errorText(e)); }
    finally { setExporting(false); }
  }

  return (
    <section aria-label="Kết quả học tập" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-2" aria-label="Trọng số hiện tại">
          {GRADE_COMPONENTS.map((c) => (
            <li key={c} className="rounded-lg bg-secondary px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">{GRADE_COMPONENT_LABEL[c]}</span>{" "}
              <strong className="font-semibold tabular-nums">{policy ? `${policy.weights[c]}%` : "…"}</strong>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={!policy} onClick={() => setDialog("policy")}><Settings2 aria-hidden /> Cấu hình</Button>
          <Button variant="secondary" onClick={() => setDialog("import")}><FileUp aria-hidden /> Nhập CSV điểm GK/CK</Button>
          <Button variant="secondary" disabled={exporting} onClick={onExport}><Download aria-hidden /> {exporting ? "Đang xuất…" : "Xuất CSV"}</Button>
        </div>
      </div>
      {policy ? (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-[13px] text-muted-foreground tabular-nums">
          <p>
            Chuyên cần: nghỉ tối đa {policy.attendance.max_absences ?? "20% số"} buổi · trừ {formatScore(policy.attendance.absent_penalty, 2)} điểm mỗi buổi vắng,
            {" "}{formatScore(policy.attendance.late_penalty, 2)} mỗi buổi muộn, {formatScore(policy.attendance.excused_penalty, 2)} mỗi buổi có phép
          </p>
          <p className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-info" aria-hidden />Đã ghi đè</span>
            <span><span className="text-muted-foreground/70">Số nhạt</span> = tạm tính</span>
          </p>
        </div>
      ) : null}

      {query.isPending ? <TableSkeleton cols={8} rows={4} />
        : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
        : rows.length === 0 ? <EmptyState icon={GraduationCap} title="Lớp chưa có sinh viên" description="Sổ điểm hiện khi lớp có sinh viên đang học." />
        : <GradebookTable classId={classId} rows={rows} policy={query.data.policy} />}

      {dialog === "policy" && policy ? <GradePolicyDialog classId={classId} policy={policy} onOpenChange={(o) => { if (!o) setDialog(null); }} /> : null}
      {dialog === "import" ? <GradeImportDialog classId={classId} onOpenChange={(o) => { if (!o) setDialog(null); }} /> : null}
    </section>
  );
}
