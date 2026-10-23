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
      <div className="space-y-2">
        <Label htmlFor="material-title">Tiêu đề</Label>
        <Input
          id="material-title"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Ví dụ: Slide chương 3 — Socket"
          aria-invalid={!!errors.title}
        />
        {errors.title ? <FieldError text={errors.title} /> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="material-description">Mô tả (tùy chọn)</Label>
        <Textarea
          id="material-description"
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          rows={3}
          placeholder="Ghi chú ngắn về nội dung học liệu"
        />
      </div>
      <div className="space-y-2">
        <Label>Phân loại</Label>
        <Select value={type || defaultType || ""} onValueChange={(v) => onType(v as MaterialType)}>
          <SelectTrigger className="w-full" aria-label="Phân loại học liệu">
            <SelectValue placeholder="Chọn phân loại" />
          </SelectTrigger>
          <SelectContent>
            {MATERIAL_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type ? <FieldError text={errors.type} /> : null}
      </div>
    </>
  );
}
