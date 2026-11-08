import type { ReactNode } from "react";

export interface GridColumn<Row> {
  id: string;
  header: string;
  align?: "start" | "end";
  /** CSS width, e.g. "9rem". */
  width?: string;
  /** Pin the column to the start edge while scrolling sideways. */
  sticky?: boolean;
  cell: (row: Row) => ReactNode;
  sortValue?: (row: Row) => string | number;
  /** Makes the cell editable as a number. */
  edit?: {
    label: string;
    value: (row: Row) => string | null;
    commit: (row: Row, value: string | null) => void;
    suffix?: string;
    disabled?: (row: Row) => boolean;
  };
  footer?: ReactNode;
  /** Subtotal of a group of rows, when the grid is grouped. */
  groupTotal?: (rows: Row[]) => ReactNode;
}

/** One cell filled by a paste from a spreadsheet. */
export interface PastedCell<Row> {
  row: Row;
  column: GridColumn<Row>;
  value: string | null;
}

export type RowTone = "danger" | "warning" | undefined;
