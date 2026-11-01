import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/form-field-error";
import { MATERIAL_TYPE_OPTIONS, type MaterialType } from "./types";

interface MaterialFormFieldsProps {
  title: string;
  onTitle: (v: string) => void;
  description: string;
  onDescription: (v: string) => void;
  type: MaterialType | "";
  onType: (v: MaterialType | "") => void;
  errors: Record<string, string>;
  /** Giá trị hiện thị khi chưa chọn (vd tab liên kết mặc định "link") */
  defaultType?: MaterialType;
}

/** Tiêu đề + mô tả + phân loại — dùng chung cho dialog tải lên và sửa học liệu */
export function MaterialFormFields({
  title,
  onTitle,
  description,
  onDescription,
  type,
  onType,
  errors,
  defaultType,
}: MaterialFormFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9.5rem]">
        <div className="space-y-2">
          <Label htmlFor="material-title">Tiêu đề</Label>
          <Input id="material-title" value={title} onChange={(e) => onTitle(e.target.value)}
            placeholder="Ví dụ: Slide chương 3 — Socket" aria-invalid={!!errors.title} />
          {errors.title ? <FieldError text={errors.title} /> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="material-type">Phân loại</Label>
          <Select value={type || defaultType || ""} onValueChange={(v) => onType(v as MaterialType)}>
            <SelectTrigger id="material-type" className="w-full" aria-invalid={!!errors.type}>
              <SelectValue placeholder="Chọn" />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type ? <FieldError text={errors.type} /> : null}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="material-description">Mô tả <span className="font-normal text-muted-foreground">(tùy chọn)</span></Label>
        <Textarea id="material-description" value={description} onChange={(e) => onDescription(e.target.value)}
          rows={2} placeholder="Ghi chú ngắn về nội dung học liệu" />
      </div>
    </>
  );
}
