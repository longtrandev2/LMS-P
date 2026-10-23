import {
  File,
  FileArchive,
  FileText,
  Link2,
  Presentation,
  Video,
  type LucideIcon,
} from "lucide-react";

/** ENUM materials.type (database-design §2.3) */
export type MaterialType = "pdf" | "doc" | "slide" | "link" | "video" | "archive" | "other";

export interface Material {
  id: number;
  class_id: number;
  title: string;
  description?: string | null;
  type: MaterialType;
  /** Tệp: đường dẫn server; link: URL đầy đủ */
  file_path?: string | null;
  size_bytes: number;
  uploaded_by: number;
  created_at: string;
}

/** Nhãn tiếng Việt + icon trung tính theo phân loại (không icon bubble màu) */
export const MATERIAL_TYPE_META: Record<MaterialType, { label: string; icon: LucideIcon }> = {
  pdf: { label: "PDF", icon: FileText },
  doc: { label: "Tài liệu", icon: FileText },
  slide: { label: "Slide", icon: Presentation },
  link: { label: "Liên kết", icon: Link2 },
  video: { label: "Video", icon: Video },
  archive: { label: "Tệp nén", icon: FileArchive },
  other: { label: "Khác", icon: File },
};

export const MATERIAL_TYPE_OPTIONS: { value: MaterialType; label: string }[] = (
  Object.keys(MATERIAL_TYPE_META) as MaterialType[]
).map((value) => ({ value, label: MATERIAL_TYPE_META[value].label }));
