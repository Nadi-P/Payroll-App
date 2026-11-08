import type {
  Aggregation,
  Deviation,
  ReportConfig,
  ReportField,
  ReportRow,
  StatKind,
  Threshold,
  ValueItem,
} from "./reportView.types";

/** A cell's value as text, for filters, grouping and duplicates. */
export const textOf = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function numberOf(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export const isNumeric = (f: ReportField | undefined) =>
  !!f && (f.type === "money" || f.type === "number" || f.type === "quantity");

// ---- filtering and sorting ------------------------------------------------------------------

export function applyFilters(rows: ReportRow[], filters: ReportConfig["filters"]): ReportRow[] {
  const entries = Object.entries(filters).map(([field, allowed]) => [field, new Set(allowed)] as const);
  if (!entries.length) return rows;
  return rows.filter((row) => entries.every(([field, allowed]) => allowed.has(textOf(row[field]))));
}

export function compareValues(a: unknown, b: unknown): number {
  const an = numberOf(a);
  const bn = numberOf(b);
  if (an !== null && bn !== null) return an - bn;
  return textOf(a).localeCompare(textOf(b), undefined, { numeric: true });
}

export function sortRows(rows: ReportRow[], sortBy: ReportConfig["table"]["sortBy"]): ReportRow[] {
  if (!sortBy) return rows;
  const factor = sortBy.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => compareValues(a[sortBy.columnId], b[sortBy.columnId]) * factor);
}

/** Each distinct value of a field, in natural order: the choices of a filter. */
export function uniqueValues(rows: ReportRow[], field: string): string[] {
  const set = new Set<string>();
  for (const row of rows) set.add(textOf(row[field]));
  return [...set].sort((a, b) => compareValues(a, b));
}

// ---- column order ---------------------------------------------------------------------------

/** The saved order, with any new fields added at the end and frozen ones moved to the front. */
export function orderedFields(all: string[], table: ReportConfig["table"]): string[] {
  const known = new Set(all);
  const saved = table.columnOrder.filter((id) => known.has(id));
  const savedSet = new Set(saved);
  const order = [...saved, ...all.filter((id) => !savedSet.has(id))];
  const pinned = new Set(table.pinned);
  return [...order.filter((id) => pinned.has(id)), ...order.filter((id) => !pinned.has(id))];
}

// ---- comparison (deviation) columns ---------------------------------------------------------

export const deviationKey = (id: string, kind: "diff" | "percent") => `__dev_${id}_${kind}`;

/** One field per shown comparison: the difference and/or the percentage. */
export function deviationFields(
  deviations: Deviation[],
  labels: { diff: string; percent: string },
): (ReportField & { deviation: Deviation; kind: "diff" | "percent" })[] {
  return deviations.flatMap((d) => [
    ...(d.showDiff
      ? [{ id: deviationKey(d.id, "diff"), label: d.name || labels.diff, type: "money" as const, deviation: d, kind: "diff" as const }]
      : []),
    ...(d.showPercent
      ? [
          {
            id: deviationKey(d.id, "percent"),
            label: `${d.name || labels.percent} %`,
            type: "number" as const,
            deviation: d,
            kind: "percent" as const,
          },
        ]
      : []),
  ]);
}

export function compare(a: number | null, b: number | null, kind: "diff" | "percent"): number | null {
  if (a === null || b === null) return null;
  if (kind === "percent") return a === 0 ? 0 : ((a - b) / a) * 100;
  return a - b;
}

/** Rows with the comparison columns added. */
export function withDeviations(rows: ReportRow[], deviations: Deviation[], labels: { diff: string; percent: string }) {
  const fields = deviationFields(deviations, labels);
  if (!fields.length) return rows;
  return rows.map((row) => {
    const next = { ...row };
    for (const f of fields) {
      const d = f.deviation;
      next[f.id] = d.sourceA && d.sourceB ? compare(numberOf(row[d.sourceA]), numberOf(row[d.sourceB]), f.kind) : null;
    }
    return next;
  });
}

// ---- highlights -----------------------------------------------------------------------------

export function checkThreshold(value: number | null, t: Threshold | undefined): boolean | null {
  if (value === null || !t) return null;
  switch (t.operator) {
    case ">":
      return value > t.value1;
    case "<":
      return value < t.value1;
    case ">=":
      return value >= t.value1;
    case "<=":
      return value <= t.value1;
    case "==":
      return value === t.value1;
    case "between":
      return value >= t.value1 && value <= (t.value2 ?? t.value1);
  }
}

/** Which cells qualify for a statistical highlight, by their key. */
export function statQualifying(cells: { key: string; value: number }[], kind: StatKind): Set<string> {
  if (!cells.length) return new Set();
  const sorted = [...cells].sort((a, b) => b.value - a.value);
  const tenth = Math.max(1, Math.ceil(sorted.length * 0.1));
  const avg = cells.reduce((s, c) => s + c.value, 0) / cells.length;
  const take =
    kind === "top10"
      ? sorted.slice(0, 10)
      : kind === "top10pct"
        ? sorted.slice(0, tenth)
        : kind === "bottom10"
          ? sorted.slice(-10)
          : kind === "bottom10pct"
            ? sorted.slice(-tenth)
            : kind === "aboveAvg"
              ? cells.filter((c) => c.value > avg)
              : cells.filter((c) => c.value < avg);
  return new Set(take.map((c) => c.key));
}

/** Values that appear more than once in a field. */
export function duplicateValues(rows: ReportRow[], field: string): Set<string> {
  const seen = new Map<string, number>();
  for (const row of rows) {
    const v = textOf(row[field]);
    if (v !== "") seen.set(v, (seen.get(v) ?? 0) + 1);
  }
  return new Set([...seen].filter(([, n]) => n > 1).map(([v]) => v));
}

// ---- pivot ----------------------------------------------------------------------------------

export function aggregate(rows: ReportRow[], field: string, how: Aggregation): number | null {
  if (!rows.length) return null;
  if (how === "count") return rows.length;
  const nums = rows.map((r) => numberOf(r[field])).filter((v): v is number => v !== null);
  if (!nums.length) return null;
  switch (how) {
    case "sum":
      return nums.reduce((a, b) => a + b, 0);
    case "avg":
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "min":
      return Math.min(...nums);
    case "max":
      return Math.max(...nums);
  }
}

/** A pivot cell: an aggregated field, or a comparison of two aggregated values. */
export function valueCell(rows: ReportRow[], item: ValueItem, config: ReportConfig): number | null {
  if (item.deviationId && item.kind) {
    const d = config.deviations.find((x) => x.id === item.deviationId);
    if (!d?.sourceA || !d.sourceB) return null;
    const aggOf = (field: string) => config.values.find((v) => v.field === field && !v.deviationId)?.aggregation ?? "sum";
    return compare(aggregate(rows, d.sourceA, aggOf(d.sourceA)), aggregate(rows, d.sourceB, aggOf(d.sourceB)), item.kind);
  }
  return aggregate(rows, item.field, item.aggregation);
}

export interface PivotNode {
  key: string;
  /** Path of keys from the top, joined: identifies the group for expanding. */
  path: string;
  level: number;
  rows: ReportRow[];
  children: PivotNode[];
}

const SEP = "\u0001";

export function buildTree(rows: ReportRow[], dims: string[], level = 0, parent = ""): PivotNode[] {
  if (level >= dims.length) return [];
  const groups = new Map<string, ReportRow[]>();
  for (const row of rows) {
    const key = textOf(row[dims[level]!]);
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => compareValues(a, b))
    .map(([key, list]) => {
      const path = parent ? `${parent}${SEP}${key}` : key;
      return { key, path, level, rows: list, children: buildTree(list, dims, level + 1, path) };
    });
}

/** Every combination of column-group values present in the rows, in order. */
export function columnPaths(rows: ReportRow[], dims: string[]): string[][] {
  if (!dims.length) return [[]];
  const seen = new Map<string, string[]>();
  for (const row of rows) {
    const path = dims.map((d) => textOf(row[d]));
    seen.set(path.join(SEP), path);
  }
  return [...seen.values()].sort((a, b) => {
    for (let i = 0; i < a.length; i++) {
      const c = compareValues(a[i], b[i]);
      if (c) return c;
    }
    return 0;
  });
}

export const matchesPath = (row: ReportRow, dims: string[], path: string[]) =>
  dims.every((d, i) => textOf(row[d]) === path[i]);

/** The values list with comparison columns kept in step with the comparisons. */
export function syncDeviationValues(values: ValueItem[], deviations: Deviation[]): ValueItem[] {
  const wanted = new Map<string, ValueItem>();
  for (const d of deviations) {
    if (d.showDiff) wanted.set(deviationKey(d.id, "diff"), { field: deviationKey(d.id, "diff"), aggregation: "sum", deviationId: d.id, kind: "diff" });
    if (d.showPercent)
      wanted.set(deviationKey(d.id, "percent"), { field: deviationKey(d.id, "percent"), aggregation: "sum", deviationId: d.id, kind: "percent" });
  }
  const kept = values.filter((v) => !v.deviationId || wanted.has(v.field));
  const present = new Set(kept.map((v) => v.field));
  return [...kept, ...[...wanted.values()].filter((v) => !present.has(v.field))];
}
