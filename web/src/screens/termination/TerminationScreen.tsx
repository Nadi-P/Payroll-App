"use client";

import { Button } from "@/components/actions/button/Button";
import { KeyValueList } from "@/components/data/key-value-list/KeyValueList";
import { SummaryRow } from "@/components/data/summary-row/SummaryRow";
import { Callout } from "@/components/feedback/callout/Callout";
import { Skeleton } from "@/components/feedback/skeleton/Skeleton";
import { Steps } from "@/components/feedback/steps/Steps";
import { DateInput } from "@/components/inputs/date-input/DateInput";
import { Field } from "@/components/inputs/field/Field";
import { NumberInput } from "@/components/inputs/number-input/NumberInput";
import { SegmentedControl } from "@/components/inputs/segmented-control/SegmentedControl";
import { Select } from "@/components/inputs/select/Select";
import { Switch } from "@/components/inputs/switch/Switch";
import { Card } from "@/components/surfaces/card/Card";
import { PageHeader } from "@/components/surfaces/page-header/PageHeader";
import { MonoText } from "@/components/typography/mono-text/MonoText";
import { Money } from "@/components/typography/money/Money";
import { NumberText } from "@/components/typography/number-text/NumberText";
import { Text } from "@/components/typography/text/Text";
import { useTerminationWizard } from "./logic/useTerminationWizard";
import { terminationStyles as s } from "./termination.styles";

export function TerminationScreen() {
  const vm = useTerminationWizard();
  const { t, form, result } = vm;

  return (
    <>
      <PageHeader title={t("termination.title")} subtitle={t("termination.subtitle")} />
      <Steps steps={vm.steps} current={vm.step} onStepClick={vm.goTo} />

      {vm.step === 0 ? (
        <Card title={t("termination.choose.title")} subtitle={t("termination.choose.body")}>
          <div className={s.form}>
            <Field label={t("termination.choose.employee")}>
              <Select value={vm.employeeId} onChange={vm.chooseEmployee} options={vm.employeeOptions} placeholder={t("termination.choose.placeholder")} />
            </Field>
            <Field label={t("termination.choose.date")}>
              <DateInput value={form.date} onChange={vm.setText("date")} />
            </Field>
            {vm.employee ? (
              <div className={s.full}>
                <Callout
                  tone="neutral"
                  title={vm.employeeName}
                  body={t("termination.choose.summary", { start: vm.employee.employee.start_date })}
                />
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {vm.step === 1 ? (
        <div className={s.body}>
          <Card title={t("termination.details.severance")}>
            <div className={s.form}>
              <div className={s.switches}>
                <Switch checked={form.entitled} onChange={vm.set("entitled")} label={t("termination.details.entitled")} />
              </div>
              <div className={s.full}>
                <Field label={t("termination.details.section14")} hint={t("termination.details.section14Hint")}>
                  <SegmentedControl
                    fullWidth
                    value={form.section14}
                    onChange={vm.set("section14")}
                    options={[
                      { value: "full", label: t("termination.details.s14full") },
                      { value: "partial", label: t("termination.details.s14partial") },
                      { value: "none", label: t("termination.details.s14none") },
                    ]}
                  />
                </Field>
              </div>
              {form.section14 === "partial" ? (
                <Field label={t("termination.details.s14rate")}>
                  <NumberInput value={form.section14Rate} suffix="%" onCommit={vm.setText("section14Rate")} />
                </Field>
              ) : null}
              <Field label={t("termination.details.fund")} hint={t("termination.details.fundHint")}>
                <NumberInput value={form.fundBalance} suffix="₪" placeholder="0" onCommit={vm.setText("fundBalance")} />
              </Field>
            </div>
          </Card>
          <Card title={t("termination.details.notice")}>
            <div className={s.form}>
              <div className={s.switches}>
                <Switch checked={form.noticeRequired} onChange={vm.set("noticeRequired")} label={t("termination.details.noticeRequired")} />
              </div>
              <Field label={t("termination.details.noticeGiven")}>
                <NumberInput value={form.noticeGiven} suffix={t("units.days")} onCommit={vm.setText("noticeGiven")} />
              </Field>
              <Field label={t("termination.details.vacation")} hint={t("termination.details.vacationHint")}>
                <NumberInput value={form.vacationBalance} suffix={t("units.days")} placeholder="0" onCommit={vm.setText("vacationBalance")} />
              </Field>
              <Field label={t("termination.details.recuperation")}>
                <NumberInput value={form.recuperationDays} suffix={t("units.days")} onCommit={vm.setText("recuperationDays")} />
              </Field>
            </div>
          </Card>
        </div>
      ) : null}

      {vm.step === 2 ? (
        vm.calculating ? (
          <Skeleton shape="tall" />
        ) : vm.error ? (
          <Callout tone="danger" title={t("errors.actionFailed")} body={vm.error} />
        ) : result ? (
          <div className={s.result}>
            <Card title={t("termination.result.title", { name: vm.employeeName })} subtitle={t("termination.result.subtitle")}>
              <div className={s.totals}>
                <KeyValueList
                  items={[
                    { key: "years", label: t("termination.result.years"), value: <NumberText value={result.years_of_service} digits={2} /> },
                    { key: "entitlement", label: t("termination.result.entitlement"), value: <Money value={result.severance_entitlement} /> },
                    { key: "covered", label: t("termination.result.covered"), value: <Money value={result.covered_by_section14} /> },
                    { key: "fund", label: t("termination.result.fund"), value: <Money value={result.fund_balance_used} /> },
                    { key: "employerSev", label: t("termination.result.employerSeverance"), value: <Money value={result.employer_severance_payment} /> },
                    { key: "exempt", label: t("termination.result.exempt"), value: <Money value={result.exempt_severance} tone="positive" /> },
                    { key: "taxable", label: t("termination.result.taxable"), value: <Money value={result.taxable_severance} /> },
                    { key: "notice", label: t("termination.result.notice", { days: Number(result.notice_days_due) }), value: <Money value={result.notice_pay} /> },
                    { key: "vacation", label: t("termination.result.vacation"), value: <Money value={result.vacation_payout} /> },
                    { key: "recuperation", label: t("termination.result.recuperation"), value: <Money value={result.recuperation_payout} /> },
                  ]}
                />
                <SummaryRow
                  label={t("termination.result.total")}
                  value={
<Money size="xl" weight="semibold" tone="accent" value={vm.total} />
                  }
                />
              </div>
            </Card>
            <Card title={t("termination.result.howTitle")} subtitle={t("termination.result.howBody")}>
              <div className={s.trace}>
                {result.trace.entries.map((entry) => (
                  <div key={entry.rule_id} className={s.traceRow}>
                    <Text weight="medium">{t(`termination.trace.${entry.rule_id.split(".")[1] ?? "severance"}`)}</Text>
                    <MonoText block value={entry.formula} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : null
      ) : null}

      <div className={s.nav}>
        <Button variant="ghost" icon="chevron-back" label={t("common.back")} disabled={vm.step === 0} onPress={vm.back} />
        {vm.step < 2 ? (
          <Button
            variant="primary"
            iconEnd="chevron-forward"
            label={vm.step === 1 ? t("termination.calculate") : t("common.next")}
            disabled={!vm.canNext}
            onPress={vm.next}
          />
        ) : (
          <Button variant="secondary" icon="refresh" label={t("termination.another")} onPress={vm.restart} />
        )}
      </div>
    </>
  );
}
