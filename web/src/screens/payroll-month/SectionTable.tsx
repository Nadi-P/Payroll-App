"use client";

import { Avatar } from "@/components/data/avatar/Avatar";
import { DataGrid } from "@/components/data/data-grid/DataGrid";
import type { GridColumn } from "@/components/data/data-grid/dataGrid.types";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { Money } from "@/components/typography/money/Money";
import { NumberText } from "@/components/typography/number-text/NumberText";
import { Text } from "@/components/typography/text/Text";
import type { PayrollMonthVM, WorkspaceRow } from "./logic/usePayrollMonth";
import { sectionTableStyles as s } from "./payrollMonth.styles";

/** Every employee of the month in the chosen section; a row opens that employee's month. */
export function SectionTable({ vm }: { vm: PayrollMonthVM }) {
  const { t } = vm;
  const days = vm.section === "absences";
  const shown = (value: number, weight?: "semibold") =>
    !value ? <Text tone="subtle">—</Text> : days ? <Text weight={weight} numeric><NumberText value={value} /></Text> : <Money value={value} weight={weight} />;

  const partColumns = vm.sectionCols.map(
    (part): GridColumn<WorkspaceRow> => ({
      id: part.key,
      header: part.label,
      align: "end",
      sortValue: (r) => vm.partOf(r.slip, part.key),
      cell: (r) => shown(vm.partOf(r.slip, part.key)),
      footer: shown(vm.columnTotal(part.key), "semibold"),
    }),
  );

  return (
    <DataGrid<WorkspaceRow>
      readOnly
      ariaLabel={t(`sections.${vm.section}`)}
      rows={vm.rows}
      rowKey={(r) => r.id}
      onSelect={vm.open}
      rowTone={(r) => (r.severity === "error" ? "danger" : r.severity === "warning" ? "warning" : undefined)}
      maxHeight="calc(100dvh - 24rem)"
      empty={<EmptyState icon="users" title={t("payroll.grid.empty")} />}
      columns={[
        {
          id: "employee",
          header: t("payroll.grid.employee"),
          sticky: true,
          width: "14rem",
          sortValue: (r) => r.name,
          cell: (r) => (
            <div className={s.person}>
              <Avatar name={r.name} size="sm" />
              <div className={s.personText}>
                <Text weight="medium" truncate>{r.name}</Text>
                <Text size="xs" tone="subtle" truncate>{r.position}</Text>
              </div>
            </div>
          ),
          footer: t("common.total"),
        },
        ...(vm.section === "payments"
          ? [
              {
                id: "hours",
                header: t("payroll.fields.hours"),
                align: "end" as const,
                sortValue: (r: WorkspaceRow) => r.hours,
                cell: (r: WorkspaceRow) => (r.hours ? <NumberText value={r.hours} tone="muted" /> : <Text tone="subtle">—</Text>),
              },
            ]
          : []),
        ...partColumns,
        {
          id: "total",
          header: t(`sections.totals.${vm.section}`),
          align: "end",
          sortValue: (r) => vm.sectionTotal(r.slip),
          cell: (r) => shown(vm.sectionTotal(r.slip), "semibold"),
          footer: shown(vm.totalOfSection(), "semibold"),
        },
      ]}
    />
  );
}
