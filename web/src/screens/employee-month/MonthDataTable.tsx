"use client";

import { DataTable } from "@/components/data/data-table/DataTable";
import { useTableLabels } from "@/screens/shared/logic/useTableLabels";
import type { EmployeeMonthVM, MonthDataRow } from "./logic/useEmployeeMonth";

/** Every figure of the employee's month in one table: what was typed, standing and calculated. */
export function MonthDataTable({ vm }: { vm: EmployeeMonthVM }) {
  const { t } = vm;
  const labels = useTableLabels();
  return (
    <DataTable<MonthDataRow>
      ariaLabel={t("employeeMonth.data")}
      rows={vm.dataRows}
      rowKey={(r) => r.id}
      labels={labels}
      fileName={`${vm.employeeId}-${vm.monthLabel}`}
      groupings={[
        { id: "section", label: t("employeeMonth.bySection"), of: (r) => r.section },
        { id: "source", label: t("employeeMonth.bySource"), of: (r) => r.source },
      ]}
      columns={[
        { id: "item", header: t("monthEntry.item"), sticky: true, width: "13rem", value: (r) => r.item },
        { id: "section", header: t("employeeMonth.section"), value: (r) => r.section },
        { id: "quantity", header: t("monthEntry.quantity"), format: "number", value: (r) => r.quantity },
        { id: "rate", header: t("monthEntry.rate"), format: "money", value: (r) => r.rate },
        { id: "amount", header: t("monthEntry.amount"), format: "money", total: false, value: (r) => r.amount },
        { id: "source", header: t("employeeMonth.source"), value: (r) => r.source },
      ]}
    />
  );
}
