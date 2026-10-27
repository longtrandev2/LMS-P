import { Link, useNavigate } from "react-router-dom";
import { MoreHorizontal, Pencil, SquareArrowOutUpRight, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ClassSummary } from "@/types/api";
import { FLUSH_TABLE } from "./list-styles";

interface CourseClassesTableProps {
  classes: ClassSummary[];
  isAdmin: boolean;
  onEdit: (clazz: ClassSummary) => void;
  onDelete: (clazz: ClassSummary) => void;
}

export function CourseClassesTable({ classes, isAdmin, onEdit, onDelete }: CourseClassesTableProps) {
  const navigate = useNavigate();
  return (
    <Table className={FLUSH_TABLE}>
      <TableHeader>
        <TableRow>
          <TableHead>Lớp</TableHead>
          <TableHead>Học kỳ</TableHead>
          <TableHead className="hidden sm:table-cell">Giảng viên</TableHead>
          <TableHead className="text-right">Sĩ số</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="w-px"><span className="sr-only">Thao tác</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {classes.map((clazz) => (
          <TableRow key={clazz.id}>
            <TableCell>
              <Link to={`/classes/${clazz.id}`} className="font-medium underline-offset-4 hover:underline">{clazz.name}</Link>
              <span className="block font-mono text-xs text-muted-foreground">{clazz.code}</span>
            </TableCell>
            <TableCell className="font-mono text-xs">{clazz.semester}</TableCell>
            <TableCell className="hidden sm:table-cell">{clazz.lecturer_name || "—"}</TableCell>
            <TableCell className="text-right tabular-nums">{clazz.enrolled_count ?? 0}{clazz.max_students ? ` / ${clazz.max_students}` : ""}</TableCell>
            <TableCell>
              {clazz.status === "locked" ? <Badge variant="destructive">Đã khóa</Badge> : <Badge variant="success">Hoạt động</Badge>}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với lớp ${clazz.code}`}><MoreHorizontal aria-hidden /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/classes/${clazz.id}`)}><SquareArrowOutUpRight aria-hidden /> Mở trang lớp</DropdownMenuItem>
                  {isAdmin ? <>
                    <DropdownMenuItem onClick={() => onEdit(clazz)}><Pencil aria-hidden /> Sửa lớp</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(clazz)}><Trash2 aria-hidden /> Xóa lớp</DropdownMenuItem>
                  </> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
