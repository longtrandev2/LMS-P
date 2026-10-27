import { SearchField } from "@/components/list-toolbar";

export function ClassSearchField({ value, onChange, placeholder = "Tìm mã, tên lớp, học kỳ" }: {
  value: string; onChange: (value: string) => void; placeholder?: string;
}) {
  return <SearchField value={value} onChange={onChange} placeholder={placeholder} />;
}
