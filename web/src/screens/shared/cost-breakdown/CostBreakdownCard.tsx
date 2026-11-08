"use client";

import { BreakdownChart } from "@/components/charts/breakdown-chart/BreakdownChart";
import { MultiSelect } from "@/components/inputs/multi-select/MultiSelect";
import { Card } from "@/components/surfaces/card/Card";
import { costBreakdownStyles as s } from "./costBreakdown.styles";
import { useCostBreakdown, type BreakdownRow } from "./logic/useCostBreakdown";

interface CostBreakdownCardProps {
  title: string;
  rows: BreakdownRow[];
  /** Hide the employee filter when the card is about one person. */
  employeeFilter?: boolean;
}

/** Employer cost as a donut, with employee and component filters in the card corner. */
export function CostBreakdownCard({ title, rows, employeeFilter = true }: CostBreakdownCardProps) {
  const vm = useCostBreakdown(rows);
  const { t } = vm;
  return (
    <Card
      title={title}
      actions={
        <div className={s.filters}>
          {employeeFilter ? (
            <MultiSelect
              icon="users"
              label={t("breakdown.employees")}
              summary={vm.people.summary}
              options={vm.people.options}
              onToggle={vm.people.toggle}
              onAll={vm.people.all}
              onNone={vm.people.none}
              allLabel={t("common.selectAll")}
              noneLabel={t("common.selectNone")}
            />
          ) : null}
          <MultiSelect
            icon="filter"
            label={t("breakdown.components")}
            summary={vm.parts.summary}
            options={vm.parts.options}
            onToggle={vm.parts.toggle}
            onAll={vm.parts.all}
            onNone={vm.parts.none}
            allLabel={t("common.selectAll")}
            noneLabel={t("common.selectNone")}
          />
        </div>
      }
    >
      <BreakdownChart
        slices={vm.slices}
        centerLabel={t("breakdown.total")}
        formatValue={vm.money}
        formatPercent={vm.percent}
        emptyLabel={t("breakdown.empty")}
      />
    </Card>
  );
}
