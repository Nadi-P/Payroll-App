import {
  applyFilters,
  buildTree,
  checkThreshold,
  columnPaths,
  deviationFields,
  duplicateValues,
  matchesPath,
  numberOf,
  orderedFields,
  sortRows,
  statQualifying,
  textOf,
  valueCell,
  withDeviations,
  type PivotNode,
} from "./reportMath";
import type { ReportConfig, ReportField, ReportLabels, ReportRow, ValueItem } from "./reportView.types";

interface ExportOptions {
  mode: "table" | "pivot";
  title: string;
  fileName: string;
  fields: ReportField[];
  rows: ReportRow[];
  config: ReportConfig;
  labels: ReportLabels;
  rtl: boolean;
}

// The same highlight colours as on screen (light theme), as Excel fills.
const FILL = {
  head: "FFF2F4F7",
  total: "FFE9ECF1",
  threshold: "FFFCF3E2",
  stat: "FFEDF4FE",
  duplicate: "FFFCEBEC",
};
const MONEY = "#,##0.00";
const QUANTITY = "#,##0.##";

const fill = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });

/** Download the report as an Excel file, as it looks now: columns, filters, sorting and highlights. */
export async function exportReport(opts: ExportOptions): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(opts.title.replace(/[[\]:*?/\\]/g, " ").slice(0, 31) || "Report");
  if (opts.mode === "table") writeTable(ws, opts);
  else writePivot(ws, opts);
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${opts.fileName}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

type Sheet = import("exceljs").Worksheet;

const numFmt = (f: ReportField) => (f.type === "money" ? MONEY : f.type === "quantity" || f.type === "number" ? QUANTITY : undefined);
const cellValue = (f: ReportField, v: unknown) => {
  if (f.type === "money" || f.type === "quantity" || f.type === "number") return numberOf(v);
  return v === null || v === undefined ? "" : (v as string | number);
};

function writeTable(ws: Sheet, { fields, rows, config, labels, rtl }: ExportOptions) {
  const all = [...fields, ...deviationFields(config.deviations, labels)];
  const byId = new Map<string, ReportField>(all.map((f) => [f.id, f]));
  const hidden = new Set(config.table.hidden);
  const columns = orderedFields(all.map((f) => f.id), config.table)
    .filter((id) => !hidden.has(id))
    .map((id) => byId.get(id)!);
  const data = sortRows(applyFilters(withDeviations(rows, config.deviations, labels), config.filters), config.table.sortBy);

  const stats = new Map<string, Set<string>>();
  for (const [field, cfg] of Object.entries(config.statHighlights)) {
    const cells = data.flatMap((row, i) => {
      const v = numberOf(row[field]);
      return v === null ? [] : [{ key: String(i), value: v }];
    });
    stats.set(field, statQualifying(cells, cfg.kind));
  }
  const dups = new Map(config.duplicates.map((f) => [f, duplicateValues(data, f)]));

  ws.columns = columns.map((f) => ({ header: f.label, key: f.id, width: f.type === "text" ? 24 : 14, style: { numFmt: numFmt(f) } }));
  data.forEach((row, i) => {
    const line = ws.addRow(columns.map((f) => cellValue(f, row[f.id])));
    columns.forEach((f, c) => {
      const v = row[f.id];
      const color =
        checkThreshold(numberOf(v), config.thresholds[f.id]) === true
          ? FILL.threshold
          : stats.get(f.id)?.has(String(i))
            ? FILL.stat
            : dups.get(f.id)?.has(textOf(v))
              ? FILL.duplicate
              : null;
      if (color) line.getCell(c + 1).fill = fill(color);
    });
  });
  const totals = ws.addRow(
    columns.map((f, i) =>
      i === 0
        ? labels.total
        : f.type === "money" || f.type === "quantity"
          ? data.reduce((a, row) => a + (numberOf(row[f.id]) ?? 0), 0)
          : "",
    ),
  );
  totals.font = { bold: true };
  totals.eachCell((cell) => (cell.fill = fill(FILL.total)));
  styleHeader(ws.getRow(1));
  const frozen = columns.filter((f) => config.table.pinned.includes(f.id)).length;
  ws.views = [{ state: "frozen", xSplit: frozen, ySplit: 1, rightToLeft: rtl }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: Math.max(columns.length, 1) } };
}

function writePivot(ws: Sheet, { fields, rows, config, labels, rtl }: ExportOptions) {
  const byId = new Map(fields.map((f) => [f.id, f]));
  const data = applyFilters(rows, config.filters);
  const paths = columnPaths(data, config.columns);
  const multi = config.columns.length > 0;
  const groups = multi ? [...paths, null] : [[] as string[]];
  const values = config.values;
  const labelOf = (item: ValueItem) => {
    if (item.deviationId) {
      const d = config.deviations.find((x) => x.id === item.deviationId);
      const name = d?.name || (item.kind === "percent" ? labels.percent : labels.diff);
      return item.kind === "percent" ? `${name} %` : name;
    }
    return `${labels.aggregations[item.aggregation]} · ${byId.get(item.field)?.label ?? item.field}`;
  };
  const fmtOf = (item: ValueItem) =>
    item.deviationId ? (item.kind === "percent" ? QUANTITY : MONEY) : item.aggregation === "count" ? "0" : byId.get(item.field)?.type === "money" ? MONEY : QUANTITY;

  const rowTitle = config.rows.map((id) => byId.get(id)?.label ?? id).join(" › ");
  let header = 1;
  if (multi) {
    const top = ws.addRow([rowTitle, ...groups.flatMap((p) => values.map((_, i) => (i === 0 ? (p ? p.join(" · ") : labels.total) : "")))]);
    groups.forEach((_, gi) => {
      if (values.length > 1) ws.mergeCells(1, 2 + gi * values.length, 1, 1 + (gi + 1) * values.length);
    });
    styleHeader(top);
    header = 2;
  }
  styleHeader(ws.addRow([multi ? "" : rowTitle, ...groups.flatMap(() => values.map(labelOf))]));

  const writeNode = (node: PivotNode) => {
    const line = ws.addRow([
      node.key || "—",
      ...groups.flatMap((path) =>
        values.map((item) => {
          const cellRows = path && multi ? node.rows.filter((r) => matchesPath(r, config.columns, path)) : node.rows;
          return valueCell(cellRows, item, config);
        }),
      ),
    ]);
    line.getCell(1).alignment = { indent: node.level * 2 };
    if (node.children.length) line.font = { bold: true };
    groups.forEach((_, gi) => values.forEach((item, vi) => (line.getCell(2 + gi * values.length + vi).numFmt = fmtOf(item))));
    node.children.forEach(writeNode);
  };
  // The file holds the whole tree, opened, whatever is collapsed on screen.
  buildTree(data, config.rows).forEach(writeNode);

  const totals = ws.addRow([
    labels.total,
    ...groups.flatMap((path) =>
      values.map((item) => valueCell(path && multi ? data.filter((r) => matchesPath(r, config.columns, path)) : data, item, config)),
    ),
  ]);
  totals.font = { bold: true };
  totals.eachCell((cell) => (cell.fill = fill(FILL.total)));
  groups.forEach((_, gi) => values.forEach((item, vi) => (totals.getCell(2 + gi * values.length + vi).numFmt = fmtOf(item))));
  ws.getColumn(1).width = 32;
  for (let c = 2; c <= 1 + groups.length * values.length; c++) ws.getColumn(c).width = 16;
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: header, rightToLeft: rtl }];
}

function styleHeader(row: import("exceljs").Row) {
  row.font = { bold: true };
  row.alignment = { vertical: "middle" };
  row.eachCell((cell) => (cell.fill = fill(FILL.head)));
}
