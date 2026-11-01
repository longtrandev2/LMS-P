import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { questionTypeLabel } from "@/lib/question-types";
import { DIFFICULTY_LABEL, formatPoints } from "@/features/assignments/lecturer/labels";
import { useCategoryNames } from "@/features/exams/lecturer/blueprint/use-bank-data";
import { variantCode } from "@/features/exams/shared/exam-labels";
import type { DrawRuleView, PapersPreview, SectionView } from "@/types/exams";

/** Bảng kho câu của từng quy tắc: điều kiện, số câu bốc, kích thước kho (đỏ khi thiếu, cam khi đề riêng dễ trùng). */
export function RulesPoolTable({ preview, rules, sections }: { preview: PapersPreview; rules: DrawRuleView[]; sections: SectionView[] }) {
  const names = useCategoryNames(rules.map((rule) => rule.bank_id));
  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  const variants = preview.paper_mode === "variants";
  const perStudent = preview.paper_mode === "per_student";
  const sorted = [...sections].sort((a, b) => a.position - b.position);
  return <Table>
    <TableHeader className="bg-secondary/60">
      <TableRow>
        <TableHead className="w-10 text-center text-[13px]">TT</TableHead>
        <TableHead className="text-[13px]">Điều kiện</TableHead>
        <TableHead className="text-[13px]">Phần</TableHead>
        {variants ? <TableHead className="text-[13px]">Mã đề</TableHead> : null}
        <TableHead className="text-right text-[13px]">Số câu</TableHead>
        <TableHead className="text-right text-[13px]">Điểm/câu</TableHead>
        <TableHead className="text-right text-[13px]">Kho</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {preview.rules.map((item, index) => {
        const rule = byId.get(item.rule_id);
        const criteria = rule ? [
          rule.category_id != null ? names.get(rule.category_id) ?? `Danh mục #${rule.category_id}` : "Mọi danh mục",
          rule.difficulty ? DIFFICULTY_LABEL[rule.difficulty] : "Mọi độ khó",
          rule.type ? questionTypeLabel(rule.type) : "Mọi loại câu",
        ].join(" · ") : `Quy tắc #${item.rule_id}`;
        const short = item.pool_size < item.requested;
        const thin = perStudent && !short && item.pool_size < item.requested * 2;
        return <TableRow key={item.rule_id}>
          <TableCell className="text-center text-muted-foreground tabular-nums">{index + 1}</TableCell>
          <TableCell className="whitespace-normal">{criteria}</TableCell>
          <TableCell className="text-muted-foreground">{rule ? sorted[rule.section_index ?? 0]?.title || "—" : "—"}</TableCell>
          {variants ? <TableCell className="text-muted-foreground">{rule?.variant_no ? `Đề ${variantCode(rule.variant_no)}` : "Chung"}</TableCell> : null}
          <TableCell className="text-right tabular-nums">{item.requested}</TableCell>
          <TableCell className="text-right tabular-nums">{rule ? formatPoints(rule.points) : "—"}</TableCell>
          <TableCell className="text-right">
            {short ? <Badge variant="destructive">{item.pool_size} · thiếu {item.requested - item.pool_size}</Badge>
              : thin ? <Badge variant="warning">{item.pool_size} · dễ trùng</Badge>
                : <span className="tabular-nums">{item.pool_size}</span>}
          </TableCell>
        </TableRow>;
      })}
    </TableBody>
  </Table>;
}
