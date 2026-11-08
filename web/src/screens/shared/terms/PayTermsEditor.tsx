"use client";

import { useTranslations } from "next-intl";
import { DateInput } from "@/components/inputs/date-input/DateInput";
import { Field } from "@/components/inputs/field/Field";
import { NumberInput } from "@/components/inputs/number-input/NumberInput";
import { SegmentedControl } from "@/components/inputs/segmented-control/SegmentedControl";
import { Select } from "@/components/inputs/select/Select";
import { TextInput } from "@/components/inputs/text-input/TextInput";
import { withEmployee, withProfile, type TermsProps } from "./logic/termsDraft";
import { termsStyles as s } from "./terms.styles";

const pct = (fraction: string | undefined) => (fraction ? String(Math.round(Number(fraction) * 10000) / 100) : "100");

/** How the employee is paid and placed: pay type, salary or rate, job share, week and role. */
export function PayTermsEditor({ record, onChange, readOnly, withPlacement = true }: TermsProps & { withPlacement?: boolean }) {
  const t = useTranslations();
  const e = record.employee;
  const set = (patch: Parameters<typeof withEmployee>[1]) => onChange(withEmployee(record, patch));
  return (
    <div className={s.form}>
      <Field label={t("terms.kind")}>
        <SegmentedControl
          fullWidth
          disabled={readOnly}
          value={e.kind}
          onChange={(kind) =>
            set(
              kind === "monthly"
                ? { kind, monthly_salary: e.monthly_salary ?? "0", hourly_rate: null }
                : { kind, hourly_rate: e.hourly_rate ?? "0", monthly_salary: null },
            )
          }
          options={[
            { value: "monthly", label: t("employee.kinds.monthly") },
            { value: "hourly", label: t("employee.kinds.hourly") },
          ]}
        />
      </Field>
      {e.kind === "monthly" ? (
        <Field label={t("terms.salary")}>
          <NumberInput suffix="₪" value={e.monthly_salary ?? null} disabled={readOnly} onCommit={(v) => set({ monthly_salary: v ?? "0" })} />
        </Field>
      ) : (
        <Field label={t("terms.rate")}>
          <NumberInput suffix="₪" value={e.hourly_rate ?? null} disabled={readOnly} onCommit={(v) => set({ hourly_rate: v ?? "0" })} />
        </Field>
      )}
      <Field label={t("terms.jobFraction")}>
        <NumberInput
          suffix="%"
          value={pct(e.job_fraction)}
          disabled={readOnly}
          onCommit={(v) => set({ job_fraction: String(Math.min(Math.max(Number(v ?? 100), 1), 100) / 100) })}
        />
      </Field>
      <Field label={t("terms.workWeek")}>
        <SegmentedControl
          fullWidth
          disabled={readOnly}
          value={String(e.work_week ?? 5)}
          onChange={(v) => set({ work_week: Number(v) })}
          options={[
            { value: "5", label: t("terms.days", { count: 5 }) },
            { value: "6", label: t("terms.days", { count: 6 }) },
          ]}
        />
      </Field>
      {withPlacement ? (
        <>
          <Field label={t("terms.start")}>
            <DateInput value={e.start_date} disabled={readOnly} onChange={(v) => v && set({ start_date: v })} />
          </Field>
          <Field label={t("terms.end")}>
            <DateInput value={e.end_date ?? null} disabled={readOnly} onChange={(v) => set({ end_date: v })} />
          </Field>
          <Field label={t("employees.columns.department")}>
            <TextInput value={record.profile.department ?? ""} disabled={readOnly} onChange={(v) => onChange(withProfile(record, { department: v }))} />
          </Field>
          <Field label={t("terms.subDepartment")}>
            <TextInput value={record.profile.sub_department ?? ""} disabled={readOnly} onChange={(v) => onChange(withProfile(record, { sub_department: v }))} />
          </Field>
          <Field label={t("employees.columns.position")}>
            <TextInput value={record.profile.position ?? ""} disabled={readOnly} onChange={(v) => onChange(withProfile(record, { position: v }))} />
          </Field>
          <Field label={t("terms.insurance")}>
            <Select
              ariaLabel={t("terms.insurance")}
              value={e.insurance_category ?? "auto"}
              disabled={readOnly}
              onChange={(v) => set({ insurance_category: v === "auto" ? null : (v as "standard" | "under_18" | "retirement_age") })}
              options={[
                { value: "auto", label: t("terms.insuranceAuto") },
                { value: "standard", label: t("exports.categories.standard") },
                { value: "under_18", label: t("exports.categories.under_18") },
                { value: "retirement_age", label: t("exports.categories.retirement_age") },
              ]}
            />
          </Field>
        </>
      ) : null}
    </div>
  );
}
