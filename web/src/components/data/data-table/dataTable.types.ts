import type { ReactNode } from "react";

export interface TableColumn<Row> {
  id: string;
  header: string;
  /** The cell's plain value: used for sorting, searching, totals and export. */
  value: (row: Row) => string | number;
  /** How numbers are shown. Text columns can use `cell` for richer content. */
  format?: "money" | "number" | "percent" | "text";
  cell?: (row: Row) => ReactNode;
  width?: string;
  sticky?: boolean;
  /** Sum this column in the footer and in group subtotals. */
  total?: boolean;
  /** Start hidden; the user can turn it on from the column picker. */
  hidden?: boolean;
}

export interface TableGrouping<Row> {
  id: string;
  label: string;
  of: (row: Row) => string;
}

/** Everything the table says, supplied by the screen in the user's language. */
export interface TableLabels {
  search: string;
  columns: string;
  groupBy: string;
  noGrouping: string;
  export: string;
  selectAll: string;
  selectNone: string;
  empty: string;
}
