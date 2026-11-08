"use client";

import { DateInput } from "@/components/inputs/date-input/DateInput";
import { Field } from "@/components/inputs/field/Field";
import { SegmentedControl } from "@/components/inputs/segmented-control/SegmentedControl";
import { Select } from "@/components/inputs/select/Select";
import { Switch } from "@/components/inputs/switch/Switch";
import { TextInput } from "@/components/inputs/text-input/TextInput";
import { Card } from "@/components/surfaces/card/Card";
import type { HealthFund, IncomeType, MaritalStatus, SpouseIncome } from "@/api/types.generated";
import { employeeProfileStyles as s } from "./employeeProfile.styles";
import { INCOME_TYPES, type EmployeeProfileVM } from "./logic/useEmployeeProfile";
import { TaxSection } from "./TaxSection";

const MARITAL: MaritalStatus[] = ["single", "married", "divorced", "widowed", "separated"];
const FUNDS: HealthFund[] = ["clalit", "maccabi", "meuhedet", "leumit", "none"];
const SPOUSE_INCOME: SpouseIncome[] = ["none", "work", "other"];

/** Everything from Form 101: personal details, contact, family and the tax section. */
export function DetailsTab({ vm }: { vm: EmployeeProfileVM }) {
  const { t, draft } = vm;
  if (!draft) return null;
  const p = draft.profile;
  const e = draft.employee;
  const address = p.address ?? {};
  const spouse = p.spouse ?? {};
  const hasSpouse = p.marital_status === "married" || p.marital_status === "separated";

  return (
    <div className={s.tabBody}>
      <div className={s.twoCards}>
      <Card title={t("profile.sections.personal")}>
        <div className={s.form}>
          <Field label={t("profile.fields.firstName")}><TextInput value={p.first_name} onChange={vm.setProfile("first_name")} /></Field>
          <Field label={t("profile.fields.lastName")}><TextInput value={p.last_name} onChange={vm.setProfile("last_name")} /></Field>
          <Field label={t("profile.fields.nationalId")}><TextInput ltr value={p.national_id} onChange={vm.setProfile("national_id")} /></Field>
          <Field label={t("profile.fields.birthDate")}>
            <DateInput value={e.birth_date} onChange={(v) => v && vm.setEmployee("birth_date")(v)} />
          </Field>
          <Field label={t("profile.fields.gender")}>
            <SegmentedControl
              fullWidth
              value={e.gender}
              onChange={vm.setEmployee("gender")}
              options={[
                { value: "female", label: t("simulator.gender.female") },
                { value: "male", label: t("simulator.gender.male") },
              ]}
            />
          </Field>
          <Field label={t("profile.fields.maritalStatus")}>
            <Select
              value={p.marital_status ?? "single"}
              onChange={(v) => vm.setProfile("marital_status")(v as MaritalStatus)}
              options={MARITAL.map((m) => ({ value: m, label: t(`profile.marital.${m}`) }))}
            />
          </Field>
          <Field label={t("profile.fields.incomeType")}>
            <Select
              value={p.income_type ?? "monthly"}
              onChange={(v) => vm.setProfile("income_type")(v as IncomeType)}
              options={INCOME_TYPES.map((i) => ({ value: i, label: t(`profile.incomeTypes.${i}`) }))}
            />
          </Field>
          <Field label={t("profile.fields.healthFund")}>
            <Select
              value={p.health_fund ?? "none"}
              onChange={(v) => vm.setProfile("health_fund")(v as HealthFund)}
              options={FUNDS.map((f) => ({ value: f, label: t(`profile.healthFunds.${f}`) }))}
            />
          </Field>
          <div className={s.switchField}>
            <Switch checked={!!p.kibbutz_member} onChange={vm.setProfile("kibbutz_member")} label={t("profile.fields.kibbutz")} />
          </div>
        </div>
      </Card>

      <Card title={t("profile.sections.contact")}>
        <div className={s.form}>
          <Field label={t("profile.fields.email")}><TextInput ltr type="email" value={p.email ?? ""} onChange={vm.setProfile("email")} /></Field>
          <Field label={t("profile.fields.mobile")}><TextInput ltr type="tel" value={p.mobile ?? ""} onChange={vm.setProfile("mobile")} /></Field>
          <Field label={t("profile.fields.phone")}><TextInput ltr type="tel" value={p.phone ?? ""} onChange={vm.setProfile("phone")} /></Field>
          <Field label={t("profile.fields.street")}><TextInput value={address.street ?? ""} onChange={vm.setAddress("street")} /></Field>
          <Field label={t("profile.fields.houseNumber")}><TextInput value={address.house_number ?? ""} onChange={vm.setAddress("house_number")} /></Field>
          <Field label={t("profile.fields.city")}><TextInput value={address.city ?? ""} onChange={vm.setAddress("city")} /></Field>
          <Field label={t("profile.fields.zip")}><TextInput ltr value={address.zip_code ?? ""} onChange={vm.setAddress("zip_code")} /></Field>
        </div>
      </Card>
      </div>

      {hasSpouse ? (
        <Card title={t("profile.sections.spouse")}>
          <div className={s.form}>
            <Field label={t("profile.fields.firstName")}><TextInput value={spouse.first_name ?? ""} onChange={vm.setSpouse("first_name")} /></Field>
            <Field label={t("profile.fields.lastName")}><TextInput value={spouse.last_name ?? ""} onChange={vm.setSpouse("last_name")} /></Field>
            <Field label={t("profile.fields.nationalId")}><TextInput ltr value={spouse.national_id ?? ""} onChange={vm.setSpouse("national_id")} /></Field>
            <Field label={t("profile.fields.birthDate")}>
              <DateInput value={spouse.birth_date ?? null} onChange={vm.setSpouse("birth_date")} />
            </Field>
            <Field label={t("profile.fields.spouseIncome")}>
              <Select
                value={spouse.income ?? "none"}
                onChange={(v) => vm.setSpouse("income")(v as SpouseIncome)}
                options={SPOUSE_INCOME.map((i) => ({ value: i, label: t(`profile.spouseIncome.${i}`) }))}
              />
            </Field>
          </div>
        </Card>
      ) : null}

      <TaxSection vm={vm} />
    </div>
  );
}
