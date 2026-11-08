"use client";

import { Button } from "@/components/actions/button/Button";
import { DataTable } from "@/components/data/data-table/DataTable";
import { KeyValueList } from "@/components/data/key-value-list/KeyValueList";
import { SummaryRow } from "@/components/data/summary-row/SummaryRow";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { Skeleton } from "@/components/feedback/skeleton/Skeleton";
import { StatusTag } from "@/components/feedback/status-tag/StatusTag";
import { Field } from "@/components/inputs/field/Field";
import { SegmentedControl } from "@/components/inputs/segmented-control/SegmentedControl";
import { Select } from "@/components/inputs/select/Select";
import { Card } from "@/components/surfaces/card/Card";
import { Heading } from "@/components/typography/heading/Heading";
import { MonoText } from "@/components/typography/mono-text/MonoText";
import { Text } from "@/components/typography/text/Text";
import type { FilingRow } from "./logic/filings";
import type { ReportsVM } from "./logic/useReports";
import { reportsStyles as s } from "./reports.styles";

/** One report for export: its status, figures, details and the full detail table. */
export function FilingView({ vm }: { vm: ReportsVM }) {
  const { t, model } = vm;
  const hasTable = model.columns.length > 0;
  const details = [
    { key: "employer", label: t("exports.fields.employer"), value: <Text>{vm.companyName}</Text> },
    { key: "file", label: t("reports.form102.file"), value: <MonoText value={vm.deductionsFile} /> },
    ...(vm.needsEmployee && vm.employeeName
      ? [
          { key: "employee", label: t("employees.columns.name"), value: <Text>{vm.employeeName}</Text> },
          { key: "nationalId", label: t("employees.columns.nationalId"), value: <MonoText value={vm.employeeNationalId} /> },
        ]
      : []),
    { key: "recipient", label: t("exports.fields.recipient"), value: <Text>{vm.recipient}</Text> },
    ...(vm.periodLabel ? [{ key: "period", label: t("exports.fields.period"), value: <Text>{vm.periodLabel}</Text> }] : []),
    ...(vm.dueLabel ? [{ key: "due", label: t("exports.fields.due"), value: <Text weight="medium">{vm.dueLabel}</Text> }] : []),
  ];

  return (
    <>
      <div className={s.head}>
        <div className={s.titleBlock}>
          <Heading level={2}>{vm.title}</Heading>
          <Text tone="muted">{vm.subtitle}</Text>
        </div>
        {vm.status !== "none" ? (
          <StatusTag
            tone={vm.statusTone}
            icon={vm.status === "ready" ? "check-circle" : vm.status === "empty" ? "dot" : "clock"}
            label={vm.statusDetail ? `${vm.statusLabel} · ${vm.statusDetail}` : vm.statusLabel}
          />
        ) : null}
        <div className={s.actions}>
          {vm.payslipsLink ? <Button variant="ghost" icon="external-link" label={t("exports.payslips.open")} onPress={vm.openPayroll} /> : null}
          {vm.terminations ? <Button variant="ghost" icon="plus" label={t("exports.form161.start")} onPress={vm.startTermination} /> : null}
          <Button variant="secondary" icon="printer" label={t("exports.print")} disabled={vm.loading} onPress={vm.print} />
          {!hasTable ? (
            <Button
              variant="secondary"
              icon="download"
              label={t("table.export")}
              disabled={!vm.final || !model.figures.length}
              onPress={vm.exportFigures}
            />
          ) : null}
        </div>
      </div>

      {vm.needsEmployee ? (
        <div className={s.pickers}>
          <div className={s.employee}>
            <Field label={t("employees.columns.name")}>
              <Select size="sm" ariaLabel={t("employees.columns.name")} value={vm.employeeId} onChange={vm.setEmployeeId} options={vm.people} />
            </Field>
          </div>
          {vm.needsMonths ? (
            <Field label={t("exports.wages.months")}>
              <SegmentedControl
                size="sm"
                ariaLabel={t("exports.wages.months")}
                value={vm.wageMonths}
                onChange={vm.setWageMonths}
                options={[
                  { value: "3", label: t("exports.wages.last", { count: 3 }) },
                  { value: "6", label: t("exports.wages.last", { count: 6 }) },
                  { value: "12", label: t("exports.wages.last", { count: 12 }) },
                ]}
              />
            </Field>
          ) : null}
        </div>
      ) : null}

      {vm.loading ? (
        <Skeleton shape="tall" />
      ) : vm.status === "empty" || (vm.needsEmployee && !vm.employeeId) ? (
        <Card>
          <EmptyState icon="file-text" title={t("exports.emptyTitle")} />
        </Card>
      ) : (
        <>
          {model.figures.length ? (
            <div className={s.summary}>
              <Card title={t("exports.summary")}>
                <div className={s.figures}>
                  <KeyValueList items={model.figures.map((f) => ({ key: f.key, label: f.label, value: <Text numeric>{vm.show(f)}</Text> }))} />
                  {model.total ? (
                    <SummaryRow
                      label={model.total.label}
                      value={
                        <Text size="xl" weight="semibold" tone="accent" numeric>
                          {vm.show(model.total)}
                        </Text>
                      }
                    />
                  ) : null}
                </div>
              </Card>
              <Card title={t("exports.details")}>
                <KeyValueList items={details} />
              </Card>
            </div>
          ) : null}
          {hasTable ? (
            vm.terminations && !model.rows.length ? (
              <Card>
                <EmptyState icon="user-x" title={t("exports.form161.none", { year: vm.year })} />
              </Card>
            ) : (
              <DataTable<FilingRow>
                key={vm.selected}
                ariaLabel={vm.title}
                columns={model.columns}
                rows={model.rows}
                rowKey={(r) => r.id}
                labels={vm.labels}
                fileName={vm.fileName}
                canExport={vm.final}
                onSelect={vm.terminations ? vm.openTermination : undefined}
              />
            )
          ) : null}
        </>
      )}
    </>
  );
}
