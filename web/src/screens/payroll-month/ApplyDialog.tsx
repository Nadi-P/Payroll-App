"use client";

import { Button } from "@/components/actions/button/Button";
import { Field } from "@/components/inputs/field/Field";
import { MultiSelect } from "@/components/inputs/multi-select/MultiSelect";
import { NumberInput } from "@/components/inputs/number-input/NumberInput";
import { Select } from "@/components/inputs/select/Select";
import { Dialog } from "@/components/overlays/dialog/Dialog";
import type { PayrollMonthVM } from "./logic/usePayrollMonth";
import { payrollMonthStyles as s } from "./payrollMonth.styles";

/** One amount of one component for many employees at once. */
export function ApplyDialog({ vm }: { vm: PayrollMonthVM }) {
  const { t, apply } = vm;
  return (
    <Dialog
      size="sm"
      open={apply.open}
      onOpenChange={(o) => !o && apply.close()}
      title={t("payroll.entry.apply")}
      closeLabel={t("common.close")}
      footer={
        <>
          <Button variant="ghost" label={t("common.cancel")} onPress={apply.close} />
          <Button variant="primary" icon="check" label={t("payroll.entry.applyAction")} disabled={!apply.canSave} loading={apply.saving} onPress={apply.save} />
        </>
      }
    >
      <div className={s.form}>
        <Field label={t("payroll.entry.component")}>
          <Select value={apply.field} onChange={apply.setField} options={apply.fieldOptions} />
        </Field>
        <Field label={t("payroll.entry.amount")}>
          <NumberInput value={apply.value} suffix="₪" onCommit={apply.setValue} />
        </Field>
        <Field label={t("breakdown.employees")}>
          <MultiSelect
            icon="users"
            label={t("breakdown.employees")}
            summary={apply.summary}
            options={apply.people}
            onToggle={apply.toggle}
            onAll={apply.all}
            onNone={apply.none}
            allLabel={t("common.selectAll")}
            noneLabel={t("common.selectNone")}
          />
        </Field>
      </div>
    </Dialog>
  );
}
