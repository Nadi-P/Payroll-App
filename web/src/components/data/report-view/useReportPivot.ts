"use client";

import { useMemo } from "react";
import {
  applyFilters,
  buildTree,
  checkThreshold,
  columnPaths,
  matchesPath,
  statQualifying,
  valueCell,
  type PivotNode,
} from "./reportMath";
import type { ReportConfig, ReportField, ReportRow, ValueItem } from "./reportView.types";

export interface PivotLine {
  node: PivotNode;
  open: boolean;
  hasChildren: boolean;
}

/** The pivot: groups down the side (expandable), groups across the top, values in the cells. */
export function useReportPivot(opts: {
  fields: ReportField[];
  rows: ReportRow[];
  config: ReportConfig;
  onConfigChange: (c: ReportConfig) => void;
}) {
  const { fields, rows, config, onConfigChange } = opts;
  const byId = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);
  const data = useMemo(() => applyFilters(rows, config.filters), [rows, config.filters]);
  const tree = useMemo(() => buildTree(data, config.rows), [data, config.rows]);
  const paths = useMemo(() => columnPaths(data, config.columns), [data, config.columns]);
  const expanded = useMemo(() => new Set(config.expanded), [config.expanded]);

  // The rows of the tree as shown: a group's children appear only when it is open.
  const lines = useMemo(() => {
    const out: PivotLine[] = [];
    const walk = (nodes: PivotNode[]) => {
      for (const node of nodes) {
        const hasChildren = node.children.length > 0;
        const open = expanded.has(node.path);
        out.push({ node, open, hasChildren });
        if (hasChildren && open) walk(node.children);
      }
    };
    walk(tree);
    return out;
  }, [tree, expanded]);

  const cellRows = (rowsOf: ReportRow[], path: string[]) =>
    config.columns.length ? rowsOf.filter((r) => matchesPath(r, config.columns, path)) : rowsOf;
  const cell = (rowsOf: ReportRow[], path: string[], item: ValueItem) => valueCell(cellRows(rowsOf, path), item, config);

  // Statistical highlights compare the deepest groups of each value column.
  const statSets = useMemo(() => {
    const out = new Map<string, Set<string>>();
    const leaves: PivotNode[] = [];
    const walk = (nodes: PivotNode[]) => nodes.forEach((n) => (n.children.length ? walk(n.children) : leaves.push(n)));
    walk(tree);
    config.values.forEach((item) => {
      const sh = config.statHighlights[item.field];
      if (!sh) return;
      paths.forEach((path, pi) => {
        const cells = leaves.flatMap((n) => {
          const v = valueCell(config.columns.length ? n.rows.filter((r) => matchesPath(r, config.columns, path)) : n.rows, item, config);
          return v === null ? [] : [{ key: `${n.path}|${pi}`, value: v }];
        });
        const set = out.get(item.field) ?? new Set<string>();
        statQualifying(cells, sh.kind).forEach((k) => set.add(k));
        out.set(item.field, set);
      });
    });
    return out;
  }, [tree, paths, config]);

  const highlight = (node: PivotNode | null, pathIndex: number, item: ValueItem, value: number | null) => {
    if (checkThreshold(value, config.thresholds[item.field]) === true) return "threshold" as const;
    if (node && statSets.get(item.field)?.has(`${node.path}|${pathIndex}`)) return "stat" as const;
    return "none" as const;
  };

  return {
    data,
    lines,
    paths,
    byId,
    empty: config.values.length === 0 || data.length === 0,
    cell,
    highlight,
    toggle: (path: string) =>
      onConfigChange({
        ...config,
        expanded: expanded.has(path) ? config.expanded.filter((p) => p !== path) : [...config.expanded, path],
      }),
    expandAll: () => {
      const all: string[] = [];
      const walk = (nodes: PivotNode[]) =>
        nodes.forEach((n) => {
          if (n.children.length) {
            all.push(n.path);
            walk(n.children);
          }
        });
      walk(tree);
      onConfigChange({ ...config, expanded: all });
    },
    collapseAll: () => onConfigChange({ ...config, expanded: [] }),
  };
}
