import { Checkbox } from "@/components/ui/checkbox";
import { LANGUAGES } from "@/lib/languages";
import { cn } from "@/lib/utils";
import type { SettingKey } from "@/types/admin";
import { NumberField } from "./number-field";
import { INT_UNIT, SETTING_LABEL, formatSetting, rangeHint } from "./settings-labels";
import { type IntKey, type SettingsDraft, draftFrom } from "./settings-model";
import { FieldHelp, SettingsSection } from "./settings-section";
import type { SettingsForm } from "./use-settings-form";

const CODE_KEYS: SettingKey[] = ["allowed_languages", "default_time_limit_ms", "max_time_limit_ms", "default_memory_limit_mb", "max_memory_limit_mb", "practice_runs_per_minute"];
const UPLOAD_KEYS: SettingKey[] = ["max_upload_mb", "leave_evidence_max_mb"];

function IntFields({ form, draft, keys }: { form: SettingsForm; draft: SettingsDraft; keys: IntKey[] }) {
  const base = draftFrom(form.map);
  return (
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {keys.map((key) => (
        <NumberField key={key} id={`setting-${key}`} label={SETTING_LABEL[key]} unit={INT_UNIT[key]}
          value={draft.ints[key]} changed={base.ints[key] !== draft.ints[key]}
          onChange={(value) => form.update((d) => ({ ...d, ints: { ...d.ints, [key]: value } }), key)}
          defaultText={formatSetting(key, form.map[key]?.default_value)}
          hint={rangeHint(key, draft.ints.max_time_limit_ms, draft.ints.max_memory_limit_mb)}
          error={form.serverErrors[key] ?? form.clientErrors[key]} />
      ))}
    </div>
  );
}

/** Nhóm "Chấm code": ngôn ngữ được phép + giới hạn thời gian/bộ nhớ + chạy thử mỗi phút. */
export function CodeSection({ form, draft }: { form: SettingsForm; draft: SettingsDraft }) {
  const error = form.serverErrors.allowed_languages ?? form.clientErrors.allowed_languages;
  const toggle = (id: string, on: boolean) => form.update((d) => ({
    ...d, allowed_languages: on ? [...d.allowed_languages, id] : d.allowed_languages.filter((l) => l !== id),
  }), "allowed_languages");

  return (
    <SettingsSection id="code" title="Chấm code" keys={CODE_KEYS} map={form.map}
      description="Giới hạn khi giảng viên soạn câu lập trình và khi sinh viên chạy thử. Câu đã ghim phiên bản không bị ảnh hưởng.">
      <fieldset className="space-y-2" aria-describedby="setting-languages-help">
        <legend className="mb-2 text-sm font-medium">{SETTING_LABEL.allowed_languages}</legend>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => {
            const checked = draft.allowed_languages.includes(lang.id);
            return (
              <label key={lang.id} className={cn("flex h-8 cursor-pointer items-center gap-2 rounded-md bg-secondary px-3 text-sm transition-colors hover:bg-accent",
                checked && "bg-accent")}>
                <Checkbox checked={checked} onCheckedChange={(value) => toggle(lang.id, value === true)} aria-invalid={Boolean(error)} />
                {lang.label}
              </label>
            );
          })}
        </div>
        <FieldHelp id="setting-languages-help" defaultText={formatSetting("allowed_languages", form.map.allowed_languages?.default_value)}
          hint="Bỏ chọn chỉ ảnh hưởng câu soạn mới" error={error} />
      </fieldset>
      <IntFields form={form} draft={draft} keys={["default_time_limit_ms", "max_time_limit_ms", "default_memory_limit_mb", "max_memory_limit_mb", "practice_runs_per_minute"]} />
    </SettingsSection>
  );
}

/** Nhóm "Upload": dung lượng học liệu và minh chứng đơn xin nghỉ. */
export function UploadSection({ form, draft }: { form: SettingsForm; draft: SettingsDraft }) {
  return (
    <SettingsSection id="upload" title="Upload" keys={UPLOAD_KEYS} map={form.map}
      description="Dung lượng tối đa mỗi tệp. Không vượt trần cấu hình của server.">
      <IntFields form={form} draft={draft} keys={["max_upload_mb", "leave_evidence_max_mb"]} />
    </SettingsSection>
  );
}
