"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyFilters,
  checkThreshold,
  deviationFields,
  duplicateValues,
  isNumeric,
  numberOf,
  orderedFields,
  sortRows,
  statQualifying,
  textOf,
  withDeviations,
} from "./reportMath";
import type { ReportConfig, ReportField, ReportLabels, ReportRow } from "./reportView.types";

/** Column widths in pixels by kind of value; frozen columns are offset by these. */
const WIDTH: Record<ReportField["type"], number> = { text: 168, id: 116, money: 132, number: 96, quantity: 104 };
export const ROW_HEIGHT = 34;

export type Highlight = "threshold" | "stat" | "duplicate" | null;

interface Cell {
  r: number;
  c: number;
}

/** Everything the report table shows, worked out from the rows and the user's config. */
export function useReportTable(opts: {
  fields: ReportField[];
  rows: ReportRow[];
  config: ReportConfig;
  onConfigChange: (c: ReportConfig) => void;
  labels: ReportLabels;
}) {
  const { fields, rows, config, onConfigChange, labels } = opts;
  const table = config.table;

  // ---- columns ----
  const allFields = useMemo(() => [...fields, ...deviationFields(config.deviations, labels)], [fields, config.deviations, labels]);
  const byId = useMemo(() => new Map<string, ReportField>(allFields.map((f) => [f.id, f])), [allFields]);
  const order = useMemo(() => orderedFields(allFields.map((f) => f.id), table), [allFields, table]);
  const hidden = useMemo(() => new Set(table.hidden), [table.hidden]);
  const pinned = useMemo(() => new Set(table.pinned), [table.pinned]);
  const columns = useMemo(() => order.filter((id) => !hidden.has(id)).map((id) => byId.get(id)!), [order, hidden, byId]);
  const widths = columns.map((f) => WIDTH[f.type]);
  const offsets = useMemo(() => {
    const out: number[] = [];
    let at = 0;
    columns.forEach((f, i) => {
      out.push(pinned.has(f.id) ? at : 0);
      if (pinned.has(f.id)) at += widths[i]!;
    });
    return out;
  }, [columns, pinned, widths]);

  // ---- rows ----
  const display = useMemo(
    () => sortRows(applyFilters(withDeviations(rows, config.deviations, labels), config.filters), table.sortBy),
    [rows, config.deviations, config.filters, table.sortBy, labels],
  );

  // ---- highlights, per column ----
  const statSets = useMemo(() => {
    const out = new Map<string, Set<string>>();
    for (const [field, cfg] of Object.entries(config.statHighlights)) {
      const cells = display.flatMap((row, i) => {
        const v = numberOf(row[field]);
        return v === null ? [] : [{ key: String(i), value: v }];
      });
      out.set(field, statQualifying(cells, cfg.kind));
    }
    return out;
  }, [display, config.statHighlights]);
  const dupSets = useMemo(
    () => new Map(config.duplicates.map((field) => [field, duplicateValues(display, field)])),
    [display, config.duplicates],
  );
  const highlight = (rowIndex: number, field: string): Highlight => {
    const value = display[rowIndex]?.[field];
    if (checkThreshold(numberOf(value), config.thresholds[field]) === true) return "threshold";
    if (statSets.get(field)?.has(String(rowIndex))) return "stat";
    if (dupSets.get(field)?.has(textOf(value))) return "duplicate";
    return null;
  };

  const totals = useMemo(
    () =>
      columns.map((f) =>
        f.type === "money" || f.type === "quantity"
          ? display.reduce((a, row) => a + (numberOf(row[f.id]) ?? 0), 0)
          : null,
      ),
    [columns, display],
  );

  // ---- config changes ----
  const setTable = (patch: Partial<ReportConfig["table"]>) => onConfigChange({ ...config, table: { ...table, ...patch } });
  const cycleSort = (id: string) => {
    const cur = table.sortBy?.columnId === id ? table.sortBy.direction : null;
    const next = cur === null ? "asc" : cur === "asc" ? "desc" : null;
    setTable({ sortBy: next ? { columnId: id, direction: next } : null });
  };
  const togglePin = (id: string) => {
    const nextPinned = pinned.has(id) ? table.pinned.filter((x) => x !== id) : [...table.pinned, id];
    setTable({ pinned: nextPinned, hidden: table.hidden.filter((x) => x !== id), columnOrder: orderedFields(order, { ...table, pinned: nextPinned }) });
  };
  /** Move within its group (frozen or not): by one step, or to the group's start or end. */
  const move = (id: string, to: "prev" | "next" | "start" | "end") => {
    const group = order.filter((x) => pinned.has(x) === pinned.has(id));
    const i = group.indexOf(id);
    const j = to === "prev" ? i - 1 : to === "next" ? i + 1 : to === "start" ? 0 : group.length - 1;
    if (j < 0 || j >= group.length || j === i) return;
    const next = [...group];
    next.splice(i, 1);
    next.splice(j, 0, id);
    const others = order.filter((x) => pinned.has(x) !== pinned.has(id));
    setTable({ columnOrder: pinned.has(id) ? [...next, ...others] : [...others, ...next] });
  };

  // ---- selection: drag or shift-click a range; the status bar adds it up ----
  const [anchor, setAnchor] = useState<Cell | null>(null);
  const [end, setEnd] = useState<Cell | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    setAnchor(null);
    setEnd(null);
  }, [display, columns.length]);
  useEffect(() => {
    if (!dragging) return;
    const up = () => setDragging(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [dragging]);
  const range = useMemo(
    () =>
      anchor && end
        ? {
            r0: Math.min(anchor.r, end.r),
            r1: Math.max(anchor.r, end.r),
            c0: Math.min(anchor.c, end.c),
            c1: Math.max(anchor.c, end.c),
          }
        : null,
    [anchor, end],
  );
  const selected = (r: number, c: number) => !!range && r >= range.r0 && r <= range.r1 && c >= range.c0 && c <= range.c1;
  const stats = useMemo(() => {
    if (!range) return null;
    let count = 0;
    const nums: number[] = [];
    for (let r = range.r0; r <= range.r1; r++)
      for (let c = range.c0; c <= range.c1; c++) {
        const f = columns[c];
        if (!f) continue;
        count++;
        // Identifiers (employee numbers, years) are not quantities: they are counted, not added.
        const n = isNumeric(f) ? numberOf(display[r]?.[f.id]) : null;
        if (n !== null) nums.push(n);
      }
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      count,
      sum: nums.length ? sum : null,
      average: nums.length ? sum / nums.length : null,
      ratio: nums.length === 2 && nums[1] ? (nums[0]! / nums[1]!) * 100 : null,
    };
  }, [range, columns, display]);

  const pointer = {
    down: (r: number, c: number, shift: boolean) => {
      if (shift && anchor) setEnd({ r, c });
      else {
        setAnchor({ r, c });
        setEnd({ r, c });
      }
      setDragging(true);
    },
    enter: (r: number, c: number) => {
      if (dragging) setEnd({ r, c });
    },
  };

  // ---- virtual rows ----
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: display.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });
  const items = virtualizer.getVirtualItems();
  const padTop = items[0]?.start ?? 0;
  const padBottom = items.length ? virtualizer.getTotalSize() - items[items.length - 1]!.end : 0;

  const filtered = useCallback((id: string) => id in config.filters, [config.filters]);

  return {
    columns,
    widths,
    offsets,
    pinned,
    display,
    totals,
    highlight,
    sortOf: (id: string) => (table.sortBy?.columnId === id ? table.sortBy.direction : null),
    filtered,
    formatted: (id: string) => !!config.thresholds[id] || !!config.statHighlights[id] || config.duplicates.includes(id),
    cycleSort,
    setSort: (id: string, direction: "asc" | "desc" | null) => setTable({ sortBy: direction ? { columnId: id, direction } : null }),
    togglePin,
    hide: (id: string) => setTable({ hidden: [...table.hidden, id], pinned: table.pinned.filter((x) => x !== id) }),
    move,
    canMove: (id: string, to: "prev" | "next") => {
      const group = order.filter((x) => pinned.has(x) === pinned.has(id));
      const i = group.indexOf(id);
      return to === "prev" ? i > 0 : i < group.length - 1;
    },
    selected,
    stats,
    pointer,
    scrollRef,
    items,
    padTop,
    padBottom,
    totalWidth: widths.reduce((a, b) => a + b, 0),
  };
}
