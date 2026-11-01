import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatUtcDateTime, utcDateTimeMillis } from "@/lib/date-time";
import { LANGUAGES } from "@/lib/languages";
import type { FailedSubmission } from "@/types/admin";

const pad = (n: number) => String(n).padStart(2, "0");
/** "27/10 14:12" — đủ gọn cho cột bảng; giờ đầy đủ ở tooltip. */
function shortTime(value: string): string {
  const d = new Date(utcDateTimeMillis(value));
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  items: FailedSubmission[];
  selected: Set<number>;
  onToggle: (id: number, on: boolean) => void;
  onTogglePage: (on: boolean) => void;
}

/** Bảng bài chấm lỗi (status = failed), chọn nhiều để chấm lại — admin-spec §4. */
export function FailedSubmissionsTable({ items, selected, onToggle, onTogglePage }: Props) {
  const onPage = items.filter((item) => selected.has(item.submission_id)).length;
  const headState = onPage === 0 ? false : onPage === items.length ? true : "indeterminate";

  return (
    <Table>
      <TableHeader className="bg-secondary/60">
        <TableRow>
          <TableHead className="w-10">
            <Checkbox checked={headState} onCheckedChange={(value) => onTogglePage(value === true)} aria-label="Chọn tất cả bài trên trang" />
          </TableHead>
          <TableHead>Bài</TableHead>
          <TableHead className="hidden md:table-cell">Lớp</TableHead>
          <TableHead>Sinh viên</TableHead>
          <TableHead className="hidden lg:table-cell">Ngôn ngữ</TableHead>
          <TableHead className="hidden sm:table-cell">Nộp lúc</TableHead>
          <TableHead>Lỗi</TableHead>
          <TableHead className="text-right whitespace-nowrap">Lần chấm</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const checked = selected.has(item.submission_id);
          return (
            <TableRow key={item.submission_id} data-state={checked ? "selected" : undefined} className="hover:bg-secondary/60">
              <TableCell>
                <Checkbox checked={checked} onCheckedChange={(value) => onToggle(item.submission_id, value === true)}
                  aria-label={`Chọn bài #${item.submission_id} của ${item.student_full_name}`} />
              </TableCell>
              <TableCell className="max-w-52">
                <Link to={`/submissions/${item.submission_id}`} className="block truncate font-medium hover:text-primary hover:underline">
                  {item.assignment_title}
                </Link>
                <span className="font-mono text-xs text-muted-foreground">#{item.submission_id}</span>
              </TableCell>
              <TableCell className="hidden font-mono text-xs md:table-cell">{item.class_code}</TableCell>
              <TableCell>
                <p className="truncate">{item.student_full_name}</p>
                {item.student_code ? <span className="font-mono text-xs text-muted-foreground">{item.student_code}</span> : null}
              </TableCell>
              <TableCell className="hidden lg:table-cell">{LANGUAGES.find((l) => l.id === item.language)?.short ?? item.language ?? "—"}</TableCell>
              <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">
                <time dateTime={item.submitted_at} title={formatUtcDateTime(item.submitted_at)}>{shortTime(item.submitted_at)}</time>
              </TableCell>
              <TableCell className="max-w-40">
                {item.error_message ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0} className="block truncate font-mono text-xs text-destructive">{item.error_message}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm font-mono text-xs break-words whitespace-pre-wrap">{item.error_message}</TooltipContent>
                  </Tooltip>
                ) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.grading_attempts}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
