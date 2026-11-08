"use client";

import { useState } from "react";
import { orderedFields } from "../reportMath";
import type { ReportConfig, ReportField } from "../reportView.types";

/** The table's columns as a list to reorder, freeze, hide and sort (Verisal's table editor). */
export function useColumnsList(fields: ReportField[], config: ReportConfig, onConfigChange: (c: ReportConfig) => void) {
  const table = config.table;
  const order = orderedFields(fields.map((f) => f.id), table);
  const pinned = new Set(table.pinned);
  const hidden = new Set(table.hidden);
  const byId = new Map(fields.map((f) => [f.id, f]));
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const setTable = (patch: Partial<ReportConfig["table"]>) => onConfigChange({ ...config, table: { ...table, ...patch } });
  const groupOf = (id: string) => order.filter((x) => pinned.has(x) === pinned.has(id));

  /** Put `id` at `index` within its own group: frozen columns stay before the others. */
  const place = (id: string, index: number) => {
    const group = groupOf(id).filter((x) => x !== id);
    const at = Math.max(0, Math.min(index, group.length));
    group.splice(at, 0, id);
    const others = order.filter((x) => pinned.has(x) !== pinned.has(id));
    setTable({ columnOrder: pinned.has(id) ? [...group, ...others] : [...others, ...group] });
  };

  return {
    items: order.map((id) => ({
      field: byId.get(id)!,
      pinned: pinned.has(id),
      hidden: hidden.has(id),
      sort: table.sortBy?.columnId === id ? table.sortBy.direction : null,
      filtered: id in config.filters,
      dragOver: overId === id && dragId !== id,
    })),
    firstUnpinned: order.findIndex((id) => !pinned.has(id)),
    togglePin: (id: string) => {
      const next = pinned.has(id) ? table.pinned.filter((x) => x !== id) : [...table.pinned, id];
      setTable({ pinned: next, hidden: table.hidden.filter((x) => x !== id), columnOrder: orderedFields(order, { ...table, pinned: next }) });
    },
    toggleHidden: (id: string) =>
      hidden.has(id)
        ? setTable({ hidden: table.hidden.filter((x) => x !== id) })
        : setTable({ hidden: [...table.hidden, id], pinned: table.pinned.filter((x) => x !== id) }),
    cycleSort: (id: string) => {
      const cur = table.sortBy?.columnId === id ? table.sortBy.direction : null;
      const next = cur === null ? "asc" : cur === "asc" ? "desc" : null;
      setTable({ sortBy: next ? { columnId: id, direction: next } : null });
    },
    setSort: (id: string, direction: "asc" | "desc" | null) => setTable({ sortBy: direction ? { columnId: id, direction } : null }),
    move: (id: string, to: "up" | "down" | "start" | "end") => {
      const group = groupOf(id);
      const i = group.indexOf(id);
      place(id, to === "up" ? i - 1 : to === "down" ? i + 1 : to === "start" ? 0 : group.length - 1);
    },
    canMove: (id: string, to: "up" | "down") => {
      const group = groupOf(id);
      const i = group.indexOf(id);
      return to === "up" ? i > 0 : i < group.length - 1;
    },
    drag: {
      start: (id: string) => setDragId(id),
      over: (id: string) => setOverId(id),
      end: () => {
        setDragId(null);
        setOverId(null);
      },
      drop: (targetId: string) => {
        if (dragId && dragId !== targetId && pinned.has(dragId) === pinned.has(targetId)) place(dragId, groupOf(dragId).indexOf(targetId));
        setDragId(null);
        setOverId(null);
      },
    },
  };
}
