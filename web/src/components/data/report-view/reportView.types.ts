/** A column of a report: its id in the rows, its header, and how its values look. */
export interface ReportField {
  id: string;
  label: string;
  type: "text" | "number" | "money" | "quantity" | "id";
}

export type ReportRow = Record<string, string | number | null>;

export type Aggregation = "sum" | "avg" | "count" | "min" | "max";

/** A value of the pivot: a field and how its rows add up, or a comparison of two values. */
export interface ValueItem {
  field: string;
  aggregation: Aggregation;
  /** Set for a comparison column; then `field` is its generated id. */
  deviationId?: string;
  kind?: "diff" | "percent";
}

/** A comparison between two numeric fields, shown as a difference and/or a percentage. */
export interface Deviation {
  id: string;
  name: string;
  sourceA: string | null;
  sourceB: string | null;
  showDiff: boolean;
  showPercent: boolean;
}

export type ThresholdOperator = ">" | "<" | ">=" | "<=" | "==" | "between";

export interface Threshold {
  operator: ThresholdOperator;
  value1: number;
  value2?: number;
}

export type StatKind = "top10" | "top10pct" | "bottom10" | "bottom10pct" | "aboveAvg" | "belowAvg";

export interface TableState {
  /** Full column order; frozen columns come first. */
  columnOrder: string[];
  hidden: string[];
  /** Frozen columns: kept at the start and in view while scrolling sideways. */
  pinned: string[];
  sortBy: { columnId: string; direction: "asc" | "desc" } | null;
}

/** Everything the user set on a report: shared filters and highlights, the pivot and the table. */
export interface ReportConfig {
  rows: string[];
  columns: string[];
  values: ValueItem[];
  /** Field id -> the values to keep (as text). A field without an entry is not filtered. */
  filters: Record<string, string[]>;
  thresholds: Record<string, Threshold>;
  statHighlights: Record<string, { kind: StatKind }>;
  /** Fields whose repeated values are highlighted. */
  duplicates: string[];
  deviations: Deviation[];
  /** Pivot row groups the user opened. */
  expanded: string[];
  table: TableState;
}

export const EMPTY_TABLE: TableState = { columnOrder: [], hidden: [], pinned: [], sortBy: null };

export const EMPTY_CONFIG: ReportConfig = {
  rows: [],
  columns: [],
  values: [],
  filters: {},
  thresholds: {},
  statHighlights: {},
  duplicates: [],
  deviations: [],
  expanded: [],
  table: EMPTY_TABLE,
};

/** Fill in anything a saved config from an older version lacks. */
export function normalizeConfig(raw: Partial<ReportConfig> | null | undefined): ReportConfig {
  const c = raw ?? {};
  return {
    rows: c.rows ?? [],
    columns: c.columns ?? [],
    values: c.values ?? [],
    filters: c.filters ?? {},
    thresholds: c.thresholds ?? {},
    statHighlights: c.statHighlights ?? {},
    duplicates: c.duplicates ?? [],
    deviations: c.deviations ?? [],
    expanded: c.expanded ?? [],
    table: { ...EMPTY_TABLE, ...(c.table ?? {}) },
  };
}

/** Every word the report view shows, supplied by the screen in the user's language. */
export interface ReportLabels {
  total: string;
  empty: string;
  emptyPivot: string;
  yes: string;
  aggregations: Record<Aggregation, string>;
  selection: { count: string; sum: string; average: string; ratio: string };
  menu: {
    sortAsc: string;
    sortDesc: string;
    sortNone: string;
    freeze: string;
    unfreeze: string;
    hide: string;
    show: string;
    filter: string;
    format: string;
    moveStart: string;
    moveEnd: string;
    moveLeft: string;
    moveRight: string;
    moveUp: string;
    moveDown: string;
  };
  expand: string;
  collapse: string;
  diff: string;
  percent: string;
}
