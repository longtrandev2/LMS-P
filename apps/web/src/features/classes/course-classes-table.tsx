import { Link } from "react-router-dom";
import { Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClassSummary } from "@/types/api";

interface CourseClassesTableProps {
  classes: ClassSummary[];
  isAdmin: boolean;
  onEdit: (clazz: ClassSummary) => void;
  onDelete: (clazz: ClassSummary) => void;
}

export function CourseClassesTable({ classes, isAdmin, onEdit, onDelete }: CourseClassesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead>Mã lớp</TableHead>
          <TableHead>Tên lớp</TableHead>
          <TableHead>Học kỳ</TableHead>
          <TableHead>Sĩ số</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="w-28 text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {classes.map((clazz) => (
          <TableRow key={clazz.id}>
            <TableCell className="font-mono text-sm">{clazz.code}</TableCell>
            <TableCell className="font-medium">
              <Link
                to={`/classes/${clazz.id}`}
                className="underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                {clazz.name}
              </Link>
            </TableCell>
            <TableCell className="font-mono text-sm">{clazz.semester}</TableCell>
            <TableCell className="text-sm tabular-nums">{clazz.enrolled_count ?? 0}{clazz.max_students ? ` / ${clazz.max_students}` : ""}</TableCell>
            <TableCell className="text-sm">{clazz.status === "locked" ? "Đã khóa" : "Đang hoạt động"}</TableCell>
            <TableCell className="text-right">
              <span className="flex justify-end gap-1">
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link to={`/classes/${clazz.id}`} aria-label={`Xem sinh viên lớp ${clazz.code}`}>
                    <Users aria-hidden />
                  </Link>
                </Button>
                {isAdmin ? <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Sửa lớp ${clazz.code}`}
                  onClick={() => onEdit(clazz)}
                >
                  <Pencil aria-hidden />
                </Button> : null}
                {isAdmin ? <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Xóa lớp ${clazz.code}`}
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(clazz)}
                >
                  <Trash2 aria-hidden />
                </Button> : null}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
