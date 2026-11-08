import { useMemo } from "react";
import { downloadCsv, round2 } from "@/lib/csv";
import type { PivotConfig, PivotDimension, PivotMeasure } from "./pivotTable.types";

const NONE = "none";

interface Bucket {
  sum: number;
  count: number;
}

export interface PivotLine {
  key: string;
  label: string;
  cells: Map<string, Bucket>;
  total: Bucket;
}

const empty = (): Bucket => ({ sum: 0, count: 0 });
const add = (b: Bucket, value: number) => {
  b.sum += value;
  b.count += 1;
};

/** Groups of a dimension, in their natural order (months by date, the rest by name). */
function groupsOf<Row>(rows: Row[], dim: PivotDimension<Row>) {
  const order = new Map<string, string | number>();
  for (const row of rows) {
    const key = dim.of(row);
    const rank = dim.order ? dim.order(row) : key;
    const seen = order.get(key);
    if (seen === undefined || rank < seen) order.set(key, rank);
  }
  return [...order.entries()]
    .sort(([, a], [, b]) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b))))
    .map(([key]) => key);
}

export function usePivotTable<Row>(opts: {
  rows: Row[];
  dimensions: PivotDimension<Row>[];
  measures: PivotMeasure<Row>[];
  config: PivotConfig;
  totalLabel: string;
  fileName: string;
}) {
  const { rows, dimensions, measures, config, totalLabel, fileName } = opts;
  const rowDim = dimensions.find((d) => d.id === config.rows) ?? dimensions[0];
  const colDim = config.columns === NONE ? undefined : dimensions.find((d) => d.id === config.columns);
  const measure = measures.find((m) => m.id === config.measure) ?? measures[0];

  const result = useMemo(() => {
    if (!rowDim || !measure) return { lines: [] as PivotLine[], columnKeys: [] as string[], totals: new Map<string, Bucket>(), grand: empty() };
    const columnKeys = colDim ? groupsOf(rows, colDim) : [];
    const byKey = new Map<string, PivotLine>();
    const totals = new Map<string, Bucket>();
    const grand = empty();
    for (const row of rows) {
      const key = rowDim.of(row);
      const line = byKey.get(key) ?? { key, label: key, cells: new Map(), total: empty() };
      byKey.set(key, line);
      const value = measure.of(row);
      if (colDim) {
        const col = colDim.of(row);
        const cell = line.cells.get(col) ?? empty();
        line.cells.set(col, cell);
        add(cell, value);
        const total = totals.get(col) ?? empty();
        totals.set(col, total);
        add(total, value);
      }
      add(line.total, value);
      add(grand, value);
    }
    const lines = groupsOf(rows, rowDim).map((k) => byKey.get(k)!);
    return { lines, columnKeys, totals, grand };
  }, [rows, rowDim, colDim, measure]);

  /** A cell's value under the chosen calculation. */
  const valueOf = (b: Bucket | undefined): number | null => {
    if (!b || b.count === 0) return null;
    if (config.calc === "count") return b.count;
    if (config.calc === "average") return b.sum / b.count;
    return b.sum;
  };

  return {
    rowDim,
    colDim,
    measure,
    ...result,
    valueOf,
    /** Counts are whole numbers whatever the measure is. */
    format: config.calc === "count" ? ("count" as const) : (measure?.format ?? "number"),
    exportFile: () => {
      const header = [rowDim?.label ?? "", ...result.columnKeys, totalLabel];
      const cell = (b: Bucket | undefined) => {
        const v = valueOf(b);
        return v === null ? "" : round2(v);
      };
      const body = result.lines.map((l) => [l.label, ...result.columnKeys.map((c) => cell(l.cells.get(c))), cell(l.total)]);
      const footer = [totalLabel, ...result.columnKeys.map((c) => cell(result.totals.get(c))), cell(result.grand)];
      downloadCsv(fileName, [header, ...body, footer]);
    },
  };
}
