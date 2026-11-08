"use client";

import { Button } from "@/components/actions/button/Button";
import { IconButton } from "@/components/actions/icon-button/IconButton";
import { Badge } from "@/components/feedback/badge/Badge";
import { Checkbox } from "@/components/inputs/checkbox/Checkbox";
import { DateInput } from "@/components/inputs/date-input/DateInput";
import { Field } from "@/components/inputs/field/Field";
import { Switch } from "@/components/inputs/switch/Switch";
import { Card } from "@/components/surfaces/card/Card";
import { Text } from "@/components/typography/text/Text";
import { employeeProfileStyles as s } from "./employeeProfile.styles";
import { INCOME_TYPES, type EmployeeProfileVM } from "./logic/useEmployeeProfile";

/** Form 101 data that decides tax credit points (parts C, E, H and T). */
export function TaxSection({ vm }: { vm: EmployeeProfileVM }) {
  const { t, draft } = vm;
  if (!draft) return null;
  const tax = draft.employee.tax ?? {};
  return (
    <div className={s.tabBody}>
      <div className={s.twoCards}>
        <Card title={t("profile.tax.status")}>
          <div className={s.switches}>
            <Switch checked={tax.resident ?? true} onChange={vm.setTax("resident")} label={t("simulator.fields.resident")} />
            <Switch checked={tax.main_employer ?? true} onChange={vm.setTax("main_employer")} label={t("simulator.fields.mainEmployer")} />
            <Field label={t("profile.fields.immigrationDate")}>
              <DateInput value={draft.profile.immigration_date ?? null} onChange={vm.setProfile("immigration_date")} />
            </Field>
            {tax.fixed_rate ? <Badge tone="warning" label={t("profile.tax.fixedRate", { rate: tax.fixed_rate })} /> : null}
            {tax.coordination ? <Badge tone="info" label={t("profile.tax.coordination")} /> : null}
          </div>
        </Card>
        <Card title={t("profile.tax.otherIncome")}>
          <div className={s.checks}>
            {INCOME_TYPES.map((type) => (
              <Checkbox
                key={type}
                checked={vm.otherIncome.includes(type)}
                onChange={() => vm.toggleOtherIncome(type)}
                label={t(`profile.incomeTypes.${type}`)}
              />
            ))}
          </div>
        </Card>
      </div>
      <div className={s.twoCards}>
        <Card title={t("simulator.fields.children")}>
          <div className={s.children}>
            {vm.children.length === 0 ? <Text size="sm" tone="subtle">{t("profile.tax.noChildren")}</Text> : null}
            {vm.children.map((child, i) => (
              <div key={i} className={s.childRow}>
                <DateInput value={child.birth_date} onChange={(v) => vm.setChild(i, v)} ariaLabel={t("simulator.fields.childBirth")} />
                <IconButton icon="x" label={t("simulator.removeChild")} onPress={() => vm.removeChild(i)} />
              </div>
            ))}
            <Button size="sm" variant="ghost" icon="plus" label={t("simulator.addChild")} onPress={vm.addChild} />
          </div>
        </Card>
        <Card title={t("profile.tax.claims")}>
          <div className={s.claims}>
            {vm.claims.length === 0 ? <Text size="sm" tone="subtle">{t("profile.tax.noClaims")}</Text> : null}
            {vm.claims.map((c) => (
              <Field key={c.code} label={c.code}>
                <Badge tone="accent" label={t("profile.tax.points", { points: c.points })} />
              </Field>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
