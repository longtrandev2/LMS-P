import { GRADE_COMPONENTS } from "@/lib/grades";
import { cn } from "@/lib/utils";
import type { GradePolicy } from "@/types/api";
import { NumberField } from "./number-field";
import { PENALTY_LABEL, WEIGHT_LABEL } from "./settings-labels";
import { PENALTY_KEYS, type SettingsDraft, draftFrom, toDecimalText, weightSum } from "./settings-model";
import { FieldHelp, SettingsSection } from "./settings-section";
import type { SettingsForm } from "./use-settings-form";

/** Nhóm "Sổ điểm mặc định": cùng định dạng grade_policy của lớp (class-schedule-grades-spec §5). */
export function GradePolicySection({ form, draft }: { form: SettingsForm; draft: SettingsDraft }) {
  const base = draftFrom(form.map);
  const def = form.map.default_grade_policy?.default_value as GradePolicy | undefined;
  const sum = weightSum(draft);
  const serverError = form.serverErrors.default_grade_policy;
  const set = (patch: (d: SettingsDraft) => SettingsDraft) => form.update(patch, "default_grade_policy");

  return (
    <SettingsSection id="grades" title="Sổ điểm mặc định" keys={["default_grade_policy"]} map={form.map}
      description="Áp dụng cho lớp chưa tự cấu hình điểm. Lớp đã có cấu hình riêng không đổi.">
      <fieldset className="space-y-3">
        <legend className="mb-3 flex w-full max-w-xl items-center justify-between text-sm font-medium">
          Trọng số (%)
          <span aria-live="polite" className={cn("rounded-md px-1.5 py-0.5 text-xs tabular-nums", sum === 100 ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive")}>
            Tổng {sum}/100
          </span>
        </legend>
        <div className="grid max-w-xl grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          {GRADE_COMPONENTS.map((c) => (
            <NumberField key={c} id={`weight-${c}`} label={WEIGHT_LABEL[c]} unit="%" value={draft.weights[c]}
              changed={base.weights[c] !== draft.weights[c]} defaultText={def ? `${def.weights[c]}%` : undefined}
              onChange={(value) => set((d) => ({ ...d, weights: { ...d.weights, [c]: value } }))} />
          ))}
        </div>
        {form.clientErrors.weights ? <p role="alert" className="text-xs text-destructive">{form.clientErrors.weights}</p> : null}
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-medium">Chính sách chuyên cần</legend>
        <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField id="max-absences" label="Số buổi nghỉ tối đa" value={draft.max_absences} placeholder="20% số buổi"
            changed={base.max_absences !== draft.max_absences} error={form.clientErrors.max_absences}
            defaultText={def ? (def.attendance.max_absences == null ? "20% số buổi" : String(def.attendance.max_absences)) : undefined}
            onChange={(value) => set((d) => ({ ...d, max_absences: value.trim() }))} />
          {PENALTY_KEYS.map((k) => (
            <NumberField key={k} id={`penalty-${k}`} label={PENALTY_LABEL[k]} unit="điểm" decimal value={draft.penalties[k]}
              changed={base.penalties[k] !== draft.penalties[k]} error={form.clientErrors[k]}
              defaultText={def ? toDecimalText(def.attendance[k]) : undefined}
              onChange={(value) => set((d) => ({ ...d, penalties: { ...d.penalties, [k]: value } }))} />
          ))}
        </div>
        <FieldHelp id="grades-help" hint="Để trống “Số buổi nghỉ tối đa” = 20% số buổi không hủy; vượt quá thì không đủ điều kiện dự thi. Điểm trừ 0–10, bước 0,25."
          error={serverError} />
      </fieldset>
    </SettingsSection>
  );
}
