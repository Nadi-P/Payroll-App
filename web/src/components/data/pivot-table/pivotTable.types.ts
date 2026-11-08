/** A field to group by: the pivot's rows or columns. */
export interface PivotDimension<Row> {
  id: string;
  label: string;
  of: (row: Row) => string;
  /** Sort order of the groups; defaults to the label. Months sort by date, not by name. */
  order?: (row: Row) => string | number;
}

/** A number to add up in each cell. */
export interface PivotMeasure<Row> {
  id: string;
  label: string;
  format: "money" | "number" | "percent";
  of: (row: Row) => number;
}

export type PivotCalc = "sum" | "average" | "count";

export interface PivotConfig {
  rows: string;
  /** "none" = a single value column. */
  columns: string;
  measure: string;
  calc: PivotCalc;
}

export interface PivotLabels {
  rows: string;
  columns: string;
  value: string;
  calc: string;
  none: string;
  sum: string;
  average: string;
  count: string;
  total: string;
  swap: string;
  export: string;
  empty: string;
}
