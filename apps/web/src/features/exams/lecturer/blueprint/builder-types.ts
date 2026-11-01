import type { BlueprintForm, RuleDraft } from "./blueprint-model";

/** Trạng thái dùng chung giữa các phần của trình dựng cấu trúc đề (exam-spec.md §8.2). */
export interface BuilderCtx {
  form: BlueprintForm;
  patch: (next: Partial<BlueprintForm>) => void;
  errors: Record<string, string>;
  locked: boolean;
  quiz: boolean;
  /** Mã đề đang chọn trên thanh mã đề; null = "Chung mọi mã đề" (hoặc không ở chế độ nhiều mã). */
  scope: number | null;
  variants: boolean;
  /** Kho của quy tắc: số từ server (đã lưu) hoặc ước tính; `exact=false` khi ước tính. */
  poolOf: (rule: RuleDraft) => { size: number; exact: boolean } | null;
  ruleCriteria: (rule: RuleDraft) => string;
  /** Thiếu câu theo lỗi xuất bản gần nhất. */
  shortageOf: (rule: RuleDraft) => { requested: number; available: number } | null;
  openPicker: (sectionKey: string) => void;
  openRule: (sectionKey: string, rule?: RuleDraft) => void;
  openMatrix: (sectionKey: string) => void;
  preview: (questionId: number) => void;
}

/** Mục có trong phạm vi mã đề đang xem. */
export function inScope(ctx: Pick<BuilderCtx, "scope">, variant: number | null): boolean {
  return ctx.scope == null || variant == null || variant === ctx.scope;
}
