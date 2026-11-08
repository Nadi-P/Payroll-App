"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/actions/button/Button";
import { DataGrid } from "@/components/data/data-grid/DataGrid";
import type { GridColumn } from "@/components/data/data-grid/dataGrid.types";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { MultiSelect } from "@/components/inputs/multi-select/MultiSelect";
import { SearchInput } from "@/components/inputs/search-input/SearchInput";
import { Select } from "@/components/inputs/select/Select";
import { Money } from "@/components/typography/money/Money";
import { NumberText } from "@/components/typography/number-text/NumberText";
import { Text } from "@/components/typography/text/Text";
import { dataTableStyles as s } from "./dataTable.styles";
import type { TableColumn, TableGrouping, TableLabels } from "./dataTable.types";
import { useDataTable } from "./useDataTable";

interface DataTableProps<Row> {
  columns: TableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  ariaLabel: string;
  labels: TableLabels;
  /** Name of the exported file, without extension. */
  fileName: string;
  groupings?: TableGrouping<Row>[];
  onSelect?: (row: Row) => void;
  maxHeight?: string;
  /** Extra controls at the start of the toolbar. */
  toolbar?: ReactNode;
  /** false = the export button is shown but unavailable (e.g. figures not final yet). */
  canExport?: boolean;
}

function shown<Row>(column: TableColumn<Row>, value: number, weight?: "semibold") {
  if (column.format === "number") return <NumberText value={value} />;
  if (column.format === "percent") return <NumberText value={value} percent digits={1} />;
  return <Money value={value} weight={weight} />;
}

/** A full data table: search, choose columns, group with subtotals, totals and export. */
export function DataTable<Row>({ columns, rows, rowKey, ariaLabel, labels, fileName, groupings, onSelect, maxHeight, toolbar, canExport = true }: DataTableProps<Row>) {
  const table = useDataTable({ columns, rows, groupings, fileName });
  const numeric = (c: TableColumn<Row>) => (c.format ?? "text") !== "text";

  const gridColumns = table.visible.map(
    (c): GridColumn<Row> => ({
      id: c.id,
      header: c.header,
      width: c.width,
      sticky: c.sticky,
      align: numeric(c) ? "end" : "start",
      sortValue: c.value,
      cell: (row) => {
        if (c.cell) return c.cell(row);
        const value = c.value(row);
        if (!numeric(c)) return <Text>{value}</Text>;
        return Number(value) ? shown(c, Number(value)) : <Text tone="subtle">—</Text>;
      },
      footer: c.total ? shown(c, table.sumOf(c, table.filtered), "semibold") : "",
      groupTotal: c.total ? (of) => shown(c, table.sumOf(c, of)) : undefined,
    }),
  );

  return (
    <div className={s.root}>
      <div className={s.toolbar}>
        {toolbar}
        <div className={s.search}>
          <SearchInput size="sm" value={table.query} onChange={table.setQuery} placeholder={labels.search} />
        </div>
        <div className={s.spacer} />
        {groupings?.length ? (
          <div className={s.group}>
            <Select
              size="sm"
              ariaLabel={labels.groupBy}
              value={table.groupId}
              onChange={table.setGroupId}
              options={[{ value: "none", label: labels.noGrouping }, ...groupings.map((g) => ({ value: g.id, label: g.label }))]}
            />
          </div>
        ) : null}
        <MultiSelect
          icon="sliders"
          label={labels.columns}
          summary={table.columnSummary}
          options={table.columnOptions}
          onToggle={table.toggleColumn}
          onAll={table.showAll}
          onNone={table.showNone}
          allLabel={labels.selectAll}
          noneLabel={labels.selectNone}
        />
        <Button variant="secondary" icon="download" label={labels.export} disabled={!canExport} onPress={table.exportFile} />
      </div>
      <DataGrid<Row>
        readOnly
        ariaLabel={ariaLabel}
        columns={gridColumns}
        rows={table.filtered}
        rowKey={rowKey}
        onSelect={onSelect}
        groupBy={table.groupBy}
        maxHeight={maxHeight}
        empty={<EmptyState icon="search" title={labels.empty} />}
      />
    </div>
  );
}
