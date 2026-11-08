"use client";

import { Button } from "@/components/actions/button/Button";
import { IconButton } from "@/components/actions/icon-button/IconButton";
import { DataGrid } from "@/components/data/data-grid/DataGrid";
import type { GridColumn } from "@/components/data/data-grid/dataGrid.types";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { Field } from "@/components/inputs/field/Field";
import { Select } from "@/components/inputs/select/Select";
import { Money } from "@/components/typography/money/Money";
import { NumberText } from "@/components/typography/number-text/NumberText";
import { Text } from "@/components/typography/text/Text";
import { pivotTableStyles as s } from "./pivotTable.styles";
import type { PivotCalc, PivotConfig, PivotDimension, PivotLabels, PivotMeasure } from "./pivotTable.types";
import { usePivotTable, type PivotLine } from "./usePivotTable";

interface PivotTableProps<Row> {
  rows: Row[];
  dimensions: PivotDimension<Row>[];
  measures: PivotMeasure<Row>[];
  config: PivotConfig;
  onConfigChange: (config: PivotConfig) => void;
  labels: PivotLabels;
  ariaLabel: string;
  /** Name of the exported file, without extension. */
  fileName: string;
  maxHeight?: string;
}

/** A pivot table the user builds from dropdowns: rows, columns, a value and how to add it up. */
export function PivotTable<Row>({ rows, dimensions, measures, config, onConfigChange, labels, ariaLabel, fileName, maxHeight }: PivotTableProps<Row>) {
  const pivot = usePivotTable({ rows, dimensions, measures, config, totalLabel: labels.total, fileName });
  const set = (patch: Partial<PivotConfig>) => onConfigChange({ ...config, ...patch });

  const shown = (value: number | null, weight?: "semibold") => {
    if (value === null) return <Text tone="subtle">—</Text>;
    if (pivot.format === "money") return <Money value={value} weight={weight} />;
    const number =
      pivot.format === "percent" ? <NumberText value={value} percent digits={1} /> : <NumberText value={value} digits={pivot.format === "count" ? 0 : undefined} />;
    return weight ? <Text weight={weight}>{number}</Text> : number;
  };

  const columns: GridColumn<PivotLine>[] = [
    {
      id: "__row",
      header: pivot.rowDim?.label ?? "",
      sticky: true,
      sortValue: (l) => l.label,
      cell: (l) => <Text weight="medium">{l.label}</Text>,
      footer: labels.total,
    },
    ...pivot.columnKeys.map(
      (key): GridColumn<PivotLine> => ({
        id: `c:${key}`,
        header: key,
        align: "end",
        sortValue: (l) => pivot.valueOf(l.cells.get(key)) ?? 0,
        cell: (l) => shown(pivot.valueOf(l.cells.get(key))),
        footer: shown(pivot.valueOf(pivot.totals.get(key)), "semibold"),
      }),
    ),
    {
      id: "__total",
      header: pivot.colDim ? labels.total : (pivot.measure?.label ?? labels.total),
      align: "end",
      sortValue: (l) => pivot.valueOf(l.total) ?? 0,
      cell: (l) => shown(pivot.valueOf(l.total), "semibold"),
      footer: shown(pivot.valueOf(pivot.grand), "semibold"),
    },
  ];

  const dimensionOptions = dimensions.map((d) => ({ value: d.id, label: d.label }));

  return (
    <div className={s.root}>
      <div className={s.toolbar}>
        <div className={s.control}>
          <Field label={labels.rows}>
            <Select size="sm" ariaLabel={labels.rows} value={config.rows} onChange={(v) => set({ rows: v })} options={dimensionOptions} />
          </Field>
        </div>
        <div className={s.swap}>
          <IconButton
            icon="arrows-swap"
            label={labels.swap}
            disabled={config.columns === "none"}
            onPress={() => set({ rows: config.columns, columns: config.rows })}
          />
        </div>
        <div className={s.control}>
          <Field label={labels.columns}>
            <Select
              size="sm"
              ariaLabel={labels.columns}
              value={config.columns}
              onChange={(v) => set({ columns: v })}
              options={[{ value: "none", label: labels.none }, ...dimensionOptions.filter((d) => d.value !== config.rows)]}
            />
          </Field>
        </div>
        <div className={s.control}>
          <Field label={labels.value}>
            <Select
              size="sm"
              ariaLabel={labels.value}
              value={config.measure}
              onChange={(v) => set({ measure: v })}
              options={measures.map((m) => ({ value: m.id, label: m.label }))}
            />
          </Field>
        </div>
        <div className={s.calc}>
          <Field label={labels.calc}>
            <Select
              size="sm"
              ariaLabel={labels.calc}
              value={config.calc}
              onChange={(v) => set({ calc: v as PivotCalc })}
              options={[
                { value: "sum", label: labels.sum },
                { value: "average", label: labels.average },
                { value: "count", label: labels.count },
              ]}
            />
          </Field>
        </div>
        <div className={s.spacer} />
        <Button variant="secondary" icon="download" label={labels.export} disabled={!pivot.lines.length} onPress={pivot.exportFile} />
      </div>
      <DataGrid<PivotLine>
        readOnly
        ariaLabel={ariaLabel}
        columns={columns}
        rows={pivot.lines}
        rowKey={(l) => l.key}
        maxHeight={maxHeight}
        empty={<EmptyState icon="search" title={labels.empty} />}
      />
    </div>
  );
}
