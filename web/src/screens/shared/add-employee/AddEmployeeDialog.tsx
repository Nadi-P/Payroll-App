"use client";

import { Button } from "@/components/actions/button/Button";
import { Callout } from "@/components/feedback/callout/Callout";
import { DateInput } from "@/components/inputs/date-input/DateInput";
import { Field } from "@/components/inputs/field/Field";
import { NumberInput } from "@/components/inputs/number-input/NumberInput";
import { SegmentedControl } from "@/components/inputs/segmented-control/SegmentedControl";
import { TextInput } from "@/components/inputs/text-input/TextInput";
import { Dialog } from "@/components/overlays/dialog/Dialog";
import { addEmployeeStyles as s } from "./addEmployee.styles";
import type { AddEmployeeForm } from "./logic/useAddEmployeeForm";

export function AddEmployeeDialog({ form: vm }: { form: AddEmployeeForm }) {
  const { t, form } = vm;
  const required = (filled: boolean) => (vm.tried && !filled ? t("employees.add.required") : null);
  return (
    <Dialog
      open={vm.open}
      onOpenChange={(o) => !o && vm.close()}
      title={t("employees.add.action")}
      closeLabel={t("common.close")}
      footer={
        <>
          <Button variant="ghost" label={t("common.cancel")} onPress={vm.close} />
          <Button variant="primary" icon="check" label={t("employees.add.save")} loading={vm.saving} onPress={vm.save} />
        </>
      }
    >
      <div className={s.body}>
        {vm.error ? <Callout tone="danger" title={t("errors.actionFailed")} body={vm.error} /> : null}
        <div className={s.grid}>
          <Field label={t("profile.fields.firstName")} error={required(!!form.firstName.trim())}>
            <TextInput value={form.firstName} onChange={vm.set("firstName")} />
          </Field>
          <Field label={t("profile.fields.lastName")} error={required(!!form.lastName.trim())}>
            <TextInput value={form.lastName} onChange={vm.set("lastName")} />
          </Field>
          <Field label={t("profile.fields.nationalId")} error={vm.idError}>
            <TextInput ltr value={form.nationalId} invalid={!!vm.idError} onChange={vm.set("nationalId")} />
          </Field>
          <Field label={t("profile.fields.birthDate")} error={required(!!form.birthDate)}>
            <DateInput value={form.birthDate} onChange={vm.set("birthDate")} />
          </Field>
          <Field label={t("profile.fields.gender")}>
            <SegmentedControl
              fullWidth
              value={form.gender}
              onChange={vm.set("gender")}
              options={[
                { value: "female", label: t("simulator.gender.female") },
                { value: "male", label: t("simulator.gender.male") },
              ]}
            />
          </Field>
          <Field label={t("profile.fields.startDate")}>
            <DateInput value={vm.startDate} onChange={vm.setStartDate} />
          </Field>
          <Field label={t("profile.fields.kind")}>
            <SegmentedControl
              fullWidth
              value={form.kind}
              onChange={vm.set("kind")}
              options={[
                { value: "monthly", label: t("employee.kinds.monthly") },
                { value: "hourly", label: t("employee.kinds.hourly") },
              ]}
            />
          </Field>
          <Field label={form.kind === "monthly" ? t("profile.fields.salary") : t("profile.fields.rate")} error={required(!!form.pay)}>
            <NumberInput value={form.pay} suffix="₪" onCommit={vm.set("pay")} />
          </Field>
          <Field label={t("profile.fields.department")}>
            <TextInput value={form.department} onChange={vm.set("department")} />
          </Field>
          <Field label={t("profile.fields.position")}>
            <TextInput value={form.position} onChange={vm.set("position")} />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
