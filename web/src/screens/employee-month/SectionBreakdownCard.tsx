"use client";

import { BreakdownChart } from "@/components/charts/breakdown-chart/BreakdownChart";
import { MultiSelect } from "@/components/inputs/multi-select/MultiSelect";
import { Select } from "@/components/inputs/select/Select";
import { Card } from "@/components/surfaces/card/Card";
import { employeeMonthStyles as s } from "./employeeMonth.styles";
import type { EmployeeMonthVM } from "./logic/useEmployeeMonth";

/** The month as a donut: pay items, imputed income, deductions, social funds or absences. */
export function SectionBreakdownCard({ vm }: { vm: EmployeeMonthVM }) {
  const { t, chart } = vm;
  return (
    <Card
      title={t("employeeMonth.breakdown")}
      actions={
        <div className={s.chartFilters}>
          <div className={s.chartSelect}>
            <Select size="sm" ariaLabel={t("sections.label")} value={chart.section} onChange={chart.setSection} options={chart.sections} />
          </div>
          <MultiSelect
            icon="filter"
            label={t("breakdown.components")}
            summary={chart.summary}
            options={chart.options}
            onToggle={chart.toggle}
            onAll={chart.all}
            onNone={chart.none}
            allLabel={t("common.selectAll")}
            noneLabel={t("common.selectNone")}
          />
        </div>
      }
    >
      <BreakdownChart
        slices={chart.slices}
        centerLabel={t("breakdown.total")}
        formatValue={chart.format}
        formatPercent={chart.percent}
        emptyLabel={t("breakdown.empty")}
      />
    </Card>
  );
}
