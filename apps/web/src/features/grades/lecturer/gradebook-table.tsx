import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BUSINESS_TABLE } from "@/features/schedule/lecturer/sessions-table";
import { GRADE_COMPONENTS, GRADE_COMPONENT_LABEL, formatScore } from "@/lib/grades";
import { cn } from "@/lib/utils";
import type { GradePolicy, GradeRow } from "@/types/api";
import { GradeCell } from "./grade-cell";

type Tone = "success" | "info" | "default" | "warning" | "destructive";
function letterTone(letter: string): Tone {
  if (letter.startsWith("A")) return "success";
  if (letter.startsWith("B")) return "info";
  if (letter.startsWith("C")) return "default";
  if (letter.startsWith("D")) return "warning";
  return "destructive";
}

/** Bảng sổ điểm: Mã SV · Họ tên · 4 thành phần (ô bấm để ghi đè) · Hệ 10 · Hệ 4 · Chữ · ĐK dự thi. */
export function GradebookTable({ classId, rows, policy }: { classId: string; rows: GradeRow[]; policy: GradePolicy }) {
  return (
    <Table className={BUSINESS_TABLE}>
      <TableHeader>
        <TableRow>
          <TableHead>Mã SV</TableHead>
          <TableHead>Họ tên</TableHead>
          {GRADE_COMPONENTS.map((c) => (
            <TableHead key={c} className="text-right">
              {GRADE_COMPONENT_LABEL[c]} <span className="font-normal tabular-nums">{policy.weights[c]}%</span>
            </TableHead>
          ))}
          <TableHead className="text-right">Hệ 10</TableHead>
          <TableHead className="text-right">Hệ 4</TableHead>
          <TableHead className="text-center">Chữ</TableHead>
          <TableHead>ĐK dự thi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const provisional = row.status === "provisional";
          return (
            <TableRow key={row.student_id}>
              <TableCell className="font-mono text-xs">{row.student_code ?? "—"}</TableCell>
              <TableCell className="font-medium">{row.full_name}</TableCell>
              {GRADE_COMPONENTS.map((c) => <TableCell key={c} className="px-1.5 text-right"><GradeCell classId={classId} row={row} component={c} /></TableCell>)}
              <TableCell className={cn("text-right font-semibold tabular-nums", provisional && "font-medium text-muted-foreground")}
                title={provisional ? "Tạm tính" : undefined}>
                {formatScore(row.total10)}
              </TableCell>
              <TableCell className={cn("text-right tabular-nums", provisional && "text-muted-foreground")}>
                {row.total4 == null ? "—" : row.total4.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </TableCell>
              <TableCell className="text-center">
                {row.letter ? <Badge variant={letterTone(row.letter)} className={cn("min-w-8", provisional && "opacity-70")}>{row.letter}</Badge>
                  : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Badge variant={row.eligible ? "success" : "destructive"}>{row.eligible ? "Đủ điều kiện" : "Không đủ"}</Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="tabular-nums">
                    Nghỉ {row.attendance.absent + row.attendance.excused}/{row.attendance.max_absences} buổi cho phép
                    {" "}· vắng {row.attendance.absent}, có phép {row.attendance.excused}, muộn {row.attendance.late}
                  </TooltipContent>
                </Tooltip>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
