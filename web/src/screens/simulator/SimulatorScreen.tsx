"use client";

import { Button } from "@/components/actions/button/Button";
import { IconButton } from "@/components/actions/icon-button/IconButton";
import { Badge } from "@/components/feedback/badge/Badge";
import { Callout } from "@/components/feedback/callout/Callout";
import { Spinner } from "@/components/feedback/spinner/Spinner";
import { DateInput } from "@/components/inputs/date-input/DateInput";
import { Field } from "@/components/inputs/field/Field";
import { NumberInput } from "@/components/inputs/number-input/NumberInput";
import { SegmentedControl } from "@/components/inputs/segmented-control/SegmentedControl";
import { Select } from "@/components/inputs/select/Select";
import { Switch } from "@/components/inputs/switch/Switch";
import { Card } from "@/components/surfaces/card/Card";
import { PageHeader } from "@/components/surfaces/page-header/PageHeader";
import { Text } from "@/components/typography/text/Text";
import { ExplainPanel } from "@/screens/shared/explain-panel/ExplainPanel";
import { PayslipView } from "@/screens/shared/payslip-view/PayslipView";
import { useSimulator } from "./logic/useSimulator";
import { simulatorStyles as s } from "./simulator.styles";

export function SimulatorScreen() {
  const vm = useSimulator();
  const { t, form, set, setText } = vm;

  return (
    <>
      <PageHeader
        eyebrow={<Badge tone="accent" label={t("simulator.eyebrow")} />}
        title={t("simulator.title")}
        subtitle={t("simulator.subtitle")}
        actions={<Button variant="ghost" icon="refresh" label={t("simulator.reset")} onPress={vm.reset} />}
      />

      <div className={s.layout}>
        <div className={s.form}>
          <Card title={t("simulator.sections.pay")}>
            <div className={s.grid}>
              <div className={s.full}>
                <SegmentedControl
                  fullWidth
                  value={form.kind}
                  onChange={set("kind")}
                  options={[
                    { value: "monthly", label: t("employee.kinds.monthly") },
                    { value: "hourly", label: t("employee.kinds.hourly") },
                  ]}
                />
              </div>
              <Field label={form.kind === "monthly" ? t("simulator.fields.salary") : t("simulator.fields.rate")}>
                <NumberInput value={form.pay} suffix="₪" onCommit={setText("pay")} />
              </Field>
              {form.kind === "hourly" ? (
                <Field label={t("simulator.fields.hours")} hint={t("simulator.fields.hoursHint")}>
                  <NumberInput value={form.hours} suffix={t("units.hours")} onCommit={setText("hours")} />
                </Field>
              ) : (
                <Field label={t("simulator.fields.jobFraction")}>
                  <NumberInput value={form.jobFraction} suffix="%" onCommit={setText("jobFraction")} />
                </Field>
              )}
              <Field label={t("simulator.fields.period")}>
                <Select value={form.period} onChange={set("period")} options={vm.periodOptions} />
              </Field>
              <Field label={t("simulator.fields.bonus")}>
                <NumberInput value={form.bonus} suffix="₪" placeholder="0" onCommit={setText("bonus")} />
              </Field>
            </div>
          </Card>

          <Card title={t("simulator.sections.person")}>
            <div className={s.grid}>
              <Field label={t("simulator.fields.gender")}>
                <SegmentedControl
                  fullWidth
                  value={form.gender}
                  onChange={set("gender")}
                  options={[
                    { value: "female", label: t("simulator.gender.female") },
                    { value: "male", label: t("simulator.gender.male") },
                  ]}
                />
              </Field>
              <Field label={t("simulator.fields.birthDate")}>
                <DateInput value={form.birthDate} onChange={setText("birthDate")} />
              </Field>
              <Field label={t("simulator.fields.startDate")}>
                <DateInput value={form.startDate} onChange={setText("startDate")} />
              </Field>
              <div className={s.switches}>
                <Switch checked={form.resident} onChange={set("resident")} label={t("simulator.fields.resident")} />
                <Switch checked={form.mainEmployer} onChange={set("mainEmployer")} label={t("simulator.fields.mainEmployer")} />
              </div>
              <div className={s.children}>
                <Text size="sm" weight="medium" tone="muted">{t("simulator.fields.children")}</Text>
                {form.children.map((child, i) => (
                  <div key={i} className={s.childRow}>
                    <DateInput value={child} onChange={(v) => vm.setChild(i, v)} ariaLabel={t("simulator.fields.childBirth")} />
                    <IconButton icon="x" label={t("simulator.removeChild")} onPress={() => vm.removeChild(i)} />
                  </div>
                ))}
                <Button size="sm" variant="ghost" icon="plus" label={t("simulator.addChild")} onPress={vm.addChild} />
              </div>
            </div>
          </Card>

          <Card title={t("simulator.sections.extras")}>
            <div className={s.grid}>
              <div className={s.switches}>
                <Switch checked={form.pension} onChange={set("pension")} label={t("simulator.fields.pension")} />
                <Switch checked={form.studyFund} onChange={set("studyFund")} label={t("simulator.fields.studyFund")} />
                <Switch checked={form.phone} onChange={set("phone")} label={t("simulator.fields.phone")} />
              </div>
              <Field label={t("simulator.fields.travel")}>
                <NumberInput value={form.travelPerDay} suffix="₪" placeholder="0" onCommit={setText("travelPerDay")} />
              </Field>
              <Field label={t("simulator.fields.carPrice")}>
                <NumberInput value={form.carPrice} suffix="₪" placeholder="0" onCommit={setText("carPrice")} />
              </Field>
              <div className={s.full}>
                <Field label={t("simulator.fields.carType")}>
                  <SegmentedControl
                    fullWidth
                    size="sm"
                    value={form.carType || "fuel"}
                    onChange={(v) => set("carType")(v === "fuel" ? "" : v)}
                    options={[
                      { value: "fuel", label: t("simulator.car.fuel") },
                      { value: "hybrid", label: t("simulator.car.hybrid") },
                      { value: "plug_in_hybrid", label: t("simulator.car.plugIn") },
                      { value: "electric", label: t("simulator.car.electric") },
                    ]}
                  />
                </Field>
              </div>
            </div>
          </Card>
        </div>

        <div className={s.result}>
          {vm.error ? <Callout tone="danger" title={t("simulator.invalid")} body={vm.error} /> : null}
          <Card
            title={t("simulator.payslip")}
            subtitle={t("simulator.payslipHint")}
            actions={
              vm.calculating ? (
                <div className={s.calcState}>
                  <Spinner size="sm" />
                  <Text size="xs" tone="muted">{t("payroll.recalculating")}</Text>
                </div>
              ) : null
            }
          >
            <PayslipView payslip={vm.payslip} explain={vm.explain} />
          </Card>
        </div>
      </div>

      <ExplainPanel explain={vm.explain} />
    </>
  );
}
