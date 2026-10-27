import { SearchField } from "@/components/list-toolbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSortSelect } from "@/features/users/user-sort-select";

interface UsersToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  role: string;
  onRole: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  sort: string;
  onSort: (value: string) => void;
  fetching: boolean;
}

/** Thanh công cụ danh sách người dùng: tìm kiếm nền xám bên trái, lọc + sắp xếp bên phải, không khung. */
export function UsersToolbar(props: UsersToolbarProps) {
  const { search, onSearch, role, onRole, status, onStatus, sort, onSort, fetching } = props;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchField
        value={search}
        onChange={onSearch}
        placeholder="Tìm theo tên, email hoặc mã SV"
        className="w-full sm:w-72"
      />
      {fetching ? <span className="text-xs text-muted-foreground" aria-live="polite">Đang tải…</span> : null}
      <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
        <Select value={role} onValueChange={onRole}>
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-36" aria-label="Lọc theo vai trò">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">Mọi vai trò</SelectItem>
            <SelectItem value="student">Sinh viên</SelectItem>
            <SelectItem value="lecturer">Giảng viên</SelectItem>
            <SelectItem value="admin">Quản trị</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={onStatus}>
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-40" aria-label="Lọc theo trạng thái">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="locked">Đã khóa</SelectItem>
          </SelectContent>
        </Select>
        <UserSortSelect value={sort} onChange={onSort} />
      </div>
    </div>
  );
}
